# ADR-0005: Performance Architecture for Large Documents

**Status**: Proposed  
**Date**: 2026-02-17  
**Deciders**: vraja + GitHub Copilot  
**Tags**: performance, rendering, layout, canvas, incremental

---

## Context

### Observed Performance (Benchmarks)

| Document Size | Render Time | UX Impact |
|---|---|---|
| 18 pages (~540 elements) | 80–120 ms | Acceptable |
| 50 pages (~1 500 elements) | ~400 ms | Noticeable lag |
| 100 pages (~3 000 elements) | ~800–1 100 ms | Degraded |
| 300 pages (~9 000 elements) | 2 000–2 700 ms | Unusable |

**Target**: ≤ 20 ms for a single keystroke in a 300-page document.

### Current Architecture

```
render(payload)
  ├── [if isCompute] computeRowList()         ← O(n) ALL elements
  │     └── createElement('canvas') EACH CALL ← throwaway, GC pressure
  ├── [if isCompute] _computePageList()
  ├── [if isCompute] position.computePositionList()  ← O(n) all elements
  ├── [if isCompute] area.compute() / search.compute()
  ├── _createPage(i) for new pages             ← DOM mutation, sync
  ├── _lazyRender() OR _immediateRender()
  │     _lazyRender():     IntersectionObserver → _drawPage() for visible pages only
  │     _immediateRender(): _drawPage() × ALL pages — synchronous
  └── setCursor() / submitHistory()
```

**What already works:**
- `_lazyRender()` (IntersectionObserver): paint is already lazy — only visible pages are drawn to canvas
- `isCompute = false` flag: cursor-only moves skip layout entirely
- `isLazy` flag: print / export correctly forces full synchronous paint
- `textParticle.cacheMeasureText` (Map): text metrics cached by font+char key
- `getSlimCloneElementList()`: history snapshots use slim clone, not full deep clone

**Root causes (in priority order):**

1. **Layout bottleneck** (`computeRowList`) — O(n) scan of the entire document on every edit.  
   At 300 pages this iterates ≈ 9 000+ elements with canvas text measurement per element.  
   Estimated share of render time: ~70–80%.

2. **Throwaway metrics canvas** — `computeRowList()` calls `document.createElement('canvas')` +
   `getContext('2d')` on every invocation (verified in Draw.ts). This creates a new GPU context
   and allocates GPU memory on every render cycle, only to discard it. GC pressure accumulates.

3. **Position O(n) scan** (`computePositionList`) — second full pass over all elements
   after `computeRowList`. Cheaper than layout (no canvas ops) but still O(n).

4. **600 live canvases in memory** — 300 pages × 2 canvases each (content + selection).  
   Each canvas is `width * scale * dpr × height * scale * dpr`. At 2× DPR on A4:
   `794px * 2 * 2 = 3176px` wide × `1123px * 2 * 2 = 4492px` tall ≈ ~54 MB per canvas pair.  
   300 pages × 54 MB = theoretical ~16 GB. Browsers cap individual allocations, but even
   at 2 MB per canvas pair (compressed allocation) this is 600 MB resident GPU memory.

5. **`_immediateRender` path** — non-paging / print mode paints ALL pages synchronously.
   No escape valve; must block main thread for entire document. This is unavoidable in
   print/export but is acceptable since it's not interactive.

---

## Decision

**Adopt a phased incremental-layout strategy**, not a full rewrite.

The current architecture's foundation is sound — the IntersectionObserver lazy-paint
is already the right shape. The missing piece is *incremental layout*: only re-layout
pages that changed, then only re-paint pages that are visible.

Three plans are documented in `.ai/plans/PERFORMANCE-IMPROVEMENT.md`. This ADR records
the architectural decision and rationale for each plan.

### Recommended Approach: Plan A — Incremental Layout (pages 1–2 of 3)

Implement dirty-page tracking + canvas virtualization in Draw.ts using the existing
two-canvas architecture. No new dependencies, no threading complexity.

