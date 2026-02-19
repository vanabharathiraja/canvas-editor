import { ElementType, IElement, TableBorder } from '../../../..'
import {
  TdBorder,
  TdBorderStyle,
  TdSlash
} from '../../../../dataset/enum/table/Table'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { ITd } from '../../../../interface/table/Td'
import { ITr } from '../../../../interface/table/Tr'
import { deepClone } from '../../../../utils'
import { detectDirection } from '../../../../utils/unicode'
import { RangeManager } from '../../../range/RangeManager'
import { Draw } from '../../Draw'

export class TableParticle {
  private draw: Draw
  private range: RangeManager
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.options = draw.getOptions()
  }

  public getTrListGroupByCol(payload: ITr[]): ITr[] {
    const trList = deepClone(payload)
    for (let t = 0; t < payload.length; t++) {
      const tr = trList[t]
      for (let d = tr.tdList.length - 1; d >= 0; d--) {
        const td = tr.tdList[d]
        const { rowspan, rowIndex, colIndex } = td
        const curRowIndex = rowIndex! + rowspan - 1
        if (curRowIndex !== d) {
          const changeTd = tr.tdList.splice(d, 1)[0]
          trList[curRowIndex]?.tdList.splice(colIndex!, 0, changeTd)
        }
      }
    }
    return trList
  }

  public getRangeRowCol(): ITd[][] | null {
    const { isTable, index, trIndex, tdIndex } = this.draw
      .getPosition()
      .getPositionContext()
    if (!isTable) return null
    const {
      isCrossRowCol,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    } = this.range.getRange()
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    if (!element || !element.trList) return null
    // For paged tables, the range's startTrIndex/endTrIndex are relative
    // to the full recombined table, but the element at positionContext.index
    // is only one fragment (truncated trList).  Reconstruct the full trList
    // from all fragments sharing the same pagingId.
    let curTrList = element.trList
    if (element.pagingId && isCrossRowCol) {
      curTrList = []
      for (let e = 0; e < originalElementList.length; e++) {
        const el = originalElementList[e]
        if (
          el.id === element.id ||
          (el.pagingId && el.pagingId === element.pagingId)
        ) {
          if (curTrList.length === 0) {
            // First fragment: include all rows
            curTrList.push(...(el.trList || []))
          } else {
            // Continuation: exclude repeat header rows
            const contRows = (el.trList || []).filter(
              tr => !tr.pagingRepeat
            )
            curTrList.push(...contRows)
          }
        }
      }
    }
    // 非跨列直接返回光标所在单元格
    if (!isCrossRowCol) {
      if (!curTrList[trIndex!] || !curTrList[trIndex!].tdList) return null
      if (!curTrList[trIndex!].tdList[tdIndex!]) return null
      return [[curTrList[trIndex!].tdList[tdIndex!]]]
    }
    if (!curTrList[startTrIndex!] || !curTrList[startTrIndex!].tdList) return null
    if (!curTrList[endTrIndex!] || !curTrList[endTrIndex!].tdList) return null
    if (!curTrList[startTrIndex!].tdList[startTdIndex!]) return null
    if (!curTrList[endTrIndex!].tdList[endTdIndex!]) return null
    const startTd = curTrList[startTrIndex!].tdList[startTdIndex!]
    const endTd = curTrList[endTrIndex!].tdList[endTdIndex!]
    // Normalize col/row ranges with min/max (handles RTL where x-swap
    // inverts col index order)
    const col1 = startTd.colIndex!
    const col2 = endTd.colIndex! + (endTd.colspan - 1)
    const startColIndex = Math.min(col1, col2)
    const endColIndex = Math.max(col1, col2)
    const row1 = startTd.rowIndex!
    const row2 = endTd.rowIndex! + (endTd.rowspan - 1)
    const startRowIndex = Math.min(row1, row2)
    const endRowIndex = Math.max(row1, row2)
    // 选区行列
    const rowCol: ITd[][] = []
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      if (!tr || !tr.tdList) continue
      const tdList: ITd[] = []
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (!td) continue
        const tdColIndex = td.colIndex!
        const tdRowIndex = td.rowIndex!
        if (
          tdColIndex >= startColIndex &&
          tdColIndex <= endColIndex &&
          tdRowIndex >= startRowIndex &&
          tdRowIndex <= endRowIndex
        ) {
          tdList.push(td)
        }
      }
      if (tdList.length) {
        rowCol.push(tdList)
      }
    }
    return rowCol.length ? rowCol : null
  }

  private _applyLineDash(
    ctx: CanvasRenderingContext2D,
    style: TdBorderStyle,
    scale: number
  ) {
    switch (style) {
      case TdBorderStyle.DASHED:
        ctx.setLineDash([3 * scale, 3 * scale])
        break
      case TdBorderStyle.DOTTED:
        ctx.setLineDash([1 * scale, 2 * scale])
        break
      case TdBorderStyle.DOUBLE:
      case TdBorderStyle.SOLID:
      default:
        ctx.setLineDash([])
        break
    }
  }

  private _drawSlash(
    ctx: CanvasRenderingContext2D,
    td: ITd,
    startX: number,
    startY: number
  ) {
    const { scale } = this.options
    ctx.save()
    const width = td.width! * scale
    const height = td.height! * scale
    const x = Math.round(td.x! * scale + startX)
    const y = Math.round(td.y! * scale + startY)
    // 正斜线 /
    if (td.slashTypes?.includes(TdSlash.FORWARD)) {
      ctx.moveTo(x + width, y)
      ctx.lineTo(x, y + height)
    }
    // 反斜线 \
    if (td.slashTypes?.includes(TdSlash.BACK)) {
      ctx.moveTo(x, y)
      ctx.lineTo(x + width, y + height)
    }
    ctx.stroke()
    ctx.restore()
  }

  /**
   * Build a lookup map of per-cell border overrides keyed by
   * "rowIndex,colIndex" for O(1) neighbor lookups.
   */
  private _buildOverrideMap(trList: ITr[]): Map<string, ITd> {
    const map = new Map<string, ITd>()
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (
          td.borderColor !== undefined ||
          td.borderWidth !== undefined ||
          td.borderStyle !== undefined
        ) {
          // Register all cell positions covered by this td (for merged cells)
          for (let r = 0; r < td.rowspan; r++) {
            for (let c = 0; c < td.colspan; c++) {
              map.set(`${td.rowIndex! + r},${td.colIndex! + c}`, td)
            }
          }
        }
      }
    }
    return map
  }

  /**
   * Resolve the effective border style for one edge of a cell.
   * Shared edges between two cells follow a "last applied wins"
   * precedence model: if the cell has an override for that edge the
   * cell's style wins; otherwise the neighbor that shares the edge
   * is consulted; finally the table-level style is used as fallback.
   *
   * Returns null when the edge should NOT be drawn (width=0 with no
   * neighbor override wanting to draw).
   */
  private _resolveEdgeStyle(
    td: ITd,
    edge: 'top' | 'right' | 'bottom' | 'left',
    overrideMap: Map<string, ITd>,
    tableBorderColor: string,
    tableBorderWidth: number,
    tableBorderStyle: TdBorderStyle | undefined,
    colCount: number,
    rowCount: number
  ): {
    color: string
    width: number
    style: TdBorderStyle
  } | null {
    const hasSelfOverride =
      td.borderColor !== undefined ||
      td.borderWidth !== undefined ||
      td.borderStyle !== undefined

    // If the cell specifies which borders to draw (borderTypes),
    // suppress edges not in the list. Maps edge name to TdBorder value.
    if (td.borderTypes?.length) {
      const edgeToBorder: Record<string, TdBorder> = {
        top: TdBorder.TOP,
        right: TdBorder.RIGHT,
        bottom: TdBorder.BOTTOM,
        left: TdBorder.LEFT
      }
      if (!td.borderTypes.includes(edgeToBorder[edge])) {
        return null
      }
    }

    // Find the neighbor that shares this edge
    let neighborKey: string | null = null
    if (edge === 'top' && td.rowIndex! > 0) {
      neighborKey = `${td.rowIndex! - 1},${td.colIndex!}`
    } else if (edge === 'bottom' && td.rowIndex! + td.rowspan < rowCount) {
      neighborKey = `${td.rowIndex! + td.rowspan},${td.colIndex!}`
    } else if (edge === 'left' && td.colIndex! > 0) {
      neighborKey = `${td.rowIndex!},${td.colIndex! - 1}`
    } else if (edge === 'right' && td.colIndex! + td.colspan < colCount) {
      neighborKey = `${td.rowIndex!},${td.colIndex! + td.colspan}`
    }
    const neighbor = neighborKey ? overrideMap.get(neighborKey) : undefined

    // Determine which source to use for this edge:
    // Priority: self override > neighbor override > table-level
    let source: 'self' | 'neighbor' | 'table' = 'table'
    if (hasSelfOverride) {
      source = 'self'
    } else if (neighbor) {
      source = 'neighbor'
    }

    let color: string
    let width: number
    let style: TdBorderStyle

    if (source === 'self') {
      color = td.borderColor ?? tableBorderColor
      width = td.borderWidth ?? tableBorderWidth
      style = td.borderStyle ?? tableBorderStyle ?? TdBorderStyle.SOLID
    } else if (source === 'neighbor') {
      color = neighbor!.borderColor ?? tableBorderColor
      width = neighbor!.borderWidth ?? tableBorderWidth
      style = neighbor!.borderStyle ?? tableBorderStyle ?? TdBorderStyle.SOLID
    } else {
      color = tableBorderColor
      width = tableBorderWidth
      style = tableBorderStyle ?? TdBorderStyle.SOLID
    }

    // width=0 means "no border on this edge"
    if (width <= 0) return null

    return { color, width, style }
  }

  private _drawBorder(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
  ) {
    const {
      colgroup,
      trList,
      borderType,
      borderColor,
      borderWidth = 1,
      borderExternalWidth
    } = element
    if (!colgroup || !trList) return
    const {
      scale,
      table: { defaultBorderColor }
    } = this.options
    const tableBorderColor = borderColor || defaultBorderColor
    const tableBorderStyle = borderType === TableBorder.DASH
      ? TdBorderStyle.DASHED
      : undefined

    // 无边框
    const isEmptyBorderType = borderType === TableBorder.EMPTY
    // 仅外边框
    const isExternalBorderType = borderType === TableBorder.EXTERNAL
    // 内边框
    const isInternalBorderType = borderType === TableBorder.INTERNAL

    // Build override lookup for shared-edge resolution
    const overrideMap = this._buildOverrideMap(trList)
    const colCount = colgroup.length
    const rowCount = trList.length
    // RTL tables have mirrored column positions — colIndex=0 is at
    // the visual right edge, colIndex=N-1 at the left.
    const isRTL = this.isTableRTL(element)

    ctx.save()

    // Helper: draw a single line segment
    const drawLine = (
      x1: number, y1: number,
      x2: number, y2: number
    ) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    // --- Precompute consistent row-Y grid positions ---
    // Row heights are the same regardless of LTR/RTL, so a
    // cumulative grid for Y is safe and ensures shared horizontal
    // edges get identical coordinates.
    const rawRowY: number[] = [0]
    for (let r = 0; r < trList.length; r++) {
      rawRowY.push(rawRowY[r] + trList[r].height * scale)
    }
    const gridY = rawRowY.map(v => Math.round(v + startY))

    type EdgeStyle = {
      color: string; width: number; style: TdBorderStyle
    }

    // --- Draw slashes (independent of edge logic) ---
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (td.slashTypes?.length) {
          this._drawSlash(ctx, td, startX, startY)
        }
      }
    }

    // --- Unified edge map: collect ALL edges for every cell ---
    // Each physical edge is stored exactly once via deduplication.
    // Override cells' edges take priority over standard grid edges.
    // This eliminates the need for clearRect + redraw phases that
    // caused junction gaps between different border styles.
    const edgeMap = new Map<string, {
      x1: number; y1: number; x2: number; y2: number
      resolved: EdgeStyle; priority: number
    }>()

    const outerBorderWidth = borderExternalWidth || borderWidth
    const defaultGridStyle: TdBorderStyle =
      tableBorderStyle ?? TdBorderStyle.SOLID

    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const ri = td.rowIndex!
        const ci = td.colIndex!
        // Use td.x/td.width directly — these are already mirrored
        // for RTL tables by computeRowColInfo(), so borders align
        // with cell content and backgrounds in both LTR and RTL.
        const cx = Math.round(td.x! * scale + startX)
        const cy = gridY[ri]
        const cx2 = Math.round((td.x! + td.width!) * scale + startX)
        const cy2 = gridY[ri + td.rowspan]

        const hasCellOverride = !!(
          td.borderColor !== undefined ||
          td.borderWidth !== undefined ||
          td.borderStyle !== undefined
        )

        // Determine which edges this cell should contribute
        const edges: Array<{
          edge: 'top' | 'right' | 'bottom' | 'left'
          x1: number; y1: number; x2: number; y2: number
        }> = [
          { edge: 'top', x1: cx, y1: cy, x2: cx2, y2: cy },
          { edge: 'right', x1: cx2, y1: cy, x2: cx2, y2: cy2 },
          { edge: 'bottom', x1: cx, y1: cy2, x2: cx2, y2: cy2 },
          { edge: 'left', x1: cx, y1: cy, x2: cx, y2: cy2 }
        ]

        for (const { edge, x1, y1, x2, y2 } of edges) {
          // In RTL, colIndex=0 is at the visual right and
          // colIndex=N-1 at the visual left, so left/right
          // perimeter tests swap compared to LTR.
          const isPerimeter =
            (edge === 'top' && ri === 0) ||
            (edge === 'bottom' && ri + td.rowspan >= rowCount) ||
            (edge === 'left' && (
              isRTL
                ? ci + td.colspan >= colCount
                : ci === 0
            )) ||
            (edge === 'right' && (
              isRTL
                ? ci === 0
                : ci + td.colspan >= colCount
            ))

          // --- Apply table-level border type rules ---
          if (isEmptyBorderType) {
            // EMPTY: no edges unless cell has individual borderTypes
            if (!hasCellOverride && !td.borderTypes?.length) continue
          }
          if (isExternalBorderType) {
            // EXTERNAL: only perimeter edges, unless cell override
            if (!isPerimeter && !hasCellOverride && !td.borderTypes?.length) {
              continue
            }
          }
          if (isInternalBorderType) {
            // INTERNAL: no perimeter edges, unless cell override
            if (isPerimeter && !hasCellOverride && !td.borderTypes?.length) {
              continue
            }
          }

          // --- borderTypes filter: explicit list of which edges to draw ---
          if (td.borderTypes?.length) {
            const edgeToBorder: Record<string, TdBorder> = {
              top: TdBorder.TOP,
              right: TdBorder.RIGHT,
              bottom: TdBorder.BOTTOM,
              left: TdBorder.LEFT
            }
            if (!td.borderTypes.includes(edgeToBorder[edge])) continue
          }

          // --- Resolve edge style ---
          let edgeStyle: EdgeStyle | null = null
          let priority = 0

          if (hasCellOverride) {
            // Use _resolveEdgeStyle for override cells (handles
            // neighbor precedence and shared-edge logic)
            edgeStyle = this._resolveEdgeStyle(
              td, edge, overrideMap,
              tableBorderColor, borderWidth,
              tableBorderStyle,
              colCount, rowCount
            )
            // Compute priority: more specific overrides win
            if (td.borderColor !== undefined) priority++
            if (td.borderWidth !== undefined) priority++
            if (td.borderStyle !== undefined) priority += 2
          } else {
            // Standard grid: use table-level style with outer border
            // width for perimeter edges
            const w = isPerimeter ? outerBorderWidth : borderWidth
            edgeStyle = {
              color: tableBorderColor,
              width: w,
              style: defaultGridStyle
            }
            priority = -1 // lowest: override cells always win
          }

          if (!edgeStyle) continue

          // Normalize key so shared edges produce the same key
          const nx1 = Math.min(x1, x2)
          const ny1 = Math.min(y1, y2)
          const nx2 = Math.max(x1, x2)
          const ny2 = Math.max(y1, y2)
          const key = `${nx1},${ny1},${nx2},${ny2}`

          const existing = edgeMap.get(key)
          if (!existing || priority >= existing.priority) {
            edgeMap.set(key, {
              x1: nx1, y1: ny1, x2: nx2, y2: ny2,
              resolved: edgeStyle, priority
            })
          }
        }
      }
    }

    // --- Draw all edges in a single pass ---
    // Each physical edge is drawn exactly once, eliminating double
    // borders and junction gaps from clear-then-redraw approaches.
    ctx.translate(0.5, 0.5)
    ctx.save()
    ctx.lineCap = 'square'
    for (const { x1, y1, x2, y2, resolved } of edgeMap.values()) {
      ctx.strokeStyle = resolved.color
      ctx.lineWidth = resolved.width * scale
      this._applyLineDash(ctx, resolved.style, scale)
      drawLine(x1, y1, x2, y2)
    }
    ctx.restore()
    ctx.translate(-0.5, -0.5)

    ctx.restore()
  }

  private _drawBackgroundColor(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
  ) {
    const { trList } = element
    if (!trList) return
    const { scale } = this.options
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (!td.backgroundColor) continue
        ctx.save()
        const width = td.width! * scale
        const height = td.height! * scale
        const x = Math.round(td.x! * scale + startX)
        const y = Math.round(td.y! * scale + startY)
        ctx.fillStyle = td.backgroundColor
        ctx.fillRect(x, y, width, height)
        ctx.restore()
      }
    }
  }

  public getTableWidth(element: IElement): number {
    return element.colgroup!.reduce((pre, cur) => pre + cur.width, 0)
  }

  public getTableHeight(element: IElement): number {
    const trList = element.trList
    if (!trList?.length) return 0
    return this.getTdListByColIndex(trList, 0).reduce(
      (pre, cur) => pre + cur.height!,
      0
    )
  }

  public getRowCountByColIndex(trList: ITr[], colIndex: number): number {
    return this.getTdListByColIndex(trList, colIndex).reduce(
      (pre, cur) => pre + cur.rowspan,
      0
    )
  }

  public getTdListByColIndex(trList: ITr[], colIndex: number): ITd[] {
    const data: ITd[] = []
    for (let r = 0; r < trList.length; r++) {
      const tdList = trList[r].tdList
      for (let d = 0; d < tdList.length; d++) {
        const td = tdList[d]
        const min = td.colIndex!
        const max = min + td.colspan - 1
        if (colIndex >= min && colIndex <= max) {
          data.push(td)
        }
      }
    }
    return data
  }

  public getTdListByRowIndex(trList: ITr[], rowIndex: number) {
    const data: ITd[] = []
    for (let r = 0; r < trList.length; r++) {
      const tdList = trList[r].tdList
      for (let d = 0; d < tdList.length; d++) {
        const td = tdList[d]
        const min = td.rowIndex!
        const max = min + td.rowspan - 1
        if (rowIndex >= min && rowIndex <= max) {
          data.push(td)
        }
      }
    }
    return data
  }

  public computeRowColInfo(element: IElement) {
    const { colgroup, trList } = element
    if (!colgroup || !trList) return
    let preX = 0
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      // 表格最后一行
      const isLastTr = trList.length - 1 === t
      // 当前行最小高度
      let rowMinHeight = 0
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        // 计算当前td所属列索引
        let colIndex = 0
        // 第一行td位置为当前列索引+上一个单元格colspan，否则从第一行开始计算列偏移量
        if (trList.length > 1 && t !== 0) {
          // 当前列起始索引：以之前单元格为起始点
          const preTd = tr.tdList[d - 1]
          const start = preTd ? preTd.colIndex! + preTd.colspan : d
          for (let c = start; c < colgroup.length; c++) {
            // 查找相同索引列之前行数，相加判断是否位置被挤占
            const rowCount = this.getRowCountByColIndex(trList.slice(0, t), c)
            // 不存在挤占则默认当前单元格可以存在该位置
            if (rowCount === t) {
              colIndex = c
              // 重置单元格起始位置坐标
              let preColWidth = 0
              for (let preC = 0; preC < c; preC++) {
                preColWidth += colgroup[preC].width
              }
              preX = preColWidth
              break
            }
          }
        } else {
          const preTd = tr.tdList[d - 1]
          if (preTd) {
            colIndex = preTd.colIndex! + preTd.colspan
          }
        }
        // 计算格宽高
        let width = 0
        for (let col = 0; col < td.colspan; col++) {
          width += colgroup[col + colIndex].width
        }
        let height = 0
        for (let row = 0; row < td.rowspan; row++) {
          const curTr = trList[row + t] || trList[t]
          height += curTr.height
        }
        // y偏移量
        if (rowMinHeight === 0 || rowMinHeight > height) {
          rowMinHeight = height
        }
        // 当前行最后一个td
        const isLastRowTd = tr.tdList.length - 1 === d
        // 当前列最后一个td
        let isLastColTd = isLastTr
        if (!isLastColTd) {
          if (td.rowspan > 1) {
            const nextTrLength = trList.length - 1 - t
            isLastColTd = td.rowspan - 1 === nextTrLength
          }
        }
        // 当前表格最后一个td
        const isLastTd = isLastTr && isLastRowTd
        td.isLastRowTd = isLastRowTd
        td.isLastColTd = isLastColTd
        td.isLastTd = isLastTd
        // 修改当前格clientBox
        td.x = preX
        // 之前行相同列的高度
        let preY = 0
        for (let preR = 0; preR < t; preR++) {
          const preTdList = trList[preR].tdList
          for (let preD = 0; preD < preTdList.length; preD++) {
            const td = preTdList[preD]
            if (
              colIndex >= td.colIndex! &&
              colIndex < td.colIndex! + td.colspan
            ) {
              preY += td.height!
              break
            }
          }
        }
        td.y = preY
        td.width = width
        td.height = height
        td.rowIndex = t
        td.colIndex = colIndex
        td.trIndex = t
        td.tdIndex = d
        // 当前列x轴累加
        preX += width
        // 一行中的最后td
        if (isLastRowTd && !isLastTd) {
          preX = 0
        }
      }
    }
    // RTL table: mirror all column x-positions so column 0 starts
    // at the right edge. Auto-detect if no explicit direction set.
    const isRTLTable = this.isTableRTL(element)
    if (isRTLTable) {
      const tableWidth = this.getTableWidth(element)
      for (let t = 0; t < trList.length; t++) {
        const tr = trList[t]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          td.x = tableWidth - td.x! - td.width!
        }
      }
    }
  }

  /**
   * Determine if a table should use RTL column ordering.
   * Uses explicit `direction` field if set, otherwise auto-detects
   * from the first cell's text content.
   */
  public isTableRTL(element: IElement): boolean {
    if (element.direction === 'rtl') return true
    if (element.direction === 'ltr') return false
    // Auto-detect: check text direction of first non-empty cell content
    if (!this.draw.getOptions().shaping?.enabled) return false
    const trList = element.trList
    if (!trList?.length) return false
    // Search across all cells — continuation cells and empty cells
    // (e.g. from T2b page break splits) may have no meaningful text.
    for (const tr of trList) {
      for (const td of tr.tdList) {
        if ((td as any).isPageBreakContinuation) continue
        if (!td.value?.length) continue
        const text = (td.value as IElement[])
          .map(el => el.value)
          .join('')
          .replace(/\u200B/g, '')
          .replace(/\u200C/g, '')
          .replace(/\u200D/g, '')
          .replace(/\uFEFF/g, '')
          .trim()
        if (text.length > 0) {
          return detectDirection(text) === 'rtl'
        }
      }
    }
    return false
  }

  public drawRange(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number,
    colRowBounds?: {
      startCol: number
      endCol: number
      startRow: number
      endRow: number
    } | null
  ) {
    const { scale, rangeAlpha, rangeColor } = this.options
    const { type, trList } = element
    if (!trList || type !== ElementType.TABLE) return
    const {
      isCrossRowCol,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    } = this.range.getRange()
    // 存在跨行/列
    if (!isCrossRowCol) return

    let startColIndex: number
    let endColIndex: number
    let startRowIndex: number
    let endRowIndex: number

    if (colRowBounds) {
      // Use pre-computed bounds (reliable for paged table fragments)
      startColIndex = colRowBounds.startCol
      endColIndex = colRowBounds.endCol
      startRowIndex = colRowBounds.startRow
      endRowIndex = colRowBounds.endRow
    } else {
      // Fall back to trList index lookup (single-page or unsplit table)
      if (
        startTrIndex == null || endTrIndex == null ||
        startTdIndex == null || endTdIndex == null
      ) return
      if (
        startTrIndex >= trList.length || endTrIndex >= trList.length
      ) return
      const startTr = trList[startTrIndex]
      const endTr = trList[endTrIndex]
      if (
        startTdIndex >= startTr.tdList.length ||
        endTdIndex >= endTr.tdList.length
      ) return
      const startTd = startTr.tdList[startTdIndex]
      const endTd = endTr.tdList[endTdIndex]
      const col1 = startTd.colIndex!
      const col2 = endTd.colIndex! + (endTd.colspan - 1)
      startColIndex = Math.min(col1, col2)
      endColIndex = Math.max(col1, col2)
      const row1 = startTd.rowIndex!
      const row2 = endTd.rowIndex! + (endTd.rowspan - 1)
      startRowIndex = Math.min(row1, row2)
      endRowIndex = Math.max(row1, row2)
    }

    ctx.save()
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const tdColIndex = td.colIndex!
        const tdRowIndex = td.rowIndex!
        if (
          tdColIndex >= startColIndex &&
          tdColIndex <= endColIndex &&
          tdRowIndex >= startRowIndex &&
          tdRowIndex <= endRowIndex
        ) {
          const x = td.x! * scale
          const y = td.y! * scale
          const width = td.width! * scale
          const height = td.height! * scale
          ctx.globalAlpha = rangeAlpha
          ctx.fillStyle = rangeColor
          ctx.fillRect(x + startX, y + startY, width, height)
        }
      }
    }
    ctx.restore()
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number,
    bgCtx?: CanvasRenderingContext2D
  ) {
    // Draw cell backgrounds on the background (selection) layer so
    // the selection highlight remains visible above the fill color.
    this._drawBackgroundColor(bgCtx || ctx, element, startX, startY)
    this._drawBorder(ctx, element, startX, startY)
  }
}
