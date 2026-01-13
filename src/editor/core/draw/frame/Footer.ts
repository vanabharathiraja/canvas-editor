import { maxHeightRadioMapping } from '../../../dataset/constant/Common'
import { BackgroundSize } from '../../../dataset/enum/Background'
import { EditorZone } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import {
  HeaderBackgroundPosition,
  HeaderBackgroundVerticalPosition,
  IHeaderBackground
} from '../../../interface/header/HeaderBackground'
import { IRow } from '../../../interface/Row'
import { Position } from '../../position/Position'
import { Zone } from '../../zone/Zone'
import { Draw } from '../Draw'

export class Footer {
  private draw: Draw
  private position: Position
  private zone: Zone
  private options: DeepRequired<IEditorOption>
  private imageCache: Map<string, HTMLImageElement>

  private elementList: IElement[]
  private rowList: IRow[]
  private positionList: IElementPosition[]

  constructor(draw: Draw, data?: IElement[]) {
    this.draw = draw
    this.position = draw.getPosition()
    this.zone = draw.getZone()
    this.options = draw.getOptions()
    this.imageCache = new Map()

    this.elementList = data || []
    this.rowList = []
    this.positionList = []
  }

  public getRowList(): IRow[] {
    return this.rowList
  }

  public setElementList(elementList: IElement[]) {
    this.elementList = elementList
  }

  public getElementList(): IElement[] {
    return this.elementList
  }

  public getPositionList(): IElementPosition[] {
    return this.positionList
  }

  public compute() {
    this.recovery()
    this._computeRowList()
    this._computePositionList()
  }

  public recovery() {
    this.rowList = []
    this.positionList = []
  }

  // Check if footer uses full-width background
  public isFullWidth(): boolean {
    return this.options.footer.fullWidth
  }

  // Get content width based on options
  private _getContentWidth(): number {
    const { fullWidth, contentFullWidth } = this.options.footer
    // Content is full-width only if both flags are true
    if (fullWidth && contentFullWidth) {
      return this.draw.getWidth()
    }
    return this.draw.getInnerWidth()
  }

  // Get content start X based on options
  private _getContentStartX(): number {
    const { fullWidth, contentFullWidth } = this.options.footer
    // Content starts at 0 only if both flags are true
    if (fullWidth && contentFullWidth) {
      return 0
    }
    const margins = this.draw.getMargins()
    return margins[3]
  }

  private _computeRowList() {
    const innerWidth = this._getContentWidth()
    this.rowList = this.draw.computeRowList({
      innerWidth,
      elementList: this.elementList
    })
  }

  private _computePositionList() {
    const footerBottom = this.getFooterBottom()
    const innerWidth = this._getContentWidth()
    const startX = this._getContentStartX()
    // 页面高度 - 页脚顶部距离页面底部高度
    const pageHeight = this.draw.getHeight()
    const footerHeight = this.getHeight()
    const startY = pageHeight - footerBottom - footerHeight
    this.position.computePageRowPosition({
      positionList: this.positionList,
      rowList: this.rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY,
      innerWidth,
      zone: EditorZone.FOOTER
    })
  }

  public getFooterBottom(): number {
    const {
      footer: { bottom, disabled },
      scale
    } = this.options
    if (disabled) return 0
    return Math.floor(bottom * scale)
  }

  public getMaxHeight(): number {
    const {
      footer: { maxHeightRadio }
    } = this.options
    const height = this.draw.getHeight()
    return Math.floor(height * maxHeightRadioMapping[maxHeightRadio])
  }

  public getHeight(): number {
    if (this.options.footer.disabled) return 0
    const maxHeight = this.getMaxHeight()
    const rowHeight = this.getRowHeight()
    return rowHeight > maxHeight ? maxHeight : rowHeight
  }

  public getRowHeight(): number {
    return this.rowList.reduce((pre, cur) => pre + cur.height, 0)
  }

  public getExtraHeight(): number {
    // 页脚下边距 + 实际高 - 页面上边距
    const margins = this.draw.getMargins()
    const footerHeight = this.getHeight()
    const footerBottom = this.getFooterBottom()
    const extraHeight = footerBottom + footerHeight - margins[2]
    return extraHeight <= 0 ? 0 : extraHeight
  }

  public getBackground(): IHeaderBackground {
    return this.options.footer.background
  }

  public setBackground(background: IHeaderBackground) {
    Object.assign(this.options.footer.background, background)
  }

  private _getBackgroundArea(): {
    x: number
    y: number
    width: number
    height: number
  } {
    const { fullWidth } = this.options.footer
    const { scale } = this.options
    const margins = this.draw.getMargins()
    const pageHeight = this.draw.getHeight()
    const footerBottom = this.getFooterBottom()
    const footerHeight = this.getHeight()

    if (fullWidth) {
      // Full-width: from edge to edge, from margin bottom to page bottom
      return {
        x: 0,
        y: (pageHeight - margins[2]) * scale,
        width: this.draw.getWidth() * scale,
        height: margins[2] * scale
      }
    } else {
      // Standard: within margins
      const startY = pageHeight - footerBottom - footerHeight
      return {
        x: margins[3] * scale,
        y: startY * scale,
        width: this.draw.getInnerWidth() * scale,
        height: footerHeight * scale
      }
    }
  }

