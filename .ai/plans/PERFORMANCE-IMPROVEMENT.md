# Performance Improvement Plan

**Version**: 1.2  
**Date**: 2026-02-20  
**Status**: Plan A Complete, Plan B.2 Complete, Plan B.3 Next  
**Related ADR**: `adr-0005-performance-architecture.md`

---

## Executive Summary

Canvas Editor's render pipeline is **O(n) over all document elements on every keystroke**,
even for a single character change. The 2 000–2 700 ms render time at 300 pages is
dominated by `computeRowList()` in Draw.ts, which re-lays out every element synchronously.

Painting is already lazy (IntersectionObserver skips off-screen pages). The missing
piece is **incremental layout** — only recomputing pages that actually changed.

Three plans are documented below, ordered by ROI. Plan A alone achieves the 20 ms
target for interactive editing. Plans B and C are optional enhancements.

---

## Current Bottleneck Analysis

### Render Pipeline (as of this analysis)

```
render({ isCompute: true })
  │
  ├─ computeRowList()                        ← BOTTLENECK #1 (~70–80% of time)
  │   ├── document.createElement('canvas')   ← BOTTLENECK #2 (GC pressure)
  │   ├── ctx.getContext('2d')               ← GPU alloc every call
  │   └── for (let i = 0; i < elementList.length; i++)  ← all N elements
  │         └── measureText / precomputeContextualWidths per element
  │
  ├─ _computePageList()                      ← cheap, depends on computeRowList output
  │
  ├─ position.computePositionList()          ← BOTTLENECK #3 (~10–15% of time)
  │   └── iterates all pages × rows × elements — O(n), pure arithmetic
  │
  ├─ area.compute() / search.compute()       ← ~2–5% of time
  │
  ├─ _createPage(i) for each new page        ← DOM mutation per extra page
  │
  └─ _lazyRender() OR _immediateRender()     ← ALREADY LAZY for paging mode
        _lazyRender: IntersectionObserver — ONLY visible pages are painted  ✓
        _immediateRender: ALL pages painted (print/export — acceptable)
```

### Memory Profile (300 pages)

| Resource | Count | Memory Estimate |
|---|---|---|
| Content canvases (`pageList`) | 300 | ~300 × (794px×1123px×4B×4 DPR²) ≈ 4.2 GB theoretical |
| Selection canvases (`selectionPageList`) | 300 | Same — 4.2 GB theoretical |
| Wrapper divs | 300 | Negligible |
| `positionList` array | ~9 000+ entries | ~5–10 MB |
| `rowList` / `pageRowList` | ~3 000+ rows | ~1–3 MB |
| History stack (slim clones) | up to N records | ~5–20 MB per snapshot |

> Browser allocations are compressed/virtual but DOM GPU pressure is real.
> 600 live canvases cause visible memory spiking in DevTools at 300+ pages.

### Code Locations of Interest

| Bottleneck | File | Line |
|---|---|---|
| `computeRowList()` — full layout | `Draw.ts` | ~1593 |
| Throwaway canvas creation | `Draw.ts` | ~1614 (inside computeRowList) |
| `render()` — top-level orchestrator | `Draw.ts` | ~3817 |
| `_lazyRender()` — IntersectionObserver | `Draw.ts` | ~3782 |
| `_immediateRender()` — sync full paint | `Draw.ts` | ~3804 |
| `_drawPage()` — per-page paint | `Draw.ts` | ~3667 |
| `computePositionList()` | `Position.ts` | ~338 |
| `cacheMeasureText` Map | `TextParticle.ts` | ~47 |
| `precomputeContextualWidths()` | `TextParticle.ts` | ~172 |

---

## Plan A — Incremental Layout (Recommended)

**Effort**: 6–8 sessions  
**Expected gain**: 2 700 ms → 100–200 ms (300 pages, single keystroke)  
**Risk**: Low — stays within existing 2D Canvas architecture  
**Dependencies**: None — no new libraries  

### Core Insight

