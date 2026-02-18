import { INTERNAL_CONTEXT_MENU_KEY } from '../../../dataset/constant/ContextMenu'
import { EditorMode } from '../../../dataset/enum/Editor'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import {
  TableAutoFit,
  TableBorder,
  TdBorder,
  TdBorderStyle,
  TdSlash
} from '../../../dataset/enum/table/Table'
import { IRegisterContextMenu } from '../../../interface/contextmenu/ContextMenu'
import { Command } from '../../command/Command'
import { TablePropertiesDialog } from '../../../../components/tablePropertiesDialog/TablePropertiesDialog'
const {
  TABLE: {
    BORDER,
    BORDER_ALL,
    BORDER_EMPTY,
    BORDER_DASH,
    BORDER_EXTERNAL,
    BORDER_INTERNAL,
    BORDER_TD,
    BORDER_TD_TOP,
    BORDER_TD_LEFT,
    BORDER_TD_BOTTOM,
    BORDER_TD_RIGHT,
    BORDER_TD_BACK,
    BORDER_TD_FORWARD,
    VERTICAL_ALIGN,
    VERTICAL_ALIGN_TOP,
    VERTICAL_ALIGN_MIDDLE,
    VERTICAL_ALIGN_BOTTOM,
    INSERT_ROW_COL,
    INSERT_TOP_ROW,
    INSERT_BOTTOM_ROW,
    INSERT_LEFT_COL,
    INSERT_RIGHT_COL,
    DELETE_ROW_COL,
    DELETE_ROW,
    DELETE_COL,
    DELETE_TABLE,
    MERGE_CELL,
    CANCEL_MERGE_CELL,
    AUTO_FIT,
    AUTO_FIT_PAGE,
    AUTO_FIT_CONTENT,
    AUTO_FIT_EQUAL,
    DISTRIBUTE_ROWS,
    SPLIT_CELL,
    SPLIT_VERTICAL,
    SPLIT_HORIZONTAL,
    BORDER_TD_WIDTH,
    BORDER_TD_WIDTH_NONE,
    BORDER_TD_WIDTH_THIN,
    BORDER_TD_WIDTH_MEDIUM,
    BORDER_TD_WIDTH_THICK,
    BORDER_TD_STYLE,
    BORDER_TD_STYLE_SOLID,
    BORDER_TD_STYLE_DASHED,
    BORDER_TD_STYLE_DOTTED,
    BORDER_TD_STYLE_DOUBLE,
    MOVE_ROW_UP,
    MOVE_ROW_DOWN,
    TD_PADDING,
    TD_PADDING_SMALL,
    TD_PADDING_MEDIUM,
    TD_PADDING_LARGE,
    TABLE_PROPERTIES
  }
} = INTERNAL_CONTEXT_MENU_KEY

