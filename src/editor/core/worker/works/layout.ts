/**
 * Layout Worker
 *
 * Computes row layout from pre-measured elements in a background thread.
 * This keeps the main thread responsive during large document layout.
 *
 * The worker receives elements with pre-computed metrics (from main thread
 * Canvas/HarfBuzz measurement) and performs the row-breaking computation.
 */

// Re-declare enums needed for computation (workers can't import from main)
enum LayoutWorkerMessageType {
  COMPUTE_LAYOUT = 'COMPUTE_LAYOUT',
  LAYOUT_RESULT = 'LAYOUT_RESULT',
  LAYOUT_ERROR = 'LAYOUT_ERROR',
  PING = 'PING',
  PONG = 'PONG'
}

enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  TABLE = 'table',
  HYPERLINK = 'hyperlink',
  SUPERSCRIPT = 'superscript',
  SUBSCRIPT = 'subscript',
  SEPARATOR = 'separator',
  PAGE_BREAK = 'pageBreak',
  CONTROL = 'control',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  LATEX = 'latex',
  TAB = 'tab',
  DATE = 'date',
  BLOCK = 'block',
  TITLE = 'title',
  LIST = 'list',
  LABEL = 'label',
  AREA = 'area'
}

// Interface declarations for worker (simplified subset of main thread types)
interface IWorkerElementMetrics {
  width: number
  height: number
  boundingBoxAscent: number
  boundingBoxDescent: number
}

interface IWorkerElement {
  index: number
  type?: string
  value: string
  metrics: IWorkerElementMetrics
  rowFlex?: string
  rowMargin?: number
  hide?: boolean
  listId?: string
  listType?: number
  listStyle?: number
  listLevel?: number
  listWrap?: boolean
  titleId?: string
  level?: number
  groupIds?: string[]
  controlComponent?: number
  tabWidth?: number
  blockWidth?: number
  blockHeight?: number
  imgDisplay?: number
  isRTL?: boolean
}

interface ILayoutOptions {
  innerWidth: number
  startX: number
  startY: number
  pageHeight: number
  mainOuterHeight: number
  scale: number
  isPagingMode: boolean
  defaultRowMargin: number
  defaultTabWidth: number
  tdPadding?: number[]
  isFromTable?: boolean
  startFromIndex?: number
}

interface IWorkerRow {
  width: number
  height: number
  ascent: number
  rowFlex?: string
  startIndex: number
  isPageBreak?: boolean
  isList?: boolean
  listIndex?: number
  listLevel?: number
  listHierarchy?: number[]
  offsetX?: number
  offsetY?: number
  elementIndices: number[]
  isWidthNotEnough?: boolean
  rowIndex: number
  isSurround?: boolean
  isRTL?: boolean
  bidiLevels?: number[]
  visualOrder?: number[]
  isBidiMixed?: boolean
}

interface IWorkerPageBoundaryState {
  pageNo: number
  lastRowIndex: number
  currentY: number
  currentPageRowCount: number
}

interface ILayoutWorkerRequest {
  type: LayoutWorkerMessageType.COMPUTE_LAYOUT
  requestId: number
  elements: IWorkerElement[]
  options: ILayoutOptions
}

interface ILayoutWorkerResponse {
  type: LayoutWorkerMessageType.LAYOUT_RESULT
  requestId: number
  rows: IWorkerRow[]
  pageBoundaryStates?: IWorkerPageBoundaryState[]
  computeTimeMs: number
}

// ============================================================================
// Row Computation Logic
// ============================================================================

/**
 * Compute row layout from pre-measured elements.
 * This is a simplified version of Draw.computeRowList for worker context.
 *
 * @param elements Pre-measured elements with metrics attached
 * @param options Layout parameters
 * @returns Computed rows
 */
