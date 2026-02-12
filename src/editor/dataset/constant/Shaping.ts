import { IShapingOption } from '../../interface/Shaping'

export const defaultShapingOption: Required<IShapingOption> = {
  enabled: false,
  basePath: '/harfbuzz',
  fontMapping: {},
  forceShaping: false,
  complexScriptFallback: 'Amiri'
}
