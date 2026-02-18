import { EditorComponent, EDITOR_COMPONENT } from '../../editor'
import { TableBorder, TdBorderStyle } from '../../editor/dataset/enum/table/Table'
import { VerticalAlign } from '../../editor/dataset/enum/VerticalAlign'
import { Command } from '../../editor/core/command/Command'
import './tablePropertiesDialog.css'

export interface ITablePropertiesOptions {
  /** Current table element for reading initial values */
  tableElement: {
    borderColor?: string
    borderWidth?: number
    borderType?: string
  } | null
  command: Command
  onClose?: () => void
}

export class TablePropertiesDialog {
  private mask: HTMLDivElement | null = null
  private container: HTMLDivElement | null = null

  // Table-level fields
  private tableBorderTypeSelect: HTMLSelectElement | null = null
  private tableBorderColorText: HTMLInputElement | null = null

  // Cell-level fields
  private cellBgColorText: HTMLInputElement | null = null
  private cellBorderColorText: HTMLInputElement | null = null
  private cellBorderWidthSelect: HTMLSelectElement | null = null
  private cellBorderStyleSelect: HTMLSelectElement | null = null
  private cellVAlignSelect: HTMLSelectElement | null = null
  private cellPaddingInput: HTMLInputElement | null = null

  constructor(private options: ITablePropertiesOptions) {
    this._render()
  }

  private _render() {
    const { tableElement, command, onClose } = this.options

    // Mask
    const mask = document.createElement('div')
    mask.classList.add('tp-dialog-mask')
    mask.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
    document.body.append(mask)
    this.mask = mask

    // Container
    const container = document.createElement('div')
    container.classList.add('tp-dialog-container')
    container.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)

    const dialog = document.createElement('div')
    dialog.classList.add('tp-dialog')
    container.append(dialog)

    // Title bar
    const titleBar = document.createElement('div')
    titleBar.classList.add('tp-dialog-title')
    const titleText = document.createElement('span')
    titleText.textContent = 'Table Properties'
    const closeBtn = document.createElement('i')
    closeBtn.title = 'Close'
    closeBtn.onclick = () => {
      onClose?.()
      this._dispose()
    }
    titleBar.append(titleText, closeBtn)
    dialog.append(titleBar)

    // ── Section 1: Table border ──
    const tableSection = this._createSection('Table Border')

