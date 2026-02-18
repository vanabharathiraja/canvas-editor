# Table Improvement Plan — Google Docs Quality Parity

**Created**: 2026-02-17
**Branch**: `shape-engine`
**Status**: In Progress (T1-T5 complete, T6 backlog)
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

## Phase T4: Per-Cell Border Styling (Medium) — COMPLETE ✅

**Problem**: Border color, width, and style are table-level only. Google Docs allows
per-cell border customization (color, width, style for each side).

**Completed**: 2026-02-18 (Session 020)
**Commit**: `53871231`

### Implementation Summary

- [x] **T4.1** — `TdBorderStyle` enum (SOLID, DASHED, DOTTED, DOUBLE) added
- [x] **T4.1** — `borderColor`, `borderWidth`, `borderStyle` added to `ITd` interface
- [x] **T4.2** — `_drawBorder()` updated for per-cell overrides on all 4 sides
- [x] **T4.3** — Commands: `tableTdBorderColor`, `tableTdBorderWidth`, `tableTdBorderStyle`
- [x] **T4.4** — Context menus: Cell border width, Cell border style, Cell border color
- [x] **T4.5** — Paste preservation: parse per-cell border CSS from pasted HTML
- [x] **T4.5** — Export: per-cell borders exported in `createDomFromElementList`
- [x] **T4.6** — i18n keys for EN, ZH-CN, AR locales

### Key Code Locations
- `Table.ts` — `TdBorderStyle` enum
- `Td.ts` — `ITd` interface with per-cell border properties
- `TableParticle.ts` — `_drawBorder()` with per-cell override logic
- `TableOperate.ts` — border styling commands
- `tableMenus.ts` — Cell border width/style/color menus
- `element.ts` — paste preservation and export

---

### T4.1 — Interface & Enum Changes (Archive)
- [x] Add to `ITd` interface in `Td.ts`:
  ```
  borderColor?: string           // per-cell border color (overrides table-level)
  borderWidth?: number           // per-cell border width
  borderStyle?: TdBorderStyle    // per-cell border style
  ```
- [x] Add new enum `TdBorderStyle` in `src/editor/dataset/enum/table/Table.ts`:
  ```
  enum TdBorderStyle { SOLID, DASHED, DOTTED, DOUBLE }
  ```

### T4.2 — Drawing Changes (Archive)
- [x] Update `_drawBorder()` in `TableParticle.ts` to read per-cell overrides:
  - When drawing cell borders, check `td.borderColor`, `td.borderWidth`, `td.borderStyle`
  - Fall back to table-level values if not set
  - Apply `ctx.setLineDash()` based on style enum
- [x] Handle `DOUBLE` style (draw two parallel lines with gap)

### T4.3 — New Commands (Archive)
- [x] `executeTableTdBorderColor(color: string)` — set border color for selected cells
- [x] `executeTableTdBorderWidth(width: number)` — set border width for selected cells
- [x] `executeTableTdBorderStyle(style: TdBorderStyle)` — set border style for selected cells
- [x] Implementation in `TableOperate.ts` → iterate selected cells, set properties

### T4.4 — Context Menu Updates (Archive)
- [x] Add **Cell border style** submenu under existing border menu:
  - "Border color" → color picker → `executeTableTdBorderColor(color)`
  - "Border width" submenu: "Thin (1px)" / "Medium (2px)" / "Thick (3px)"
  - "Border style" submenu: "Solid" / "Dashed" / "Dotted" / "Double"

### T4.5 — Paste Preservation (Archive)
- [x] Update `getElementListByHTML()` in `element.ts` to parse inline CSS border
  properties (`border-color`, `border-width`, `border-style`) from pasted HTML
  and map to new ITd properties

---

## Phase T5: Table Operations & Properties (Medium) — COMPLETE ✅

**Problem**: Missing convenience operations that Google Docs provides.

**Completed**: 2026-02-19 (Session 021)
**Commits**: `e1fe34bf` (T5.1+T5.2), `e0740801` (T5.3 + bug fixes)

### Implementation Summary

- [x] **T5.1** — `moveTableRowUp()` / `moveTableRowDown()` commands in `TableOperate.ts`
- [x] **T5.2** — `padding?: [T,R,B,L]` on `ITd`; `tableTdPadding()` command; position/draw/getContextInnerWidth updated
- [x] **T5.3** — `TablePropertiesDialog` component (`src/components/tablePropertiesDialog/`)
  - Table border type selector (all/none/outer/inner/dashed)
  - Table border color picker + text field
  - Cell background color, border color/width/style, vertical align, uniform padding
  - Accessible from context menu: "Table Properties..."
- [x] **Bug 1** — Cell backgrounds moved to `selCtx` (bottom layer) so selection remains visible
- [x] **Bug 3** — "None (0px)" option added to border width submenu
- [x] **Bug 4+5** — `_drawBorder()` rewritten: per-edge `drawLine()` helper, `!== undefined` check,
  per-cell override draws all 4 explicit sides (fixes dashed style on top/left shared edges)

### Key Code Locations
- `TableOperate.ts` — `moveTableRowUp/Down()`, `tableTdPadding()`
- `TableParticle.ts` — rewritten `_drawBorder()`, `render()` now accepts `bgCtx`
- `Draw.ts` — passes `selCtx` as `bgCtx` to `tableParticle.render()`; per-cell padding in layout
- `Position.ts` — per-cell padding in position computation
- `tableMenus.ts` — Move row up/down, Cell padding presets, None border option, Table Properties
- `TablePropertiesDialog.ts` — new modal dialog component with CSS
- `ContextMenu.ts` / `en.json` / `zh-CN.json` / `ar.json` — new constants and i18n keys

### T5.1 — Move Row Up/Down
- [x] `moveTableRowUp()`: swaps `trList[trIndex]` ↔ `trList[trIndex-1]`, updates positionContext
- [x] `moveTableRowDown()`: swaps `trList[trIndex]` ↔ `trList[trIndex+1]`, updates positionContext
- [x] Context menu entries with icons: "Move row up", "Move row down"

### T5.2 — Per-Cell Padding
- [x] `padding?: [number, number, number, number]` added to `ITd` interface
- [x] `tableTdPadding(payload)` command iterates selected cells, sets per-cell padding
- [x] Context menu: Small (2px) / Medium (5px) / Large (10px) presets
- [x] `Position.ts` and `Draw.ts` use `td.padding` when set, fall back to global `tdPadding`

### T5.3 — Table Properties Dialog
- [x] `src/components/tablePropertiesDialog/TablePropertiesDialog.ts`
- [x] `src/components/tablePropertiesDialog/tablePropertiesDialog.css`
- [x] Opens from context menu "Table Properties..." entry (last item in table menus, with divider)
- [x] Section 1 (Table Border): type select, color picker+text
- [x] Section 2 (Cell Styling): bg color, border color, border width (0-3px), border style, vertical align, padding
- [x] Apply button calls commands; Cancel/Close dismiss without changes

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
T1 ✅ ──→ T2 ✅ ──→ T3 ✅ ──→ T4 ✅ ──→ T5 ✅ ──→ T6 (Backlog)
  Paste fit   Multi-page   Auto-fit &   Cell border   Table ops    Advanced
              splitting    sizing cmds  styling        & dialogs
```

**All planned phases T1-T5 complete.** T6 is backlog.

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
3. **T3** ✅: User can auto-fit table, set exact row/col sizes, distribute evenly via context menu
4. **T4** ✅: User can set per-cell border color, width, style via context menu
5. **T5** ✅: User can move rows, set cell padding, access table/cell properties dialog
6. **T6**: Advanced features (sort, themes, percentage widths) available
