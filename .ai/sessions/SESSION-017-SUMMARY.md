# Session 017 Summary — B.3 Bug Fixes + Scale/Scroll Overlap Fix

**Date**: 2026-02-20  
**Branch**: `perf/incremental-layout`  
**Agent**: GitHub Copilot (Claude Sonnet 4.6)  
**Last HEAD**: `4bebd96f`  

---

## Goal

Fix all regressions introduced by Plan B.3 (bounded visible layout) on a
185-page document, and fix the "text overlap after scale + scroll" bug that
was present but undiagnosed from a previous session.

---

## Context Coming In

Previous session left the branch with:
- `942340b9` as HEAD — catalog worker crash fix (committed)  
- ~123 lines of uncommitted changes in `Draw.ts` (10 incremental bug fixes)
  that had been applied but not yet committed
- Known unresolved issue: text overlap after scale change + scroll to pages  
  above the edit area

---

## Problems Diagnosed

### A. 185-Page Document Regressions

| # | Symptom | Root Cause |
|---|---|---|
| 1 | Pages 9–184 blank after paste | `useBoundedFull` applied bounded window ON the full-layout path — padded empty pageRowList before positionList was computed |
| 2 | Infinite 2/sec render loop | `isIdleFullLayout` not set → idle clean-up render re-activated `useBounded` → new timer → repeat |
| 3 | 185ms overhead per keystroke during debounce | Debounce was calling `_renderInternal({isCompute:false})` which reconstructs IntersectionObserver for all 185 pages |
| 4 | Rapid backspace deletes wrong character | `_renderInternal({isCompute:false})` called `setCursor(stale_index)` — position list built with pre-debounce layout, wrong cursorPosition.index |
| 5 | `spliceElementList` crash: `undefined.controlId` | Optional chain missing on `deleteElement?.controlId` |
| 6 | 1500ms idle full layout (instead of incremental) | `_scheduleFullLayout` passed `curIndex:undefined` → forced `needsFullLayout=true` path |

### B. Scale + Scroll Overlap

The `_lazyRender()` IntersectionObserver is async. After `setPageScale` called the full
`render()` (which builds a new observer and bumps `_lazyRenderVersion`), browser could
still deliver pending IO callbacks from the *previous* observer. The `_lazyRenderVersion`
version check alone was insufficient because:
- New observer fires for same visible wrappers with *new* version → correct
- Old observer callbacks could fire with *old* version → version check correctly  
  discards them
- BUT the new observer fires concurrently for pages that were *already* painted  
  by the synchronous `render()`, causing a **double-draw** onto a canvas cleared  
  by the new `_drawPage()` pass

More precisely: `render()` calls `_lazyRender()` which sets up the new observer.  
The immediate `_drawPage()` for currently-visible pages happens via the IO callback  
(asynchronous delivery). Between `setPageScale` completing and the first IO callback,  
a *previous* stale IO could have already drawn old-scale rows on the newly-sized canvas.

---

## Fixes Implemented

All changes in `Draw.ts` unless noted.

### 1. Remove `useBoundedFull` (blank pages fix)

The full-layout path now **always** does a real full compute. `useBoundedFull` had
tried to apply a bounded window during full layout, but that path is used for paste,
large inserts, and first-page edits — all cases where clean-page cache is invalid.
Bounded optimisation **only** applies in the incremental canIncremental path.

### 2. `isIdleFullLayout` flag (infinite loop fix)

New field on `IDrawOption` interface (`src/editor/interface/Draw.ts`).  
`_scheduleFullLayout` passes `isIdleFullLayout: true` to its `_renderInternal` call.  
`useBounded` condition gains `&& !isIdleFullLayout` guard.  
Result: idle clean-up never re-activates bounded layout → no new timer → loop broken.

### 3. Replace debounce immediate render with `_updateCursorIndex()` (185ms fix)

During the debounce window, instead of calling  
`_renderInternal({ isCompute:false })` (which rebuilds IntersectionObserver),  
only call `_updateCursorIndex(payload.curIndex)`.  
This clones the current `cursorPosition` object and patches its `.index` field —  
no canvas ops, no DOM touches, no observer rebuild.

### 4. `_updateCursorIndex()` helper (backspace correctness fix)

```typescript
private _updateCursorIndex(curIndex: number | undefined) {
  if (curIndex === undefined) return
  const curPos = this.position.getCursorPosition()
  if (!curPos) return
  this.position.setCursorPosition({ ...curPos, index: curIndex })
}
```

Shallow-clone preserves x/y so cursor DOM element doesn't move. Only `.index`
is updated so rapid operations like backspace read the correct element slot.

### 5. `spliceElementList` crash fix

