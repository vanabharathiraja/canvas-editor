import { EditorComponent, EDITOR_COMPONENT } from '../../editor'
import { BackgroundRepeat, BackgroundSize } from '../../editor/dataset/enum/Background'
import {
  HeaderBackgroundPosition,
  HeaderBackgroundVerticalPosition,
  IHeaderBackground
} from '../../editor/interface/header/HeaderBackground'
import './backgroundDialog.css'

export interface IBackgroundDialogOptions {
  title: string
  currentBackground: IHeaderBackground
  onClose?: () => void
  onCancel?: () => void
  onConfirm?: (background: IHeaderBackground) => void
  onClear?: () => void
}

export class BackgroundDialog {
  private options: IBackgroundDialogOptions
  private mask: HTMLDivElement | null = null
  private container: HTMLDivElement | null = null

  // Form elements
  private colorInput: HTMLInputElement | null = null
  private imageInput: HTMLInputElement | null = null
  private sizeSelect: HTMLSelectElement | null = null
  private repeatSelect: HTMLSelectElement | null = null
  private positionXSelect: HTMLSelectElement | null = null
  private positionYSelect: HTMLSelectElement | null = null
  private opacityInput: HTMLInputElement | null = null
  private opacityValue: HTMLSpanElement | null = null
  private previewArea: HTMLDivElement | null = null

  constructor(options: IBackgroundDialogOptions) {
    this.options = options
    this._render()
  }

  private _render() {
    const { title, currentBackground, onClose, onCancel, onConfirm, onClear } = this.options

    // Create mask
    const mask = document.createElement('div')
    mask.classList.add('background-dialog-mask')
    mask.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
    document.body.append(mask)
    this.mask = mask

    // Create container
    const container = document.createElement('div')
    container.classList.add('background-dialog-container')
    container.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)

    // Dialog
    const dialog = document.createElement('div')
    dialog.classList.add('background-dialog')
    container.append(dialog)

    // Title
    const titleContainer = document.createElement('div')
    titleContainer.classList.add('background-dialog-title')
    const titleSpan = document.createElement('span')
    titleSpan.textContent = title
    const titleClose = document.createElement('i')
    titleClose.onclick = () => {
      onClose?.()
      this._dispose()
    }
    titleContainer.append(titleSpan, titleClose)
    dialog.append(titleContainer)

    // Color section
    const colorSection = this._createSection('Color')
    const colorRow = this._createRow('Background Color')
    this.colorInput = document.createElement('input')
    this.colorInput.type = 'color'
    this.colorInput.value = currentBackground.color || '#ffffff'
    this.colorInput.addEventListener('input', () => this._updatePreview())
    colorRow.append(this.colorInput)
    colorSection.append(colorRow)
    dialog.append(colorSection)

    // Image section
    const imageSection = this._createSection('Image')
    const imageRow = this._createRow('Image URL')
    const imageUploadDiv = document.createElement('div')
    imageUploadDiv.classList.add('background-dialog-image-upload')
    this.imageInput = document.createElement('input')
    this.imageInput.type = 'text'
    this.imageInput.placeholder = 'Enter image URL or upload...'
    this.imageInput.value = currentBackground.image || ''
    this.imageInput.addEventListener('input', () => this._updatePreview())

    const uploadBtn = document.createElement('button')
    uploadBtn.textContent = 'Browse'
    uploadBtn.type = 'button'
    uploadBtn.onclick = () => this._handleImageUpload()
    imageUploadDiv.append(this.imageInput, uploadBtn)
    imageRow.append(imageUploadDiv)
    imageSection.append(imageRow)
    dialog.append(imageSection)

    // Size & Repeat section
    const sizeSection = this._createSection('Size & Repeat')

