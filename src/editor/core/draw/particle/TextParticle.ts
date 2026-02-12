import { ElementType, IEditorOption, IElement, RenderMode } from '../../..'
import {
  PUNCTUATION_LIST,
  METRICS_BASIS_TEXT
} from '../../../dataset/constant/Common'
import { DeepRequired } from '../../../interface/Common'
import { IRowElement } from '../../../interface/Row'
import { ITextMetrics } from '../../../interface/Text'
import { Draw } from '../Draw'
import { ShapeEngine } from '../../shaping/ShapeEngine'
import { IShapeResult, IGlyphInfo } from '../../shaping/interface/ShapeEngine'
import {
  needsComplexShaping,
  detectDirection
} from '../../../utils/unicode'

export interface IMeasureWordResult {
  width: number
  endElement: IElement | null
}

/**
 * Per-element contextual rendering info.
 * Maps each element to its glyphs within the contextual group shape result.
 */
interface IContextualRenderInfo {
  /** The glyphs belonging to this element (subset of the group's shapeResult) */
  glyphs: IGlyphInfo[]
  /** Font ID used for shaping */
  fontId: string
  /** Font size used for shaping (unscaled) */
  fontSize: number
}

export class TextParticle {
  private draw: Draw
  private options: DeepRequired<IEditorOption>

