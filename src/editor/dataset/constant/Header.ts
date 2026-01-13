import {
  HeaderBackgroundPosition,
  HeaderBackgroundVerticalPosition,
  IHeaderBackground
} from '../../interface/header/HeaderBackground'
import { IHeader } from '../../interface/Header'
import { MaxHeightRatio } from '../enum/Common'
import { BackgroundRepeat, BackgroundSize } from '../enum/Background'

export const defaultHeaderBackground: Readonly<Required<IHeaderBackground>> = {
  color: '',
  image: '',
  size: BackgroundSize.COVER,
  repeat: BackgroundRepeat.NO_REPEAT,
  width: 0,
  height: 0,
  positionX: HeaderBackgroundPosition.CENTER,
  positionY: HeaderBackgroundVerticalPosition.MIDDLE,
  opacity: 1
}

export const defaultHeaderOption: Readonly<Required<IHeader>> = {
  top: 30,
  inactiveAlpha: 1,
  maxHeightRadio: MaxHeightRatio.HALF,
  disabled: false,
  editable: true,
  fullWidth: false,
  contentFullWidth: false,
  background: { ...defaultHeaderBackground }
}