    const sizeRow = this._createRow('Size')
    this.sizeSelect = document.createElement('select')
    const sizeOptions = [
      { value: BackgroundSize.COVER, label: 'Cover' },
      { value: BackgroundSize.CONTAIN, label: 'Contain' }
    ]
    sizeOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (currentBackground.size === opt.value) option.selected = true
      this.sizeSelect!.append(option)
    })
    this.sizeSelect.addEventListener('change', () => this._updatePreview())
    sizeRow.append(this.sizeSelect)
    sizeSection.append(sizeRow)

    const repeatRow = this._createRow('Repeat')
    this.repeatSelect = document.createElement('select')
    const repeatOptions = [
      { value: BackgroundRepeat.NO_REPEAT, label: 'No Repeat' },
      { value: BackgroundRepeat.REPEAT, label: 'Repeat' },
      { value: BackgroundRepeat.REPEAT_X, label: 'Repeat X' },
      { value: BackgroundRepeat.REPEAT_Y, label: 'Repeat Y' }
    ]
    repeatOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (currentBackground.repeat === opt.value) option.selected = true
      this.repeatSelect!.append(option)
    })
    repeatRow.append(this.repeatSelect)
    sizeSection.append(repeatRow)
    dialog.append(sizeSection)

    // Position section
    const positionSection = this._createSection('Position')

    const posXRow = this._createRow('Horizontal')
    this.positionXSelect = document.createElement('select')
    const posXOptions = [
      { value: HeaderBackgroundPosition.LEFT, label: 'Left' },
      { value: HeaderBackgroundPosition.CENTER, label: 'Center' },
      { value: HeaderBackgroundPosition.RIGHT, label: 'Right' }
    ]
    posXOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (currentBackground.positionX === opt.value) option.selected = true
      this.positionXSelect!.append(option)
    })
    posXRow.append(this.positionXSelect)
    positionSection.append(posXRow)

    const posYRow = this._createRow('Vertical')
    this.positionYSelect = document.createElement('select')
    const posYOptions = [
      { value: HeaderBackgroundVerticalPosition.TOP, label: 'Top' },
      { value: HeaderBackgroundVerticalPosition.MIDDLE, label: 'Middle' },
      { value: HeaderBackgroundVerticalPosition.BOTTOM, label: 'Bottom' }
    ]
    posYOptions.forEach(opt => {
      const option = document.createElement('option')
      option.value = opt.value
      option.textContent = opt.label
      if (currentBackground.positionY === opt.value) option.selected = true
      this.positionYSelect!.append(option)
    })
    posYRow.append(this.positionYSelect)
    positionSection.append(posYRow)
    dialog.append(positionSection)

    // Opacity section
    const opacitySection = this._createSection('Opacity')
    const opacityRow = this._createRow('Opacity')
    const opacityDiv = document.createElement('div')
    opacityDiv.classList.add('background-dialog-opacity-row')
    this.opacityInput = document.createElement('input')
    this.opacityInput.type = 'range'
    this.opacityInput.min = '0'
    this.opacityInput.max = '100'
    this.opacityInput.value = String((currentBackground.opacity ?? 1) * 100)
    this.opacityValue = document.createElement('span')
    this.opacityValue.textContent = `${this.opacityInput.value}%`
    this.opacityInput.addEventListener('input', () => {
      this.opacityValue!.textContent = `${this.opacityInput!.value}%`
      this._updatePreview()
    })
    opacityDiv.append(this.opacityInput, this.opacityValue)
    opacityRow.append(opacityDiv)
    opacitySection.append(opacityRow)
    dialog.append(opacitySection)

    // Preview section
    const previewSection = document.createElement('div')
    previewSection.classList.add('background-dialog-preview')
    const previewTitle = document.createElement('div')
    previewTitle.classList.add('background-dialog-preview-title')
    previewTitle.textContent = 'Preview'
    this.previewArea = document.createElement('div')
    this.previewArea.classList.add('background-dialog-preview-area')
    previewSection.append(previewTitle, this.previewArea)
    dialog.append(previewSection)
    this._updatePreview()

    // Buttons
    const menuContainer = document.createElement('div')
    menuContainer.classList.add('background-dialog-menu')

    const clearBtn = document.createElement('button')
    clearBtn.classList.add('background-dialog-menu__clear')
    clearBtn.textContent = 'Clear'
    clearBtn.type = 'button'
    clearBtn.onclick = () => {
      onClear?.()
      this._dispose()
    }

    const cancelBtn = document.createElement('button')
    cancelBtn.classList.add('background-dialog-menu__cancel')
    cancelBtn.textContent = 'Cancel'
    cancelBtn.type = 'button'
    cancelBtn.onclick = () => {
      onCancel?.()
      this._dispose()
    }

    const confirmBtn = document.createElement('button')
    confirmBtn.classList.add('background-dialog-menu__confirm')
    confirmBtn.textContent = 'Apply'
    confirmBtn.type = 'button'
    confirmBtn.onclick = () => {
      const background = this._getFormValues()
      onConfirm?.(background)
      this._dispose()
    }

    menuContainer.append(clearBtn, cancelBtn, confirmBtn)
    dialog.append(menuContainer)

    document.body.append(container)
    this.container = container
  }

  private _createSection(title: string): HTMLDivElement {
    const section = document.createElement('div')
    section.classList.add('background-dialog-section')
    const sectionTitle = document.createElement('div')
    sectionTitle.classList.add('background-dialog-section-title')
    sectionTitle.textContent = title
    section.append(sectionTitle)
    return section
  }

  private _createRow(labelText: string): HTMLDivElement {
    const row = document.createElement('div')
    row.classList.add('background-dialog-row')
    const label = document.createElement('label')
    label.textContent = labelText
    row.append(label)
    return row
  }

  private _handleImageUpload() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          if (this.imageInput) {
            this.imageInput.value = reader.result as string
            this._updatePreview()
          }
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  private _updatePreview() {
    if (!this.previewArea) return

    const color = this.colorInput?.value || ''
    const image = this.imageInput?.value || ''
    const opacity = (parseInt(this.opacityInput?.value || '100') / 100)

    this.previewArea.style.backgroundColor = color
    this.previewArea.style.opacity = String(opacity)

    // Clear existing content
    this.previewArea.innerHTML = ''

    if (image) {
      const img = document.createElement('img')
      img.src = image
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = this.sizeSelect?.value === BackgroundSize.COVER ? 'cover' : 'contain'
      this.previewArea.append(img)
    }
  }

  private _getFormValues(): IHeaderBackground {
    return {
      color: this.colorInput?.value || '',
      image: this.imageInput?.value || '',
      size: (this.sizeSelect?.value as BackgroundSize) || BackgroundSize.COVER,
      repeat: (this.repeatSelect?.value as BackgroundRepeat) || BackgroundRepeat.NO_REPEAT,
      positionX: (this.positionXSelect?.value as HeaderBackgroundPosition) || HeaderBackgroundPosition.CENTER,
      positionY: (this.positionYSelect?.value as HeaderBackgroundVerticalPosition) || HeaderBackgroundVerticalPosition.MIDDLE,
      opacity: parseInt(this.opacityInput?.value || '100') / 100
    }
  }

  private _dispose() {
    this.mask?.remove()
    this.container?.remove()
  }
}