A keystroke on page 5 cannot invalidate pages 1–4 (text flows forward, not backward).
After the edit, only page 5 and all subsequent pages need layout recomputation.
Pages before the edit point can reuse their cached `rowList` entries.

### A.1 — Persistent Metrics Canvas (Quick Win, ~30 min)

**Problem**: `computeRowList()` creates a new `<canvas>` + `getContext('2d')` on every
call just to measure text widths. This creates a new GPU context and triggers GC.

**Fix**: Create a single persistent offscreen canvas in `Draw` constructor, reuse it.

```typescript
// In Draw class fields:
private metricsCanvas: HTMLCanvasElement
private metricsCtx: CanvasRenderingContext2D

// In constructor (after existing setup):
this.metricsCanvas = document.createElement('canvas')
this.metricsCanvas.width = 1
this.metricsCanvas.height = 1
this.metricsCtx = this.metricsCanvas.getContext('2d')!

// In computeRowList(), replace:
//   const canvas = document.createElement('canvas')
//   const ctx = canvas.getContext('2d')!
// with:
//   const ctx = this.metricsCtx
```

**Expected gain**: Eliminates GC pressure from canvas creation. Measurable improvement
even at 18 pages (the throwaway was created every render). ~5–10% overall improvement.

### A.2 — Dirty-Page Layout Cache (Core, ~2–3 sessions)

**Problem**: Full `computeRowList()` runs for every element on every render.

**Fix**: Track the first-changed element index. Skip layout for all pages before
the page containing that element. Reuse cached `pageRowList[i]` for unchanged pages.

#### Data Structures Needed

```typescript
// In Draw class:
private pageLayoutCache: IRow[][]    // cached rowList per page
private pageElementBounds: [number, number][]  // [startElementIdx, endElementIdx] per page
private layoutDirtyFromPage: number  // first page needing recompute, or -1 for all
```

#### Render Call Changes

Each `render()` call that causes a real edit must identify the `curIndex` (cursor
position). The dirty page is `Math.floor(curIndex / approxElementsPerPage)` —
but more precisely, it's determined by binary-searching `pageElementBounds`.

```typescript
// Pseudo-code in render():
if (isCompute) {
  if (this.layoutDirtyFromPage === -1 || curIndex === undefined) {
    // Full recompute — first render, paste, global format change
    this.rowList = this.computeRowList(...)
  } else {
    // Incremental — only recompute from dirty page onward
    const cleanPages = this.pageRowList.slice(0, this.layoutDirtyFromPage)
    const dirtyInput = this.elementList.slice(this.pageElementBounds[this.layoutDirtyFromPage][0])
    const dirtyRowList = this._computeRowListFromIndex(
      dirtyInput,
      this.layoutDirtyFromPage
    )
    this.rowList = [...cleanPages.flat(), ...dirtyRowList]
  }
  this.layoutDirtyFromPage = -1  // reset after compute
}
```

#### Invalidation Rules

Must invalidate ALL pages (`layoutDirtyFromPage = 0`) when:
- `isFirstRender = true`
- Paper size, margin, scale, or direction changes
- Font default changes
- Header/footer changes
- Full document `setValue()` or `setEditorData()`
- History undo/redo (unknown edit position)
- Image resize (affects row heights)