function computeWorkerRows(
  elements: IWorkerElement[],
  options: ILayoutOptions
): {
  rows: IWorkerRow[]
  pageBoundaryStates: IWorkerPageBoundaryState[]
} {
  const {
    innerWidth,
    startY,
    pageHeight,
    // mainOuterHeight used for future surround element support
    scale,
    isPagingMode,
    defaultRowMargin,
    startFromIndex = 0
  } = options

  const rows: IWorkerRow[] = []
  const pageBoundaryStates: IWorkerPageBoundaryState[] = []

  // Available width for content
  const availableWidth = innerWidth * scale

  // Current state
  let currentRowIndex = 0
  let currentY = startY
  let currentPageNo = 0
  let pageRowCount = 0
  let rowWidth = 0
  let rowHeight = 0
  let rowAscent = 0
  let rowElements: number[] = []
  let rowStartIndex = startFromIndex
  let currentRowFlex: string | undefined

  // Process each element
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    const metrics = element.metrics

    // Handle hidden elements
    if (element.hide) {
      rowElements.push(element.index)
      continue
    }

    // Get row margin for this element
    const rowMargin = (element.rowMargin ?? defaultRowMargin) * scale

    // Calculate element contributions
    const elementWidth = metrics.width
    const elementAscent = metrics.boundingBoxAscent + rowMargin
    const elementHeight = rowMargin + metrics.boundingBoxAscent
      + metrics.boundingBoxDescent + rowMargin

    // Check for page break element
    if (element.type === ElementType.PAGE_BREAK) {
      // Finalize current row first if has content
      if (rowElements.length > 0) {
        rows.push({
          width: rowWidth,
          height: rowHeight,
          ascent: rowAscent,
          rowFlex: currentRowFlex,
          startIndex: rowStartIndex,
          elementIndices: rowElements,
          rowIndex: currentRowIndex
        })
        currentRowIndex++
        pageRowCount++
      }

      // Add page break row
      rows.push({
        width: 0,
        height: 0,
        ascent: 0,
        startIndex: element.index,
        isPageBreak: true,
        elementIndices: [element.index],
        rowIndex: currentRowIndex
      })

      // Capture page boundary before moving to next page
      pageBoundaryStates.push({
        pageNo: currentPageNo,
        lastRowIndex: currentRowIndex,
        currentY,
        currentPageRowCount: pageRowCount
      })

      // Start new page
      currentPageNo++
      currentY = startY
      pageRowCount = 0
      currentRowIndex++

      // Reset row state
      rowWidth = 0
      rowHeight = 0
      rowAscent = 0
      rowElements = []
      rowStartIndex = element.index + 1
      currentRowFlex = undefined
      continue
    }

    // Check if element fits in current row
    const wouldOverflow = rowWidth + elementWidth > availableWidth
      && rowElements.length > 0

    if (wouldOverflow) {
      // Finalize current row
      rows.push({
        width: rowWidth,
        height: rowHeight,
        ascent: rowAscent,
        rowFlex: currentRowFlex,
        startIndex: rowStartIndex,
        elementIndices: rowElements,
        rowIndex: currentRowIndex,
        isWidthNotEnough: rowWidth > availableWidth
      })

      currentRowIndex++
      pageRowCount++

      // Update Y position
      currentY += rowHeight

      // Check for page break in paging mode
      if (isPagingMode && currentY + elementHeight > pageHeight) {
        // Capture page boundary
        pageBoundaryStates.push({
          pageNo: currentPageNo,
          lastRowIndex: currentRowIndex - 1,
          currentY,
          currentPageRowCount: pageRowCount
        })

        // Start new page
        currentPageNo++
        currentY = startY
        pageRowCount = 0
      }

      // Start new row
      rowWidth = 0
      rowHeight = 0
      rowAscent = 0
      rowElements = []
      rowStartIndex = element.index
      currentRowFlex = element.rowFlex
    }

    // Add element to current row
    rowElements.push(element.index)
    rowWidth += elementWidth
    rowHeight = Math.max(rowHeight, elementHeight)
    rowAscent = Math.max(rowAscent, elementAscent)

    // Track row flex (first non-undefined wins)
    if (!currentRowFlex && element.rowFlex) {
      currentRowFlex = element.rowFlex
    }
  }

  // Finalize last row if has content
  if (rowElements.length > 0) {
    rows.push({
      width: rowWidth,
      height: rowHeight,
      ascent: rowAscent,
      rowFlex: currentRowFlex,
      startIndex: rowStartIndex,
      elementIndices: rowElements,
      rowIndex: currentRowIndex
    })
  }

  return { rows, pageBoundaryStates }
}

// ============================================================================
// Worker Message Handler
// ============================================================================

onmessage = (evt: MessageEvent) => {
  const message = evt.data

  // Handle ping for health check
  if (message.type === LayoutWorkerMessageType.PING) {
    postMessage({ type: LayoutWorkerMessageType.PONG })
    return
  }

  // Handle layout computation request
  if (message.type === LayoutWorkerMessageType.COMPUTE_LAYOUT) {
    const request = message as ILayoutWorkerRequest
    const startTime = performance.now()

    try {
      const { rows, pageBoundaryStates } = computeWorkerRows(
        request.elements,
        request.options
      )

      const computeTimeMs = performance.now() - startTime

      const response: ILayoutWorkerResponse = {
        type: LayoutWorkerMessageType.LAYOUT_RESULT,
        requestId: request.requestId,
        rows,
        pageBoundaryStates,
        computeTimeMs
      }

      postMessage(response)
    } catch (error) {
      postMessage({
        type: LayoutWorkerMessageType.LAYOUT_ERROR,
        requestId: request.requestId,
        error: String(error)
      })
    }
    return
  }

  // Unknown message type
  console.warn('[LayoutWorker] Unknown message type:', message.type)
}
