import { ITd } from './Td'

export interface ITr {
  id?: string
  extension?: unknown
  externalId?: string
  height: number
  tdList: ITd[]
  minHeight?: number
  pagingRepeat?: boolean // 在各页顶端以标题行的形式重复出现
  // Intra-row split: marks a synthetic row created by splitting
  // a single oversized row. Used for recombination on next layout cycle.
  isVirtualRow?: boolean
}
