import { RowFlex } from '../dataset/enum/Row'
import { IElement, IElementMetrics } from './Element'
import { IBidiRun } from '../core/draw/bidi/BidiManager'

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
  bidiRuns?: IBidiRun[] // Logical order bidi runs
  visualBidiRuns?: IBidiRun[] // Visual order bidi runs (for rendering)
}
