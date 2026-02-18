# Table Improvement Plan — Google Docs Quality Parity

**Created**: 2026-02-17
**Branch**: `shape-engine`
**Status**: In Progress (T1 & T2 complete, T3 next)
**ADR**: [adr-0002-table-auto-fit-and-multipage.md](../decisions/adr-0002-table-auto-fit-and-multipage.md)

---

## Overview

Bring table system closer to Google Docs quality. Six phases, ordered by
user impact and implementation complexity.

---

## Existing Table Feature Inventory

Before planning new work, here's what already exists:

### Commands (19 total in CommandAdapt.ts → Command.ts)
| Command | Status |
|---|---|
| Insert table, row (top/bottom), col (left/right) | ✅ |
| Delete row, col, table | ✅ |
| Merge / unmerge cells | ✅ |
| Split cell vertically / horizontally | ✅ (command only, not in context menu) |
| Cell vertical align (top/middle/bottom) | ✅ |
| Table border type (all/empty/external/internal/dash) | ✅ |
| Table border color (table-level) | ✅ (command only, not in context menu) |
| Cell border toggle (top/right/bottom/left) | ✅ |
| Cell diagonal slash (forward/back) | ✅ |
| Cell background color | ✅ |
| Select all cells | ✅ |

### Context Menu Items (tableMenus.ts)
Border submenu, cell border submenu, vertical align, insert/delete row/col, merge/unmerge.

### What's Missing (Gap Analysis vs Google Docs)
| Feature | Gap |
|---|---|
| **Per-cell border color** | ❌ Only table-level `borderColor` |
| **Per-cell border width** | ❌ Only table-level `borderWidth` |
| **Per-cell border style** (solid/dashed/dotted/double) | ❌ Only table-level DASH |
| **Per-cell padding** | ❌ Only global `tdPadding` |
| **Distribute rows/columns evenly** | ❌ No command |
| **Set exact row height** | ✅ T3 `tableRowHeight` command |
| **Set exact column width** | ✅ T3 `tableColWidth` command |
| **Auto-fit table width** | ✅ T3 `tableAutoFit` command (page/content/equal) |
| **Move row up/down** | ❌ No command |
| **Sort table by column** | ❌ No command |
| **Table properties dialog** | ❌ No UI |
| **Border color in context menu** | ⚠️ Command exists, no menu entry |
| **Split cell in context menu** | ✅ T3 context menu added |

---

## Phase T1: Paste Auto-Fit (Critical) — COMPLETE ✅

**Problem**: Pasting a Google Docs table with wide columns creates an un-resizable
table that overflows the editor panel.

**Completed**: 2026-02-17 (Session 014-015)
**Commit**: `68a00005`

### Implementation Summary

- [x] **T1.1** — Added `normalizeTableColWidths()` in `element.ts`
- [x] **T1.2** — Normalization wired into ALL data entry paths
- [x] **T1.3** — Edge cases handled (no colgroup, min width floor, nested tables)
- [x] **T1.4** — Test coverage (6 test tables in mock.ts)
- [ ] **T1.5** — Overflow option enforcement (deferred to T3)

### Key Code Locations
- `element.ts` L1609-L1650 — table HTML parsing
- `TableOperate.ts` L228-L249 — existing `adjustColWidth()`
- `Draw.ts` L571 — `getContextInnerWidth()`

---

## Phase T2: Multi-Page Table Splitting (High) — COMPLETE ✅

**Problem**: Tables with merged cells (rowspan > 1) cannot split across pages.
The split is abandoned when a row has cross-row cells, leaving blank page space.

**Completed**: 2026-02-18 (Session 016-018)
**Commits**: `673f36f7`, `1a98a924`

### Implementation Summary

- [x] **T2a** — Rowspan-aware split-point selection with `rowspanTracker[]`
- [x] **T2b** — Rowspan carryover: continuation cells with `isPageBreakContinuation` marker
- [x] **T2c** — Intra-row split for oversized single rows
- [x] **T2-fix** — Null checks in `TableParticle.getRangeRowCol()` and `main.ts`
- [x] **T2-fix** — Virtual row `minHeight` bug fix
- [x] **T2-fix** — Recombination logic for continuation cells in `element.ts`

### Key Code Locations
- `Draw.ts` — table split logic (rowspan tracking, carryover, intra-row split)
- `TableParticle.ts` — `getRangeRowCol()` null safety
- `element.ts` — recombination of split table fragments
- `Tr.ts` / `Td.ts` — `isVirtualRow`, `isPageBreakContinuation`, `originalRowspan` fields

---

## Phase T3: Auto-Fit & Table Sizing Commands (Medium) — COMPLETE ✅

**Problem**: No way to auto-size columns, set exact row heights, or set exact column
widths. Missing commands and context menu entries for existing features.

**Completed**: 2026-02-18 (Session 019)
**Commit**: `2501396c`

### Implementation Summary

- [x] **T3.1** — `tableAutoFit(mode)` command: PAGE (proportional scale), CONTENT (measure content), EQUAL (uniform)
- [x] **T3.2** — `tableColWidth(px)` command: set exact column width, rebalance neighbor
- [x] **T3.3** — `tableRowHeight(px)` command: set exact row minHeight
- [x] **T3.4** — `distributeTableRows()` command: equalize all row heights
- [x] **T3.5** — Context menus: Auto-fit submenu, Distribute rows, Split cell submenu
- [x] **T3.6** — i18n keys added for EN, ZH-CN, AR locales
- [ ] **T3.7** — Keyboard shortcut (deferred — optional)
- [ ] **T3.8** — Border color context menu entry (deferred to T4)

