import { INTERNAL_CONTEXT_MENU_KEY } from '../../../dataset/constant/ContextMenu'
import { EditorMode, EditorZone } from '../../../dataset/enum/Editor'
import { IRegisterContextMenu } from '../../../interface/contextmenu/ContextMenu'
import { Command } from '../../command/Command'

const {
  FOOTER: { FULL_WIDTH, CONTENT_FULL_WIDTH, SET_BACKGROUND }
} = INTERNAL_CONTEXT_MENU_KEY

export const footerMenus: IRegisterContextMenu[] = [
  {
    isDivider: true
  },
  {
    key: SET_BACKGROUND,
    i18nPath: 'contextmenu.footer.setBackground',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.zone === EditorZone.FOOTER &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeSetFooterBackground()
    }
  },
  {
    key: FULL_WIDTH,
    i18nPath: 'contextmenu.footer.fullWidth',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.zone === EditorZone.FOOTER &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeSetFooterFullWidth()
    }
  },
  {
    key: CONTENT_FULL_WIDTH,
    i18nPath: 'contextmenu.footer.contentFullWidth',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.zone === EditorZone.FOOTER &&
        payload.options.mode !== EditorMode.FORM &&
        payload.options.footer.fullWidth
      )
    },
    callback: (command: Command) => {
      command.executeSetFooterContentFullWidth()
    }
  }
]