  private ctx: CanvasRenderingContext2D
  private curX: number
  private curY: number
  private text: string
  private curStyle: string
  private curColor?: string
  private curFont?: string // Resolved font ID for ShapeEngine (e.g. "Noto Sans|bold")
  public cacheMeasureText: Map<string, TextMetrics>
  // Track fonts that are currently being lazy-loaded to avoid duplicate triggers
  private pendingFontLoads: Set<string>
  // Precomputed contextual widths: element reference → shaped width in pixels.
  // Populated by precomputeContextualWidths() before computeRowList iteration.
  private contextualWidths: Map<IElement, number> = new Map()
  // Precomputed contextual rendering info: element reference → glyph data.
  // Stores the exact glyphs (from contextual shaping) that belong to each element,
  // so rendering can use the same shape result as measurement — no re-shaping needed.
  private contextualRenderInfo: Map<IElement, IContextualRenderInfo> = new Map()

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.ctx = draw.getCtx()
    this.curX = -1
    this.curY = -1
    this.text = ''
    this.curStyle = ''
    this.cacheMeasureText = new Map()
    this.pendingFontLoads = new Set()
  }

  /**
   * Resolve the CSS font family name for an element.
   */
  private _getElementFontName(element?: IElement): string {
    return element?.font || this.options.defaultFont
  }

  /**
   * Resolve the ShapeEngine font ID for an element, accounting for
   * bold/italic variants. Falls back through available variants.
   *
   * When `text` is provided and contains complex script characters,
   * falls back to the configured complexScriptFallback font (e.g. Amiri)
   * if the element's font isn't registered in ShapeEngine.
   */
  private _resolveShapingFontId(element?: IElement, text?: string): string {
    const fontName = this._getElementFontName(element)
    if (!this.options.shaping.enabled) return fontName
    const engine = ShapeEngine.getInstance()
    // For complex-script text, use fallback if the font isn't registered
    const textToCheck = text || element?.value || ''
    if (textToCheck && needsComplexShaping(textToCheck)) {
      return engine.resolveWithFallback(
        fontName,
        this.options.shaping.complexScriptFallback,
        !!element?.bold,
        !!element?.italic
      )
    }
    return engine.resolveFontId(
      fontName,
      !!element?.bold,
      !!element?.italic
    )
  }

  /**
   * Resolve the font size for an element.
   */
  private _getElementFontSize(element?: IElement): number {
    return element?.actualSize || element?.size || this.options.defaultSize
  }

  /**
   * Check if shaping is enabled AND the resolved font is ready.
   * If the font is registered but not yet loaded, triggers lazy loading
   * which will cause a re-render when complete.
   */
  private _isShapingReady(fontId?: string): boolean {
    if (!this.options.shaping.enabled) return false
    const id = fontId || this.options.defaultFont
    const engine = ShapeEngine.getInstance()
    if (!engine.isInitialized()) return false
    if (engine.isFontReady(id)) return true
    // Font is registered but not loaded — trigger lazy load & re-render
    if (engine.isFontRegistered(id) && !this.pendingFontLoads.has(id)) {
      this.pendingFontLoads.add(id)
      this.draw.ensureShapingFont(id)
    }
    return false
  }

  /**
   * Determine whether this text should be routed through the ShapeEngine.
   *
   * - If `forceShaping` is true, ALL text goes through ShapeEngine.
   * - Otherwise, only text containing complex-script characters
   *   (Arabic, Devanagari, Thai, etc.) uses ShapeEngine.
   * - Simple scripts (Latin, CJK, Cyrillic) use native Canvas API
   *   for superior rendering quality (subpixel AA + font hinting).
   */
  private _shouldUseShaping(text: string): boolean {
    if (this.options.shaping.forceShaping) return true
    return needsComplexShaping(text)
  }

  /**
   * Precompute contextual advance widths for complex-script elements.
   *
   * Groups consecutive TEXT elements that need complex shaping (Arabic, etc.)
   * with the same font/size, shapes each group as a unit, then distributes
   * per-cluster advances back to individual elements via HarfBuzz cluster IDs.
   *
   * This fixes the measurement gap where isolated-form character widths
   * (e.g. 3 chars sum to ~24px) don't match contextual rendered widths
   * (e.g. connected glyphs ~18px).
   *
   * Must be called BEFORE computeRowList iteration.
   */
  public precomputeContextualWidths(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[]
  ): void {
    this.contextualWidths.clear()
    this.contextualRenderInfo.clear()
    if (!this.options.shaping.enabled) return
    const engine = ShapeEngine.getInstance()
    if (!engine.isInitialized()) return

    let groupStart = -1
    let groupFontId = ''
    let groupFontSize = 0

    const flushGroup = (end: number) => {
      if (groupStart < 0) return
      this._processContextualGroup(
        ctx, elementList, groupStart, end,
        groupFontId, groupFontSize
      )
      groupStart = -1
    }

    for (let i = 0; i <= elementList.length; i++) {
      const el = elementList[i]
      // Only group plain TEXT elements with complex script content
      const isTextType = el && (!el.type || el.type === ElementType.TEXT)
      const isComplex = isTextType
        && !el.width // skip elements with custom width
        && needsComplexShaping(el.value)

      // Allow whitespace (spaces, tabs) to continue an active group.
      // This ensures space widths come from HarfBuzz (matching the
      // rendering font) rather than Canvas measureText which may use
      // a different default font — fixing excessive Arabic word spacing.
      const isContinuableWhitespace = !isComplex
        && isTextType
        && !el.width
        && groupStart >= 0
        && /^\s+$/.test(el?.value ?? '')

      if (isComplex) {
        const fontId = this._resolveShapingFontId(el)
        const fontSize = this._getElementFontSize(el)

        if (
          groupStart >= 0 &&
          fontId === groupFontId &&
          fontSize === groupFontSize
        ) {
          // Continue current group
          continue
        }
        // Start new group (flush previous if any)
        flushGroup(i - 1)
        groupStart = i
        groupFontId = fontId
        groupFontSize = fontSize
      } else if (isContinuableWhitespace) {
        // Continue the current group through whitespace so that
        // space advances come from HarfBuzz, not Canvas measureText
        continue
      } else {
        flushGroup(i - 1)
      }
    }
  }

  /**
   * Shape a group of consecutive complex-script elements as a unit
   * and store per-element contextual widths + rendering glyph data.
   *
   * The shape result is also distributed to individual elements so that
   * the renderer can draw each element's glyphs at its computed position
   * without re-shaping — ensuring measurement and rendering use the exact
   * same HarfBuzz output.
   */
  private _processContextualGroup(
    _ctx: CanvasRenderingContext2D,
    elementList: IElement[],
    start: number,
    end: number,
    fontId: string,
    fontSize: number
  ): void {
    if (!this._isShapingReady(fontId)) return
    const engine = ShapeEngine.getInstance()

    // Build concatenated text and track char → element mapping
    let text = ''
    const charToElement: Array<{ el: IElement; localIdx: number }> = []
    for (let i = start; i <= end; i++) {
      const el = elementList[i]
      for (let c = 0; c < el.value.length; c++) {
        charToElement.push({ el, localIdx: c })
      }
      text += el.value
    }

    if (!text) return

    const direction = detectDirection(text)
    const result = engine.shapeText(text, fontId, fontSize, { direction })

    // Build per-cluster advances for width distribution
    const advances = new Map<number, number>()
    for (const glyph of result.glyphs) {
      const current = advances.get(glyph.cluster) || 0
      advances.set(glyph.cluster, current + glyph.xAdvance)
    }

    // Distribute per-cluster advances to elements.
    // Each element's contextual width = sum of cluster advances
    // for the character indices that belong to it.
    const elementWidths = new Map<IElement, number>()
    for (let charIdx = 0; charIdx < charToElement.length; charIdx++) {
      const { el } = charToElement[charIdx]
      const advance = advances.get(charIdx) || 0
      elementWidths.set(el, (elementWidths.get(el) || 0) + advance)
    }

    for (const [el, width] of elementWidths) {
      this.contextualWidths.set(el, width)
    }

    // Map each glyph to its source element via cluster IDs.
    // This lets the renderer draw each element's contextual glyphs
    // at the correct position without re-shaping.
    const elementGlyphs = new Map<IElement, IGlyphInfo[]>()
    for (const glyph of result.glyphs) {
      const charIdx = glyph.cluster
      if (charIdx < charToElement.length) {
        const { el } = charToElement[charIdx]
        let glyphList = elementGlyphs.get(el)
        if (!glyphList) {
          glyphList = []
          elementGlyphs.set(el, glyphList)
        }
        glyphList.push(glyph)
      }
    }

    for (const [el, glyphs] of elementGlyphs) {
      this.contextualRenderInfo.set(el, {
        glyphs,
        fontId,
        fontSize
      })
    }
  }

  public measureBasisWord(
    ctx: CanvasRenderingContext2D,
    font: string
  ): ITextMetrics {
    ctx.save()
    ctx.font = font
    const textMetrics = this.measureText(ctx, {
      value: METRICS_BASIS_TEXT
    })
    ctx.restore()
    return textMetrics
  }

  public measureWord(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[],
    curIndex: number
  ): IMeasureWordResult {
    const LETTER_REG = this.draw.getLetterReg()
    let width = 0
    let endElement: IElement | null = null
    let i = curIndex
    while (i < elementList.length) {
      const element = elementList[i]
      if (
        (element.type && element.type !== ElementType.TEXT) ||
        !LETTER_REG.test(element.value)
      ) {
        endElement = element
        break
      }
      width += this.measureText(ctx, element).width
      i++
    }
    return {
      width,
      endElement
    }
  }

  public measurePunctuationWidth(
    ctx: CanvasRenderingContext2D,
    element: IElement
  ): number {
    if (!element || !PUNCTUATION_LIST.includes(element.value)) return 0
    ctx.font = this.draw.getElementFont(element)
    return this.measureText(ctx, element).width
  }

  public measureText(
    ctx: CanvasRenderingContext2D,
    element: IElement
  ): ITextMetrics {
    // 优先使用自定义字宽设置
    if (element.width) {
      const textMetrics = ctx.measureText(element.value)
      // TextMetrics是类无法解构
      return {
        width: element.width,
        actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
        actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
        actualBoundingBoxRight: textMetrics.actualBoundingBoxRight,
        fontBoundingBoxAscent: textMetrics.fontBoundingBoxAscent,
        fontBoundingBoxDescent: textMetrics.fontBoundingBoxDescent
      }
    }
    // Use precomputed contextual width if available (from precomputeContextualWidths).
    // This gives accurate widths for complex-script characters that were shaped
    // together as a group, rather than isolated single-character shaping.
    const contextualWidth = this.contextualWidths.get(element)
    if (contextualWidth !== undefined) {
      const textMetrics = ctx.measureText(element.value)
      return {
        width: contextualWidth,
        actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
        actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
        actualBoundingBoxRight: textMetrics.actualBoundingBoxRight,
        fontBoundingBoxAscent: textMetrics.fontBoundingBoxAscent,
        fontBoundingBoxDescent: textMetrics.fontBoundingBoxDescent
      }
    }
    const id = `${element.value}${ctx.font}`
    const cacheTextMetrics = this.cacheMeasureText.get(id)
    if (cacheTextMetrics) {
      return cacheTextMetrics
    }
    // Try ShapeEngine for width measurement (complex scripts or forceShaping)
    const fontId = this._resolveShapingFontId(element)
    if (
      this._isShapingReady(fontId) &&
      this._shouldUseShaping(element.value)
    ) {
      const fontSize = this._getElementFontSize(element)
      const engine = ShapeEngine.getInstance()
      const direction = detectDirection(element.value)
      const shapedWidth = engine.getShapedWidth(
        element.value,
        fontId,
        fontSize,
        { direction }
      )
      // Use Canvas API for vertical metrics (ascent/descent)
      // since ShapeEngine doesn't provide pixel-space metrics
      const textMetrics = ctx.measureText(element.value)
      const result: ITextMetrics = {
        width: shapedWidth,
        actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
        actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
        actualBoundingBoxRight: textMetrics.actualBoundingBoxRight,
        fontBoundingBoxAscent: textMetrics.fontBoundingBoxAscent,
        fontBoundingBoxDescent: textMetrics.fontBoundingBoxDescent
      }
      this.cacheMeasureText.set(id, result as unknown as TextMetrics)
      return result
    }
    const textMetrics = ctx.measureText(element.value)
    this.cacheMeasureText.set(id, textMetrics)
    return textMetrics
  }

  public getBasisWordBoundingBoxAscent(
    ctx: CanvasRenderingContext2D,
    font: string
  ): number {
    return this.measureBasisWord(ctx, font).fontBoundingBoxAscent
  }

  public getBasisWordBoundingBoxDescent(
    ctx: CanvasRenderingContext2D,
    font: string
  ): number {
    return this.measureBasisWord(ctx, font).fontBoundingBoxDescent
  }

  /**
   * Check if an element has precomputed contextual rendering info.
   * Used by drawRow() to decide between position-based rendering
   * (accurate for complex scripts) and batched record/complete rendering.
   */
  public hasContextualRenderInfo(element: IElement): boolean {
    return this.contextualRenderInfo.has(element)
  }

  /**
   * Render an element using its precomputed contextual glyphs.
   *
   * Instead of re-shaping the text (which may produce different glyph forms
   * when shaped out of context), this uses the exact glyphs from the
   * contextual group shaping — ensuring measurement and rendering match.
   *
   * The glyphs are rendered at position (x, y) using their xOffset/yOffset,
   * advancing by each glyph's xAdvance.
   */
  public renderContextualElement(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number,
    scale: number,
    color?: string
  ): void {
    const info = this.contextualRenderInfo.get(element)
    if (!info) return

    const fillColor = color || element.color || this.options.defaultColor
    const engine = ShapeEngine.getInstance()
    // Scale the font size to match the rendering scale
    const scaledFontSize = info.fontSize * scale

    // Build a partial IShapeResult with just this element's glyphs,
    // scaling advances/offsets to match the rendering scale
    const scaledGlyphs: IGlyphInfo[] = info.glyphs.map(g => ({
      ...g,
      xAdvance: g.xAdvance * scale,
      yAdvance: g.yAdvance * scale,
      xOffset: g.xOffset * scale,
      yOffset: g.yOffset * scale
    }))

    const partialResult: IShapeResult = {
      glyphs: scaledGlyphs,
      direction: detectDirection(element.value),
      totalAdvance: scaledGlyphs.reduce((sum, g) => sum + g.xAdvance, 0)
    }

    engine.renderGlyphs(
      ctx,
      partialResult,
      info.fontId,
      scaledFontSize,
      x,
      y,
      fillColor
    )
  }

  /**
   * Render a single element's text through the correct pipeline.
   * This is the shared rendering gateway that all text-drawing particles
   * should use instead of calling ctx.fillText() directly.
   *
   * Routes to ShapeEngine for complex scripts (Arabic, Devanagari, etc.)
   * and native Canvas API for simple scripts (Latin, CJK, Cyrillic).
   *
   * Callers must set ctx.font before calling this method.
   */
  public renderText(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number,
    color?: string
  ): void {
    const fontId = this._resolveShapingFontId(element)
    const fillColor = color || element.color || this.options.defaultColor

    if (
      this._isShapingReady(fontId) &&
      this._shouldUseShaping(element.value)
    ) {
      const engine = ShapeEngine.getInstance()
      const fontSize = this._getElementFontSize(element)
      const direction = detectDirection(element.value)
      const result = engine.shapeText(element.value, fontId, fontSize, { direction })
      engine.renderGlyphs(ctx, result, fontId, fontSize, x, y, fillColor)
    } else {
      ctx.fillStyle = fillColor
      ctx.fillText(element.value, x, y)
    }
  }

  public complete() {
    this._render()
    this.text = ''
  }

  /**
   * Flush the current batch if pending text does NOT belong to a contextual
   * group. Called when entering a contextual group to prevent non-group
   * characters (like ZWSP \u200B) from joining the Arabic batch — which
   * would change the batch text, miss the ShapeEngine cache, and produce
   * different per-cluster advances than the contextual group measurement.
   */
  public flushIfNotContextual(): void {
    // Nothing to flush
    if (!this.text) return
    // If the pending text already contains complex-script characters
    // from a contextual group, don't flush — let it continue accumulating
    if (needsComplexShaping(this.text)) return
    // Pending text is non-contextual (e.g. ZWSP) — flush it before
    // the contextual group elements start recording
    this.complete()
  }

  public record(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number
  ) {
    this.ctx = ctx
    // Resolve font ID including bold/italic variant
    const fontId = this._resolveShapingFontId(element)
    // 兼容模式立即绘制
    if (this.options.renderMode === RenderMode.COMPATIBILITY) {
      this._setCurXY(x, y)
      this.text = element.value
      this.curStyle = element.style
      this.curColor = element.color
      this.curFont = fontId
      this.complete()
      return
    }
    // 主动完成的重设起始点
    if (!this.text) {
      this._setCurXY(x, y)
    }
    // 样式发生改变 (includes font family, size, bold, italic changes)
    if (
      (this.curStyle && element.style !== this.curStyle) ||
      element.color !== this.curColor
    ) {
      this.complete()
      this._setCurXY(x, y)
    }
    this.text += element.value
    this.curStyle = element.style
    this.curColor = element.color
    this.curFont = fontId
  }

  private _setCurXY(x: number, y: number) {
    this.curX = x
    this.curY = y
  }

  private _render() {
    if (!this.text || !~this.curX || !~this.curY) return
    this.ctx.save()
    this.ctx.font = this.curStyle
    const color = this.curColor || this.options.defaultColor

    // Re-resolve font ID with the full accumulated text so fallback
    // kicks in for complex scripts even if curFont was set per-char.
    let fontId = this.curFont || this.options.defaultFont
    if (
      this._shouldUseShaping(this.text) &&
      !ShapeEngine.getInstance().isFontRegistered(fontId)
    ) {
      const fallback = this.options.shaping.complexScriptFallback
      if (fallback && ShapeEngine.getInstance().isFontRegistered(fallback)) {
        fontId = fallback
      }
    }

    // Try ShapeEngine rendering (complex scripts or forceShaping)
    if (
      this._isShapingReady(fontId) &&
      this._shouldUseShaping(this.text)
    ) {
      const engine = ShapeEngine.getInstance()
      // Extract font size from curStyle (e.g. "italic bold 16px Microsoft YaHei")
      const fontSize = this._parseFontSize(this.curStyle)
      const direction = detectDirection(this.text)
      const result = engine.shapeText(this.text, fontId, fontSize, { direction })
      engine.renderGlyphs(
        this.ctx,
        result,
        fontId,
        fontSize,
        this.curX,
        this.curY,
        color
      )
    } else {
      // Fallback to Canvas API
      this.ctx.fillStyle = color
      this.ctx.fillText(this.text, this.curX, this.curY)
    }
    this.ctx.restore()
  }

  /**
   * Parse the font size (in px) from a CSS font string.
   * Example: "italic bold 16px Microsoft YaHei" → 16
   */
  private _parseFontSize(fontStr: string): number {
    const match = fontStr.match(/(\d+(?:\.\d+)?)px/)
    if (match) return parseFloat(match[1])
    return this.options.defaultSize
  }
}
