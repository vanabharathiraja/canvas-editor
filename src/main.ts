import { commentList, data, options } from './mock'
import './style.css'
import prism from 'prismjs'
import docxPlugin from '@hufe921/canvas-editor-plugin-docx'
import Editor, {
  BlockType,
  Command,
  ControlState,
  ControlType,
  EditorMode,
  EditorZone,
  ElementType,
  IBlock,
  ICatalogItem,
  IElement,
  KeyMap,
  ListStyle,
  ListType,
  PageMode,
  PaperDirection,
  RowFlex,
  TextDecorationStyle,
  TitleLevel,
  splitText
} from './editor'
import { Dialog } from './components/dialog/Dialog'
import { formatPrismToken } from './utils/prism'
import { Signature } from './components/signature/Signature'
import { debounce, nextTick, scrollIntoView } from './utils'

window.onload = function () {
  const isApple =
    typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent)

  // 1. Initialize Editor
  const container = document.querySelector<HTMLDivElement>('.editor')!
  const instance = new Editor(
    container,
    {
      header: [
        {
          value: 'First People\'s Hospital',
          size: 28,
          color: '#FFFFFF',
          rowFlex: RowFlex.CENTER
        },
        {
          value: '\nOutpatient Medical Record',
          size: 14,
          color: '#FFFFFF',
          rowFlex: RowFlex.CENTER
        }
      ],
      main: <IElement[]>data,
      footer: [
        {
          value: 'Taqniat intelligent solutions Ltd.',
          size: 12,
          rowFlex: RowFlex.CENTER
        }
      ]
    },
    options
  )
  // Register docx plugin
  instance.use(docxPlugin as any)
  console.log('Instance: ', instance)
  // For Cypress testing
  Reflect.set(window, 'editor', instance)

  // Menu popup destroy
  window.addEventListener(
    'click',
    evt => {
      const visibleDom = document.querySelector('.visible')
      if (!visibleDom || visibleDom.contains(<Node>evt.target)) return
      visibleDom.classList.remove('visible')
    },
    {
      capture: true
    }
  )

  // 2. | Undo | Redo | Format Painter | Clear Format |
  const undoDom = document.querySelector<HTMLDivElement>('.menu-item__undo')!
  undoDom.title = `Undo (${isApple ? '⌘' : 'Ctrl'}+Z)`
  undoDom.onclick = function () {
    console.log('undo')
    instance.command.executeUndo()
  }

  const redoDom = document.querySelector<HTMLDivElement>('.menu-item__redo')!
  redoDom.title = `Redo (${isApple ? '⌘' : 'Ctrl'}+Y)`
  redoDom.onclick = function () {
    console.log('redo')
    instance.command.executeRedo()
  }

  const painterDom = document.querySelector<HTMLDivElement>(
    '.menu-item__painter'
  )!

  let isFirstClick = true
  let painterTimeout: number
  painterDom.onclick = function () {
    if (isFirstClick) {
      isFirstClick = false
      painterTimeout = window.setTimeout(() => {
        console.log('painter-click')
        isFirstClick = true
        instance.command.executePainter({
          isDblclick: false
        })
      }, 200)
    } else {
      window.clearTimeout(painterTimeout)
    }
  }

  painterDom.ondblclick = function () {
    console.log('painter-dblclick')
    isFirstClick = true
    window.clearTimeout(painterTimeout)
    instance.command.executePainter({
      isDblclick: true
    })
  }

  document.querySelector<HTMLDivElement>('.menu-item__format')!.onclick =
    function () {
      console.log('format')
      instance.command.executeFormat()
    }

  // 3. | Font | Font Size Up | Font Size Down | Bold | Italic | Underline | Strikeout | Superscript | Subscript | Font Color | Background |
  const fontDom = document.querySelector<HTMLDivElement>('.menu-item__font')!
  const fontSelectDom = fontDom.querySelector<HTMLDivElement>('.select')!
  const fontOptionDom = fontDom.querySelector<HTMLDivElement>('.options')!
  fontDom.onclick = function () {
    console.log('font')
    fontOptionDom.classList.toggle('visible')
  }
  fontOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeFont(li.dataset.family!)
  }

  const sizeSetDom = document.querySelector<HTMLDivElement>('.menu-item__size')!
  const sizeSelectDom = sizeSetDom.querySelector<HTMLDivElement>('.select')!
  const sizeOptionDom = sizeSetDom.querySelector<HTMLDivElement>('.options')!
  sizeSetDom.title = `Set Font Size`
  sizeSetDom.onclick = function () {
    console.log('size')
    sizeOptionDom.classList.toggle('visible')
  }
  sizeOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeSize(Number(li.dataset.size!))
  }

  const sizeAddDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-add'
  )!
  sizeAddDom.title = `Increase Font Size (${isApple ? '⌘' : 'Ctrl'}+[)`
  sizeAddDom.onclick = function () {
    console.log('size-add')
    instance.command.executeSizeAdd()
  }

  const sizeMinusDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-minus'
  )!
  sizeMinusDom.title = `Decrease Font Size (${isApple ? '⌘' : 'Ctrl'}+])`
  sizeMinusDom.onclick = function () {
    console.log('size-minus')
    instance.command.executeSizeMinus()
  }

  const boldDom = document.querySelector<HTMLDivElement>('.menu-item__bold')!
  boldDom.title = `Bold (${isApple ? '⌘' : 'Ctrl'}+B)`
  boldDom.onclick = function () {
    console.log('bold')
    instance.command.executeBold()
  }

  const italicDom =
    document.querySelector<HTMLDivElement>('.menu-item__italic')!
  italicDom.title = `Italic (${isApple ? '⌘' : 'Ctrl'}+I)`
  italicDom.onclick = function () {
    console.log('italic')
    instance.command.executeItalic()
  }

  const underlineDom = document.querySelector<HTMLDivElement>(
    '.menu-item__underline'
  )!
  underlineDom.title = `Underline (${isApple ? '⌘' : 'Ctrl'}+U)`
  const underlineOptionDom =
    underlineDom.querySelector<HTMLDivElement>('.options')!
  underlineDom.querySelector<HTMLSpanElement>('.select')!.onclick =
    function () {
      underlineOptionDom.classList.toggle('visible')
    }
  underlineDom.querySelector<HTMLElement>('i')!.onclick = function () {
    console.log('underline')
    instance.command.executeUnderline()
    underlineOptionDom.classList.remove('visible')
  }
  underlineDom.querySelector<HTMLUListElement>('ul')!.onmousedown = function (
    evt
  ) {
    const li = evt.target as HTMLLIElement
    const decorationStyle = <TextDecorationStyle>li.dataset.decorationStyle
    instance.command.executeUnderline({
      style: decorationStyle
    })
    underlineOptionDom.classList.remove('visible')
  }

  const strikeoutDom = document.querySelector<HTMLDivElement>(
    '.menu-item__strikeout'
  )!
  strikeoutDom.onclick = function () {
    console.log('strikeout')
    instance.command.executeStrikeout()
  }

  const superscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__superscript'
  )!
  superscriptDom.title = `Superscript (${isApple ? '⌘' : 'Ctrl'}+Shift+,)`
  superscriptDom.onclick = function () {
    console.log('superscript')
    instance.command.executeSuperscript()
  }

  const subscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__subscript'
  )!
  subscriptDom.title = `Subscript (${isApple ? '⌘' : 'Ctrl'}+Shift+.)`
  subscriptDom.onclick = function () {
    console.log('subscript')
    instance.command.executeSubscript()
  }

  const colorControlDom = document.querySelector<HTMLInputElement>('#color')
  if (colorControlDom) {
    colorControlDom.oninput = function () {
      instance.command.executeColor(colorControlDom.value)
    }
  }
  const colorDom = document.querySelector<HTMLDivElement>('.menu-item__color')!
  const colorSpanDom = colorDom.querySelector('span')!
  colorDom.onclick = function () {
    console.log('color')
    if (colorControlDom) colorControlDom.click()
  }

  const highlightControlDom = document.querySelector<HTMLInputElement>('#highlight')
  if (highlightControlDom) {
    highlightControlDom.oninput = function () {
      instance.command.executeHighlight(highlightControlDom.value)
    }
  }
  const highlightDom = document.querySelector<HTMLDivElement>(
    '.menu-item__highlight'
  )!
  highlightDom.onclick = function () {
    console.log('highlight')
    highlightControlDom?.click()
  }

  const titleDom = document.querySelector<HTMLDivElement>('.menu-item__title')!
  const titleSelectDom = titleDom.querySelector<HTMLDivElement>('.select')!
  const titleOptionDom = titleDom.querySelector<HTMLDivElement>('.options')!
  titleOptionDom.querySelectorAll('li').forEach((li, index) => {
    li.title = `Ctrl+${isApple ? 'Option' : 'Alt'}+${index}`
  })

  titleDom.onclick = function () {
    console.log('title')
    titleOptionDom.classList.toggle('visible')
  }
  titleOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const level = <TitleLevel>li.dataset.level
    instance.command.executeTitle(level || null)
  }

  const leftDom = document.querySelector<HTMLDivElement>('.menu-item__left')!
  leftDom.title = `Left Align (${isApple ? '⌘' : 'Ctrl'}+L)`
  leftDom.onclick = function () {
    console.log('left')
    instance.command.executeRowFlex(RowFlex.LEFT)
  }

  const centerDom =
    document.querySelector<HTMLDivElement>('.menu-item__center')!
  centerDom.title = `Center Align (${isApple ? '⌘' : 'Ctrl'}+E)`
  centerDom.onclick = function () {
    console.log('center')
    instance.command.executeRowFlex(RowFlex.CENTER)
  }

  const rightDom = document.querySelector<HTMLDivElement>('.menu-item__right')!
  rightDom.title = `Right Align (${isApple ? '⌘' : 'Ctrl'}+R)`
  rightDom.onclick = function () {
    console.log('right')
    instance.command.executeRowFlex(RowFlex.RIGHT)
  }

  const alignmentDom = document.querySelector<HTMLDivElement>(
    '.menu-item__alignment'
  )!
  alignmentDom.title = `Justify (${isApple ? '⌘' : 'Ctrl'}+J)`
  alignmentDom.onclick = function () {
    console.log('alignment')
    instance.command.executeRowFlex(RowFlex.ALIGNMENT)
  }

  const justifyDom = document.querySelector<HTMLDivElement>(
    '.menu-item__justify'
  )!
  justifyDom.title = `Distribute (${isApple ? '⌘' : 'Ctrl'}+Shift+J)`
  justifyDom.onclick = function () {
    console.log('justify')
    instance.command.executeRowFlex(RowFlex.JUSTIFY)
  }

  const rowMarginDom = document.querySelector<HTMLDivElement>(
    '.menu-item__row-margin'
  )!
  const rowOptionDom = rowMarginDom.querySelector<HTMLDivElement>('.options')!
  rowMarginDom.onclick = function () {
    console.log('row-margin')
    rowOptionDom.classList.toggle('visible')
  }
  rowOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeRowMargin(Number(li.dataset.rowmargin!))
  }

  const listDom = document.querySelector<HTMLDivElement>('.menu-item__list')!
  listDom.title = `List (${isApple ? '⌘' : 'Ctrl'}+Shift+U)`
  const listOptionDom = listDom.querySelector<HTMLDivElement>('.options')!
  listDom.onclick = function () {
    console.log('list')
    listOptionDom.classList.toggle('visible')
  }
  listOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const listType = <ListType>li.dataset.listType || null
    const listStyle = <ListStyle>(<unknown>li.dataset.listStyle)
    instance.command.executeList(listType, listStyle)
  }

  // 4. | Table | Image | Hyperlink | Separator | Watermark | Code Block | Page Break | Control | Checkbox | LaTeX | Date Picker
  const tableDom = document.querySelector<HTMLDivElement>('.menu-item__table')!
  const tablePanelContainer = document.querySelector<HTMLDivElement>(
    '.menu-item__table__collapse'
  )!
  const tableClose = document.querySelector<HTMLDivElement>('.table-close')!
  const tableTitle = document.querySelector<HTMLDivElement>('.table-select')!
  const tablePanel = document.querySelector<HTMLDivElement>('.table-panel')!
  // Draw rows and columns
  const tableCellList: HTMLDivElement[][] = []
  for (let i = 0; i < 10; i++) {
    const tr = document.createElement('tr')
    tr.classList.add('table-row')
    const trCellList: HTMLDivElement[] = []
    for (let j = 0; j < 10; j++) {
      const td = document.createElement('td')
      td.classList.add('table-cel')
      tr.append(td)
      trCellList.push(td)
    }
    tablePanel.append(tr)
    tableCellList.push(trCellList)
  }
  let colIndex = 0
  let rowIndex = 0
  // Remove all cell selection
  function removeAllTableCellSelect() {
    tableCellList.forEach(tr => {
      tr.forEach(td => td.classList.remove('active'))
    })
  }
  // Set title content
  function setTableTitle(payload: string) {
    tableTitle.innerText = payload
  }
  // Recovery to initial state
  function recoveryTable() {
    // Reset selection style, title, selected rows/cols
    removeAllTableCellSelect()
    setTableTitle('Insert')
    colIndex = 0
    rowIndex = 0
    // Hide panel
    tablePanelContainer.style.display = 'none'
  }
  tableDom.onclick = function () {
    console.log('table')
    tablePanelContainer!.style.display = 'block'
  }
  tablePanel.onmousemove = function (evt) {
    const celSize = 16
    const rowMarginTop = 10
    const celMarginRight = 6
    const { offsetX, offsetY } = evt
    // Remove all selection
    removeAllTableCellSelect()
    colIndex = Math.ceil(offsetX / (celSize + celMarginRight)) || 1
    rowIndex = Math.ceil(offsetY / (celSize + rowMarginTop)) || 1
    // Change selection style
    tableCellList.forEach((tr, trIndex) => {
      tr.forEach((td, tdIndex) => {
        if (tdIndex < colIndex && trIndex < rowIndex) {
          td.classList.add('active')
        }
      })
    })
    // Change table title
    setTableTitle(`${rowIndex}×${colIndex}`)
  }
  tableClose.onclick = function () {
    recoveryTable()
  }
  tablePanel.onclick = function () {
    // Apply selection
    instance.command.executeInsertTable(rowIndex, colIndex)
    recoveryTable()
  }

  const imageDom = document.querySelector<HTMLDivElement>('.menu-item__image')!
        const imageFileDom = document.querySelector<HTMLInputElement>('#image')
        imageDom.onclick = function () {
          if (imageFileDom) imageFileDom.click()
        }
        if (imageFileDom) {
          imageFileDom.onchange = function () {
            const file = imageFileDom.files![0]!
            const fileReader = new FileReader()
            fileReader.readAsDataURL(file)
            fileReader.onload = function () {
              // Calculate dimensions
              const image = new Image()
              const value = fileReader.result as string
              image.src = value
              image.onload = function () {
                instance.command.executeImage({
                  value,
                  width: image.width,
                  height: image.height
                })
                imageFileDom.value = ''
              }
            }
          }
        }

  const hyperlinkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__hyperlink'
  )!
  hyperlinkDom.onclick = function () {
    console.log('hyperlink')
    new Dialog({
      title: 'Hyperlink',
      data: [
        {
          type: 'text',
          label: 'Text',
          name: 'name',
          required: true,
          placeholder: 'Please enter text',
          value: instance.command.getRangeText()
        },
        {
          type: 'text',
          label: 'Link',
          name: 'url',
          required: true,
          placeholder: 'Please enter link'
        }
      ],
      onConfirm: payload => {
        const name = payload.find(p => p.name === 'name')?.value
        if (!name) return
        const url = payload.find(p => p.name === 'url')?.value
        if (!url) return
        instance.command.executeHyperlink({
          url,
          valueList: splitText(name).map(n => ({
            value: n,
            size: 16
          }))
        })
      }
    })
  }

  const separatorDom = document.querySelector<HTMLDivElement>(
    '.menu-item__separator'
  )!
  const separatorOptionDom =
    separatorDom.querySelector<HTMLDivElement>('.options')!
  separatorDom.onclick = function () {
    console.log('separator')
    separatorOptionDom.classList.toggle('visible')
  }
  separatorOptionDom.onmousedown = function (evt) {
    let payload: number[] = []
    const li = evt.target as HTMLLIElement
    const separatorDash = li.dataset.separator?.split(',').map(Number)
    if (separatorDash) {
      const isSingleLine = separatorDash.every(d => d === 0)
      if (!isSingleLine) {
        payload = separatorDash
      }
    }
    instance.command.executeSeparator(payload)
  }

  const pageBreakDom = document.querySelector<HTMLDivElement>(
    '.menu-item__page-break'
  )!
  pageBreakDom.onclick = function () {
    console.log('pageBreak')
    instance.command.executePageBreak()
  }

  const watermarkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__watermark'
  )!
  const watermarkOptionDom =
    watermarkDom.querySelector<HTMLDivElement>('.options')!
  watermarkDom.onclick = function () {
    console.log('watermark')
    watermarkOptionDom.classList.toggle('visible')
  }
  watermarkOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const menu = li.dataset.menu!
    watermarkOptionDom.classList.toggle('visible')
    if (menu === 'add') {
      new Dialog({
        title: 'Watermark',
        data: [
          {
            type: 'text',
            label: 'Content',
            name: 'data',
            required: true,
            placeholder: 'Please enter content'
          },
          {
            type: 'color',
            label: 'Color',
            name: 'color',
            required: true,
            value: '#AEB5C0'
          },
          {
            type: 'number',
            label: 'Font Size',
            name: 'size',
            required: true,
            value: '120'
          },
          {
            type: 'number',
            label: 'Opacity',
            name: 'opacity',
            required: true,
            value: '0.3'
          },
          {
            type: 'select',
            label: 'Repeat',
            name: 'repeat',
            value: '0',
            required: false,
            options: [
              {
                label: 'No Repeat',
                value: '0'
              },
              {
                label: 'Repeat',
                value: '1'
              }
            ]
          },
          {
            type: 'number',
            label: 'Horizontal Gap',
            name: 'horizontalGap',
            required: false,
            value: '10'
          },
          {
            type: 'number',
            label: 'Vertical Gap',
            name: 'verticalGap',
            required: false,
            value: '10'
          }
        ],
        onConfirm: payload => {
          const nullableIndex = payload.findIndex(p => !p.value)
          if (~nullableIndex) return
          const watermark = payload.reduce((pre, cur) => {
            pre[cur.name] = cur.value
            return pre
          }, <any>{})
          const repeat = watermark.repeat === '1'
          instance.command.executeAddWatermark({
            data: watermark.data,
            color: watermark.color,
            size: Number(watermark.size),
            opacity: Number(watermark.opacity),
            repeat,
            gap:
              repeat && watermark.horizontalGap && watermark.verticalGap
                ? [
                    Number(watermark.horizontalGap),
                    Number(watermark.verticalGap)
                  ]
                : undefined
          })
        }
      })
    } else {
      instance.command.executeDeleteWatermark()
    }
  }

  const codeblockDom = document.querySelector<HTMLDivElement>(
    '.menu-item__codeblock'
  )!
  codeblockDom.onclick = function () {
    console.log('codeblock')
    new Dialog({
      title: 'Code Block',
      data: [
        {
          type: 'textarea',
          name: 'codeblock',
          placeholder: 'Please enter code',
          width: 500,
          height: 300
        }
      ],
      onConfirm: payload => {
        const codeblock = payload.find(p => p.name === 'codeblock')?.value
        if (!codeblock) return
        const tokenList = prism.tokenize(codeblock, prism.languages.javascript)
        const formatTokenList = formatPrismToken(tokenList)
        const elementList: IElement[] = []
        for (let i = 0; i < formatTokenList.length; i++) {
          const formatToken = formatTokenList[i]
          const tokenStringList = splitText(formatToken.content)
          for (let j = 0; j < tokenStringList.length; j++) {
            const value = tokenStringList[j]
            const element: IElement = {
              value
            }
            if (formatToken.color) {
              element.color = formatToken.color
            }
            if (formatToken.bold) {
              element.bold = true
            }
            if (formatToken.italic) {
              element.italic = true
            }
            elementList.push(element)
          }
        }
        elementList.unshift({
          value: '\n'
        })
        instance.command.executeInsertElementList(elementList)
      }
    })
  }

  const controlDom = document.querySelector<HTMLDivElement>(
    '.menu-item__control'
  )!
  const controlOptionDom = controlDom.querySelector<HTMLDivElement>('.options')!
  controlDom.onclick = function () {
    console.log('control')
    controlOptionDom.classList.toggle('visible')
  }
  controlOptionDom.onmousedown = function (evt) {
    controlOptionDom.classList.toggle('visible')
    const li = evt.target as HTMLLIElement
    const type = <ControlType>li.dataset.control
    switch (type) {
      case ControlType.TEXT:
        new Dialog({
          title: 'Text Control',
          data: [
            {
              type: 'text',
              label: 'Placeholder',
              name: 'placeholder',
              required: true,
              placeholder: 'Please enter placeholder'
            },
            {
              type: 'text',
              label: 'Default Value',
              name: 'value',
              placeholder: 'Please enter default value'
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      case ControlType.SELECT:
        new Dialog({
          title: 'Select Control',
          data: [
            {
              type: 'text',
              label: 'Placeholder',
              name: 'placeholder',
              required: true,
              placeholder: 'Please enter placeholder'
            },
            {
              type: 'text',
              label: 'Default Value',
              name: 'code',
              placeholder: 'Please enter default value'
            },
            {
              type: 'textarea',
              label: 'Value Set',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Please enter value set JSON, e.g.:\n[{\n"value":"Yes",\n"code":"98175"\n}]`
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                placeholder,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.CHECKBOX:
        new Dialog({
          title: 'Checkbox Control',
          data: [
            {
              type: 'text',
              label: 'Default Value',
              name: 'code',
              placeholder: 'Please enter default value, separate multiple values with commas'
            },
            {
              type: 'textarea',
              label: 'Value Set',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Please enter value set JSON, e.g.:\n[{\n"value":"Yes",\n"code":"98175"\n}]`
            }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.RADIO:
        new Dialog({
          title: 'Radio Control',
          data: [
            {
              type: 'text',
              label: 'Default Value',
              name: 'code',
              placeholder: 'Please enter default value'
            },
            {
              type: 'textarea',
              label: 'Value Set',
              name: 'valueSets',
              required: true,
              height: 100,
              placeholder: `Please enter value set JSON, e.g.:\n[{\n"value":"Yes",\n"code":"98175"\n}]`
            }
          ],
          onConfirm: payload => {
            const valueSets = payload.find(p => p.name === 'valueSets')?.value
            if (!valueSets) return
            const code = payload.find(p => p.name === 'code')?.value
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                code,
                value: null,
                valueSets: JSON.parse(valueSets)
              }
            })
          }
        })
        break
      case ControlType.DATE:
        new Dialog({
          title: 'Date Control',
          data: [
            {
              type: 'text',
              label: 'Placeholder',
              name: 'placeholder',
              required: true,
              placeholder: 'Please enter placeholder'
            },
            {
              type: 'text',
              label: 'Default Value',
              name: 'value',
              placeholder: 'Please enter default value'
            },
            {
              type: 'select',
              label: 'Date Format',
              name: 'dateFormat',
              value: 'yyyy-MM-dd hh:mm:ss',
              required: true,
              options: [
                {
                  label: 'yyyy-MM-dd hh:mm:ss',
                  value: 'yyyy-MM-dd hh:mm:ss'
                },
                {
                  label: 'yyyy-MM-dd',
                  value: 'yyyy-MM-dd'
                }
              ]
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            const dateFormat =
              payload.find(p => p.name === 'dateFormat')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                dateFormat,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      case ControlType.NUMBER:
        new Dialog({
          title: 'Number Control',
          data: [
            {
              type: 'text',
              label: 'Placeholder',
              name: 'placeholder',
              required: true,
              placeholder: 'Please enter placeholder'
            },
            {
              type: 'text',
              label: 'Default Value',
              name: 'value',
              placeholder: 'Please enter default value'
            }
          ],
          onConfirm: payload => {
            const placeholder = payload.find(
              p => p.name === 'placeholder'
            )?.value
            if (!placeholder) return
            const value = payload.find(p => p.name === 'value')?.value || ''
            instance.command.executeInsertControl({
              type: ElementType.CONTROL,
              value: '',
              control: {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              }
            })
          }
        })
        break
      default:
        break
    }
  }

  const checkboxDom = document.querySelector<HTMLDivElement>(
    '.menu-item__checkbox'
  )!
  checkboxDom.onclick = function () {
    console.log('checkbox')
    instance.command.executeInsertElementList([
      {
        type: ElementType.CHECKBOX,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const radioDom = document.querySelector<HTMLDivElement>('.menu-item__radio')!
  radioDom.onclick = function () {
    console.log('radio')
    instance.command.executeInsertElementList([
      {
        type: ElementType.RADIO,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const latexDom = document.querySelector<HTMLDivElement>('.menu-item__latex')!
  latexDom.onclick = function () {
    console.log('LaTeX')
    new Dialog({
      title: 'LaTeX',
      data: [
        {
          type: 'textarea',
          height: 100,
          name: 'value',
          placeholder: 'Please enter LaTeX text'
        }
      ],
      onConfirm: payload => {
        const value = payload.find(p => p.name === 'value')?.value
        if (!value) return
        instance.command.executeInsertElementList([
          {
            type: ElementType.LATEX,
            value
          }
        ])
      }
    })
  }

  const dateDom = document.querySelector<HTMLDivElement>('.menu-item__date')!
  const dateDomOptionDom = dateDom.querySelector<HTMLDivElement>('.options')!
  dateDom.onclick = function () {
    console.log('date')
    dateDomOptionDom.classList.toggle('visible')
    // Position adjustment
    const bodyRect = document.body.getBoundingClientRect()
    const dateDomOptionRect = dateDomOptionDom.getBoundingClientRect()
    if (dateDomOptionRect.left + dateDomOptionRect.width > bodyRect.width) {
      dateDomOptionDom.style.right = '0px'
      dateDomOptionDom.style.left = 'unset'
    } else {
      dateDomOptionDom.style.right = 'unset'
      dateDomOptionDom.style.left = '0px'
    }
    // Current date
    const date = new Date()
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    const dateTimeString = `${dateString} ${hour}:${minute}:${second}`
    dateDomOptionDom.querySelector<HTMLLIElement>('li:first-child')!.innerText =
      dateString
    dateDomOptionDom.querySelector<HTMLLIElement>('li:last-child')!.innerText =
      dateTimeString
  }
  dateDomOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const dateFormat = li.dataset.format!
    dateDomOptionDom.classList.toggle('visible')
    instance.command.executeInsertElementList([
      {
        type: ElementType.DATE,
        value: '',
        dateFormat,
        valueList: [
          {
            value: li.innerText.trim()
          }
        ]
      }
    ])
  }

  const blockDom = document.querySelector<HTMLDivElement>('.menu-item__block')!
  blockDom.onclick = function () {
    console.log('block')
    new Dialog({
      title: 'Content Block',
      data: [
        {
          type: 'select',
          label: 'Type',
          name: 'type',
          value: 'iframe',
          required: true,
          options: [
            {
              label: 'URL',
              value: 'iframe'
            },
            {
              label: 'Video',
              value: 'video'
            }
          ]
        },
        {
          type: 'number',
          label: 'Width',
          name: 'width',
          placeholder: 'Please enter width (default is page inner width)'
        },
        {
          type: 'number',
          label: 'Height',
          name: 'height',
          required: true,
          placeholder: 'Please enter height'
        },
        {
          type: 'input',
          label: 'Address',
          name: 'src',
          required: false,
          placeholder: 'Please enter address'
        },
        {
          type: 'textarea',
          label: 'HTML',
          height: 100,
          name: 'srcdoc',
          required: false,
          placeholder: 'Please enter HTML code (only valid for URL type)'
        }
      ],
      onConfirm: payload => {
        const type = payload.find(p => p.name === 'type')?.value
        if (!type) return
        const width = payload.find(p => p.name === 'width')?.value
        const height = payload.find(p => p.name === 'height')?.value
        if (!height) return
        // Address or HTML code must have at least one
        const src = payload.find(p => p.name === 'src')?.value
        const srcdoc = payload.find(p => p.name === 'srcdoc')?.value
        const block: IBlock = {
          type: <BlockType>type
        }
        if (block.type === BlockType.IFRAME) {
          if (!src && !srcdoc) return
          block.iframeBlock = {
            src,
            srcdoc
          }
        } else if (block.type === BlockType.VIDEO) {
          if (!src) return
          block.videoBlock = {
            src
          }
        }
        const blockElement: IElement = {
          type: ElementType.BLOCK,
          value: '',
          height: Number(height),
          block
        }
        if (width) {
          blockElement.width = Number(width)
        }
        instance.command.executeInsertElementList([blockElement])
      }
    })
  }

  // 5. | Search & Replace | Print |
  const searchCollapseDom = document.querySelector<HTMLDivElement>(
    '.menu-item__search__collapse'
  )!
  const searchInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__search input'
  )!
  const replaceInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__replace input'
  )!
  const searchRegInputDom = document.querySelector<HTMLInputElement>('#option-reg')
  const searchCaseInputDom = document.querySelector<HTMLInputElement>('#option-case')
  const searchSelectionInputDom = document.querySelector<HTMLInputElement>('#option-selection')
  const searchDom =
    document.querySelector<HTMLDivElement>('.menu-item__search')!
  searchDom.title = `Search & Replace (${isApple ? '⌘' : 'Ctrl'}+F)`
  const searchResultDom =
    searchCollapseDom.querySelector<HTMLLabelElement>('.search-result')!
  function setSearchResult() {
    const result = instance.command.getSearchNavigateInfo()
    if (result) {
      const { index, count } = result
      searchResultDom.innerText = `${index}/${count}`
    } else {
      searchResultDom.innerText = ''
    }
  }
  searchDom.onclick = function () {
    console.log('search')
    searchCollapseDom.style.display = 'block'
    const bodyRect = document.body.getBoundingClientRect()
    const searchRect = searchDom.getBoundingClientRect()
    const searchCollapseRect = searchCollapseDom.getBoundingClientRect()
    if (searchRect.left + searchCollapseRect.width > bodyRect.width) {
      searchCollapseDom.style.right = '0px'
      searchCollapseDom.style.left = 'unset'
    } else {
      searchCollapseDom.style.right = 'unset'
    }
    searchInputDom.focus()
  }
  searchCollapseDom.querySelector<HTMLSpanElement>('span')!.onclick =
    function () {
      searchCollapseDom.style.display = 'none'
      searchInputDom.value = ''
      replaceInputDom.value = ''
      instance.command.executeSearch(null)
      setSearchResult()
    }

  function emitSearch() {
    instance.command.executeSearch(searchInputDom.value || null, {
      isRegEnable: searchRegInputDom ? searchRegInputDom.checked : false,
      isIgnoreCase: searchCaseInputDom ? searchCaseInputDom.checked : false,
      isLimitSelection: searchSelectionInputDom ? searchSelectionInputDom.checked : false
    })
    setSearchResult()
  }

  searchInputDom.oninput = emitSearch
  if (searchRegInputDom) searchRegInputDom.onchange = emitSearch
  if (searchCaseInputDom) searchCaseInputDom.onchange = emitSearch
  if (searchSelectionInputDom) searchSelectionInputDom.onchange = emitSearch
  searchInputDom.onkeydown = function (evt) {
    if (evt.key === 'Enter') {
      emitSearch()
    }
  }
  searchCollapseDom.querySelector<HTMLButtonElement>('button')!.onclick =
    function () {
      const searchValue = searchInputDom.value
      const replaceValue = replaceInputDom.value
      if (searchValue && searchValue !== replaceValue) {
        instance.command.executeReplace(replaceValue)
      }
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-left')!.onclick =
    function () {
      instance.command.executeSearchNavigatePre()
      setSearchResult()
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-right')!.onclick =
    function () {
      instance.command.executeSearchNavigateNext()
      setSearchResult()
    }

  const printDom = document.querySelector<HTMLDivElement>('.menu-item__print')!
  printDom.title = `Print (${isApple ? '⌘' : 'Ctrl'}+P)`
  printDom.onclick = function () {
    console.log('print')
    instance.command.executePrint()
  }

  // Import DOCX
  const importDocxDom = document.querySelector<HTMLDivElement>('.menu-item__import-docx')!
  const importDocxFileDom = document.querySelector<HTMLInputElement>('#import-docx')
  importDocxDom.onclick = function () {
    if (importDocxFileDom) importDocxFileDom.click()
  }
  if (importDocxFileDom) {
    importDocxFileDom.onchange = function () {
      const file = importDocxFileDom.files![0]
      if (!file) return
      const fileReader = new FileReader()
      fileReader.readAsArrayBuffer(file)
      fileReader.onload = function () {
        const arrayBuffer = fileReader.result as ArrayBuffer
        ;(instance.command as any).executeImportDocx({
          arrayBuffer
        })
        importDocxFileDom.value = ''
      }
    }
  }

  // Export DOCX
  const exportDocxDom = document.querySelector<HTMLDivElement>('.menu-item__export-docx')!
  exportDocxDom.onclick = function () {
    console.log('export docx')
    ;(instance.command as any).executeExportDocx({
      fileName: 'canvas-editor-export'
    })
  }

  // 6. Catalog Show/Hide | Page Mode | Paper Scale | Paper Size | Paper Direction | Page Margin | Fullscreen | Settings
  const editorOptionDom =
    document.querySelector<HTMLDivElement>('.editor-option')!
  editorOptionDom.onclick = function () {
    const options = instance.command.getOptions()
    new Dialog({
      title: 'Editor Configuration',
      data: [
        {
          type: 'textarea',
          name: 'option',
          width: 350,
          height: 300,
          required: true,
          value: JSON.stringify(options, null, 2),
          placeholder: 'Please enter editor configuration'
        }
      ],
      onConfirm: payload => {
        const newOptionValue = payload.find(p => p.name === 'option')?.value
        if (!newOptionValue) return
        const newOption = JSON.parse(newOptionValue)
        instance.command.executeUpdateOptions(newOption)
      }
    })
  }

  async function updateCatalog() {
    const catalog = await instance.command.getCatalog()
    const catalogMainDom =
      document.querySelector<HTMLDivElement>('.catalog__main')!
    catalogMainDom.innerHTML = ''
    if (catalog) {
      const appendCatalog = (
        parent: HTMLDivElement,
        catalogItems: ICatalogItem[]
      ) => {
        for (let c = 0; c < catalogItems.length; c++) {
          const catalogItem = catalogItems[c]
          const catalogItemDom = document.createElement('div')
          catalogItemDom.classList.add('catalog-item')
          // Render
          const catalogItemContentDom = document.createElement('div')
          catalogItemContentDom.classList.add('catalog-item__content')
          const catalogItemContentSpanDom = document.createElement('span')
          catalogItemContentSpanDom.innerText = catalogItem.name
          catalogItemContentDom.append(catalogItemContentSpanDom)
          // Locate
          catalogItemContentDom.onclick = () => {
            instance.command.executeLocationCatalog(catalogItem.id)
          }
          catalogItemDom.append(catalogItemContentDom)
          if (catalogItem.subCatalog && catalogItem.subCatalog.length) {
            appendCatalog(catalogItemDom, catalogItem.subCatalog)
          }
          // Append
          parent.append(catalogItemDom)
        }
      }
      appendCatalog(catalogMainDom, catalog)
    }
  }
  let isCatalogShow = true
  const catalogDom = document.querySelector<HTMLElement>('.catalog')!
  const catalogModeDom =
    document.querySelector<HTMLDivElement>('.catalog-mode')!
  const catalogHeaderCloseDom = document.querySelector<HTMLDivElement>(
    '.catalog__header__close'
  )!
  const switchCatalog = () => {
    isCatalogShow = !isCatalogShow
    if (isCatalogShow) {
      catalogDom.style.display = 'block'
      updateCatalog()
    } else {
      catalogDom.style.display = 'none'
    }
  }
  catalogModeDom.onclick = switchCatalog
  catalogHeaderCloseDom.onclick = switchCatalog

  const pageModeDom = document.querySelector<HTMLDivElement>('.page-mode')!
  const pageModeOptionsDom =
    pageModeDom.querySelector<HTMLDivElement>('.options')!
  pageModeDom.onclick = function () {
    pageModeOptionsDom.classList.toggle('visible')
  }
  pageModeOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executePageMode(<PageMode>li.dataset.pageMode!)
  }

  document.querySelector<HTMLDivElement>('.page-scale-percentage')!.onclick =
    function () {
      console.log('page-scale-recovery')
      instance.command.executePageScaleRecovery()
    }

  document.querySelector<HTMLDivElement>('.page-scale-minus')!.onclick =
    function () {
      console.log('page-scale-minus')
      instance.command.executePageScaleMinus()
    }

  document.querySelector<HTMLDivElement>('.page-scale-add')!.onclick =
    function () {
      console.log('page-scale-add')
      instance.command.executePageScaleAdd()
    }

  // Paper Size
  const paperSizeDom = document.querySelector<HTMLDivElement>('.paper-size')!
  console.log("Paper Size DOM:", paperSizeDom)
  const paperSizeDomOptionsDom =
    paperSizeDom.querySelector<HTMLDivElement>('.options')!
  paperSizeDom.onclick = function () {
    console.log('paper-size')
    paperSizeDomOptionsDom.classList.toggle('visible')
  }
  paperSizeDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const paperType = li.dataset.paperSize!
    const [width, height] = paperType.split('*').map(Number)
    instance.command.executePaperSize(width, height)
    // Paper status feedback
    paperSizeDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // Paper Direction
  const paperDirectionDom =
    document.querySelector<HTMLDivElement>('.paper-direction')!
  const paperDirectionDomOptionsDom =
    paperDirectionDom.querySelector<HTMLDivElement>('.options')!
  paperDirectionDom.onclick = function () {
    paperDirectionDomOptionsDom.classList.toggle('visible')
  }
  paperDirectionDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const paperDirection = li.dataset.paperDirection!
    instance.command.executePaperDirection(<PaperDirection>paperDirection)
    // Paper direction status feedback
    paperDirectionDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // Page Margin
  const paperMarginDom =
    document.querySelector<HTMLDivElement>('.paper-margin')!
  paperMarginDom.onclick = function () {
    const [topMargin, rightMargin, bottomMargin, leftMargin] =
      instance.command.getPaperMargin()
    new Dialog({
      title: 'Page Margin',
      data: [
        {
          type: 'text',
          label: 'Top Margin',
          name: 'top',
          required: true,
          value: `${topMargin}`,
          placeholder: 'Please enter top margin'
        },
        {
          type: 'text',
          label: 'Bottom Margin',
          name: 'bottom',
          required: true,
          value: `${bottomMargin}`,
          placeholder: 'Please enter bottom margin'
        },
        {
          type: 'text',
          label: 'Left Margin',
          name: 'left',
          required: true,
          value: `${leftMargin}`,
          placeholder: 'Please enter left margin'
        },
        {
          type: 'text',
          label: 'Right Margin',
          name: 'right',
          required: true,
          value: `${rightMargin}`,
          placeholder: 'Please enter right margin'
        }
      ],
      onConfirm: payload => {
        const top = payload.find(p => p.name === 'top')?.value
        if (!top) return
        const bottom = payload.find(p => p.name === 'bottom')?.value
        if (!bottom) return
        const left = payload.find(p => p.name === 'left')?.value
        if (!left) return
        const right = payload.find(p => p.name === 'right')?.value
        if (!right) return
        instance.command.executeSetPaperMargin([
          Number(top),
          Number(right),
          Number(bottom),
          Number(left)
        ])
      }
    })
  }

  // Fullscreen
  const fullscreenDom = document.querySelector<HTMLDivElement>('.fullscreen')!
  fullscreenDom.onclick = toggleFullscreen
  window.addEventListener('keydown', evt => {
    if (evt.key === 'F11') {
      toggleFullscreen()
      evt.preventDefault()
    }
  })
  document.addEventListener('fullscreenchange', () => {
    fullscreenDom.classList.toggle('exist')
  })
  function toggleFullscreen() {
    console.log('fullscreen')
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // 7. Editor Mode
  let modeIndex = 0
  const modeList = [
    {
      mode: EditorMode.EDIT,
      name: 'Edit Mode'
    },
    {
      mode: EditorMode.CLEAN,
      name: 'Clean Mode'
    },
    {
      mode: EditorMode.READONLY,
      name: 'Readonly Mode'
    },
    {
      mode: EditorMode.FORM,
      name: 'Form Mode'
    },
    {
      mode: EditorMode.PRINT,
      name: 'Print Mode'
    },
    {
      mode: EditorMode.DESIGN,
      name: 'Design Mode'
    },
    {
      mode: EditorMode.GRAFFITI,
      name: 'Graffiti Mode'
    }
  ]
  const modeElement = document.querySelector<HTMLDivElement>('.editor-mode')!
  modeElement.onclick = function () {
    // Mode selection cycle
    modeIndex === modeList.length - 1 ? (modeIndex = 0) : modeIndex++
    // Set mode
    const { name, mode } = modeList[modeIndex]
    modeElement.innerText = name
    instance.command.executeMode(mode)
    // Set menu permission visual feedback
    const isReadonly = mode === EditorMode.READONLY
    const enableMenuList = ['search', 'print']
    document.querySelectorAll<HTMLDivElement>('.menu-item>div').forEach(dom => {
      const menu = dom.dataset.menu
      isReadonly && (!menu || !enableMenuList.includes(menu))
        ? dom.classList.add('disable')
        : dom.classList.remove('disable')
    })
  }

  // Simulate comments
  const commentDom = document.querySelector<HTMLDivElement>('.comment')!
  async function updateComment() {
    const groupIds = await instance.command.getGroupIds()
    for (const comment of commentList) {
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${comment.id}']`
      )
      // Check if editor has corresponding group id
      if (groupIds.includes(comment.id)) {
        // Check if current dom exists - append if not
        if (!activeCommentDom) {
          const commentItem = document.createElement('div')
          commentItem.classList.add('comment-item')
          commentItem.setAttribute('data-id', comment.id)
          commentItem.onclick = () => {
            instance.command.executeLocationGroup(comment.id)
          }
          commentDom.append(commentItem)
          // Selection info
          const commentItemTitle = document.createElement('div')
          commentItemTitle.classList.add('comment-item__title')
          commentItemTitle.append(document.createElement('span'))
          const commentItemTitleContent = document.createElement('span')
          commentItemTitleContent.innerText = comment.rangeText
          commentItemTitle.append(commentItemTitleContent)
          const closeDom = document.createElement('i')
          closeDom.onclick = () => {
            instance.command.executeDeleteGroup(comment.id)
          }
          commentItemTitle.append(closeDom)
          commentItem.append(commentItemTitle)
          // Basic info
          const commentItemInfo = document.createElement('div')
          commentItemInfo.classList.add('comment-item__info')
          const commentItemInfoName = document.createElement('span')
          commentItemInfoName.innerText = comment.userName
          const commentItemInfoDate = document.createElement('span')
          commentItemInfoDate.innerText = comment.createdDate
          commentItemInfo.append(commentItemInfoName)
          commentItemInfo.append(commentItemInfoDate)
          commentItem.append(commentItemInfo)
          // Detailed comment
          const commentItemContent = document.createElement('div')
          commentItemContent.classList.add('comment-item__content')
          commentItemContent.innerText = comment.content
          commentItem.append(commentItemContent)
          commentDom.append(commentItem)
        }
      } else {
        // Remove dom if editor doesn't have corresponding group id
        activeCommentDom?.remove()
      }
    }
  }
  // 8. Internal Event Listeners
  instance.listener.rangeStyleChange = function (payload) {
    // Control type
    payload.type === ElementType.SUBSCRIPT
      ? subscriptDom.classList.add('active')
      : subscriptDom.classList.remove('active')
    payload.type === ElementType.SUPERSCRIPT
      ? superscriptDom.classList.add('active')
      : superscriptDom.classList.remove('active')
    payload.type === ElementType.SEPARATOR
      if (subscriptDom) {
        payload.type === ElementType.SUBSCRIPT
          ? subscriptDom.classList.add('active')
          : subscriptDom.classList.remove('active')
      }
      if (superscriptDom) {
        payload.type === ElementType.SUPERSCRIPT
          ? superscriptDom.classList.add('active')
          : superscriptDom.classList.remove('active')
      }
      if (separatorDom) {
        payload.type === ElementType.SEPARATOR
          ? separatorDom.classList.add('active')
          : separatorDom.classList.remove('active')
      }
      if (separatorOptionDom) {
        separatorOptionDom
          .querySelectorAll('li')
          .forEach(li => li.classList.remove('active'))
        if (payload.type === ElementType.SEPARATOR) {
          const separator = payload.dashArray.join(',') || '0,0'
          const curSeparatorDom = separatorOptionDom.querySelector<HTMLLIElement>(
            `[data-separator='${separator}']`
          )
          if (curSeparatorDom) {/* Lines 1651-1652 omitted */}
        }
      }

      // Rich text
      if (fontOptionDom) {
        fontOptionDom
          .querySelectorAll<HTMLLIElement>('li')
          .forEach(li => li.classList.remove('active'))
        const curFontDom = fontOptionDom.querySelector<HTMLLIElement>(
          `[data-family='${payload.font}']`
        )
        if (curFontDom && fontSelectDom) {
          fontSelectDom.innerText = curFontDom.innerText
          fontSelectDom.style.fontFamily = payload.font
          curFontDom.classList.add('active')
        }
      }
      if (sizeOptionDom) {
        sizeOptionDom
          .querySelectorAll<HTMLLIElement>('li')
          .forEach(li => li.classList.remove('active'))
        const curSizeDom = sizeOptionDom.querySelector<HTMLLIElement>(
          `[data-size='${payload.size}']`
        )
        if (curSizeDom && sizeSelectDom) {
          sizeSelectDom.innerText = curSizeDom.innerText
          curSizeDom.classList.add('active')
        } else if (sizeSelectDom) {
          sizeSelectDom.innerText = `${payload.size}`
        }
      }
      if (boldDom) {
        payload.bold
          ? boldDom.classList.add('active')
          : boldDom.classList.remove('active')
      }
      if (italicDom) {
        payload.italic
          ? italicDom.classList.add('active')
          : italicDom.classList.remove('active')
      }
      if (underlineDom) {
        payload.underline
          ? underlineDom.classList.add('active')
          : underlineDom.classList.remove('active')
      }
      if (strikeoutDom) {
        payload.strikeout
          ? strikeoutDom.classList.add('active')
          : strikeoutDom.classList.remove('active')
      }
      if (colorDom && colorControlDom && colorSpanDom) {
        if (payload.color) {
          colorDom.classList.add('active')
          colorControlDom.value = payload.color
          colorSpanDom.style.backgroundColor = payload.color
        } else {
          colorDom.classList.remove('active')
          colorControlDom.value = '#000000'
          colorSpanDom.style.backgroundColor = '#000000'
        }
      }
      if (highlightDom) {
        if (payload.highlight) {
          highlightDom.classList.add('active')
          /* Lines 1702-1704 omitted */
        } else {/* Lines 1705-1708 omitted */}
      }

      // Row layout
      if (leftDom) leftDom.classList.remove('active')
      if (centerDom) centerDom.classList.remove('active')
      if (rightDom) rightDom.classList.remove('active')
      if (alignmentDom) alignmentDom.classList.remove('active')
      if (justifyDom) justifyDom.classList.remove('active')
      if (payload.rowFlex && payload.rowFlex === 'right') {/* Lines 1717-1718 omitted */} else if (payload.rowFlex && payload.rowFlex === 'center') {/* Lines 1719-1720 omitted */} else if (payload.rowFlex && payload.rowFlex === 'alignment') {/* Lines 1721-1722 omitted */} else if (payload.rowFlex && payload.rowFlex === 'justify') {/* Lines 1723-1724 omitted */} else {/* Lines 1725-1726 omitted */}

      // Row spacing
      if (rowOptionDom) {
        rowOptionDom
          .querySelectorAll<HTMLLIElement>('li')
          .forEach(li => li.classList.remove('active'))
        const curRowMarginDom = rowOptionDom.querySelector<HTMLLIElement>(
          `[data-rowmargin='${payload.rowMargin}']`
        )
        if (curRowMarginDom) curRowMarginDom.classList.add('active')
      }

      // Features
      if (undoDom) {
        payload.undo
          ? undoDom.classList.remove('no-allow')
          : undoDom.classList.add('no-allow')
      }
      if (redoDom) {
        payload.redo
          ? redoDom.classList.remove('no-allow')
          : redoDom.classList.add('no-allow')
      }
      if (painterDom) {
        payload.painter
          ? painterDom.classList.add('active')
          : painterDom.classList.remove('active')
      }

      // Title
      if (titleOptionDom) {
        titleOptionDom
          .querySelectorAll<HTMLLIElement>('li')
          .forEach(li => li.classList.remove('active'))
        if (payload.level) {/* Lines 1753-1758 omitted */} else {/* Lines 1759-1761 omitted */}
      }
      /* Lines 1762-1809 omitted */
    payload.painter
      ? painterDom.classList.add('active')
      : painterDom.classList.remove('active')

    // Title
    titleOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.level) {
      const curTitleDom = titleOptionDom.querySelector<HTMLLIElement>(
        `[data-level='${payload.level}']`
      )!
      titleSelectDom.innerText = curTitleDom.innerText
      curTitleDom.classList.add('active')
    } else {
      titleSelectDom.innerText = 'Body Text'
      titleOptionDom.querySelector('li:first-child')!.classList.add('active')
    }

    // List
    listOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.listType) {
      listDom.classList.add('active')
      const listType = payload.listType
      const listStyle =
        payload.listType === ListType.OL ? ListStyle.DECIMAL : payload.listType
      const curListDom = listOptionDom.querySelector<HTMLLIElement>(
        `[data-list-type='${listType}'][data-list-style='${listStyle}']`
      )
      if (curListDom) {
        curListDom.classList.add('active')
      }
    } else {
      listDom.classList.remove('active')
    }

    // Comment
    commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(commentItemDom => {
        commentItemDom.classList.remove('active')
      })
    if (payload.groupIds) {
      const [id] = payload.groupIds
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${id}']`
      )
      if (activeCommentDom) {
        activeCommentDom.classList.add('active')
        scrollIntoView(commentDom, activeCommentDom)
      }
    }

    // Row and column info
    const rangeContext = instance.command.getRangeContext()
    if (rangeContext) {
      document.querySelector<HTMLSpanElement>('.row-no')!.innerText = `${
        rangeContext.startRowNo + 1
      }`
      document.querySelector<HTMLSpanElement>('.col-no')!.innerText = `${
        rangeContext.startColNo + 1
      }`
    }
  }

  instance.listener.visiblePageNoListChange = function (payload) {
    const text = payload.map(i => i + 1).join('、')
    document.querySelector<HTMLSpanElement>('.page-no-list')!.innerText = text
  }

  instance.listener.pageSizeChange = function (payload) {
    document.querySelector<HTMLSpanElement>(
      '.page-size'
    )!.innerText = `${payload}`
  }

  instance.listener.intersectionPageNoChange = function (payload) {
    document.querySelector<HTMLSpanElement>('.page-no')!.innerText = `${
      payload + 1
    }`
  }

  instance.listener.pageScaleChange = function (payload) {
    document.querySelector<HTMLSpanElement>(
      '.page-scale-percentage'
    )!.innerText = `${Math.floor(payload * 10 * 10)}%`
  }

  instance.listener.controlChange = function (payload) {
    const disableMenusInControlContext = [
      'table',
      'hyperlink',
      'separator',
      'page-break',
      'control'
    ]
    // Menu operation permissions
    disableMenusInControlContext.forEach(menu => {
      const menuDom = document.querySelector<HTMLDivElement>(
        `.menu-item__${menu}`
      )!
      payload.state === ControlState.ACTIVE
        ? menuDom.classList.add('disable')
        : menuDom.classList.remove('disable')
    })
  }

  instance.listener.pageModeChange = function (payload) {
    const activeMode = pageModeOptionsDom.querySelector<HTMLLIElement>(
      `[data-page-mode='${payload}']`
    )!
    pageModeOptionsDom
      .querySelectorAll('li')
      .forEach(li => li.classList.remove('active'))
    activeMode.classList.add('active')
  }

  const handleContentChange = async function () {
    // Word count
    const wordCount = await instance.command.getWordCount()
    document.querySelector<HTMLSpanElement>('.word-count')!.innerText = `${
      wordCount || 0
    }`
    // Catalog
    if (isCatalogShow) {
      nextTick(() => {
        updateCatalog()
      })
    }
    // Comment
    nextTick(() => {
      updateComment()
    })
  }
  instance.listener.contentChange = debounce(handleContentChange, 200)
  handleContentChange()

  instance.listener.saved = function (payload) {
    console.log('elementList: ', payload)
  }

  // 9. Context Menu Registration
  instance.register.contextMenuList([
    {
      name: 'Comment',
      when: payload => {
        return (
          !payload.isReadonly &&
          payload.editorHasSelection &&
          payload.zone === EditorZone.MAIN
        )
      },
      callback: (command: Command) => {
        new Dialog({
          title: 'Comment',
          data: [
            {
              type: 'textarea',
              label: 'Comment',
              height: 100,
              name: 'value',
              required: true,
              placeholder: 'Please enter comment'
            }
          ],
          onConfirm: payload => {
            const value = payload.find(p => p.name === 'value')?.value
            if (!value) return
            const groupId = command.executeSetGroup()
            if (!groupId) return
            commentList.push({
              id: groupId,
              content: value,
              userName: 'Hufe',
              rangeText: command.getRangeText(),
              createdDate: new Date().toLocaleString()
            })
          }
        })
      }
    },
    {
      name: 'Signature',
      icon: 'signature',
      when: payload => {
        return !payload.isReadonly && payload.editorTextFocus
      },
      callback: (command: Command) => {
        new Signature({
          onConfirm(payload) {
            if (!payload) return
            const { value, width, height } = payload
            if (!value || !width || !height) return
            command.executeInsertElementList([
              {
                value,
                width,
                height,
                type: ElementType.IMAGE
              }
            ])
          }
        })
      }
    },
    {
      name: 'Format Cleanup',
      icon: 'word-tool',
      when: payload => {
        return !payload.isReadonly
      },
      callback: (command: Command) => {
        command.executeWordTool()
      }
    },
    {
      name: 'Clear Graffiti',
      when: payload => {
        return payload.options.mode === EditorMode.GRAFFITI
      },
      callback: (command: Command) => {
        command.executeClearGraffiti()
      }
    }
  ])

  // 10. Shortcut Registration
  instance.register.shortcutList([
    {
      key: KeyMap.P,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePrint()
      }
    },
    {
      key: KeyMap.F,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        const text = command.getRangeText()
        searchDom.click()
        if (text) {
          searchInputDom.value = text
          instance.command.executeSearch(text)
          setSearchResult()
        }
      }
    },
    {
      key: KeyMap.MINUS,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleMinus()
      }
    },
    {
      key: KeyMap.EQUAL,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleAdd()
      }
    },
    {
      key: KeyMap.ZERO,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleRecovery()
      }
    }
  ])
}
