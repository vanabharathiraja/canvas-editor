import { IRowElement } from '../../../interface/Row'
import { Draw } from '../Draw'

export class SuperscriptParticle {
  private draw: Draw

  constructor(draw: Draw) {
    this.draw = draw
  }

  // 向上偏移字高的一半
  public getOffsetY(element: IRowElement): number {
    return -element.metrics.height / 2
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number
  ) {
    ctx.save()
    ctx.font = element.style
    this.draw.getTextParticle().renderText(
      ctx,
      element,
      x,
      y + this.getOffsetY(element),
      element.color
    )
    ctx.restore()
  }
}
