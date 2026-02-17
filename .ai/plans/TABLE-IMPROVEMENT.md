# Table Improvement Plan — Google Docs Quality Parity

**Created**: 2026-02-17
**Branch**: `shape-engine`
**Status**: Planning
**ADR**: [adr-0002-table-auto-fit-and-multipage.md](../decisions/adr-0002-table-auto-fit-and-multipage.md)

---

## Overview

Bring table system closer to Google Docs quality. Four phases, ordered by
user impact and implementation complexity.

---

## Phase T1: Paste Auto-Fit (Critical) — 1-2 Sessions

**Problem**: Pasting a Google Docs table with wide columns creates an un-resizable
table that overflows the editor panel.

### Tasks

- [ ] **T1.1** — Add `normalizeTableColWidths()` to TableOperate
  - Input: `element: IElement` (TABLE type)
  - Compute `totalWidth = sum(colgroup[].width)`
  - If `totalWidth <= innerWidth` → no change
  - If `totalWidth > innerWidth` → scale proportionally:
    `col.width = col.width * (innerWidth / totalWidth)`
  - Enforce floor: `Math.max(col.width, defaultColMinWidth)`
  - After floor enforcement, if total still > innerWidth, redistribute excess
    from widest columns
  - File: `src/editor/core/draw/particle/table/TableOperate.ts`

- [ ] **T1.2** — Call `normalizeTableColWidths()` in paste path
  - In `getElementListByHTML()` (element.ts), after building the table element,
    call normalization. BUT: this utils function doesn't have access to
    `TableOperate` or `draw` context.
  - **Approach A**: Pass `innerWidth` as parameter to `getElementListByHTML()`
    (it already receives `IEditorOption`)
  - **Approach B**: Do normalization in the caller after paste returns elements
  - **Decision**: Approach A — add normalization inline in `getElementListByHTML`
    since `options.innerWidth` is accessible. Simpler, no architecture change.
  - File: `src/editor/utils/element.ts` (table branch of `getElementListByHTML`)

- [ ] **T1.3** — Handle edge cases
  - Table with no `<colgroup>` (already falls back to `innerWidth / tdCount` — OK)
  - Table with some `<col>` elements but not all (pad remaining with equal widths)
  - Table where all columns are at `defaultColMinWidth` but still overflow
    (reduce min width proportionally in extreme cases)
  - Very narrow innerWidth (e.g. table inside another table cell)

- [ ] **T1.4** — Test paste scenarios
  - Paste Google Docs table wider than editor → fits within editor
  - Paste Google Docs table narrower than editor → widths preserved
  - Paste table from Word → same behavior
  - Paste table from plain HTML → works
  - Paste into table cell (nested table scenario)

- [ ] **T1.5** — Enforce overflow option on paste
  - When `table.overflow === false`, ALWAYS normalize (not just when sum > innerWidth)
  - When `table.overflow === true`, normalize only when sum > innerWidth (prevent
    un-renderable tables, but allow slight overflow if user resizes later)

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
