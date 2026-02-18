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
    // 无边框
    const isEmptyBorderType = borderType === TableBorder.EMPTY
    // 仅外边框
    const isExternalBorderType = borderType === TableBorder.EXTERNAL
    // 内边框
    const isInternalBorderType = borderType === TableBorder.INTERNAL

    ctx.save()
    // Table-level dash
    if (borderType === TableBorder.DASH) {
      ctx.setLineDash([3, 3])
    }
    ctx.lineWidth = borderWidth * scale
    ctx.strokeStyle = borderColor || defaultBorderColor

    // Outer border
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

    // Helper: draw a single line segment with its own beginPath/stroke
    const drawLine = (
      x1: number, y1: number,
      x2: number, y2: number
    ) => {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    // Per-cell border drawing
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]

        // 单元格内斜线
        if (td.slashTypes?.length) {
          this._drawSlash(ctx, td, startX, startY)
        }

        const hasCellOverride = !!(
          td.borderColor !== undefined ||
          td.borderWidth !== undefined ||
          td.borderStyle !== undefined
        )

        // Skip cells with no visible borders
        if (
          !td.borderTypes?.length &&
          !hasCellOverride &&
          (isEmptyBorderType || isExternalBorderType)
        ) {
          continue
        }

        const width = td.width! * scale
        const height = td.height! * scale
        const x = Math.round(td.x! * scale + startX)
        const y = Math.round(td.y! * scale + startY)

        ctx.translate(0.5, 0.5)

        // ── Individual cell border toggles (TdBorder.TOP/RIGHT/etc.) ──
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

        // ── Table-grid or per-cell override drawing ──
        if (!isEmptyBorderType && !isExternalBorderType) {
          if (hasCellOverride) {
            // Per-cell override: draw all 4 sides explicitly with override style
            // so top & left also get the custom color/width/style (overpainting
            // whatever the adjacent cell drew for those shared edges).
            ctx.save()
            // Only override the values that are actually set (undefined = inherit)
            if (td.borderColor !== undefined) ctx.strokeStyle = td.borderColor
            if (td.borderWidth !== undefined) {
              ctx.lineWidth = td.borderWidth === 0
                ? 0
                : td.borderWidth * scale
            }
            if (td.borderStyle !== undefined) {
              this._applyLineDash(ctx, td.borderStyle, scale)
            }
            if ((td.borderWidth ?? 1) > 0) {
              // top
              drawLine(x, y, x + width, y)
              // right
              if (!isInternalBorderType || td.colIndex! + td.colspan < colgroup.length) {
                drawLine(x + width, y, x + width, y + height)
              }
              // bottom
              if (!isInternalBorderType || td.rowIndex! + td.rowspan < trList.length) {
                drawLine(x + width, y + height, x, y + height)
              }
              // left
              drawLine(x, y, x, y + height)
            }
            ctx.restore()
          } else {
            // Standard table-grid: draw right + bottom only.
            // Top comes from the row above's bottom; left from the col before's right.
            // right
            if (
              !isInternalBorderType ||
              td.colIndex! + td.colspan < colgroup.length
            ) {
              const lineWidth = ctx.lineWidth
              if (
                borderExternalWidth &&
                borderExternalWidth !== borderWidth &&
                td.colIndex! + td.colspan === colgroup.length
              ) {
                ctx.lineWidth = borderExternalWidth * scale
              }
              drawLine(x + width, y, x + width, y + height)
              ctx.lineWidth = lineWidth
            }
            // bottom
            if (
              !isInternalBorderType ||
              td.rowIndex! + td.rowspan < trList.length
            ) {
              const lineWidth = ctx.lineWidth
              if (
                borderExternalWidth &&
                borderExternalWidth !== borderWidth &&
                td.rowIndex! + td.rowspan === trList.length
              ) {
                ctx.lineWidth = borderExternalWidth * scale
              }
              drawLine(x + width, y + height, x, y + height)
              ctx.lineWidth = lineWidth
            }
          }
        }

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
