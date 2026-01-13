import { MaxHeightRatio } from '../dataset/enum/Common'
import { IHeaderBackground } from './header/HeaderBackground'

export interface IHeader {
  top?: number
  inactiveAlpha?: number
  maxHeightRadio?: MaxHeightRatio
  disabled?: boolean
  editable?: boolean
  fullWidth?: boolean
  contentFullWidth?: boolean
  background?: IHeaderBackground
}
