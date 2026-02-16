import { ZERO } from '../../../dataset/constant/Common'
import {
  getOlMarkerText,
  LIST_BASE_INDENT,
  LIST_LEVEL_INDENT,
  ulStyleByLevel,
  ulStyleMapping
} from '../../../dataset/constant/List'
import { ElementType } from '../../../dataset/enum/Element'
import { ListStyle, ListType, UlStyle } from '../../../dataset/enum/List'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { getUUID } from '../../../utils'
import { RangeManager } from '../../range/RangeManager'
import { Draw } from '../Draw'

export class ListParticle {
  private draw: Draw
  private range: RangeManager
  private options: DeepRequired<IEditorOption>

  // 非递增样式直接返回默认值
  private readonly UN_COUNT_STYLE_WIDTH = 20
  private readonly MEASURE_BASE_TEXT = '0'
  private readonly LIST_GAP = 8
  // 列表标记与文本之间的间距
  private readonly LIST_MARKER_SPACING = 6

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.options = draw.getOptions()
  }

  public setList(listType: ListType | null, listStyle?: ListStyle) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range.getRangeParagraphElementList()
    if (!changeElementList || !changeElementList.length) return
    // 如果包含列表则设置为取消列表
    const isUnsetList = changeElementList.find(
      el => el.listType === listType && el.listStyle === listStyle
    )
    if (isUnsetList || !listType) {
      this.unsetList()
      return
    }
    // 设置值
    const listId = getUUID()
    changeElementList.forEach(el => {
      el.listId = listId
      el.listType = listType
      el.listStyle = listStyle
      el.listLevel = el.listLevel ?? 0
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public setListLevel(level: number) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表（仅限列表内元素）
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    // 设置层级（限制在0-8范围内）
    const newLevel = Math.max(0, Math.min(8, level))
    changeElementList.forEach(el => {
      el.listLevel = newLevel
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public listIndent() {
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    const currentLevel = changeElementList[0].listLevel || 0
    this.setListLevel(currentLevel + 1)
  }

  public listOutdent() {
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    const currentLevel = changeElementList[0].listLevel || 0
    this.setListLevel(currentLevel - 1)
  }

  public unsetList() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    // 如果列表最后字符不是换行符则需插入换行符
    const elementList = this.draw.getElementList()
    const endElement = elementList[endIndex]
    if (endElement.listId) {
      let start = endIndex + 1
      while (start < elementList.length) {
        const element = elementList[start]
        if (element.value === ZERO && !element.listWrap) break
        if (element.listId !== endElement.listId) {
          this.draw.spliceElementList(elementList, start, 0, [
            {
              value: ZERO
            }
          ])
          break
        }
        start++
      }
    }
    // 取消设置
    changeElementList.forEach(el => {
      delete el.listId
      delete el.listType
      delete el.listStyle
      delete el.listWrap
      delete el.listLevel
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public computeListStyle(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[]
  ): Map<string, number> {
    const listStyleMap = new Map<string, number>()
    let start = 0
    let curListId = elementList[start].listId
    let curElementList: IElement[] = []
    const elementLength = elementList.length
    while (start < elementLength) {
      const curElement = elementList[start]
      if (curListId && curListId === curElement.listId) {
        curElementList.push(curElement)
      } else {
        if (curElement.listId && curElement.listId !== curListId) {
          // 列表结束
          if (curElementList.length) {
            const width = this.getListStyleWidth(ctx, curElementList)
            listStyleMap.set(curListId!, width)
          }
          curListId = curElement.listId
          curElementList = curListId ? [curElement] : []
        }
      }
      start++
    }
    if (curElementList.length) {
      const width = this.getListStyleWidth(ctx, curElementList)
      listStyleMap.set(curListId!, width)
    }
    return listStyleMap
  }

  public getListStyleWidth(
    ctx: CanvasRenderingContext2D,
    listElementList: IElement[]
  ): number {
    const { scale, checkbox } = this.options
    const startElement = listElementList[0]
    // 非递增样式返回固定值
    if (
      startElement.listStyle &&
      startElement.listStyle !== ListStyle.DECIMAL
    ) {
      if (startElement.listStyle === ListStyle.CHECKBOX) {
        return (checkbox.width + this.LIST_GAP) * scale
      }
      return (this.UN_COUNT_STYLE_WIDTH + this.LIST_MARKER_SPACING) * scale
    }
    // 计算列表数量
    let count = 0
    listElementList.forEach(el => {
      if (el.value === ZERO) {
        count++
      }
    })
    if (!count) return 0
    // 使用固定的标记宽度：数字位数 + 点 + 间距
    // 层级编号由各自的缩进处理，这里只需考虑单个数字的宽度
    const digitCount = String(count).length
    const text = this.MEASURE_BASE_TEXT.repeat(digitCount + 1) // +1 for the period
    const textMetrics = ctx.measureText(text)
    return Math.ceil((textMetrics.width + this.LIST_GAP + this.LIST_MARKER_SPACING) * scale)
  }

  public drawListStyle(
    ctx: CanvasRenderingContext2D,
    row: IRow,
    position: IElementPosition
  ) {
    const { elementList, offsetX, listIndex, listLevel, ascent } = row
    const startElement = elementList[0]
    if (startElement.value !== ZERO || startElement.listWrap) return
    // tab width
    let tabWidth = 0
    const { defaultTabWidth, scale, defaultFont, defaultSize } = this.options
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (element?.type !== ElementType.TAB) break
      tabWidth += defaultTabWidth * scale
    }
    // 获取元素字体和字号（优先使用元素自身的，否则使用默认值）
    const elementFont = startElement.font || defaultFont
    const elementSize = startElement.size || defaultSize
    // 列表样式渲染
    const {
      coordinate: {
        leftTop: [startX, startY]
      }
    } = position
    // 计算列表层级缩进量（基础缩进 + 层级缩进）
    const baseIndent = LIST_BASE_INDENT * scale
    const levelIndent = (listLevel || 0) * LIST_LEVEL_INDENT * scale
    // For list rows, use row.isRTL without checking isBidiMixed because
    // the ZWSP first-element always produces a false-positive "mixed" result.
    const isRTL = !!row.isRTL
    // LTR: marker at content-left + indent
    // RTL: marker at text-right-edge + mirror indent (space reserved by Position.ts)
    const ltrX = startX - offsetX! + tabWidth + baseIndent + levelIndent
    const y = startY + ascent
    // 复选框样式特殊处理
    if (startElement.listStyle === ListStyle.CHECKBOX) {
      const { width, height, gap } = this.options.checkbox
      const checkboxRowElement: IRowElement = {
        ...startElement,
        checkbox: {
          value: !!startElement.checkbox?.value
        },
        metrics: {
          ...startElement.metrics,
          width: (width + gap * 2) * scale,
          height: height * scale
        }
      }
      // For RTL, position checkbox on the right side of text
      const cbX = isRTL
        ? startX + row.width + offsetX!
          - baseIndent - levelIndent - tabWidth
          - (width + gap * 2) * scale
        : ltrX - gap * scale
      this.draw.getCheckboxParticle().render({
        ctx,
        x: cbX,
        y,
        index: 0,
        row: {
          ...row,
          elementList: [checkboxRowElement, ...row.elementList]
        }
      })
    } else {
      let text = ''
      if (startElement.listType === ListType.UL) {
        // 根据层级自动选择bullet样式（循环使用）
        const level = listLevel || 0
        text = ulStyleByLevel[level % ulStyleByLevel.length] ||
          ulStyleMapping[<UlStyle>(<unknown>startElement.listStyle)] ||
          ulStyleMapping[UlStyle.DISC]
      } else {
        // 层级式编号（1. → 1.1 → 1.1.1）
        const hierarchy = row.listHierarchy || [listIndex || 0]
        const marker = getOlMarkerText(hierarchy)
        // RTL: dot before number (.1) — LTR: dot after number (1.)
        text = isRTL ? `.${marker}` : `${marker}.`
      }
      if (!text) return
      ctx.save()
      ctx.font = `${elementSize * scale}px ${elementFont}`
      if (isRTL) {
        // RTL: place marker to the right of the text block.
        // Position.ts skipped adding offsetX so text content is shifted
        // left by offsetX from the right edge. The marker goes in the
        // reserved space between text-end and the right margin.
        // rightEdge = startX + row.width + offsetX = right margin.
        // Marker right-edge placed at: rightEdge - baseIndent - levelIndent.
        const rightEdge = startX + row.width + offsetX!
        const markerX = rightEdge - baseIndent - levelIndent - tabWidth
        ctx.textAlign = 'right'
        ctx.fillText(text, markerX, y)
      } else {
        ctx.fillText(text, ltrX, y)
      }
      ctx.restore()
    }
  }
}
