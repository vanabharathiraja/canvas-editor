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
import {
  needsComplexShaping,
  detectDirection
} from '../../../utils/unicode'

export interface IMeasureWordResult {
  width: number
  endElement: IElement | null
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
   */
  private _resolveShapingFontId(element?: IElement): string {
    const fontName = this._getElementFontName(element)
    if (!this.options.shaping.enabled) return fontName
    const engine = ShapeEngine.getInstance()
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
      } else {
        flushGroup(i - 1)
      }
    }
  }

  /**
   * Shape a group of consecutive complex-script elements as a unit
   * and store per-element contextual widths.
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
    const advances = engine.getPerClusterAdvances(
      text, fontId, fontSize, { direction }
    )

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

    // Try ShapeEngine rendering (complex scripts or forceShaping)
    const fontId = this.curFont || this.options.defaultFont
    if (
      this._isShapingReady(fontId) &&
      this._shouldUseShaping(this.text)
    ) {
      console.log(`Shaping & rendering text: "${this.text}" with fontId: ${fontId}`)
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