    // Border type
    const borderTypeRow = this._createRow('Border Type')
    this.tableBorderTypeSelect = document.createElement('select')
    const borderTypeOptions: { value: string; label: string }[] = [
      { value: TableBorder.ALL, label: 'All' },
      { value: TableBorder.EMPTY, label: 'None' },
      { value: TableBorder.EXTERNAL, label: 'Outer Only' },
      { value: TableBorder.INTERNAL, label: 'Inner Only' },
      { value: TableBorder.DASH, label: 'Dashed' }
    ]
    borderTypeOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (tableElement?.borderType === opt.value) option.selected = true
      this.tableBorderTypeSelect!.append(option)
    })
    borderTypeRow.append(this.tableBorderTypeSelect)
    tableSection.append(borderTypeRow)

    // Border color
    const borderColorRow = this._createRow('Border Color')
    const { colorInput: tbc, colorText: tbct, wrapper: tbcw } =
      this._createColorRow(tableElement?.borderColor || '#000000')
    this.tableBorderColorText = tbct
    void tbc // picker syncs with text field; managed locally
    borderColorRow.append(tbcw)
    tableSection.append(borderColorRow)

    dialog.append(tableSection)

    // ── Section 2: Cell styling ──
    const cellSection = this._createSection('Cell Styling (selected cells)')

    // Background color
    const bgRow = this._createRow('Background Color')
    const { colorInput: bgc, colorText: bgct, wrapper: bgw } =
      this._createColorRow('#ffffff')
    this.cellBgColorText = bgct
    void bgc
    bgRow.append(bgw)
    cellSection.append(bgRow)

    // Cell border color
    const cellBcRow = this._createRow('Border Color')
    const { colorInput: cbc, colorText: cbct, wrapper: cbcw } =
      this._createColorRow('#000000')
    this.cellBorderColorText = cbct
    void cbc
    cellBcRow.append(cbcw)
    cellSection.append(cellBcRow)

    // Cell border width
    const cellBwRow = this._createRow('Border Width')
    this.cellBorderWidthSelect = document.createElement('select')
    const bwOptions = [
      { value: '-1', label: '(keep existing)' },
      { value: '0', label: 'None (0px)' },
      { value: '1', label: 'Thin (1px)' },
      { value: '2', label: 'Medium (2px)' },
      { value: '3', label: 'Thick (3px)' }
    ]
    bwOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      this.cellBorderWidthSelect!.append(option)
    })
    cellBwRow.append(this.cellBorderWidthSelect)
    cellSection.append(cellBwRow)

    // Cell border style
    const cellBsRow = this._createRow('Border Style')
    this.cellBorderStyleSelect = document.createElement('select')
    const bsOptions: { value: string; label: string }[] = [
      { value: '', label: '(keep existing)' },
      { value: TdBorderStyle.SOLID, label: 'Solid' },
      { value: TdBorderStyle.DASHED, label: 'Dashed' },
      { value: TdBorderStyle.DOTTED, label: 'Dotted' },
      { value: TdBorderStyle.DOUBLE, label: 'Double' }
    ]
    bsOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      this.cellBorderStyleSelect!.append(option)
    })
    cellBsRow.append(this.cellBorderStyleSelect)
    cellSection.append(cellBsRow)

    // Vertical align
    const vAlignRow = this._createRow('Vertical Align')
    this.cellVAlignSelect = document.createElement('select')
    const vaOptions: { value: string; label: string }[] = [
      { value: '', label: '(keep existing)' },
      { value: VerticalAlign.TOP, label: 'Top' },
      { value: VerticalAlign.MIDDLE, label: 'Middle' },
      { value: VerticalAlign.BOTTOM, label: 'Bottom' }
    ]
    vaOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      this.cellVAlignSelect!.append(option)
    })
    vAlignRow.append(this.cellVAlignSelect)
    cellSection.append(vAlignRow)

    // Cell padding
    const paddingRow = this._createRow('Padding (px)')
    this.cellPaddingInput = document.createElement('input')
    this.cellPaddingInput.type = 'number'
    this.cellPaddingInput.min = '0'
    this.cellPaddingInput.max = '40'
    this.cellPaddingInput.placeholder = 'uniform'
    this.cellPaddingInput.title = 'Uniform padding applied to all 4 sides'
    paddingRow.append(this.cellPaddingInput)
    cellSection.append(paddingRow)

    dialog.append(cellSection)

    // ── Buttons ──
    const menuContainer = document.createElement('div')
    menuContainer.classList.add('tp-dialog-menu')

    const cancelBtn = document.createElement('button')
    cancelBtn.classList.add('tp-dialog-menu__cancel')
    cancelBtn.textContent = 'Cancel'
    cancelBtn.type = 'button'
    cancelBtn.onclick = () => this._dispose()

    const applyBtn = document.createElement('button')
    applyBtn.classList.add('tp-dialog-menu__apply')
    applyBtn.textContent = 'Apply'
    applyBtn.type = 'button'
    applyBtn.onclick = () => {
      this._applyChanges(command)
      this._dispose()
    }

    menuContainer.append(cancelBtn, applyBtn)
    dialog.append(menuContainer)

    document.body.append(container)
    this.container = container
  }

  private _applyChanges(command: Command) {
    // Table-level border type
    const borderType = this.tableBorderTypeSelect!.value as TableBorder
    command.executeTableBorderType(borderType)

    // Table-level border color (only if not empty/default)
    const tableBorderColor = this.tableBorderColorText!.value.trim()
    if (tableBorderColor) {
      command.executeTableBorderColor(tableBorderColor)
    }

    // Cell background color (only if user changed from white default — check text field)
    const cellBgColor = this.cellBgColorText!.value.trim()
    if (cellBgColor && cellBgColor !== '#ffffff') {
      command.executeTableTdBackgroundColor(cellBgColor)
    }

    // Cell border color
    const cellBorderColor = this.cellBorderColorText!.value.trim()
    if (cellBorderColor && cellBorderColor !== '#000000') {
      command.executeTableTdBorderColor(cellBorderColor)
    }

    // Cell border width (-1 = keep existing)
    const bwVal = parseInt(this.cellBorderWidthSelect!.value)
    if (bwVal >= 0) {
      command.executeTableTdBorderWidth(bwVal)
    }

    // Cell border style ('' = keep existing)
    const bsVal = this.cellBorderStyleSelect!.value
    if (bsVal) {
      command.executeTableTdBorderStyle(bsVal as TdBorderStyle)
    }

    // Vertical align ('' = keep existing)
    const vaVal = this.cellVAlignSelect!.value
    if (vaVal) {
      command.executeTableTdVerticalAlign(vaVal as VerticalAlign)
    }

    // Padding (empty = keep existing)
    const padVal = this.cellPaddingInput!.value.trim()
    if (padVal !== '') {
      const p = Math.max(0, parseInt(padVal) || 0)
      command.executeTableTdPadding([p, p, p, p])
    }
  }

  private _createSection(title: string): HTMLDivElement {
    const section = document.createElement('div')
    section.classList.add('tp-dialog-section')
    const sectionTitle = document.createElement('div')
    sectionTitle.classList.add('tp-dialog-section-title')
    sectionTitle.textContent = title
    section.append(sectionTitle)
    return section
  }

  private _createRow(labelText: string): HTMLDivElement {
    const row = document.createElement('div')
    row.classList.add('tp-dialog-row')
    const label = document.createElement('label')
    label.textContent = labelText
    row.append(label)
    return row
  }

  private _createColorRow(defaultColor: string): {
    colorInput: HTMLInputElement
    colorText: HTMLInputElement
    wrapper: HTMLDivElement
  } {
    const wrapper = document.createElement('div')
    wrapper.classList.add('tp-dialog-color-row')

    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.value = defaultColor

    const colorText = document.createElement('input')
    colorText.type = 'text'
    colorText.value = defaultColor
    colorText.style.flex = '1'

    // Sync picker → text
    colorInput.addEventListener('input', () => {
      colorText.value = colorInput.value
    })
    // Sync text → picker (on blur, only if valid hex)
    colorText.addEventListener('blur', () => {
      const val = colorText.value.trim()
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
        colorInput.value = val
      }
    })

    wrapper.append(colorInput, colorText)
    return { colorInput, colorText, wrapper }
  }

  private _dispose() {
    this.mask?.remove()
    this.container?.remove()
  }
}