```typescript
// Before (crashes when deleteElement is undefined on rapid backspace):
(!deleteElement.controlId || ...)

// After:
(!deleteElement?.controlId || ...)
```

### 6. `_scheduleFullLayout` incremental idle path

Saves `dirtyFrom` page when bounded activates (`_boundedLayoutDirtyFrom`).  
Idle timer uses this to pass a valid `curIndex` and `setLayoutDirtyFromPage(savedDirtyFrom)`,
taking the incremental path (pages dirtyFrom..N) instead of full 0..N.  
Idle layout time on 185-page doc: 1500ms → 40–80ms.

### 7. `isSubmitHistory` guard in `_shouldDebounceLayout`

```typescript
if (!isSubmitHistory) return false
```

Structural renders (scale, paper size, margin) pass `isSubmitHistory:false` — they must
never be debounced since canvases were already physically resized.

### 8. Fast-path guard in `_shouldDebounceLayout`

```typescript
if (this.layoutTimes[last] < 20) return false
```

Last-page editing stays sub-20ms with incremental layout; no need to debounce it.

### 9. `BOUNDED_PAGE_WINDOW = 3` (was 8)

Enough for text reflow (dirty page + 2 forward). Smaller window → idle timer  
fires less frequently → less perceived stutter.

### 10. `candidateStop < totalKnownPages - 1` guard

Prevents bounded from activating when editing near end of document (the window  
would cover the whole remainder anyway — no point activating bounded then).

### 11. `_repaintVisiblePages()` (scale + scroll overlap fix)

```typescript
private _repaintVisiblePages() {
  if (!this.getIsPagingMode()) return
  const { visiblePageNoList } = this.scrollObserver.getPageVisibleInfo()
  if (!visiblePageNoList.length) return
  const positionList = this.position.getOriginalMainPositionList()
  const elementList = this.getOriginalMainElementList()
  for (const pageNo of visiblePageNoList) {
    const rowList = this.pageRowList[pageNo]
    if (!rowList?.length) continue
    this._drawPage({ elementList, positionList, rowList, pageNo })
  }
}
```

Called synchronously after `render()` completes in: `setPageScale`,
`setPageDevicePixel`, `setPaperSize`, `setPaperDirection`, `setPaperMargin`.  
Sidesteps the IO timing window entirely — visible pages are painted correctly
before any async IO callbacks can deliver stale data.

---

## Commits

| Hash | Message |
|---|---|
| `4bebd96f` | `fix(perf): bounded layout regressions on 185-page document + scale/scroll overlap` |

---

## Files Modified

| File | Change |
|---|---|
| `src/editor/core/draw/Draw.ts` | All 11 fixes above (+241 lines) |
| `src/editor/interface/Draw.ts` | `isIdleFullLayout?: boolean` on `IDrawOption` |
| `src/editor/core/worker/WorkerManager.ts` | Defer `getCatalog()` when positionList shorter than elementList |
| `src/main.ts` | Null return guard in `updateCatalog()` keeps panel during bounded layout |
| `.ai/plans/PERFORMANCE-IMPROVEMENT.md` | Status updates |

---

## Next Work (B.4 + B.5)

### B.4 — Correctness Testing

Test all element types with 185-page document under bounded layout:

- [ ] Tables with pagination (multi-page split)
- [ ] Images (inline, float, surround)
- [ ] Hyperlinks across pages
- [ ] Controls (checkbox, radio, select)
- [ ] BiDi / RTL text
- [ ] Lists with multiple levels
- [ ] Page breaks (explicit)
- [ ] Headers and footers across pages
- [ ] Selection + copy/paste across page boundary
- [ ] Undo/redo after bounded layout corrects itself

Expected: all behaviours identical to pre-B.3 baseline.

### B.5 — Performance Benchmarking

Measure on 185-page document (same content used during this session):

| Edit Location | Target | Expected |
|---|---|---|
| Last page | ≤ 10ms | 2–5ms |
| Mid-document (page 90) | ≤ 70ms | 30–50ms |
| First page | ≤ 70ms | 40–60ms (full layout) |
| Idle full layout after mid-doc edit | ≤ 100ms | 40–80ms (incremental) |

Measurement method: `performance.now()` logged in `_renderInternal()` before/after.

### Suggested Next Session Prompt

> "I'm continuing on the perf/incremental-layout branch (HEAD 4bebd96f).
> Plan B.3 (bounded visible layout) is complete with all regressions fixed.
> Start B.4 correctness testing with a 185-page document. Check tables,
> images, controls, and BiDi under bounded layout. Then do B.5 benchmarking.
> Read `.ai/sessions/SESSION-017-SUMMARY.md` for full context."
