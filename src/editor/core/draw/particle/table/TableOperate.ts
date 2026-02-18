import {
  ElementType,
  IElement,
  TableAutoFit,
  TableBorder,
  VerticalAlign
} from '../../../..'
import { ZERO } from '../../../../dataset/constant/Common'
import { TABLE_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import {
  TdBorder,
  TdBorderStyle,
  TdSlash
} from '../../../../dataset/enum/table/Table'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IColgroup } from '../../../../interface/table/Colgroup'
import { ITd } from '../../../../interface/table/Td'
import { ITr } from '../../../../interface/table/Tr'
import { cloneProperty, getUUID } from '../../../../utils'
import {
  formatElementContext,
  formatElementList
} from '../../../../utils/element'
import { Position } from '../../../position/Position'
import { RangeManager } from '../../../range/RangeManager'
import { Draw } from '../../Draw'
import { TableParticle } from './TableParticle'
import { TableTool } from './TableTool'

export class TableOperate {
  private draw: Draw
  private range: RangeManager
  private position: Position
  private tableTool: TableTool
  private tableParticle: TableParticle
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.position = draw.getPosition()
    this.tableTool = draw.getTableTool()
    this.tableParticle = draw.getTableParticle()
    this.options = draw.getOptions()
  }

  public insertTable(row: number, col: number) {
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    const { defaultTrMinHeight } = this.options.table
    const elementList = this.draw.getElementList()
    let offsetX = 0
    if (elementList[startIndex]?.listId) {
      const positionList = this.position.getPositionList()
      const { rowIndex } = positionList[startIndex]
      const rowList = this.draw.getRowList()
      const row = rowList[rowIndex]
      offsetX = row?.offsetX || 0
    }
    const innerWidth = this.draw.getContextInnerWidth() - offsetX
    // colgroup
    const colgroup: IColgroup[] = []
    const colWidth = innerWidth / col
    for (let c = 0; c < col; c++) {
      colgroup.push({
        width: colWidth
      })
    }
    // trlist
    const trList: ITr[] = []
    for (let r = 0; r < row; r++) {
      const tdList: ITd[] = []
      const tr: ITr = {
        height: defaultTrMinHeight,
        tdList
      }
      for (let c = 0; c < col; c++) {
        tdList.push({
          colspan: 1,
          rowspan: 1,
          value: []
        })
      }
      trList.push(tr)
    }
    const element: IElement = {
      type: ElementType.TABLE,
      value: '',
      colgroup,
      trList
    }
    // 格式化element
    formatElementList([element], {
      editorOptions: this.options
    })
    formatElementContext(elementList, [element], startIndex, {
      editorOptions: this.options
    })
    const curIndex = startIndex + 1
    this.draw.spliceElementList(
      elementList,
      curIndex,
      startIndex === endIndex ? 0 : endIndex - startIndex,
      [element]
    )
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex, isSetCursor: false })
  }

  public insertTableTopRow() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, trIndex, tableId } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]
    // 之前跨行的增加跨行数
    if (curTr.tdList.length < element.colgroup!.length) {
      const curTrNo = curTr.tdList[0].rowIndex!
      for (let t = 0; t < trIndex!; t++) {
        const tr = curTrList[t]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          if (td.rowspan > 1 && td.rowIndex! + td.rowspan >= curTrNo + 1) {
            td.rowspan += 1
          }
        }
      }
    }
    // 增加当前行
    const newTrId = getUUID()
    const newTr: ITr = {
      height: curTr.height,
      id: newTrId,
      tdList: []
    }
    for (let t = 0; t < curTr.tdList.length; t++) {
      const curTd = curTr.tdList[t]
      const newTdId = getUUID()
      newTr.tdList.push({
        id: newTdId,
        rowspan: 1,
        colspan: curTd.colspan,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: newTrId,
            tdId: newTdId
          }
        ]
      })
    }
    curTrList.splice(trIndex!, 0, newTr)
    // 重新设置上下文
    this.position.setPositionContext({
      isTable: true,
      index,
      trIndex,
      tdIndex: 0,
      tdId: newTr.tdList[0].id,
      trId: newTr.id,
      tableId
    })
    this.range.setRange(0, 0)
    // 重新渲染
    this.draw.render({ curIndex: 0 })
    this.tableTool.render()
  }

  public insertTableBottomRow() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, trIndex, tableId } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]
    const anchorTr =
      curTrList.length - 1 === trIndex ? curTr : curTrList[trIndex! + 1]
    // 之前/当前行跨行的增加跨行数
    if (anchorTr.tdList.length < element.colgroup!.length) {
      const curTrNo = anchorTr.tdList[0].rowIndex!
      for (let t = 0; t < trIndex! + 1; t++) {
        const tr = curTrList[t]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          if (td.rowspan > 1 && td.rowIndex! + td.rowspan >= curTrNo + 1) {
            td.rowspan += 1
          }
        }
      }
    }
    // 增加当前行
    const newTrId = getUUID()
    const newTr: ITr = {
      height: anchorTr.height,
      id: newTrId,
      tdList: []
    }
    for (let t = 0; t < anchorTr.tdList.length; t++) {
      const curTd = anchorTr.tdList[t]
      const newTdId = getUUID()
      newTr.tdList.push({
        id: newTdId,
        rowspan: 1,
        colspan: curTd.colspan,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: newTrId,
            tdId: newTdId
          }
        ]
      })
    }
    curTrList.splice(trIndex! + 1, 0, newTr)
    // 重新设置上下文
    this.position.setPositionContext({
      isTable: true,
      index,
      trIndex: trIndex! + 1,
      tdIndex: 0,
      tdId: newTr.tdList[0].id,
      trId: newTr.id,
      tableId: element.id
    })
    this.range.setRange(0, 0)
    // 重新渲染
    this.draw.render({ curIndex: 0 })
  }

  public adjustColWidth(element: IElement) {
    if (element.type !== ElementType.TABLE) return
    const { defaultColMinWidth } = this.options.table
    const colgroup = element.colgroup!
    const colgroupWidth = colgroup.reduce((pre, cur) => pre + cur.width, 0)
    const width = this.draw.getOriginalInnerWidth()
    if (colgroupWidth > width) {
      // 过滤大于最小宽度的列（可能减少宽度的列）
      const greaterMinWidthCol = colgroup.filter(
        col => col.width > defaultColMinWidth
      )
      // 均分多余宽度
      const adjustWidth = (colgroupWidth - width) / greaterMinWidthCol.length
      for (let g = 0; g < colgroup.length; g++) {
        const group = colgroup[g]
        // 小于最小宽度的列不处理
        if (group.width - adjustWidth >= defaultColMinWidth) {
          group.width -= adjustWidth
        }
      }
    }
  }

  public insertTableLeftCol() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, tdIndex, tableId } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTdIndex = tdIndex!
    // 增加列
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      const tdId = getUUID()
      tr.tdList.splice(curTdIndex, 0, {
        id: tdId,
        rowspan: 1,
        colspan: 1,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: tr.id,
            tdId
          }
        ]
      })
    }
    // 重新计算宽度
    const { defaultColMinWidth } = this.options.table
    const colgroup = element.colgroup!
    colgroup.splice(curTdIndex, 0, {
      width: defaultColMinWidth
    })
    this.adjustColWidth(element)
    // 重新设置上下文
    this.position.setPositionContext({
      isTable: true,
      index,
      trIndex: 0,
      tdIndex: curTdIndex,
      tdId: curTrList[0].tdList[curTdIndex].id,
      trId: curTrList[0].id,
      tableId
    })
    this.range.setRange(0, 0)
    // 重新渲染
    this.draw.render({ curIndex: 0 })
    this.tableTool.render()
  }

  public insertTableRightCol() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, tdIndex, tableId } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTdIndex = tdIndex! + 1
    // 增加列
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      const tdId = getUUID()
      tr.tdList.splice(curTdIndex, 0, {
        id: tdId,
        rowspan: 1,
        colspan: 1,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: tr.id,
            tdId
          }
        ]
      })
    }
    // 重新计算宽度
    const { defaultColMinWidth } = this.options.table
    const colgroup = element.colgroup!
    colgroup.splice(curTdIndex, 0, {
      width: defaultColMinWidth
    })
    this.adjustColWidth(element)
    // 重新设置上下文
    this.position.setPositionContext({
      isTable: true,
      index,
      trIndex: 0,
      tdIndex: curTdIndex,
      tdId: curTrList[0].tdList[curTdIndex].id,
      trId: curTrList[0].id,
      tableId: element.id
    })
    this.range.setRange(0, 0)
    // 重新渲染
    this.draw.render({ curIndex: 0 })
  }

  public deleteTableRow() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, trIndex, tdIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const trList = element.trList!
    const curTr = trList[trIndex!]
    const curTdRowIndex = curTr.tdList[tdIndex!].rowIndex!
    // 如果是最后一行，直接删除整个表格（如果是拆分表格按照正常逻辑走）
    if (trList.length <= 1 && element.pagingIndex === 0) {
      this.deleteTable()
      return
    }
    // 之前行缩小rowspan
    for (let r = 0; r < curTdRowIndex; r++) {
      const tr = trList[r]
      const tdList = tr.tdList
      for (let d = 0; d < tdList.length; d++) {
        const td = tdList[d]
        if (td.rowIndex! + td.rowspan > curTdRowIndex) {
          td.rowspan--
        }
      }
    }
    // 补跨行
    for (let d = 0; d < curTr.tdList.length; d++) {
      const td = curTr.tdList[d]
      if (td.rowspan > 1) {
        const tdId = getUUID()
        const nextTr = trList[trIndex! + 1]
        nextTr.tdList.splice(d, 0, {
          id: tdId,
          rowspan: td.rowspan - 1,
          colspan: td.colspan,
          value: [
            {
              value: ZERO,
              size: 16,
              tableId: element.id,
              trId: nextTr.id,
              tdId
            }
          ]
        })
      }
    }
    // 删除当前行
    trList.splice(trIndex!, 1)
    // 重新设置上下文
    this.position.setPositionContext({
      isTable: false
    })
    this.range.clearRange()
    // 重新渲染
    this.draw.render({
      curIndex: positionContext.index
    })
    this.tableTool.dispose()
  }

  public deleteTableCol() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, tdIndex, trIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTd = curTrList[trIndex!].tdList[tdIndex!]
    const curColIndex = curTd.colIndex!
    // 如果是最后一列，直接删除整个表格
    const moreTdTr = curTrList.find(tr => tr.tdList.length > 1)
    if (!moreTdTr) {
      this.deleteTable()
      return
    }
    // 缩小colspan或删除与当前列重叠的单元格
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (
          td.colIndex! <= curColIndex &&
          td.colIndex! + td.colspan > curColIndex
        ) {
          if (td.colspan > 1) {
            td.colspan--
          } else {
            tr.tdList.splice(d, 1)
          }
        }
      }
    }
    element.colgroup?.splice(curColIndex, 1)
    // 重新设置上下文
    this.position.setPositionContext({
      isTable: false
    })
    this.range.setRange(0, 0)
    // 重新渲染
    this.draw.render({
      curIndex: positionContext.index
    })
    this.tableTool.dispose()
  }

  public deleteTable() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const originalElementList = this.draw.getOriginalElementList()
    const tableElement = originalElementList[positionContext.index!]
    // 需要删除的表格数量（拆分表格）及位置
    let deleteCount = 1
    let deleteStartIndex = positionContext.index!
    if (tableElement.pagingId) {
      // 开始删除的下标位置
      deleteStartIndex = positionContext.index! - tableElement.pagingIndex!
      // 计算删除的表格数量
      for (let i = deleteStartIndex + 1; i < originalElementList.length; i++) {
        if (originalElementList[i].pagingId === tableElement.pagingId) {
          deleteCount++
        } else {
          break
        }
      }
    }
    // 删除
    originalElementList.splice(deleteStartIndex, deleteCount)
    const curIndex = deleteStartIndex - 1
    this.position.setPositionContext({
      isTable: false,
      index: curIndex
    })
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
    this.tableTool.dispose()
  }

  public mergeTableCell() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const {
      isCrossRowCol,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    } = this.range.getRange()
    if (!isCrossRowCol) return
    const { index } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    let startTd = curTrList[startTrIndex!].tdList[startTdIndex!]
    let endTd = curTrList[endTrIndex!].tdList[endTdIndex!]
    // 交换起始位置
    if (startTd.x! > endTd.x! || startTd.y! > endTd.y!) {
      // prettier-ignore
      [startTd, endTd] = [endTd, startTd]
    }
    const startColIndex = startTd.colIndex!
    const endColIndex = endTd.colIndex! + (endTd.colspan - 1)
    const startRowIndex = startTd.rowIndex!
    const endRowIndex = endTd.rowIndex! + (endTd.rowspan - 1)
    // 选区行列
    const rowCol: ITd[][] = []
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      const tdList: ITd[] = []
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
          tdList.push(td)
        }
      }
      if (tdList.length) {
        rowCol.push(tdList)
      }
    }
    if (!rowCol.length) return
    // 是否是矩形
    const lastRow = rowCol[rowCol.length - 1]
    const leftTop = rowCol[0][0]
    const rightBottom = lastRow[lastRow.length - 1]
    const startX = leftTop.x!
    const startY = leftTop.y!
    const endX = rightBottom.x! + rightBottom.width!
    const endY = rightBottom.y! + rightBottom.height!
    for (let t = 0; t < rowCol.length; t++) {
      const tr = rowCol[t]
      for (let d = 0; d < tr.length; d++) {
        const td = tr[d]
        const tdStartX = td.x!
        const tdStartY = td.y!
        const tdEndX = tdStartX + td.width!
        const tdEndY = tdStartY + td.height!
        // 存在不符合项
        if (
          startX > tdStartX ||
          startY > tdStartY ||
          endX < tdEndX ||
          endY < tdEndY
        ) {
          return
        }
      }
    }
    // 合并单元格
    const mergeTdIdList: string[] = []
    const anchorTd = rowCol[0][0]
    const anchorElement = anchorTd.value[0]
    for (let t = 0; t < rowCol.length; t++) {
      const tr = rowCol[t]
      for (let d = 0; d < tr.length; d++) {
        const td = tr[d]
        const isAnchorTd = t === 0 && d === 0
        // 缓存待删除单元id并合并单元格内容
        if (!isAnchorTd) {
          mergeTdIdList.push(td.id!)
          // 被合并单元格没内容时忽略换行符
          const startTdValueIndex = td.value.length > 1 ? 0 : 1
          // 复制表格属性后追加
          for (let d = startTdValueIndex; d < td.value.length; d++) {
            const tdElement = td.value[d]
            cloneProperty<IElement>(
              TABLE_CONTEXT_ATTR,
              anchorElement,
              tdElement
            )
            anchorTd.value.push(tdElement)
          }
        }
        // 列合并
        if (t === 0 && d !== 0) {
          anchorTd.colspan += td.colspan
        }
        // 行合并
        if (t !== 0) {
          if (anchorTd.colIndex === td.colIndex) {
            anchorTd.rowspan += td.rowspan
          }
        }
      }
    }
    // 移除多余单元格
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      let d = 0
      while (d < tr.tdList.length) {
        const td = tr.tdList[d]
        if (mergeTdIdList.includes(td.id!)) {
          tr.tdList.splice(d, 1)
          d--
        }
        d++
      }
    }
    // 设置上下文信息
    this.position.setPositionContext({
      ...positionContext,
      trIndex: anchorTd.trIndex,
      tdIndex: anchorTd.tdIndex
    })
    const curIndex = anchorTd.value.length - 1
    this.range.setRange(curIndex, curIndex)
    // 重新渲染
    this.draw.render()
    this.tableTool.render()
  }

  public cancelMergeTableCell() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, tdIndex, trIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]!
    const curTd = curTr.tdList[tdIndex!]
    if (curTd.rowspan === 1 && curTd.colspan === 1) return
    const colspan = curTd.colspan
    // 设置跨列
    if (curTd.colspan > 1) {
      for (let c = 1; c < curTd.colspan; c++) {
        const tdId = getUUID()
        curTr.tdList.splice(tdIndex! + c, 0, {
          id: tdId,
          rowspan: 1,
          colspan: 1,
          value: [
            {
              value: ZERO,
              size: 16,
              tableId: element.id,
              trId: curTr.id,
              tdId
            }
          ]
        })
      }
      curTd.colspan = 1
    }
    // 设置跨行
    if (curTd.rowspan > 1) {
      for (let r = 1; r < curTd.rowspan; r++) {
        const tr = curTrList[trIndex! + r]
        for (let c = 0; c < colspan; c++) {
          const tdId = getUUID()
          tr.tdList.splice(curTd.colIndex!, 0, {
            id: tdId,
            rowspan: 1,
            colspan: 1,
            value: [
              {
                value: ZERO,
                size: 16,
                tableId: element.id,
                trId: tr.id,
                tdId
              }
            ]
          })
        }
      }
      curTd.rowspan = 1
    }
    // 重新渲染
    const curIndex = curTd.value.length - 1
    this.range.setRange(curIndex, curIndex)
    this.draw.render()
    this.tableTool.render()
  }

  public splitVerticalTableCell() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    // 暂时忽略跨行列选择
    const range = this.range.getRange()
    if (range.isCrossRowCol) return
    const { index, tdIndex, trIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]!
    const curTd = curTr.tdList[tdIndex!]
    // 增加列属性
    element.colgroup!.splice(tdIndex! + 1, 0, {
      width: this.options.table.defaultColMinWidth
    })
    // 同行增加td，非同行增加跨列数
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      let d = 0
      while (d < tr.tdList.length) {
        const td = tr.tdList[d]
        // 非同行：存在交叉时增加跨列数
        if (td.rowIndex !== curTd.rowIndex) {
          if (
            td.colIndex! <= curTd.colIndex! &&
            td.colIndex! + td.colspan > curTd.colIndex!
          ) {
            td.colspan++
          }
        } else {
          // 当前单元格：往右插入td
          if (td.id === curTd.id) {
            const tdId = getUUID()
            curTr.tdList.splice(d + curTd.colspan, 0, {
              id: tdId,
              rowspan: curTd.rowspan,
              colspan: 1,
              value: [
                {
                  value: ZERO,
                  size: 16,
                  tableId: element.id,
                  trId: tr.id,
                  tdId
                }
              ]
            })
            d++
          }
        }
        d++
      }
    }
    // 重新渲染
    this.draw.render()
    this.tableTool.render()
  }

  public splitHorizontalTableCell() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    // 暂时忽略跨行列选择
    const range = this.range.getRange()
    if (range.isCrossRowCol) return
    const { index, tdIndex, trIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]!
    const curTd = curTr.tdList[tdIndex!]
    // 追加的行跳出循环
    let appendTrIndex = -1
    // 交叉行增加rowspan，当前单元格往下追加一行tr
    let t = 0
    while (t < curTrList.length) {
      if (t === appendTrIndex) {
        t++
        continue
      }
      const tr = curTrList[t]
      let d = 0
      while (d < tr.tdList.length) {
        const td = tr.tdList[d]
        if (td.id === curTd.id) {
          const trId = getUUID()
          const tdId = getUUID()
          curTrList.splice(t + curTd.rowspan, 0, {
            id: trId,
            height: this.options.table.defaultTrMinHeight,
            tdList: [
              {
                id: tdId,
                rowspan: 1,
                colspan: curTd.colspan,
                value: [
                  {
                    value: ZERO,
                    size: 16,
                    tableId: element.id,
                    trId,
                    tdId
                  }
                ]
              }
            ]
          })
          appendTrIndex = t + curTd.rowspan
        } else if (
          td.rowIndex! >= curTd.rowIndex! &&
          td.rowIndex! < curTd.rowIndex! + curTd.rowspan &&
          td.rowIndex! + td.rowspan >= curTd.rowIndex! + curTd.rowspan
        ) {
          // 1. 循环td上方大于等于当前td上方 && 小于当前td的下方=>存在交叉
          // 2. 循环td下方大于或等于当前td下方
          td.rowspan++
        }
        d++
      }
      t++
    }
    // 重新渲染
    this.draw.render()
    this.tableTool.render()
  }

  public tableTdVerticalAlign(payload: VerticalAlign) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        const td = row[c]
        if (
          !td ||
          td.verticalAlign === payload ||
          (!td.verticalAlign && payload === VerticalAlign.TOP)
        ) {
          continue
        }
        // 重设垂直对齐方式
        td.verticalAlign = payload
      }
    }
    const { endIndex } = this.range.getRange()
    this.draw.render({
      curIndex: endIndex
    })
  }

  public tableBorderType(payload: TableBorder) {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    if (
      (!element.borderType && payload === TableBorder.ALL) ||
      element.borderType === payload
    ) {
      return
    }
    element.borderType = payload
    const { endIndex } = this.range.getRange()
    this.draw.render({
      curIndex: endIndex
    })
  }

  public tableBorderColor(payload: string) {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    if (
      (!element.borderColor &&
        payload === this.options.table.defaultBorderColor) ||
      element.borderColor === payload
    ) {
      return
    }
    element.borderColor = payload
    const { endIndex } = this.range.getRange()
    this.draw.render({
      curIndex: endIndex,
      isCompute: false
    })
  }

  public tableTdBorderType(payload: TdBorder) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    const tdList = rowCol.flat()
    // 存在则设置边框类型，否则取消设置
    const isSetBorderType = tdList.some(
      td => !td.borderTypes?.includes(payload)
    )
    tdList.forEach(td => {
      if (!td.borderTypes) {
        td.borderTypes = []
      }
      const borderTypeIndex = td.borderTypes.findIndex(type => type === payload)
      if (isSetBorderType) {
        if (!~borderTypeIndex) {
          td.borderTypes.push(payload)
        }
      } else {
        if (~borderTypeIndex) {
          td.borderTypes.splice(borderTypeIndex, 1)
        }
      }
      // 不存在边框设置时删除字段
      if (!td.borderTypes.length) {
        delete td.borderTypes
      }
    })
    const { endIndex } = this.range.getRange()
    this.draw.render({
      curIndex: endIndex
    })
  }

  public tableTdSlashType(payload: TdSlash) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    const tdList = rowCol.flat()
    // 存在则设置单元格斜线类型，否则取消设置
    const isSetTdSlashType = tdList.some(
      td => !td.slashTypes?.includes(payload)
    )
    tdList.forEach(td => {
      if (!td.slashTypes) {
        td.slashTypes = []
      }
      const slashTypeIndex = td.slashTypes.findIndex(type => type === payload)
      if (isSetTdSlashType) {
        if (!~slashTypeIndex) {
          td.slashTypes.push(payload)
        }
      } else {
        if (~slashTypeIndex) {
          td.slashTypes.splice(slashTypeIndex, 1)
        }
      }
      // 不存在斜线设置时删除字段
      if (!td.slashTypes.length) {
        delete td.slashTypes
      }
    })
    const { endIndex } = this.range.getRange()
    this.draw.render({
      curIndex: endIndex
    })
  }

  public tableTdBackgroundColor(payload: string) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        const col = row[c]
        col.backgroundColor = payload
      }
    }
    const { endIndex } = this.range.getRange()
    this.range.setRange(endIndex, endIndex)
    this.draw.render({
      isCompute: false
    })
  }

  public tableSelectAll() {
    const positionContext = this.position.getPositionContext()
    const { index, tableId, isTable } = positionContext
    if (!isTable || !tableId) return
    const { startIndex, endIndex } = this.range.getRange()
    const originalElementList = this.draw.getOriginalElementList()
    const trList = originalElementList[index!].trList!
    // 最后单元格位置
    const endTrIndex = trList.length - 1
    const endTdIndex = trList[endTrIndex].tdList.length - 1
    this.range.replaceRange({
      startIndex,
      endIndex,
      tableId,
      startTdIndex: 0,
      endTdIndex,
      startTrIndex: 0,
      endTrIndex
    })
    this.draw.render({
      isSetCursor: false,
      isCompute: false,
      isSubmitHistory: false
    })
  }

  // --- T3: Auto-fit & table sizing commands ---

  private getColIndex(
    trList: ITr[],
    trIndex: number,
    tdIndex: number
  ): number {
    const tr = trList[trIndex]
    if (!tr) return -1
    let colIdx = 0
    for (let i = 0; i < tdIndex && i < tr.tdList.length; i++) {
      colIdx += tr.tdList[i].colspan || 1
    }
    return colIdx
  }

  public tableAutoFit(payload: TableAutoFit) {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const colgroup = element.colgroup
    if (!colgroup || !colgroup.length) return
    const { defaultColMinWidth } = this.options.table
    const innerWidth = this.draw.getOriginalInnerWidth()
    if (payload === TableAutoFit.PAGE) {
      // Scale proportionally to fill page width
      const currentTotal = colgroup.reduce(
        (sum, col) => sum + col.width,
        0
      )
      if (currentTotal === 0) return
      const scale = innerWidth / currentTotal
      for (let g = 0; g < colgroup.length; g++) {
        colgroup[g].width = Math.max(
          defaultColMinWidth,
          Math.round(colgroup[g].width * scale)
        )
      }
      // Fix rounding error on last column
      const newTotal = colgroup.reduce(
        (sum, col) => sum + col.width,
        0
      )
      const diff = innerWidth - newTotal
      if (diff !== 0) {
        colgroup[colgroup.length - 1].width += diff
      }
    } else if (payload === TableAutoFit.EQUAL) {
      // All columns equal width
      const colWidth = Math.max(
        defaultColMinWidth,
        Math.floor(innerWidth / colgroup.length)
      )
      for (let g = 0; g < colgroup.length; g++) {
        colgroup[g].width = colWidth
      }
      // Fix rounding remainder
      const newTotal = colgroup.reduce(
        (sum, col) => sum + col.width,
        0
      )
      const diff = innerWidth - newTotal
      if (diff !== 0) {
        colgroup[colgroup.length - 1].width += diff
      }
    } else if (payload === TableAutoFit.CONTENT) {
      // Measure max content length per column
      const trList = element.trList
      if (!trList) return
      const colCount = colgroup.length
      const colContentWidths: number[] = new Array(colCount).fill(0)
      for (let t = 0; t < trList.length; t++) {
        const tr = trList[t]
        let colCursor = 0
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          const span = td.colspan || 1
          let charCount = 0
          if (td.value) {
            for (let v = 0; v < td.value.length; v++) {
              charCount += td.value[v].value?.length || 0
            }
          }
          const fontSize = td.value?.[0]?.size || 16
          const contentWidth = Math.max(
            charCount * fontSize * 0.6,
            defaultColMinWidth
          )
          const perCol = contentWidth / span
          for (let s = 0; s < span && colCursor + s < colCount; s++) {
            colContentWidths[colCursor + s] = Math.max(
              colContentWidths[colCursor + s],
              perCol
            )
          }
          colCursor += span
        }
      }
      const totalContent = colContentWidths.reduce(
        (sum, w) => sum + w,
        0
      )
      if (totalContent === 0) return
      const scale = Math.min(1, innerWidth / totalContent)
      for (let i = 0; i < colgroup.length; i++) {
        colgroup[i].width = Math.max(
          defaultColMinWidth,
          Math.round(colContentWidths[i] * scale)
        )
      }
      // Ensure total does not exceed innerWidth
      const newTotal = colgroup.reduce(
        (sum, col) => sum + col.width,
        0
      )
      if (newTotal > innerWidth && colgroup.length > 0) {
        const excess = newTotal - innerWidth
        colgroup[colgroup.length - 1].width = Math.max(
          defaultColMinWidth,
          colgroup[colgroup.length - 1].width - excess
        )
      }
    }
    const { endIndex } = this.range.getRange()
    this.draw.render({ curIndex: endIndex })
  }

  public tableColWidth(payload: number) {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, trIndex, tdIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const colgroup = element.colgroup
    const trList = element.trList
    if (!colgroup || !trList) return
    const colIdx = this.getColIndex(trList, trIndex!, tdIndex!)
    if (colIdx < 0 || colIdx >= colgroup.length) return
    const { defaultColMinWidth } = this.options.table
    const newWidth = Math.max(payload, defaultColMinWidth)
    const oldWidth = colgroup[colIdx].width
    const diff = newWidth - oldWidth
    if (diff === 0) return
    colgroup[colIdx].width = newWidth
    // Adjust neighbor column to maintain total table width
    if (colIdx + 1 < colgroup.length) {
      colgroup[colIdx + 1].width = Math.max(
        defaultColMinWidth,
        colgroup[colIdx + 1].width - diff
      )
    } else if (colIdx - 1 >= 0) {
      colgroup[colIdx - 1].width = Math.max(
        defaultColMinWidth,
        colgroup[colIdx - 1].width - diff
      )
    }
    const { endIndex } = this.range.getRange()
    this.draw.render({ curIndex: endIndex })
  }

  public tableRowHeight(payload: number) {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index, trIndex } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const trList = element.trList
    if (!trList) return
    const tr = trList[trIndex!]
    if (!tr) return
    tr.minHeight = Math.max(payload, 0)
    const { endIndex } = this.range.getRange()
    this.draw.render({ curIndex: endIndex })
  }

  public distributeTableRows() {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return
    const { index } = positionContext
    const originalElementList = this.draw.getOriginalElementList()
    const element = originalElementList[index!]
    const trList = element.trList
    if (!trList || !trList.length) return
    // Calculate average row height
    const totalHeight = trList.reduce(
      (sum, tr) => sum + tr.height,
      0
    )
    const avgHeight = Math.floor(totalHeight / trList.length)
    for (let t = 0; t < trList.length; t++) {
      trList[t].minHeight = avgHeight
    }
    const { endIndex } = this.range.getRange()
    this.draw.render({ curIndex: endIndex })
  }

  // --- T4: Per-cell border styling commands ---

  public tableTdBorderColor(payload: string) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        row[c].borderColor = payload
      }
    }
    const { endIndex } = this.range.getRange()
    this.range.setRange(endIndex, endIndex)
    this.draw.render({ isCompute: false })
  }

  public tableTdBorderWidth(payload: number) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        row[c].borderWidth = Math.max(payload, 0)
      }
    }
    const { endIndex } = this.range.getRange()
    this.range.setRange(endIndex, endIndex)
    this.draw.render({ isCompute: false })
  }

  public tableTdBorderStyle(payload: TdBorderStyle) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        row[c].borderStyle = payload
      }
    }
    const { endIndex } = this.range.getRange()
    this.range.setRange(endIndex, endIndex)
    this.draw.render({ isCompute: false })
  }
}