### Key Code Locations
- `TableOperate.ts` — `tableAutoFit()`, `tableColWidth()`, `tableRowHeight()`, `distributeTableRows()`
- `CommandAdapt.ts` / `Command.ts` — command wrappers and bindings
- `tableMenus.ts` — new Auto-fit, Distribute rows, Split cell menus
- `Table.ts` — `TableAutoFit` enum (PAGE, CONTENT, EQUAL)
- `ContextMenu.ts` constants — new menu key constants

---

## Phase T4: Per-Cell Border Styling (Medium) — NEXT 🔜

**Problem**: Border color, width, and style are table-level only. Google Docs allows
per-cell border customization (color, width, style for each side).

### T4.1 — Interface & Enum Changes
- [ ] Add to `ITd` interface in `Td.ts`:
  ```
  borderColor?: string           // per-cell border color (overrides table-level)
  borderWidth?: number           // per-cell border width
  borderStyle?: TdBorderStyle    // per-cell border style
  ```
- [ ] Add new enum `TdBorderStyle` in `src/editor/dataset/enum/table/Table.ts`:
  ```
  enum TdBorderStyle { SOLID, DASHED, DOTTED, DOUBLE }
  ```

### T4.2 — Drawing Changes
- [ ] Update `_drawBorder()` in `TableParticle.ts` to read per-cell overrides:
  - When drawing cell borders, check `td.borderColor`, `td.borderWidth`, `td.borderStyle`
  - Fall back to table-level values if not set
  - Apply `ctx.setLineDash()` based on style enum
- [ ] Handle `DOUBLE` style (draw two parallel lines with gap)

### T4.3 — New Commands
- [ ] `executeTableTdBorderColor(color: string)` — set border color for selected cells
- [ ] `executeTableTdBorderWidth(width: number)` — set border width for selected cells
- [ ] `executeTableTdBorderStyle(style: TdBorderStyle)` — set border style for selected cells
- [ ] Implementation in `TableOperate.ts` → iterate selected cells, set properties

### T4.4 — Context Menu Updates
- [ ] Add **Cell border style** submenu under existing border menu:
  - "Border color" → color picker → `executeTableTdBorderColor(color)`
  - "Border width" submenu: "Thin (1px)" / "Medium (2px)" / "Thick (3px)"
  - "Border style" submenu: "Solid" / "Dashed" / "Dotted" / "Double"

### T4.5 — Paste Preservation
- [ ] Update `getElementListByHTML()` in `element.ts` to parse inline CSS border
  properties (`border-color`, `border-width`, `border-style`) from pasted HTML
  and map to new ITd properties

---

## Phase T5: Table Operations & Properties (Medium) — 1-2 Sessions

**Problem**: Missing convenience operations that Google Docs provides.

### T5.1 — Move Row Up/Down
- [ ] Add `executeTableMoveRowUp()` command — swap current row with row above
- [ ] Add `executeTableMoveRowDown()` command — swap current row with row below
- [ ] Handle rowspan cells that span across the move boundary
- [ ] Add to context menu under "Row" submenu

### T5.2 — Per-Cell Padding
- [ ] Add `padding?: IPadding` to `ITd` interface
  - Per-cell padding overrides global `tdPadding`
- [ ] Update cell content layout in `computeRowList()` to use per-cell padding
- [ ] Add `executeTableTdPadding(padding: IPadding)` command

### T5.3 — Table Properties Dialog
- [ ] New dialog accessible from context menu: "Table properties..."
- [ ] Shows and allows editing of:
  - Table border type, color, width
  - Table width (auto/exact)
  - Default cell padding
  - Default cell vertical alignment
- [ ] Uses existing `Dialog` component pattern
- [ ] File: new `src/components/tablePropertiesDialog/`

### T5.4 — Cell Properties Dialog (optional)
- [ ] New dialog: "Cell properties..."
- [ ] Shows and allows editing of:
  - Cell background color
  - Cell border color/width/style per side
  - Cell padding
  - Cell vertical alignment
- [ ] Useful as a unified UI for all T4 features

---

## Phase T6: Advanced Table Features (Low) — Backlog

Future improvements, not currently planned for implementation.

- [ ] **T6.1** — Minimum column width enforcement throughout system
- [ ] **T6.2** — Table width percentage mode (columns as % of available width)
- [ ] **T6.3** — Nested table support (recursive parsing)
- [ ] **T6.4** — Baseline vertical alignment for cells in same row
- [ ] **T6.5** — Table styles / themes (predefined color schemes, alternating rows)
- [ ] **T6.6** — Sort table by column (ascending/descending)
- [ ] **T6.7** — Table header row repeat control from context menu
  - `pagingRepeat` exists on ITr but no command/menu to toggle it

---

## Implementation Order

```
T1 (DONE) ──→ T2 (DONE) ──→ T3 (NEXT) ──→ T4 ──→ T5 ──→ T6 (Backlog)
  Paste fit     Multi-page     Auto-fit &    Cell border   Table ops    Advanced
                splitting      sizing cmds   styling       & dialogs
```

**Estimated remaining**: 5-7 sessions for T3-T5. T6 is backlog.

---

## Dependencies

- No dependency on shaping engine or RTL work
- RTL table column ordering (Phase 9.B) is already complete
- The `overflow` option infrastructure already exists
- T4 depends on T3 being complete (context menu patterns established)
- T5.3/T5.4 dialogs can be built independently

## Success Criteria

1. **T1** ✅: Pasting any Google Docs table results in a table that fits within the editor
2. **T2** ✅: Tables with rowspan split correctly across pages with continuation cells
3. **T3**: User can auto-fit table, set exact row/col sizes, distribute evenly via context menu
4. **T4**: User can set per-cell border color, width, style via context menu
5. **T5**: User can move rows, set cell padding, access table/cell properties dialog
6. **T6**: Advanced features (sort, themes, percentage widths) available