Must invalidate from dirty page when:
- Any normal keystroke, delete, paste (use `curIndex` to find page)
- Format change — bold, italic, size change at `curIndex`
- Table cell edit (invalidate from the table element's page)

#### `_computeRowListFromIndex()` signature

```typescript
private _computeRowListFromIndex(
  elementList: IElement[],
  startPageNo: number,
  startRowY: number,       // Y offset at start of dirty page
  startIndex: number       // element index in full elementList
): IRow[]
```

This is the extracted inner loop of `computeRowList()` taking an arbitrary start point.
The existing `computeRowList` becomes a thin wrapper calling `_computeRowListFromIndex`
with `startPageNo = 0, startRowY = margins[0] + headerHeight, startIndex = 0`.

### A.3 — Canvas Virtualization (Memory Fix, ~1–2 sessions)

**Problem**: 300 live canvases keep GPU memory allocated indefinitely.

**Fix**: Destroy canvas pixel buffers for pages far from viewport. Keep the DOM wrapper div
(preserving scroll height) but set `canvas.width = 1, canvas.height = 1` (frees GPU memory).
Recreate full-size canvas + repaint when page enters viewport.

```typescript
// Thresholds
const CANVAS_PRELOAD_PAGES = 3   // keep ±3 pages around viewport alive
const CANVAS_DESTROY_PAGES = 6   // destroy pages > 6 from viewport

// In scrollObserver callback:
this.visiblePageNoList.forEach(visibleNo => {
  for (let p = visibleNo - CANVAS_DESTROY_PAGES; p <= visibleNo + CANVAS_DESTROY_PAGES; p++) {
    if (p < 0 || p >= this.pageList.length) continue
    const dist = Math.abs(p - visibleNo)
    if (dist <= CANVAS_PRELOAD_PAGES) {
      this._ensurePageCanvasAlive(p)  // recreate if destroyed
    } else {
      this._freePageCanvasBitmap(p)   // release GPU memory
    }
  }
})

private _freePageCanvasBitmap(pageNo: number) {
  const canvas = this.pageList[pageNo]
  if (canvas.width === 1) return   // already freed
  canvas.width = 1
  canvas.height = 1
  // Mark as needs-repaint
  this._pageNeedsRepaint.add(pageNo)
}

private _ensurePageCanvasAlive(pageNo: number) {
  const canvas = this.pageList[pageNo]
  if (canvas.width > 1) return   // already alive
  const width = this.getWidth()
  const height = this.getHeight()
  const dpr = this.getPagePixelRatio()
  canvas.width = width * dpr
  canvas.height = height * dpr
  this._initPageContext(this.ctxList[pageNo])
  // Trigger repaint for this page
  this._drawPage({ ..., pageNo })
}
```

**Memory profile after change**: Only ±3 visible pages × 2 canvases = 12 live canvases max.
Memory drops from ~600 MB to ~24 MB GPU canvas allocation regardless of document size.

**Trade-off**: ~2–5 ms cost when scrolling to a destroyed page (canvas realloc + repaint).
This is imperceptible at normal scroll speeds (1–2 pages per 16 ms frame).

### A.4 — Incremental Position Computation (~1 session)

`computePositionList()` re-computes coordinates for ALL elements on every render.
After Plan A.2 is in place, position computation can mirror layout dirtyness:

```typescript
// In Position.computePositionList():
if (this.draw.getLayoutDirtyFromPage() > 0) {
  const dirtyPage = this.draw.getLayoutDirtyFromPage()
  // Clear positions from dirty page onward, reuse earlier ones
  this.positionList = this.positionList.slice(0, this.pageElementBounds[dirtyPage][0])
  // Compute only for dirty pages
  this._computeFromPage(dirtyPage)
} else {
  // Full recompute (existing logic)
  this.positionList = []
  this._computeFromPage(0)
}
```

**Expected gain**: Position computation is pure arithmetic (no canvas ops), so gain is
moderate (~5–10% of total render time). Worth doing as part of Plan A.2.

### Plan A — Session Breakdown (COMPLETED 2026-02-20)

| Session | Work | Status |
|---|---|---|
| A-1 | Persistent metrics canvas (A.1) + measure baseline | ✅ Complete |
| A-2 | `pageElementBounds` tracking + `layoutDirtyFromPage` detection | ✅ Complete |
| A-3 | Incremental compute path with `startFromIndex` | ✅ Complete |
| A-4 | Full invalidation rules + edge cases (undo, paste, table) | ✅ Complete |
| A-5 | Canvas virtualization (A.3) | ✅ Complete |
| A-6 | Incremental position computation (A.4) | ✅ Complete |
| A-7 | Bug fix: header/footer computeRowList wipe | ✅ Complete |

**Results achieved** (49 pages, 83K elements):
- Last page edit: 350ms → 2ms (175x faster)
- Middle page edit: 350ms → 140ms (2.5x faster)  
- First page edit: No regression (full layout still required, addressed in Plan B)

---

## Plan B — OffscreenCanvas + Web Worker (Optional, Additive to Plan A)

**Effort**: 8–10 additional sessions (after Plan A)  
**Expected gain**: 200 ms → 20–40 ms (layout async, non-blocking)  
**Risk**: Medium — threading introduces message-passing complexity  
**Dependencies**: `OffscreenCanvas` API (Chrome 69+, Firefox 105+, Safari 16.4+) — already supported  

### Core Insight

`computeRowList()` is pure layout computation — it doesn't touch the DOM or require
the main thread. The only dependency on the DOM is `canvas.measureText()` for font
metrics. With `OffscreenCanvas`, this can move to a worker.

### B.1 — Worker Architecture

```
Main Thread                           Layout Worker
     │                                      │
     │  postMessage({ type: 'layout',       │
     │    elementList, options, dirtyFrom }) │
     │ ─────────────────────────────────── >│
     │                                      │ computeRowList() runs here
     │                                      │ (non-blocking to main thread)
     │  postMessage({ type: 'layout-done',  │
     │    rowList, pageRowList, bounds })    │
     │ < ─────────────────────────────────  │
     │                                      │
     │ _computePageList()   (fast)           
     │ position.computePositionList()       
     │ area/search (fast)                   
     │ _lazyRender() → _drawPage()          
```

**Main thread is free to handle events during layout worker execution**.
For fast typists this means keystrokes are never dropped — they queue while
layout runs asynchronously, then a single final merged render fires.

### B.2 — WorkerManager Integration

`WorkerManager.ts` already exists at `src/editor/core/worker/WorkerManager.ts`.
The layout worker can be registered there.

```typescript
// WorkerManager.ts additions:
public dispatchLayoutWork(payload: ILayoutWorkPayload): Promise<ILayoutWorkResult> {
  return new Promise(resolve => {
    this.layoutWorker.postMessage(payload)
    this.layoutWorker.onmessage = e => resolve(e.data)
  })
}
```

Layout worker receives a serialized subset of `computeRowList` inputs:
- `elementList` (serialized — no methods, just data)
- `options` (scale, margins, font defaults, etc.)
- `dirtyFromIndex` — start position for incremental compute
- `cachedRowList` — pages before dirty point (pass-through)

Layout worker returns:
- `rowList` — complete computed row list
- `pageRowList` — split per page
- `pageElementBounds` — element index ranges per page

### B.3 — Text Metrics in Worker

Text measurement requires a canvas. Workers have access to `OffscreenCanvas`:

```typescript
// In layout worker:
const metricsCanvas = new OffscreenCanvas(1, 1)
const metricsCtx = metricsCanvas.getContext('2d')!
// Use exactly like the main-thread canvas for measureText
```

`OffscreenCanvas.getContext('2d').measureText()` is spec-compliant and widely supported.

### B.4 — Keystroke Debouncing During Async Layout

While the layout worker is running, additional keystrokes must be buffered:

```typescript
private layoutWorkerPending = false
private pendingRenderPayload: IRenderPayload | null = null

public render(payload: IRenderPayload) {
  if (this.layoutWorkerPending && payload.isCompute) {
    // Merge into pending — just keep latest cursor position
    this.pendingRenderPayload = payload
    return
  }
  if (payload.isCompute) {
    this.layoutWorkerPending = true
    this._dispatchLayoutAsync(payload).then(result => {
      this.layoutWorkerPending = false
      this._onLayoutComplete(result, payload)
      if (this.pendingRenderPayload) {
        const pending = this.pendingRenderPayload
        this.pendingRenderPayload = null
        this.render(pending)
      }
    })
    // Immediate: update cursor position (isCompute: false render)
    this.render({ ...payload, isCompute: false })
    return
  }
  // Non-compute render (cursor, selection, scroll): synchronous as today
  this._syncRender(payload)
}
```

### Plan B — Session Breakdown

| Session | Work | Status |
|---|---|---|
| B-1 | Layout worker scaffolding, WorkerManager integration | ✅ Complete |
| B-2 | Adaptive debouncing + keystroke batching | ✅ Complete |
| B-3 | **Bounded visible layout** (NEXT) | 🔲 Not started |
| B-4 | Test correctness — BiDi, tables, images, controls | 🔲 Not started |
| B-5 | Performance benchmarking + tuning | 🔲 Not started |

### B.2 — Adaptive Debouncing (COMPLETED)

**Problem**: Even with incremental layout, mid-document edits require 220-280ms to compute
35+ pages of layout. This blocks the main thread and causes typing lag.

**Solution implemented**:
- Adaptive debounce delay: 100ms base, increases by 20ms per rapid keystroke (up to 300ms)
- Keystroke batching: Multiple keystrokes → single render call
- Defensive null checks in `getRangeContext()` to prevent runtime errors

**Results**:
- Render calls reduced from ~10/sec to ~2-3/sec during rapid typing
- Layout still takes 220-280ms (unavoidable for 35-page recompute)
- **Conclusion**: Debouncing alone is insufficient — need bounded layout

### B.3 — Bounded Visible Layout (NEXT PHASE)

**Problem**: Editing page 13 of 47 requires recomputing pages 13-47 (35 pages).
Even with incremental layout, this takes 220-280ms which is perceptible.

**Solution**: Only compute layout for visible pages + small buffer during typing.
Complete full document layout when user pauses.

**Implementation outline**:

```typescript
// During typing (debounced render):
const visiblePages = this.visiblePageNoList  // e.g. [12, 13, 14]
const editPage = this.getPageByElementIndex(curIndex)

// Compute layout only for pages: [editPage - 2, ..., editPage + 3]
// This is ~5-6 pages instead of 35
const boundedRowList = this.computeRowList({
  ...normalParams,
  stopAtPage: editPage + 3  // NEW parameter
})

// When idle (after 500ms pause):
// Trigger full document layout in background
this._scheduleFullLayout()
```

**Expected results**:
- Typing response: 220ms → 30-40ms (compute ~5 pages instead of 35)
- Page count visible in footer may lag briefly during typing
- Full accuracy restored when typing pauses

**This is how Google Docs achieves responsive typing in large documents.**

---

## Plan C — WebGL/WebGPU Text Rendering (Not Recommended Now)

**Effort**: 20–30 sessions  
**Expected gain**: 20–40 ms → 5–10 ms  
**Risk**: Very High — complete rewrite of render layer  
**Recommendation**: **Defer indefinitely**. Plan A + B already achieve the 20 ms target.

### What Would Be Required

1. **SDF Glyph Atlas** — pre-render all used glyphs to signed-distance-field textures.
   Required for GPU text rendering. Must handle CJK (large glyph set), Arabic (contextual
   shaping already done via HarfBuzz — integrate with atlas), emoji (color font).

2. **WebGL Text Shader** — vertex/fragment shader for SDF rendering, sub-pixel antialiasing,
   font weight simulation.

3. **Spatial Index (R-tree or Quadtree)** — replace O(n) linear scan in `getPositionByXY()`
   (hit testing for mouse clicks). Needed when position list has 50 000+ entries.

4. **Page Compositor** — GPU compositing of multiple layer textures (background, watermark,
   text, selection, search highlights). Replace 2-canvas stack with WebGL framebuffers.

5. **Selection/Cursor Overlay** — real-time cursor blink at 60 FPS without re-rendering
   the text layer. GPU overlay blending.

### Why This Is Overkill

- SDF atlas requires a complete font loader integration layer beyond what HarfBuzz provides.
- CJK support needs dynamic atlas growth (Unicode range 4E00–9FFF = 20 902 glyphs).
- Arabic contextual shaping is already done by HarfBuzz; feeding shaped glyph IDs into
  a WebGL atlas is a non-trivial integration.
- Browser compatibility: WebGPU is not available in Safari stable as of 2026-02.
- Maintenance: every new element type (table, image, hyperlink, checkbox) needs a GPU
  rendering path.
- The 5–10 ms vs 20–40 ms difference is imperceptible to users.

### If Reconsidered (Future)

Order of implementation: Spatial index → SDF atlas (Latin only) → WebGL page compositor →
Arabic/CJK glyph support → WebGPU upgrade path.

---

## Comparison Table

| Metric | Current | Plan A | Plan A+B.2 | Plan A+B.3 | Plan C |
|---|---|---|---|---|---|
| Last-page keystroke (ms) | 350 | 2 | 2 | 2 | — |
| Mid-doc keystroke (ms) | 350 | 220 | 220 (batched) | **30-40** | 5–10 |
| First-page keystroke (ms) | 350 | 350 | 350 (batched) | **30-40** | 5–10 |
| Memory (canvases) | 600 live | 12 live | 12 live | 12 live | N/A |
| Architecture change | — | Incremental | + Debounce | + Bounded | Full rewrite |
| Effort (sessions) | — | 6–8 | +2 | +3 | +20–30 |
| Status | — | ✅ Done | ✅ Done | **Next** | Defer |

---

## Quick-Win Checklist (Plan A.1, implementable in 1 session)

These three changes require minimal effort and provide measurable gains:

- [ ] **Persistent metrics canvas** — replace throwaway `createElement('canvas')` in
  `computeRowList()` with `this.metricsCtx`. One-line change.
  _Expected gain_: Eliminates GC pressure, ~5–10 ms per render.

- [ ] **Visible page clipping in `_immediateRender`** — when `isLazy=false` is NOT due to
  print/export (e.g., `getDataURL`), still skip pages with no elements. Trivial filter.
  _Expected gain_: Minimal for interactive, saves ~20–30% for getDataURL at large page counts.

- [ ] **`requestAnimationFrame` coalescing for rapid edits** — wrap `render()` in a rAF check:
  if a render is already queued for the current frame, merge the payload and skip.
  Not a substitute for incremental layout, but prevents redundant full re-renders during
  fast IME composition or rapid paste operations.
  _Expected gain_: ~15–25% for fast typists, ~0% for normal editing.

---

## Implementation Order

```
Phase 0 (quick wins — 1 session):    A.1 metrics canvas + rAF coalescing
Phase 1 (core — 3 sessions):         A.2 dirty-page layout cache
Phase 2 (memory — 1 session):        A.3 canvas virtualization
Phase 3 (position — 1 session):      A.4 incremental position
Phase 4 (testing — 1 session):       Cypress perf tests, regression suite
Phase 5 (optional threading — 8s):   Plan B worker integration
Phase X (defer — never):             Plan C WebGL/WebGPU
```

---

## Success Criteria

| Metric | Target | Measurement |
|---|---|---|
| Single keystroke, 300 pages | ≤ 20 ms | `performance.now()` in `render()` (already instrumented) |
| Single keystroke, 50 pages | ≤ 5 ms | Same |
| Scroll to new page (first paint) | ≤ 5 ms | IntersectionObserver → `_drawPage()` timing |
| Memory at 300 pages | ≤ 50 MB canvas GPU | DevTools Memory tab |
| No visual regression | Zero diff | Cypress screenshot comparison |
| Undo/redo correctness | 100% | Existing Cypress tests |

---

## Notes for Implementers

1. `computeRowList` is called recursively for table cells via `TableParticle`. The dirty-page
   cache must correctly handle table elements — a change inside a table cell on page 5 invalidates
   from page 5 onward, same as any other element.

2. The `isCompute = false` fast path already exists and is used for cursor-only moves. Do not
   break this path — it should remain a zero-layout code path.

3. `precomputeContextualWidths()` in `TextParticle.ts` runs HarfBuzz shaping before `computeRowList`.
   This pass must also become incremental — only re-shape elements from `dirtyFromIndex` onward.

4. The `ShapeEngine` caches shaped output internally per element reference. After incremental
   layout, the elements before the dirty point are unchanged references, so their shaping
   cache hits remain valid.

5. History undo/redo replaces `this.elementList` entirely via `deepClone(oldElementList)`.
   This must always trigger full layout recompute (`layoutDirtyFromPage = 0`). The existing
   `isSourceHistory` flag can be used to detect this case.
