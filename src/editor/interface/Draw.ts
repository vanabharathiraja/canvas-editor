import { ImageDisplay } from '../dataset/enum/Common'
import { EditorMode, EditorZone } from '../dataset/enum/Editor'
import { IElement, IElementPosition } from './Element'
import { IRow } from './Row'

export interface IDrawOption {
  curIndex?: number
  isSetCursor?: boolean
  isSubmitHistory?: boolean
  isCompute?: boolean
  isLazy?: boolean
  isInit?: boolean
  isSourceHistory?: boolean
  isFirstRender?: boolean
  /** Set by _scheduleFullLayout to prevent bounded layout from re-activating
   * during the idle cleanup render, which would cause an infinite loop. */
  isIdleFullLayout?: boolean
}

export interface IForceUpdateOption {
  isSubmitHistory?: boolean
}

export interface IDrawImagePayload {
  id?: string
  conceptId?: string
  width: number
  height: number
  value: string
  imgDisplay?: ImageDisplay
  extension?: unknown
}

export interface IDrawRowPayload {
  elementList: IElement[]
  positionList: IElementPosition[]
  rowList: IRow[]
  pageNo: number
  startIndex: number
  innerWidth: number
  zone?: EditorZone
  isDrawLineBreak?: boolean
  isDrawWhiteSpace?: boolean
}

export interface IDrawFloatPayload {
  pageNo: number
  imgDisplays: ImageDisplay[]
}

export interface IDrawPagePayload {
  elementList: IElement[]
  positionList: IElementPosition[]
  rowList: IRow[]
  pageNo: number
}

export interface IPainterOption {
  isDblclick: boolean
}

export interface IGetValueOption {
  pageNo?: number
  extraPickAttrs?: Array<keyof IElement>
}

export type IGetOriginValueOption = Omit<IGetValueOption, 'extraPickAttrs'>

export interface IAppendElementListOption {
  isPrepend?: boolean
  isSubmitHistory?: boolean
}

export interface IGetImageOption {
  pixelRatio?: number
  mode?: EditorMode
}

/**
 * Captured layout state at a page boundary.
 * Used to resume computeRowList from a mid-point during incremental layout.
 */
export interface IPageBoundaryState {
  pageNo: number
  listId?: string
  prevListLevel?: number
  listHierarchy: number[]
  controlRealWidth: number
}

export interface IComputeRowListPayload {
  innerWidth: number
  elementList: IElement[]
  startX?: number
  startY?: number
  isFromTable?: boolean
  isPagingMode?: boolean
  pageHeight?: number
  mainOuterHeight?: number
  surroundElementList?: IElement[]
  // --- Incremental layout parameters ---
  // When provided, skip elements before this index and seed the
  // rowList with initialRows + an empty starter row. The main loop
  // begins at startFromIndex using state from initialLayoutState.
  startFromIndex?: number
  initialLayoutState?: IPageBoundaryState
  initialRows?: IRow[]
  // When set, stop computing new pages after this page number.
  // Used by bounded visible layout (Plan B.3) to limit layout
  // to visible pages ± buffer during rapid typing.
  stopAtPage?: number
}