  private _calculateImagePosition(
    imageWidth: number,
    imageHeight: number,
    areaWidth: number,
    areaHeight: number,
    background: IHeaderBackground
  ): { x: number; y: number; width: number; height: number } {
    const { size, positionX, positionY, width, height } = background
    let drawWidth = imageWidth
    let drawHeight = imageHeight

    // Calculate dimensions based on size mode
    if (size === BackgroundSize.COVER) {
      const scaleX = areaWidth / imageWidth
      const scaleY = areaHeight / imageHeight
      const scale = Math.max(scaleX, scaleY)
      drawWidth = imageWidth * scale
      drawHeight = imageHeight * scale
    } else if (size === BackgroundSize.CONTAIN) {
      const scaleX = areaWidth / imageWidth
      const scaleY = areaHeight / imageHeight
      const scale = Math.min(scaleX, scaleY)
      drawWidth = imageWidth * scale
      drawHeight = imageHeight * scale
    } else if (width && height) {
      // Custom dimensions
      drawWidth = width * this.options.scale
      drawHeight = height * this.options.scale
    }

    // Calculate X position
    let x = 0
    if (typeof positionX === 'number') {
      x = positionX * this.options.scale
    } else {
      switch (positionX) {
        case HeaderBackgroundPosition.LEFT:
          x = 0
          break
        case HeaderBackgroundPosition.CENTER:
          x = (areaWidth - drawWidth) / 2
          break
        case HeaderBackgroundPosition.RIGHT:
          x = areaWidth - drawWidth
          break
      }
    }

    // Calculate Y position
    let y = 0
    if (typeof positionY === 'number') {
      y = positionY * this.options.scale
    } else {
      switch (positionY) {
        case HeaderBackgroundVerticalPosition.TOP:
          y = 0
          break
        case HeaderBackgroundVerticalPosition.MIDDLE:
          y = (areaHeight - drawHeight) / 2
          break
        case HeaderBackgroundVerticalPosition.BOTTOM:
          y = areaHeight - drawHeight
          break
      }
    }

    return { x, y, width: drawWidth, height: drawHeight }
  }

  private _renderBackgroundColor(
    ctx: CanvasRenderingContext2D,
    color: string,
    area: { x: number; y: number; width: number; height: number }
  ) {
    ctx.save()
    ctx.fillStyle = color
    ctx.fillRect(area.x, area.y, area.width, area.height)
    ctx.restore()
  }

  private _renderBackgroundImage(
    ctx: CanvasRenderingContext2D,
    area: { x: number; y: number; width: number; height: number }
  ) {
    const background = this.options.footer.background
    const cachedImage = this.imageCache.get(background.image)

    if (cachedImage) {
      this._drawBackgroundImage(ctx, cachedImage, area, background)
    } else {
      const img = new Image()
      img.setAttribute('crossOrigin', 'Anonymous')
      img.src = background.image
      img.onload = () => {
        this.imageCache.set(background.image, img)
        this._drawBackgroundImage(ctx, img, area, background)
        // Trigger re-render
        this.draw.render({
          isCompute: false,
          isSubmitHistory: false
        })
      }
    }
  }

  private _drawBackgroundImage(
    ctx: CanvasRenderingContext2D,
    imageElement: HTMLImageElement,
    area: { x: number; y: number; width: number; height: number },
    background: IHeaderBackground
  ) {
    const pos = this._calculateImagePosition(
      imageElement.width,
      imageElement.height,
      area.width,
      area.height,
      background
    )

    ctx.save()
    // Set opacity
    if (background.opacity !== undefined && background.opacity < 1) {
      ctx.globalAlpha = background.opacity
    }
    // Clip to area
    ctx.beginPath()
    ctx.rect(area.x, area.y, area.width, area.height)
    ctx.clip()
    // Draw image
    ctx.drawImage(
      imageElement,
      area.x + pos.x,
      area.y + pos.y,
      pos.width,
      pos.height
    )
    ctx.restore()
  }

  public renderBackground(ctx: CanvasRenderingContext2D) {
    const background = this.options.footer.background
    const area = this._getBackgroundArea()

    // Render background color first
    if (background.color) {
      this._renderBackgroundColor(ctx, background.color, area)
    }

    // Render background image on top
    if (background.image) {
      this._renderBackgroundImage(ctx, area)
    }
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    ctx.save()
    ctx.globalAlpha = this.zone.isFooterActive()
      ? 1
      : this.options.footer.inactiveAlpha
    const innerWidth = this._getContentWidth()
    const maxHeight = this.getMaxHeight()
    // 超出最大高度不渲染
    const rowList: IRow[] = []
    let curRowHeight = 0
    for (let r = 0; r < this.rowList.length; r++) {
      const row = this.rowList[r]
      if (curRowHeight + row.height > maxHeight) {
        break
      }
      rowList.push(row)
      curRowHeight += row.height
    }
    this.draw.drawRow(ctx, {
      elementList: this.elementList,
      positionList: this.positionList,
      rowList,
      pageNo,
      startIndex: 0,
      innerWidth,
      zone: EditorZone.FOOTER
    })
    ctx.restore()
  }
}
