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

interface IDrawTableBorderOption {
  ctx: CanvasRenderingContext2D
  startX: number
  startY: number
  width: number
  height: number
  borderExternalWidth?: number
  isDrawFullBorder?: boolean
}

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
    const curTrList = element.trList
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

  private _drawOuterBorder(payload: IDrawTableBorderOption) {
    const {
      ctx,
      startX,
      startY,
      width,
      height,
      isDrawFullBorder,
      borderExternalWidth
    } = payload
    const { scale } = this.options
    // 外部边框单独设置
    const lineWidth = ctx.lineWidth
    if (borderExternalWidth) {
      ctx.lineWidth = borderExternalWidth * scale
    }
    ctx.beginPath()
    const x = Math.round(startX)
    const y = Math.round(startY)
    ctx.translate(0.5, 0.5)
    if (isDrawFullBorder) {
      ctx.rect(x, y, width, height)
    } else {
      ctx.moveTo(x, y + height)
      ctx.lineTo(x, y)
      ctx.lineTo(x + width, y)
    }
    ctx.stroke()
    // 还原边框设置
    if (borderExternalWidth) {
      ctx.lineWidth = lineWidth
    }
    ctx.translate(-0.5, -0.5)
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
    const tableWidth = element.width! * scale
    const tableHeight = element.height! * scale
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

    // Helper: clear the entire cell border area in one pass so that
    // per-edge clearing doesn't erase previously drawn corner pixels.
    const clearCellBorders = (
      x: number, y: number,
      w: number, h: number,
      lineWidth: number
    ) => {
      const half = Math.ceil(lineWidth / 2) + 1
      ctx.clearRect(
        x - half, y - half,
        w + half * 2, h + half * 2
      )
    }

    // ── Pass 1: Outer border + standard grid (non-override cells) ──
    ctx.lineWidth = borderWidth * scale
    ctx.strokeStyle = tableBorderColor
    if (borderType === TableBorder.DASH) {
      ctx.setLineDash([3, 3])
    }

    // Outer border — but skip edges where outer cells have overrides
    if (!isEmptyBorderType && !isInternalBorderType) {
      this._drawOuterBorder({
        ctx,
        startX,
        startY,
        width: tableWidth,
        height: tableHeight,
        borderExternalWidth,
        isDrawFullBorder: isExternalBorderType
      })
    }

    // Standard grid pass: non-override cells draw right + bottom
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]

        // Slashes always drawn
        if (td.slashTypes?.length) {
          this._drawSlash(ctx, td, startX, startY)
        }

        const hasCellOverride = !!(
          td.borderColor !== undefined ||
          td.borderWidth !== undefined ||
          td.borderStyle !== undefined
        )

        // Skip override cells — they are handled in pass 2
        if (hasCellOverride) continue

        // Skip cells with no visible borders
        if (
          !td.borderTypes?.length &&
          (isEmptyBorderType || isExternalBorderType)
        ) {
          continue
        }

        const width = td.width! * scale
        const height = td.height! * scale
        const x = Math.round(td.x! * scale + startX)
        const y = Math.round(td.y! * scale + startY)

        ctx.translate(0.5, 0.5)

        // Individual cell border toggles (TdBorder.TOP/RIGHT/etc.)
        if (td.borderTypes?.length) {
          if (td.borderTypes.includes(TdBorder.TOP))
            drawLine(x, y, x + width, y)
          if (td.borderTypes.includes(TdBorder.RIGHT))
            drawLine(x + width, y, x + width, y + height)
          if (td.borderTypes.includes(TdBorder.BOTTOM))
            drawLine(x + width, y + height, x, y + height)
          if (td.borderTypes.includes(TdBorder.LEFT))
            drawLine(x, y, x, y + height)
        }

        // Standard table-grid: draw right + bottom only
        if (!isEmptyBorderType && !isExternalBorderType) {
          // right
          if (
            !isInternalBorderType ||
            td.colIndex! + td.colspan < colCount
          ) {
            const lw = ctx.lineWidth
            if (
              borderExternalWidth &&
              borderExternalWidth !== borderWidth &&
              td.colIndex! + td.colspan === colCount
            ) {
              ctx.lineWidth = borderExternalWidth * scale
            }
            drawLine(x + width, y, x + width, y + height)
            ctx.lineWidth = lw
          }
          // bottom
          if (
            !isInternalBorderType ||
            td.rowIndex! + td.rowspan < rowCount
          ) {
            const lw = ctx.lineWidth
            if (
              borderExternalWidth &&
              borderExternalWidth !== borderWidth &&
              td.rowIndex! + td.rowspan === rowCount
            ) {
              ctx.lineWidth = borderExternalWidth * scale
            }
            drawLine(x + width, y + height, x, y + height)
            ctx.lineWidth = lw
          }
        }

        ctx.translate(-0.5, -0.5)
      }
    }

    // ── Pass 2: Per-cell override cells ──
    // Uses three-phase rendering with edge deduplication:
    //   1. Precompute grid positions so shared edges have identical coords
    //   2. Collect ALL edges into a dedup map (each physical edge drawn once)
    //   3. Phase A: clear, Phase B: backgrounds, Phase C: draw unique edges

    // --- Precompute consistent grid positions ---
    // Using cumulative column widths and row heights ensures shared edges
    // have identical coordinates regardless of which cell references them.
    // Without this, Math.round(tdA.x*s + off) + tdA.w*s ≠
    // Math.round(tdB.x*s + off) for adjacent cells → double lines.
    const rawColX: number[] = [0]
    for (let c = 0; c < colgroup.length; c++) {
      rawColX.push(rawColX[c] + colgroup[c].width * scale)
    }
    const rawRowY: number[] = [0]
    for (let r = 0; r < trList.length; r++) {
      rawRowY.push(rawRowY[r] + trList[r].height * scale)
    }
    const gridX = rawColX.map(v => Math.round(v + startX))
    const gridY = rawRowY.map(v => Math.round(v + startY))

    type EdgeStyle = { color: string; width: number; style: TdBorderStyle }

    // Override cell info for clearing/background phases
    const overrideCells: Array<{
      td: ITd
      x: number; y: number; width: number; height: number
    }> = []

    // Edge deduplication map: "x1,y1,x2,y2" → style + priority
    // When two cells claim the same edge, highest priority wins.
    // Priority: +2 for borderStyle, +1 for borderColor, +1 for borderWidth
    const edgeMap = new Map<string, {
      x1: number; y1: number; x2: number; y2: number
      resolved: EdgeStyle; priority: number
    }>()

    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const hasCellOverride = !!(
          td.borderColor !== undefined ||
          td.borderWidth !== undefined ||
          td.borderStyle !== undefined
        )
        if (!hasCellOverride) continue

        const ri = td.rowIndex!
        const ci = td.colIndex!
        const cx = gridX[ci]
        const cy = gridY[ri]
        const cx2 = gridX[ci + td.colspan]
        const cy2 = gridY[ri + td.rowspan]

        overrideCells.push({
          td, x: cx, y: cy, width: cx2 - cx, height: cy2 - cy
        })

        // Compute priority: more specific overrides win on shared edges
        let priority = 0
        if (td.borderColor !== undefined) priority++
        if (td.borderWidth !== undefined) priority++
        if (td.borderStyle !== undefined) priority += 2

        // Resolve and collect edges into the dedup map
        const edgeDefs = [
          { edge: 'top' as const, x1: cx, y1: cy, x2: cx2, y2: cy },
          { edge: 'right' as const, x1: cx2, y1: cy, x2: cx2, y2: cy2 },
          { edge: 'bottom' as const, x1: cx, y1: cy2, x2: cx2, y2: cy2 },
          { edge: 'left' as const, x1: cx, y1: cy, x2: cx, y2: cy2 }
        ]

        for (const { edge, x1, y1, x2, y2 } of edgeDefs) {
          if (isInternalBorderType) {
            if (edge === 'right' && ci + td.colspan >= colCount) continue
            if (edge === 'bottom' && ri + td.rowspan >= rowCount) continue
          }

          const edgeStyle = this._resolveEdgeStyle(
            td, edge, overrideMap,
            tableBorderColor, borderWidth,
            tableBorderStyle,
            colCount, rowCount
          )
          if (!edgeStyle) continue

          // Normalize key so both cells produce the same key for shared edge
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

    // Phase A: Clear ALL override cells' border areas at once
    for (const { td, x, y, width, height } of overrideCells) {
      ctx.translate(0.5, 0.5)
      const maxClearWidth = Math.max(
        (td.borderWidth ?? borderWidth) * scale,
        borderWidth * scale,
        3
      )
      clearCellBorders(x, y, width, height, maxClearWidth)
      ctx.translate(-0.5, -0.5)
    }

    // Phase B: Redraw ALL backgrounds in cleared areas
    for (const { td, x, y, width, height } of overrideCells) {
      if (!td.backgroundColor) continue
      ctx.translate(0.5, 0.5)
      ctx.save()
      ctx.fillStyle = td.backgroundColor
      ctx.fillRect(x, y, width, height)
      ctx.restore()
      ctx.translate(-0.5, -0.5)
    }

    // Phase C: Draw ALL unique edges from the dedup map
    // Each physical edge is drawn exactly once, eliminating double borders.
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

    // Phase D: Restore outer border segments cleared in Phase A
    // Only needed for perimeter cells when the outer border should
    // remain at the table-level style (not replaced by the cell override).
    if (!isEmptyBorderType && !isInternalBorderType) {
      for (const { td, x, y, width, height } of overrideCells) {
        const ri = td.rowIndex!
        const ci = td.colIndex!
        const isTopEdge = ri === 0
        const isLeftEdge = ci === 0
        const isRightEdge = ci + td.colspan >= colCount
        const isBottomEdge = ri + td.rowspan >= rowCount

        if (!(isTopEdge || isLeftEdge || isRightEdge || isBottomEdge)) {
          continue
        }

        ctx.translate(0.5, 0.5)
        const outerWidth = (borderExternalWidth || borderWidth) * scale
        ctx.save()
        ctx.lineWidth = outerWidth
        ctx.strokeStyle = tableBorderColor
        ctx.lineCap = 'square'
        if (borderType === TableBorder.DASH) {
          ctx.setLineDash([3, 3])
        }

        if (isTopEdge) {
          const topStyle = this._resolveEdgeStyle(
            td, 'top', overrideMap, tableBorderColor,
            borderWidth, tableBorderStyle, colCount, rowCount
          )
          if (!topStyle || (
            topStyle.color === tableBorderColor &&
            topStyle.width === (borderExternalWidth || borderWidth) &&
            topStyle.style === (tableBorderStyle ?? TdBorderStyle.SOLID)
          )) {
            drawLine(x, y, x + width, y)
          }
        }
        if (isLeftEdge) {
          const leftStyle = this._resolveEdgeStyle(
            td, 'left', overrideMap, tableBorderColor,
            borderWidth, tableBorderStyle, colCount, rowCount
          )
          if (!leftStyle || (
            leftStyle.color === tableBorderColor &&
            leftStyle.width === (borderExternalWidth || borderWidth) &&
            leftStyle.style === (tableBorderStyle ?? TdBorderStyle.SOLID)
          )) {
            drawLine(x, y, x, y + height)
          }
        }
        if (isRightEdge && !isExternalBorderType) {
          const rightStyle = this._resolveEdgeStyle(
            td, 'right', overrideMap, tableBorderColor,
            borderWidth, tableBorderStyle, colCount, rowCount
          )
          if (!rightStyle || (
            rightStyle.color === tableBorderColor &&
            rightStyle.width === (borderExternalWidth || borderWidth) &&
            rightStyle.style === (tableBorderStyle ?? TdBorderStyle.SOLID)
          )) {
            drawLine(x + width, y, x + width, y + height)
          }
        }
        if (isBottomEdge && !isExternalBorderType) {
          const bottomStyle = this._resolveEdgeStyle(
            td, 'bottom', overrideMap, tableBorderColor,
            borderWidth, tableBorderStyle, colCount, rowCount
          )
          if (!bottomStyle || (
            bottomStyle.color === tableBorderColor &&
            bottomStyle.width === (borderExternalWidth || borderWidth) &&
            bottomStyle.style === (tableBorderStyle ?? TdBorderStyle.SOLID)
          )) {
            drawLine(x + width, y + height, x, y + height)
          }
        }
        ctx.restore()
        ctx.translate(-0.5, -0.5)
      }
    }

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
    // Auto-detect: check text direction of first cell content
    if (!this.draw.getOptions().shaping?.enabled) return false
    const trList = element.trList
    if (!trList?.length) return false
    const firstTd = trList[0].tdList[0]
    if (!firstTd?.value?.length) return false
    const text = (firstTd.value as IElement[])
      .map(el => el.value)
      .join('')
    return detectDirection(text) === 'rtl'
  }

  public drawRange(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    startX: number,
    startY: number
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
    const startTd = trList[startTrIndex!].tdList[startTdIndex!]
    const endTd = trList[endTrIndex!].tdList[endTdIndex!]
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
