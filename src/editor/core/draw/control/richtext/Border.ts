import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElementFillRect } from '../../../../interface/Element'
import { Draw } from '../../Draw'

export class ControlBorder {
  protected borderRect: IElementFillRect
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.borderRect = this.clearBorderInfo()
    this.options = draw.getOptions()
  }

  public clearBorderInfo() {
    this.borderRect = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    return this.borderRect
  }

  public recordBorderInfo(x: number, y: number, width: number, height: number) {
    const isFirstRecord = !this.borderRect.width
    if (isFirstRecord) {
      this.borderRect.x = x
      this.borderRect.y = y
      this.borderRect.height = height
      this.borderRect.width = width
    } else {
      // Track visual extent: expand to cover min-x to max-(x+width)
      // This handles BiDi rows where elements may not be visually contiguous
      const curRight = this.borderRect.x + this.borderRect.width
      const newRight = x + width
      const minX = Math.min(this.borderRect.x, x)
      const maxRight = Math.max(curRight, newRight)
      this.borderRect.x = minX
      this.borderRect.width = maxRight - minX
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.borderRect.width) return
    const {
      scale,
      control: { borderWidth, borderColor }
    } = this.options
    const { x, y, width, height } = this.borderRect
    ctx.save()
    ctx.translate(0, 1 * scale)
    ctx.lineWidth = borderWidth * scale
    ctx.strokeStyle = borderColor
    ctx.beginPath()
    ctx.rect(x, y, width, height)
    ctx.stroke()
    ctx.restore()
    this.clearBorderInfo()
  }
}
