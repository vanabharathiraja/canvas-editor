import { BackgroundRepeat, BackgroundSize } from '../../dataset/enum/Background'

export enum HeaderBackgroundPosition {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

export enum HeaderBackgroundVerticalPosition {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom'
}

export interface IHeaderBackground {
  color?: string
  image?: string
  size?: BackgroundSize
  repeat?: BackgroundRepeat
  width?: number // Custom width in pixels (when size is not cover/contain)
  height?: number // Custom height in pixels
  positionX?: HeaderBackgroundPosition | number // Horizontal position or offset
  positionY?: HeaderBackgroundVerticalPosition | number // Vertical position or offset
  opacity?: number // 0-1
}
