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
  private curFont?: string // CSS font name for ShapeEngine (e.g. "Microsoft YaHei")
  public cacheMeasureText: Map<string, TextMetrics>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.ctx = draw.getCtx()
    this.curX = -1
    this.curY = -1
    this.text = ''
    this.curStyle = ''
    this.cacheMeasureText = new Map()
  }

  /**
   * Resolve the CSS font name for an element, using defaultFont as fallback.
   */
  private _getElementFontName(element?: IElement): string {
    return element?.font || this.options.defaultFont
  }

  /**
   * Resolve the font size for an element.
   */
  private _getElementFontSize(element?: IElement): number {
    return element?.actualSize || element?.size || this.options.defaultSize
  }

  /**
   * Check if shaping is enabled AND the font is ready for a given element.
   */
  private _isShapingReady(fontName?: string): boolean {
    if (!this.options.shaping.enabled) return false
    const name = fontName || this.options.defaultFont
    const engine = ShapeEngine.getInstance()
    return engine.isInitialized() && engine.isFontReady(name)
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
    const id = `${element.value}${ctx.font}`
    const cacheTextMetrics = this.cacheMeasureText.get(id)
    if (cacheTextMetrics) {
      return cacheTextMetrics
    }
    // Try ShapeEngine for width measurement
    const fontName = this._getElementFontName(element)
    if (this._isShapingReady(fontName)) {
      const fontSize = this._getElementFontSize(element)
      const engine = ShapeEngine.getInstance()
      const shapedWidth = engine.getShapedWidth(
        element.value,
        fontName,
        fontSize
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
    // Track font name for ShapeEngine rendering
    const fontName = this._getElementFontName(element)
    // 兼容模式立即绘制
    if (this.options.renderMode === RenderMode.COMPATIBILITY) {
      this._setCurXY(x, y)
      this.text = element.value
      this.curStyle = element.style
      this.curColor = element.color
      this.curFont = fontName
      this.complete()
      return
    }
    // 主动完成的重设起始点
    if (!this.text) {
      this._setCurXY(x, y)
    }
    // 样式发生改变
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
    this.curFont = fontName
  }

  private _setCurXY(x: number, y: number) {
    this.curX = x
    this.curY = y
  }

  private _render() {
    if (!this.text || !~this.curX || !~this.curX) return
    this.ctx.save()
    this.ctx.font = this.curStyle
    const color = this.curColor || this.options.defaultColor

    // Try ShapeEngine rendering
    const fontName = this.curFont || this.options.defaultFont
    if (this._isShapingReady(fontName)) {
      const engine = ShapeEngine.getInstance()
      // Extract font size from curStyle (e.g. "italic bold 16px Microsoft YaHei")
      const fontSize = this._parseFontSize(this.curStyle)
      const result = engine.shapeText(this.text, fontName, fontSize)
      engine.renderGlyphs(
        this.ctx,
        result,
        fontName,
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
