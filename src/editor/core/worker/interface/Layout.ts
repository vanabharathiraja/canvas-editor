/**
 * Layout Worker Message Protocol
 *
 * This defines the message types exchanged between the main thread
 * and the layout Web Worker for async layout computation.
 */

import { RowFlex } from '../../../dataset/enum/Row'
import { ElementType } from '../../../dataset/enum/Element'

// ============================================================================
// Worker Element Types (serializable subset of IElement)
// ============================================================================

/**
 * Pre-computed metrics attached to elements before sending to worker.
 * Main thread computes these using Canvas/HarfBuzz, then serializes to worker.
 */
export interface IWorkerElementMetrics {
  width: number
  height: number
  boundingBoxAscent: number
  boundingBoxDescent: number
}

/**
 * Serializable element data for worker.
 * Contains only the fields needed for row computation.
 */
export interface IWorkerElement {
  /** Original index in the elementList (for mapping back) */
  index: number
  /** Element type */
  type?: ElementType
  /** Element value (text content) */
  value: string
  /** Pre-computed metrics from main thread */
  metrics: IWorkerElementMetrics
  /** Row flex alignment */
  rowFlex?: RowFlex
  /** Row margin override */
  rowMargin?: number
  /** Whether element is hidden */
  hide?: boolean
  /** List-related fields */
  listId?: string
  listType?: number
  listStyle?: number
  listLevel?: number
  listWrap?: boolean
  /** Title-related fields */
  titleId?: string
  level?: number
  /** Grouping */
  groupIds?: string[]
  /** Control component type */
  controlComponent?: number
  /** Tab width (for TAB elements) */
  tabWidth?: number
  /** Block dimensions */
  blockWidth?: number
  blockHeight?: number
  /** Image display mode */
  imgDisplay?: number
  /** RTL direction marker */
  isRTL?: boolean
}

// ============================================================================
// Worker Request Message
// ============================================================================

export enum LayoutWorkerMessageType {
  COMPUTE_LAYOUT = 'COMPUTE_LAYOUT',
  LAYOUT_RESULT = 'LAYOUT_RESULT',
  LAYOUT_ERROR = 'LAYOUT_ERROR',
  PING = 'PING',
  PONG = 'PONG'
}

/**
 * Layout computation request sent to worker.
 */
export interface ILayoutWorkerRequest {
  type: LayoutWorkerMessageType.COMPUTE_LAYOUT
  /** Unique ID for this layout request (for version tracking) */
  requestId: number
  /** Elements with pre-computed metrics */
  elements: IWorkerElement[]
  /** Layout parameters */
  options: ILayoutOptions
}

/**
 * Layout options needed for row computation.
 */
export interface ILayoutOptions {
  /** Available width for content */
  innerWidth: number
  /** Starting X position */
  startX: number
  /** Starting Y position */
  startY: number
  /** Page height (for page break detection) */
  pageHeight: number
  /** Main content outer height */
  mainOuterHeight: number
  /** Scale factor */
  scale: number
  /** Whether in paging mode */
  isPagingMode: boolean
  /** Default row margin */
  defaultRowMargin: number
  /** Default tab width */
  defaultTabWidth: number
  /** Table padding (if from table) */
  tdPadding?: number[]
  /** Whether computing table layout */
  isFromTable?: boolean
  /** Start element index (for incremental) */
  startFromIndex?: number
}

// ============================================================================
// Worker Response Message
// ============================================================================

/**
 * Computed row data returned from worker.
 * Uses element indices instead of full element objects.
 */
export interface IWorkerRow {
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
  /** Indices into the elements array (not actual elements) */
  elementIndices: number[]
  isWidthNotEnough?: boolean
  rowIndex: number
  isSurround?: boolean
  isRTL?: boolean
  bidiLevels?: number[]
  visualOrder?: number[]
  isBidiMixed?: boolean
}

/**
 * Layout computation result returned from worker.
 */
export interface ILayoutWorkerResponse {
  type: LayoutWorkerMessageType.LAYOUT_RESULT
  /** Matching requestId from the request */
  requestId: number
  /** Computed rows */
  rows: IWorkerRow[]
  /** Page boundary states for incremental mode */
  pageBoundaryStates?: IWorkerPageBoundaryState[]
  /** Time taken for computation (ms) */
  computeTimeMs: number
}

/**
 * Page boundary state for incremental mode.
 */
export interface IWorkerPageBoundaryState {
  pageNo: number
  lastRowIndex: number
  currentY: number
  currentPageRowCount: number
}

/**
 * Error response from worker.
 */
export interface ILayoutWorkerError {
  type: LayoutWorkerMessageType.LAYOUT_ERROR
  requestId: number
  error: string
}

/**
 * Ping/pong for worker health check.
 */
export interface ILayoutWorkerPing {
  type: LayoutWorkerMessageType.PING
}

export interface ILayoutWorkerPong {
  type: LayoutWorkerMessageType.PONG
}

/**
 * Union type for all messages to worker.
 */
export type LayoutWorkerInMessage =
  | ILayoutWorkerRequest
  | ILayoutWorkerPing

/**
 * Union type for all messages from worker.
 */
export type LayoutWorkerOutMessage =
  | ILayoutWorkerResponse
  | ILayoutWorkerError
  | ILayoutWorkerPong
