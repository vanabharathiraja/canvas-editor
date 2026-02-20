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

### Performance Plan B.3: Bounded Visible Layout ✅
- Only compute layout for visible pages + BOUNDED_PAGE_WINDOW=3 buffer during typing
- Complete full document layout when idle (FULL_LAYOUT_IDLE_MS=500ms)
- All regressions on 185-page document fixed (11 bugs)
- Scale + scroll overlap fixed via `_repaintVisiblePages()`
- Catalog worker deferred during bounded layout (null guard in main.ts)
- Commit: `4bebd96f`

## In Progress
- **Performance Plan B.4** — Correctness testing on 185-page document
  - Tables, images, controls, BiDi, lists, page breaks, headers/footers
  - Selection + copy/paste across page boundary
  - Undo/redo after bounded layout corrects itself

## Recently Completed

### Performance Plan B.3: Bounded Visible Layout ✅
- `BOUNDED_PAGE_WINDOW = 3`: dirty page + 2 forward
- Bounded path: incremental `canIncremental` branch only (not full-layout path)
- Idle cleanup: `_scheduleFullLayout` → incremental idle from `_boundedLayoutDirtyFrom`
- `isIdleFullLayout` flag prevents re-entry
- `_updateCursorIndex()` during debounce window (replaces full re-render)
- `_repaintVisiblePages()` synchronous repaint after geometry changes
- Commit: `4bebd96f`

### Performance Plan B.2: Adaptive Debouncing ✅
- **Adaptive delay**: 100ms base, up to 300ms for rapid typing
- **Keystroke batching**: Multiple keystrokes → single render call
- **Defensive null checks**: Fixed runtime error in `getRangeContext()`
- **Results**: Fewer render calls during rapid typing, but layout still ~220-280ms
- **Conclusion**: Debouncing alone insufficient; need bounded layout for true responsiveness
- Commit: `752991af`

### Performance Plan B.1: Layout Worker Infrastructure ✅
- **Message Protocol**: `ILayoutWorkerRequest`, `ILayoutWorkerResponse` interfaces
- **Layout Worker**: `layout.ts` with row computation in background thread
  - Ping/pong health check
  - COMPUTE_LAYOUT message handling
  - Page break detection + pageBoundaryStates generation
- **WorkerManager**: `computeLayoutAsync()`, `pingLayoutWorker()` methods
- **Cypress Tests**: 3 tests for ping, row wrapping, page breaks (all passing)
- Commit: `f241061b`

### Performance Plan A: Incremental Layout ✅
- **A.1** Persistent metrics canvas singleton — eliminates GC pressure
- **A.2** Dirty-page layout cache infrastructure:
  - `pageElementBounds[]` tracks element index ranges per page
  - `layoutDirtyFromPage` marks first page needing recompute
  - `pageBoundaryStates[]` captures layout state at page boundaries
- **A.3** Canvas virtualization — frees GPU memory for distant pages
- **A.4** Incremental position computation — skips clean pages
- **Bug fix** Header/footer computeRowList wipe — moved reset to render()
- **Results** (49 pages, 83K elements):
  - Last page: 350ms → 2ms (175x faster)
  - Middle page: 350ms → 140ms (2.5x faster)
  - First page: No regression (expected full layout)
- Commits: `798f1492` (main implementation)

## Upcoming
- **Performance Plan B.4** — Correctness testing (NEXT):
  - Tables, images, controls, BiDi, lists under bounded layout
  - Verify all element types render correctly on non-visible pages after idle layout
- **Performance Plan B.5** — Benchmarking:
  - Target: last-page <10ms, mid-doc <70ms, first-page <70ms on 185-page doc
- **T6: Advanced Table Features** — Alternating colors, style picker, row/col select, toolbar
- **Paste Improvement** — Word/Docs/Excel paste fidelity (P1-P6 planned)
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
_Last updated: 2026-02-20 (Session 017)_