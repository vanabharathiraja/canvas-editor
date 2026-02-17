# ADR-0002: Table Auto-Fit and Multi-Page Improvements

**Date**: 2026-02-17
**Status**: Accepted (Phase T1 implemented)
**Deciders**: vanabharathiraja
**Context**: Table system falls behind Google Docs quality — pasted wide tables overflow, multi-page splitting fails on merged cells

---

## 1. Problem Statement

### 1.1 Paste Overflow (Critical)
When copying a table from Google Docs (or any external source), the `<colgroup><col width="...">` pixel values are stored **verbatim** in `colgroup[].width`. If the source table is wider than the editor's `innerWidth`, the table overflows the rendering panel with no way to resize it back.

**Root Cause**: `getElementListByHTML()` in `element.ts` reads `<col width>` attributes directly via `parseFloat()` without any clamping. The `adjustColWidth()` method exists in `TableOperate.ts` but is **never called** in the paste path — only when inserting a new column.

**Google Docs behavior**: Google Docs automatically scales all column widths proportionally so the table fits within the available page width.

### 1.2 Multi-Page Table Splitting (High)
When a table is too tall for one page, the splitting algorithm at `Draw.ts L1830-L1837` checks if a row has merged cells (rowspan). If the column count at the split point doesn't match `colgroup.length`, the split is **abandoned entirely** — the table stays unsplit and overflows the page vertically.

**Root Cause**: The algorithm doesn't know how to split a rowspan across pages. It treats it as an all-or-nothing decision.

**Google Docs behavior**: Google Docs splits tables at any row boundary, drawing partial merged cells on each page with continued borders.

### 1.3 No Auto-Fit Column Widths (Medium)
There is no mechanism to auto-size columns based on content. Columns are either evenly distributed on creation or manually resized. When content varies widely between columns, this wastes space.

### 1.4 Overflow Option Gap (Medium)
The `overflow: boolean` option only affects **interactive column drag-resize** in `TableTool.ts`. It has no effect on pasted tables or programmatic table creation. Setting `overflow: false` does not prevent paste-induced overflow.

---

## 2. Architecture Analysis

### 2.1 Current Table Data Flow
```
Paste/Create → IElement(TABLE) → colgroup[].width stored
                                       ↓
computeRowList() → computeRowColInfo() → td.x, td.y, td.width, td.height computed
                 → recursive computeRowList() per cell
                 → row height adjustment (expand/reduce)
                 → multi-page split (if pagingMode)
                                       ↓
drawRow() → tableParticle.render() → borders, backgrounds
          → recursive drawRow() per cell → text, controls, etc.
```

### 2.2 Key Integration Points

| Component | File | What It Does | Change Needed |
|-----------|------|-------------|---------------|
| `getElementListByHTML()` | `element.ts` | Parses `<table>` from clipboard | Add auto-fit normalization |
| `adjustColWidth()` | `TableOperate.ts` | Shrinks columns to fit innerWidth | Generalize + call on paste |
| `computeRowColInfo()` | `TableParticle.ts` | Computes cell geometry | No change for auto-fit (reads colgroup) |
| `computeRowList()` table section | `Draw.ts` | Layout + split + merge | Improve split algorithm for rowspan |
| `TableTool.ts` resize | `TableTool.ts` | Drag resize columns | Respect overflow option consistently |
| `insertTable()` | `TableOperate.ts` | Creates table programmatically | Already fits to innerWidth |

### 2.3 Proposed Architecture Change: Minimal

No fundamental architecture change needed. The fixes are:
1. **Normalization pass** after paste — proportionally scale colgroup widths to fit `innerWidth`
2. **Improved split algorithm** — handle rowspan cells at page boundaries
3. **Auto-fit command** — optional "fit table to page" command
4. **Consistent overflow enforcement** — apply overflow setting in paste path too

These are **localized changes** to existing methods, not architectural rework.

---

## 3. Design Decisions

### 3.1 Auto-Fit Strategy on Paste

**Option A**: Always fit to page width (Google Docs behavior)
- Pro: Consistent, no overflow possible
- Con: User may want to preserve original column proportions wider than page

**Option B**: Fit only when total width exceeds innerWidth
- Pro: Preserves original widths when they fit
- Con: Slight inconsistency

**Decision**: **Option B** — Only normalize when total colgroup width > innerWidth.
Proportionally scale all columns: `col.width = col.width * (innerWidth / totalWidth)`.
Enforce `defaultColMinWidth` (40px) as floor. This matches Google Docs behavior
(Google Docs only scales when the table doesn't fit).

### 3.2 Multi-Page Split with Rowspan

**Option A**: Split at any row, visually clip merged cells
- Pro: Maximum page utilization
- Con: Complex — need to draw partial cell borders, content may be cut mid-text

**Option B**: Split only at rows where ALL cells start (no active rowspan)
- Pro: Simpler, no partial cell rendering
- Con: Large rowspan cells prevent splitting → blank space at page bottom

**Option C**: Split at any row, carry over remaining rowspan to next page
- Pro: Good page utilization, cells continue on next page
- Con: Need to track "remaining rowspan" and re-create partial cells

**Decision**: **Option C** in phases — Phase 1 implements Option B properly (current
behavior but with correct logic), Phase 2 adds rowspan carryover. This is how
Google Docs handles it: the merged cell continues on the next page with reduced rowspan.

### 3.3 Overflow Option Scope

**Decision**: The `overflow` option should be respected in ALL table creation paths:
- Interactive column resize (already done)
- Paste from clipboard (new)
- Programmatic insertTable (already fits, but add guard)
- Column insert via adjustColWidth (already done)

---

## 4. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Proportional scaling makes some columns too narrow | Medium | Floor at defaultColMinWidth (40px) |
| Rowspan carryover creates visual artifacts | Medium | Phase 2 only after Phase 1 is stable |
| Performance: re-measuring after auto-fit | Low | One-time pass on paste only |
| Breaking existing tables in documents | High | Only apply to NEW paste operations; existing data untouched |

---

## 5. Implementation Phases

See `.ai/plans/TABLE-IMPROVEMENT.md` for detailed task breakdown.

- **Phase T1**: Paste auto-fit (critical fix, 1-2 sessions)
- **Phase T2**: Multi-page split improvement (high, 2-3 sessions)
- **Phase T3**: Auto-fit command + UI (medium, 1 session)
- **Phase T4**: Advanced table features (low, backlog)
