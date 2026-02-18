# Canvas Editor AI Progress

## Completed Phases

### T1: Paste Auto-Fit ✅
- `normalizeTableColWidths()` scales colgroup widths to fit page
- Wired into all data entry paths (paste, setValue, insertElementList)
- Commit: `68a00005`

### T2: Multi-Page Table Splitting ✅
- Rowspan-aware split-point selection with `rowspanTracker[]`
- Rowspan carryover with `isPageBreakContinuation` marker
- Intra-row split for oversized single rows
- Null checks in `TableParticle.getRangeRowCol()` and `main.ts`
- Commits: `673f36f7`, `1a98a924`

### T3: Auto-Fit & Table Sizing Commands ✅
- `TableAutoFit` enum (PAGE, CONTENT, EQUAL)
- 4 new commands: `tableAutoFit`, `tableColWidth`, `tableRowHeight`, `distributeTableRows`
- Context menus: Auto-fit submenu, Distribute rows, Split cell submenu
- i18n keys for EN, ZH-CN, AR locales
- Commit: `2501396c`

### T4: Per-Cell Border Styling ✅
- `TdBorderStyle` enum (SOLID, DASHED, DOTTED, DOUBLE)
- Commands: `tableTdBorderColor`, `tableTdBorderWidth`, `tableTdBorderStyle`
- Updated `_drawBorder()` for per-cell overrides on all 4 sides
- Context menus: Cell border width, style, color pickers
- Paste preservation and export for per-cell border styles
- i18n keys for EN, ZH-CN, AR locales
- Commit: `53871231`

### Bug Fixes ✅
- Fixed broken footer events (null checks for DOM input bindings in main.ts)
- Added null checks in `rangeStyleChange` for all DOM elements
- Patched `emitSearch` and color menu handlers for TypeScript null safety
- Removed unused `highlightSpanDom` variable


### T5: Table Operations & Properties
- **T5.1** - moveTableRowUp/Down commands + context menu entries
- **T5.2** - Per-cell padding on ITd; tableTdPadding command; presets in menu
- **T5.3** - TablePropertiesDialog component; "Table Properties..." context menu entry
- **Bug 1** - Cell backgrounds moved to selCtx so selection stays visible
- **Bug 3** - "None (0px)" added to border width submenu
- **Bug 4+5** - _drawBorder() rewritten; per-cell override draws all 4 sides correctly
- Commits: e1fe34bf (T5.1+T5.2), e0740801 (T5.3 + rendering bug fixes)

### T5-fix: Border Rendering Precedence Fix ✅
- Rewrote `_drawBorder()` into two-pass rendering (standard grid → override cells)
- Added `_buildOverrideMap()` for O(1) neighbor lookup by row,col
- Added `_resolveEdgeStyle()` — self override → neighbor override → table-level
- `clearEdge()` erases previously drawn border before redrawing with override style
- Fixed: `borderWidth=0` no longer reveals table outer border
- Fixed: dashed style no longer shows double borders on top/left shared edges
- Commit: `9c094472`

## In Progress
- **T6: Advanced Table Features** — Alternating colors, style picker, row/col select, toolbar
- **Paste Improvement** — Word/Docs/Excel paste fidelity (P1-P6 planned)

## Upcoming
- **T6.1**: Alternating row colors (banding)
- **T6.2**: Table style picker (presets)
- **T6.3**: Row/column selection + apply styles
- **T6.4**: Table toolbar / enhanced property panel
- **P1**: Paste source detection + sanitization
- **P2**: Property capture (font-family, letter-spacing, cell padding)
- **P3**: Google Docs normalizer
- **P4**: MS Word normalizer
- **P5**: Excel normalizer + TSV
- **P6**: Paste as plain text (Ctrl+Shift+V)

---
_Last updated: 2026-02-18_