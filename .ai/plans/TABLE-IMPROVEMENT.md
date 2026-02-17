# Table Improvement Plan — Google Docs Quality Parity

**Created**: 2026-02-17
**Branch**: `shape-engine`
**Status**: In Progress (T1 complete, T2 next)
**ADR**: [adr-0002-table-auto-fit-and-multipage.md](../decisions/adr-0002-table-auto-fit-and-multipage.md)

---

## Overview

Bring table system closer to Google Docs quality. Four phases, ordered by
user impact and implementation complexity.

---

## Phase T1: Paste Auto-Fit (Critical) — COMPLETE

**Problem**: Pasting a Google Docs table with wide columns creates an un-resizable
table that overflows the editor panel.

**Completed**: 2026-02-17 (Session 014-015)
**Commit**: `68a00005`

### Implementation Summary

- [x] **T1.1** — Added `normalizeTableColWidths()` in `element.ts` (not TableOperate)
  - Proportionally scales colgroup widths when total > innerWidth
  - Enforces 40px minimum column width floor
  - Redistributes deficit from flexible columns after floor enforcement

- [x] **T1.2** — Normalization wired into ALL data entry paths:
  - `getElementListByHTML()` — paste from clipboard
  - Editor constructor — initial data load
  - `setValue()` — programmatic data set
  - `insertElementList()` — programmatic insert
  - `_normalizeTableElements()` private method in Draw.ts handles recursive
    normalization for nested tables in cells

- [x] **T1.3** — Edge cases handled:
  - Tables without `<colgroup>` fall back to `innerWidth / tdCount` (unchanged)
  - Minimum width floor prevents columns from becoming unusable
  - Nested tables normalized recursively with cell width minus padding

- [x] **T1.4** — Test coverage:
  - 6 test tables in mock.ts (T1-1 through T1-6)
  - Wide LTR (1200px), extreme 6-col (2400px), RTL Arabic (900px),
    BiDi mixed (1000px), colspan (800px), within-bounds (400px)
  - All visually verified to fit within 554px panel

- [ ] **T1.5** — Overflow option enforcement (deferred to T3)
  - Not critical since normalization already prevents overflow for all paths

### Key Code Locations
- `element.ts` L1609-L1650 — table HTML parsing
- `TableOperate.ts` L228-L249 — existing `adjustColWidth()` (reference)
- `Draw.ts` L571 — `getContextInnerWidth()`
- `Table.ts` constant — `defaultTableOption.overflow`

---

## Phase T2: Multi-Page Table Splitting (High) — 2-3 Sessions

**Problem**: Tables with merged cells (rowspan > 1) cannot split across pages.
The split is abandoned when a row has cross-row cells, leaving blank page space.

### Phase T2a: Improve Split-Point Selection (1 session)

- [ ] **T2a.1** — Refactor split-point algorithm
  - Current: abandons split if ANY row at split point has rowspan
  - New: scan backwards from split point to find the nearest "clean" row
    (where all cells either start at that row or their rowspan ends before it)
  - If no clean row exists within the current page, fall back to current behavior
  - File: `src/editor/core/draw/Draw.ts` L1795-L1880

- [ ] **T2a.2** — Track rowspan state per column
  - Build a `rowspanTracker: number[]` array (one per column)
  - Initialize all to 0
  - For each row, decrement all non-zero entries; for each cell, set
    `tracker[colIndex] = cell.rowspan - 1`
  - A row is "clean" when all `tracker[colIndex] === 0`
  - This replaces the crude `rowColCount !== colgroup.length` check