**Core changes:**
1. Persistent metrics canvas (singleton) — eliminates throwaway canvas GC pressure
2. Dirty-page layout cache — only recompute changed page + all downstream pages
3. Canvas virtualization — destroy off-screen canvases (> ±3 pages from viewport),
   recreate on scroll demand via IntersectionObserver
4. Incremental position computation — only recompute positions from dirty page onward

### Plan B — OffscreenCanvas Workers (optional, additive to Plan A)

Move `computeRowList` to a Web Worker using `OffscreenCanvas` transfer for text
metrics. Unblocks main thread during layout; paint remains on main thread.

### Plan C — WebGL/WebGPU Text Rendering (not recommended now)

SDF glyph atlas, GPU compositing, R-tree hit testing — complete rewrite of render
layer. Would achieve 5–20 ms but carries enormous complexity, risk, and maintenance
burden. Canvas 2D + Plan A+B already achieves the 20 ms target.

---

## Consequences

### Positive
- Plan A alone expected to reduce 300-page render from 2 700 ms → 150–250 ms
- Plan A + B expected to reduce to 30–60 ms (layout async, paint lazy)
- Quick wins (metrics canvas singleton + canvas virtualization) implementable in 1 session
- No public API changes — internal optimization only
- Maintains identical visual output
- Incremental changeset — each step independently verifiable

### Negative
- Dirty-page tracking requires careful invalidation logic — risk of stale layout cache
  on global mutations (margin change, scale change, paper size → must invalidate all)
- Canvas virtualization requires recreating canvas context on scroll, which has a
  ~1–3 ms cost per page (acceptable, amortized over scroll speed)
- OffscreenCanvas (Plan B) requires `transferControlToOffscreen()` which cannot be
  reversed — canvas refs must be managed carefully

### Risks
- **Stale layout cache**: If dirty-page invalidation misses a case, text may overlap
  or disappear. Mitigation: full re-layout fallback on `isFirstRender=true`.
- **Canvas virtualization + IntersectionObserver race**: New page created vs. observer
  callback ordering. Mitigation: explicit paint call after `_createPage()`.
- **Table cell layout**: `computeRowList` calls itself recursively for each table cell.
  Dirty-tracking must propagate through table element boundaries correctly.

---

## Alternatives Considered

### Alt 1: Request Animation Frame (rAF) batching
Coalesce rapid keystrokes into a single `rAF` callback. Pro: zero code change,
immediate gain for fast typists. Con: does not address O(n) layout at all — merely
defers the same work. Estimated gain: 10–15% at best.

### Alt 2: Virtualized DOM (no canvas per page)
Replace per-page canvas with a single scrolling canvas showing a viewport window.
Pro: only 2 canvases total, no memory cliff. Con: requires full rethink of coordinate
system, hit testing, page boundary rendering, multi-page selection, and export path.
Estimated effort: 30+ sessions. Risk: very high.

### Alt 3: Shared OffscreenCanvas worker pool (Plan B generalization)
Multiple workers, each handling a shard of pages. Pro: further parallelism. Con:
page-boundary elements (multi-page tables, flowing text) require expensive cross-worker
coordination. Not worth complexity over single-worker approach.

---

## References

- `.ai/plans/PERFORMANCE-IMPROVEMENT.md` — detailed 3-plan implementation guide
- `src/editor/core/draw/Draw.ts` — `computeRowList()` line ~1593, `render()` line ~3817
- `src/editor/core/draw/Draw.ts` — `_lazyRender()` line ~3782, `_immediateRender()` line ~3804
- `src/editor/core/position/Position.ts` — `computePositionList()` line ~338
- `src/editor/core/draw/particle/TextParticle.ts` — `cacheMeasureText` Map, `precomputeContextualWidths()`
- `src/editor/core/history/HistoryManager.ts` — closure-based undo/redo with slim clone snapshots
