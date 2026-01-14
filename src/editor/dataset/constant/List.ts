import { ListStyle, ListType, UlStyle } from '../enum/List'

// 列表基础缩进宽度（从左边距开始的基本缩进）
export const LIST_BASE_INDENT = 20

// 列表层级缩进宽度（每层级缩进量）
export const LIST_LEVEL_INDENT = 36

// 无序列表层级样式循环（● → ○ → ■ → ● → ...）
export const ulStyleByLevel: string[] = ['•', '◦', '▫︎']

// 根据层级索引数组获取有序列表标记（层级式编号：1. → 1.1 → 1.1.1）
export function getOlMarkerText(hierarchyIndices: number[]): string {
  return hierarchyIndices.map(idx => idx + 1).join('.')
}

export const ulStyleMapping: Record<UlStyle, string> = {
  [UlStyle.DISC]: '•',
  [UlStyle.CIRCLE]: '◦',
  [UlStyle.SQUARE]: '▫︎',
  [UlStyle.CHECKBOX]: '☑️'
}

export const listTypeElementMapping: Record<ListType, string> = {
  [ListType.OL]: 'ol',
  [ListType.UL]: 'ul'
}

export const listStyleCSSMapping: Record<ListStyle, string> = {
  [ListStyle.DISC]: 'disc',
  [ListStyle.CIRCLE]: 'circle',
  [ListStyle.SQUARE]: 'square',
  [ListStyle.DECIMAL]: 'decimal',
  [ListStyle.CHECKBOX]: 'checkbox'
}
