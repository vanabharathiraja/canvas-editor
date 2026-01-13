import {
  HeaderBackgroundPosition,
  HeaderBackgroundVerticalPosition,
  IHeaderBackground
} from '../../interface/header/HeaderBackground'
import { IFooter } from '../../interface/Footer'
import { MaxHeightRatio } from '../enum/Common'
import { BackgroundRepeat, BackgroundSize } from '../enum/Background'

export const defaultFooterBackground: Readonly<Required<IHeaderBackground>> = {
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

export const defaultFooterOption: Readonly<Required<IFooter>> = {
  bottom: 30,
  inactiveAlpha: 1,
  maxHeightRadio: MaxHeightRatio.HALF,
  disabled: false,
  editable: true,
  fullWidth: false,
  contentFullWidth: false,
  background: { ...defaultFooterBackground }
}