export const tableMenus: IRegisterContextMenu[] = [
  {
    isDivider: true
  },
  {
    key: BORDER,
    i18nPath: 'contextmenu.table.border',
    icon: 'border-all',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: BORDER_ALL,
        i18nPath: 'contextmenu.table.borderAll',
        icon: 'border-all',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableBorderType(TableBorder.ALL)
        }
      },
      {
        key: BORDER_EMPTY,
        i18nPath: 'contextmenu.table.borderEmpty',
        icon: 'border-empty',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableBorderType(TableBorder.EMPTY)
        }
      },
      {
        key: BORDER_DASH,
        i18nPath: 'contextmenu.table.borderDash',
        icon: 'border-dash',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableBorderType(TableBorder.DASH)
        }
      },
      {
        key: BORDER_EXTERNAL,
        i18nPath: 'contextmenu.table.borderExternal',
        icon: 'border-external',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableBorderType(TableBorder.EXTERNAL)
        }
      },
      {
        key: BORDER_INTERNAL,
        i18nPath: 'contextmenu.table.borderInternal',
        icon: 'border-internal',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableBorderType(TableBorder.INTERNAL)
        }
      },
      {
        key: BORDER_TD,
        i18nPath: 'contextmenu.table.borderTd',
        icon: 'border-td',
        when: () => true,
        childMenus: [
          {
            key: BORDER_TD_TOP,
            i18nPath: 'contextmenu.table.borderTdTop',
            icon: 'border-td-top',
            when: () => true,
            callback: (command: Command) => {
              command.executeTableTdBorderType(TdBorder.TOP)
            }
          },
          {
            key: BORDER_TD_RIGHT,
            i18nPath: 'contextmenu.table.borderTdRight',
            icon: 'border-td-right',
            when: () => true,
            callback: (command: Command) => {
              command.executeTableTdBorderType(TdBorder.RIGHT)
            }
          },
          {
            key: BORDER_TD_BOTTOM,
            i18nPath: 'contextmenu.table.borderTdBottom',
            icon: 'border-td-bottom',
            when: () => true,
            callback: (command: Command) => {
              command.executeTableTdBorderType(TdBorder.BOTTOM)
            }
          },
          {
            key: BORDER_TD_LEFT,
            i18nPath: 'contextmenu.table.borderTdLeft',
            icon: 'border-td-left',
            when: () => true,
            callback: (command: Command) => {
              command.executeTableTdBorderType(TdBorder.LEFT)
            }
          },
          {
            key: BORDER_TD_FORWARD,
            i18nPath: 'contextmenu.table.borderTdForward',
            icon: 'border-td-forward',
            when: () => true,
            callback: (command: Command) => {
              command.executeTableTdSlashType(TdSlash.FORWARD)
            }
          },
          {
            key: BORDER_TD_BACK,
            i18nPath: 'contextmenu.table.borderTdBack',
            icon: 'border-td-back',
            when: () => true,
            callback: (command: Command) => {
              command.executeTableTdSlashType(TdSlash.BACK)
            }
          }
        ]
      }
    ]
  },
  {
    key: VERTICAL_ALIGN,
    i18nPath: 'contextmenu.table.verticalAlign',
    icon: 'vertical-align',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: VERTICAL_ALIGN_TOP,
        i18nPath: 'contextmenu.table.verticalAlignTop',
        icon: 'vertical-align-top',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdVerticalAlign(VerticalAlign.TOP)
        }
      },
      {
        key: VERTICAL_ALIGN_MIDDLE,
        i18nPath: 'contextmenu.table.verticalAlignMiddle',
        icon: 'vertical-align-middle',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdVerticalAlign(VerticalAlign.MIDDLE)
        }
      },
      {
        key: VERTICAL_ALIGN_BOTTOM,
        i18nPath: 'contextmenu.table.verticalAlignBottom',
        icon: 'vertical-align-bottom',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdVerticalAlign(VerticalAlign.BOTTOM)
        }
      }
    ]
  },
  {
    key: INSERT_ROW_COL,
    i18nPath: 'contextmenu.table.insertRowCol',
    icon: 'insert-row-col',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: INSERT_TOP_ROW,
        i18nPath: 'contextmenu.table.insertTopRow',
        icon: 'insert-top-row',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableTopRow()
        }
      },
      {
        key: INSERT_BOTTOM_ROW,
        i18nPath: 'contextmenu.table.insertBottomRow',
        icon: 'insert-bottom-row',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableBottomRow()
        }
      },
      {
        key: INSERT_LEFT_COL,
        i18nPath: 'contextmenu.table.insertLeftCol',
        icon: 'insert-left-col',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableLeftCol()
        }
      },
      {
        key: INSERT_RIGHT_COL,
        i18nPath: 'contextmenu.table.insertRightCol',
        icon: 'insert-right-col',
        when: () => true,
        callback: (command: Command) => {
          command.executeInsertTableRightCol()
        }
      }
    ]
  },
  {
    key: DELETE_ROW_COL,
    i18nPath: 'contextmenu.table.deleteRowCol',
    icon: 'delete-row-col',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: DELETE_ROW,
        i18nPath: 'contextmenu.table.deleteRow',
        icon: 'delete-row',
        when: () => true,
        callback: (command: Command) => {
          command.executeDeleteTableRow()
        }
      },
      {
        key: DELETE_COL,
        i18nPath: 'contextmenu.table.deleteCol',
        icon: 'delete-col',
        when: () => true,
        callback: (command: Command) => {
          command.executeDeleteTableCol()
        }
      },
      {
        key: DELETE_TABLE,
        i18nPath: 'contextmenu.table.deleteTable',
        icon: 'delete-table',
        when: () => true,
        callback: (command: Command) => {
          command.executeDeleteTable()
        }
      }
    ]
  },
  {
    key: MERGE_CELL,
    i18nPath: 'contextmenu.table.mergeCell',
    icon: 'merge-cell',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isCrossRowCol &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeMergeTableCell()
    }
  },
  {
    key: CANCEL_MERGE_CELL,
    i18nPath: 'contextmenu.table.mergeCancelCell',
    icon: 'merge-cancel-cell',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeCancelMergeTableCell()
    }
  },
  {
    key: AUTO_FIT,
    i18nPath: 'contextmenu.table.autoFit',
    icon: 'auto-fit',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: AUTO_FIT_PAGE,
        i18nPath: 'contextmenu.table.autoFitPage',
        icon: 'auto-fit-page',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableAutoFit(TableAutoFit.PAGE)
        }
      },
      {
        key: AUTO_FIT_CONTENT,
        i18nPath: 'contextmenu.table.autoFitContent',
        icon: 'auto-fit-content',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableAutoFit(TableAutoFit.CONTENT)
        }
      },
      {
        key: AUTO_FIT_EQUAL,
        i18nPath: 'contextmenu.table.autoFitEqual',
        icon: 'auto-fit-equal',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableAutoFit(TableAutoFit.EQUAL)
        }
      }
    ]
  },
  {
    key: DISTRIBUTE_ROWS,
    i18nPath: 'contextmenu.table.distributeRows',
    icon: 'distribute-row',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeDistributeTableRows()
    }
  },
  {
    key: SPLIT_CELL,
    i18nPath: 'contextmenu.table.splitCell',
    icon: 'split-cell',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: SPLIT_VERTICAL,
        i18nPath: 'contextmenu.table.splitVertical',
        icon: 'split-vertical',
        when: () => true,
        callback: (command: Command) => {
          command.executeSplitVerticalTableCell()
        }
      },
      {
        key: SPLIT_HORIZONTAL,
        i18nPath: 'contextmenu.table.splitHorizontal',
        icon: 'split-horizontal',
        when: () => true,
        callback: (command: Command) => {
          command.executeSplitHorizontalTableCell()
        }
      }
    ]
  },
  {
    key: BORDER_TD_WIDTH,
    i18nPath: 'contextmenu.table.borderTdWidth',
    icon: 'border-width',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: BORDER_TD_WIDTH_NONE,
        i18nPath: 'contextmenu.table.borderTdWidthNone',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderWidth(0)
        }
      },
      {
        key: BORDER_TD_WIDTH_THIN,
        i18nPath: 'contextmenu.table.borderTdWidthThin',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderWidth(1)
        }
      },
      {
        key: BORDER_TD_WIDTH_MEDIUM,
        i18nPath: 'contextmenu.table.borderTdWidthMedium',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderWidth(2)
        }
      },
      {
        key: BORDER_TD_WIDTH_THICK,
        i18nPath: 'contextmenu.table.borderTdWidthThick',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderWidth(3)
        }
      }
    ]
  },
  {
    key: BORDER_TD_STYLE,
    i18nPath: 'contextmenu.table.borderTdStyle',
    icon: 'border-style',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: BORDER_TD_STYLE_SOLID,
        i18nPath: 'contextmenu.table.borderTdStyleSolid',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderStyle(TdBorderStyle.SOLID)
        }
      },
      {
        key: BORDER_TD_STYLE_DASHED,
        i18nPath: 'contextmenu.table.borderTdStyleDashed',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderStyle(TdBorderStyle.DASHED)
        }
      },
      {
        key: BORDER_TD_STYLE_DOTTED,
        i18nPath: 'contextmenu.table.borderTdStyleDotted',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderStyle(TdBorderStyle.DOTTED)
        }
      },
      {
        key: BORDER_TD_STYLE_DOUBLE,
        i18nPath: 'contextmenu.table.borderTdStyleDouble',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdBorderStyle(TdBorderStyle.DOUBLE)
        }
      }
    ]
  },
  {
    key: MOVE_ROW_UP,
    i18nPath: 'contextmenu.table.moveRowUp',
    icon: 'move-row-up',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeMoveTableRowUp()
    }
  },
  {
    key: MOVE_ROW_DOWN,
    i18nPath: 'contextmenu.table.moveRowDown',
    icon: 'move-row-down',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command) => {
      command.executeMoveTableRowDown()
    }
  },
  {
    key: TD_PADDING,
    i18nPath: 'contextmenu.table.tdPadding',
    icon: 'td-padding',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    childMenus: [
      {
        key: TD_PADDING_SMALL,
        i18nPath: 'contextmenu.table.tdPaddingSmall',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdPadding([2, 2, 2, 2])
        }
      },
      {
        key: TD_PADDING_MEDIUM,
        i18nPath: 'contextmenu.table.tdPaddingMedium',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdPadding([5, 5, 5, 5])
        }
      },
      {
        key: TD_PADDING_LARGE,
        i18nPath: 'contextmenu.table.tdPaddingLarge',
        when: () => true,
        callback: (command: Command) => {
          command.executeTableTdPadding([10, 10, 10, 10])
        }
      }
    ]
  },
  {
    isDivider: true
  },
  {
    key: TABLE_PROPERTIES,
    i18nPath: 'contextmenu.table.tableProperties',
    icon: 'table-properties',
    when: payload => {
      return (
        !payload.isReadonly &&
        payload.isInTable &&
        payload.options.mode !== EditorMode.FORM
      )
    },
    callback: (command: Command, context) => {
      new TablePropertiesDialog({
        tableElement: context.tableElement
          ? {
              borderColor: context.tableElement.borderColor,
              borderWidth: context.tableElement.borderWidth,
              borderType: context.tableElement.borderType
            }
          : null,
        command
      })
    }
  }
]
