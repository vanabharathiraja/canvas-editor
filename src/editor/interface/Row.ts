import { RowFlex } from '../dataset/enum/Row'
import { IElement, IElementMetrics } from './Element'

export type IRowElement = IElement & {
  metrics: IElementMetrics
  style: string
  left?: number
}

export interface IRow {
  width: number
  height: number
  ascent: number
  rowFlex?: RowFlex
  startIndex: number
  isPageBreak?: boolean
  isList?: boolean
  listIndex?: number
  listLevel?: number
  listHierarchy?: number[]
  offsetX?: number
  offsetY?: number
  elementList: IRowElement[]
  isWidthNotEnough?: boolean
  rowIndex: number
  isSurround?: boolean
  isRTL?: boolean
  /** Per-element UAX#9 embedding levels (odd = RTL, even = LTR) */
  bidiLevels?: number[]
  /**
   * Visual order mapping: visualOrder[visualPos] = logicalElementIndex.
   * Used by computePageRowPosition to assign x coords in visual order.
   * Only present when the row has mixed LTR/RTL content.
   */
  visualOrder?: number[]
  /** Whether the row contains mixed LTR/RTL directions */
  isBidiMixed?: boolean
}