- [ ] **T2a.3** — Test multi-page split
  - Table with simple rows → splits correctly (no regression)
  - Table with rowspan=2 at split point → finds earlier clean row
  - Table with rowspan=5 spanning entire page → no split (correct, can't fit)
  - Table with rowspan in one column, not in another → correct clean row detection

### Phase T2b: Rowspan Carryover (2 sessions)

- [ ] **T2b.1** — Implement rowspan carryover algorithm
  - When splitting at a non-clean row (no clean row found earlier):
    1. For each column, if a cell's rowspan crosses the split point:
       - Calculate `remainingRows = (cell.rowIndex + cell.rowspan) - splitRowIndex`
       - On current page's fragment: reduce cell's rowspan to `splitRowIndex - cell.rowIndex`
       - On next page's fragment: create a continuation cell with `rowspan = remainingRows`
       - The continuation cell gets **empty content** (content stays on first page)
         OR a `continuedFrom` marker for potential content carry-over
    2. Update the continuation fragment's first row's tdList to include these cells
  - File: `src/editor/core/draw/Draw.ts` table split section

- [ ] **T2b.2** — Continuation cell rendering
  - Continuation cells render with top border dashed or hidden (visual cue)
  - Content is NOT duplicated — only the original page shows cell content
  - Background color carries over
  - File: `src/editor/core/draw/particle/table/TableParticle.ts`

- [ ] **T2b.3** — Recombination update
  - When recombining split tables (L1674-L1694), merge continuation cells back
    into their original rowspan
  - Match continuation cells by column index and `continuedFrom` marker
  - File: `src/editor/core/draw/Draw.ts`

- [ ] **T2b.4** — Edge cases
  - Cell with rowspan spanning 3+ pages
  - Multiple columns with different rowspans at same split point
  - Rowspan cell is the ONLY cell in a row (single-cell row with rowspan)
  - Header repeat rows with rowspan

---

## Phase T3: Auto-Fit Command & UI (Medium) — 1 Session

**Problem**: No way to auto-size columns based on content width.

### Tasks

- [ ] **T3.1** — Add `executeAutoFitTableWidth` command
  - **Fit to page**: Scale all columns proportionally so table width = innerWidth
  - **Fit to content**: Measure content width per column, set proportionally
  - **Fixed column width**: Reset to equal widths (innerWidth / colCount)
  - File: `src/editor/core/command/CommandAdapt.ts`

- [ ] **T3.2** — Add auto-fit to context menu
  - New submenu under table context menu: "Auto-fit"
    - "Fit to page width"
    - "Fit to contents"
    - "Fixed column width"
  - File: `src/editor/core/contextmenu/menus/tableMenus.ts`

- [ ] **T3.3** — Measure content width per column
  - For "fit to content": iterate all rows, for each column find max content width
  - Content width = max(width of all cells in that column after text wrapping at
    minimum width)
  - This requires a trial `computeRowList()` at min width → measure actual used width
  - Simpler heuristic: measure longest word in each column × font size
  - File: `src/editor/core/draw/particle/table/TableOperate.ts`

- [ ] **T3.4** — Keyboard shortcut (optional)
  - Ctrl+Shift+F when cursor is in table → auto-fit to page

---

## Phase T4: Advanced Table Features (Low) — Backlog

Future improvements, not currently planned for implementation.

- [ ] **T4.1** — Minimum column width enforcement throughout system
  - Currently `defaultColMinWidth` (40px) is only used in `adjustColWidth()`
  - Should be enforced in paste, resize, and auto-fit paths consistently

- [ ] **T4.2** — Table width percentage mode
  - Columns stored as percentages of available width rather than fixed pixels
  - Auto-adjusts when page width or margins change
  - Google Docs uses this internally

- [ ] **T4.3** — Nested table support
  - Currently not explicitly supported
  - Would require recursive table parsing in `getElementListByHTML()`
  - Layout engine already supports recursion (computeRowList → isFromTable)

- [ ] **T4.4** — Better cell vertical alignment
  - Currently supports TOP, MIDDLE, BOTTOM
  - Add baseline alignment for cells in same row
  - Improve MIDDLE calculation for cells with complex content

- [ ] **T4.5** — Cell content overflow indicators
  - When cell content is clipped (if ever), show visual indicator
  - Currently content always wraps, so this may not be needed

- [ ] **T4.6** — Table styles / themes
  - Predefined table color schemes
  - Alternating row colors
  - Header row styling

---

## Implementation Order

```
Phase T1 (Critical) ──→ Phase T2a (High) ──→ Phase T2b (High) ──→ Phase T3 (Medium)
     │                                                                    │
     └── Can be demo'd after T1 alone                                     └── Phase T4 (Backlog)
```

**Estimated total**: 5-7 sessions for T1-T3. T4 is backlog.

---

## Dependencies

- No dependency on shaping engine or RTL work
- RTL table column ordering (Phase 9.B) is already complete
- The `overflow` option infrastructure already exists

## Success Criteria

1. **T1**: Pasting any Google Docs table results in a table that fits within the editor
2. **T2a**: Tables with rowspan split at the best available clean row
3. **T2b**: Tables with rowspan split at any row with continuation cells
4. **T3**: User can auto-fit any table to page width via context menu
