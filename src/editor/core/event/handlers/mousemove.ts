import { ImageDisplay } from '../../../dataset/enum/Common'
import { ControlComponent } from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { CanvasEvent } from '../CanvasEvent'

export function mousemove(evt: MouseEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  // 是否是拖拽文字
  if (host.isAllowDrag) {
    // 是否允许拖拽到选区
    const x = evt.offsetX
    const y = evt.offsetY
    const { startIndex, endIndex } = host.cacheRange!
    const positionList = host.cachePositionList!
    // Cache row mirror bounds for pure RTL rows
    const rowMirrorCache = new Map<number, { start: number; end: number }>()
    for (let p = startIndex + 1; p <= endIndex; p++) {
      const {
        coordinate: { leftTop, rightTop, leftBottom }
      } = positionList[p]
      const pos = positionList[p]
      let visualLeft = leftTop[0]
      let visualRight = rightTop[0]
      // Pure RTL: mirror logical coords to visual coords
      if (pos.isRTL && !pos.isBidiMixed) {
        const rowNo = pos.rowNo
        if (!rowMirrorCache.has(rowNo)) {
          let rStart = leftTop[0]
          let rEnd = rightTop[0]
          for (let k = 0; k < positionList.length; k++) {
            const pk = positionList[k]
            if (pk.rowNo !== rowNo || pk.pageNo !== pos.pageNo) continue
            if (pk.isFirstLetter) rStart = pk.coordinate.leftTop[0]
            if (pk.isLastLetter) {
              rEnd = pk.coordinate.rightTop[0]
              break
            }
          }
          rowMirrorCache.set(rowNo, { start: rStart, end: rEnd })
        }
        const mirror = rowMirrorCache.get(rowNo)!
        visualRight = mirror.start + mirror.end - leftTop[0]
        visualLeft = mirror.start + mirror.end - rightTop[0]
      }
      if (
        x >= visualLeft &&
        x <= visualRight &&
        y >= leftTop[1] &&
        y <= leftBottom[1]
      ) {
        return
      }
    }
    const cacheStartIndex = host.cacheRange?.startIndex
    if (cacheStartIndex) {
      // 浮动元素拖拽调整位置
      const dragElement = host.cacheElementList![cacheStartIndex]
      if (
        dragElement?.type === ElementType.IMAGE &&
        (dragElement.imgDisplay === ImageDisplay.SURROUND ||
          dragElement.imgDisplay === ImageDisplay.FLOAT_TOP ||
          dragElement.imgDisplay === ImageDisplay.FLOAT_BOTTOM)
      ) {
        draw.getPreviewer().clearResizer()
        draw.getImageParticle().dragFloatImage(evt.movementX, evt.movementY)
      }
    }
    host.dragover(evt)
    host.isAllowDrop = true
    return
  }
  if (!host.isAllowSelection || !host.mouseDownStartPosition) return
  const target = evt.target as HTMLDivElement
  const pageIndex = target.dataset.index
  // 设置pageNo
  if (pageIndex) {
    draw.setPageNo(Number(pageIndex))
  }
  // 结束位置
  const position = draw.getPosition()
  const positionResult = position.getPositionByXY({
    x: evt.offsetX,
    y: evt.offsetY
  })
  if (!~positionResult.index) return
  const {
    index,
    isTable,
    tdValueIndex,
    tdIndex,
    trIndex,
    tableId,
    trId,
    tdId
  } = positionResult
  const {
    index: startIndex,
    isTable: startIsTable,
    tdIndex: startTdIndex,
    trIndex: startTrIndex,
    tableId: startTableId
  } = host.mouseDownStartPosition
  const endIndex = isTable ? tdValueIndex! : index
  // 判断是否是表格跨行/列
  const rangeManager = draw.getRange()
  if (
    isTable &&
    startIsTable &&
    (tdIndex !== startTdIndex || trIndex !== startTrIndex)
  ) {
    rangeManager.setRange(
      endIndex,
      endIndex,
      tableId,
      startTdIndex,
      tdIndex,
      startTrIndex,
      trIndex
    )
    position.setPositionContext({
      isTable,
      index,
      trIndex,
      tdIndex,
      tdId,
      trId,
      tableId
    })
  } else {
    let end = ~endIndex ? endIndex : 0
    // 开始或结束位置存在表格，但是非相同表格则忽略选区设置
    if ((startIsTable || isTable) && startTableId !== tableId) return
    // 开始位置
    let start = startIndex
    if (start > end) {
      // prettier-ignore
      [start, end] = [end, start]
    }
    if (start === end) return
    // 背景文本禁止选区
    const elementList = draw.getElementList()
    const startElement = elementList[start + 1]
    const endElement = elementList[end]
    if (
      startElement?.controlComponent === ControlComponent.PLACEHOLDER &&
      endElement?.controlComponent === ControlComponent.PLACEHOLDER &&
      startElement.controlId === endElement.controlId
    ) {
      return
    }
    rangeManager.setRange(start, end)
  }
  // 绘制
  draw.render({
    isSubmitHistory: false,
    isSetCursor: false,
    isCompute: false
  })
}
