import { INTERNAL_CONTEXT_MENU_KEY } from '../../../dataset/constant/ContextMenu'
import { EditorMode, EditorZone } from '../../../dataset/enum/Editor'
import { IRegisterContextMenu } from '../../../interface/contextmenu/ContextMenu'
import { Command } from '../../command/Command'

const {
  HEADER: { FULL_WIDTH, CONTENT_FULL_WIDTH, SET_BACKGROUND }
} = INTERNAL_CONTEXT_MENU_KEY

export const headerMenus: IRegisterContextMenu[] = [
  {
    isDivider: true
  },
  {
    key: SET_BACKGROUND,
    i18nPath: 'contextmenu.header.setBackground',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.zone === EditorZone.HEADER &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeSetHeaderBackground()
    }
  },
  {
    key: FULL_WIDTH,
    i18nPath: 'contextmenu.header.fullWidth',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.zone === EditorZone.HEADER &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeSetHeaderFullWidth()
    }
  },
  {
    key: CONTENT_FULL_WIDTH,
    i18nPath: 'contextmenu.header.contentFullWidth',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.zone === EditorZone.HEADER &&
        payload.options.mode !== EditorMode.FORM &&
        payload.options.header.fullWidth
      )
    },
    callback: (command: Command) => {
      command.executeSetHeaderContentFullWidth()
    }
  }
]
