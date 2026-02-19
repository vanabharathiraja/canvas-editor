# Session 016 Summary — Performance Analysis & Planning

**Date**: 2026-02-17  
**Agent**: GitHub Copilot (Claude Sonnet 4.6)  
**Type**: Analysis only — no code changes  

---

## Goal

Deeply analyse the canvas-editor rendering pipeline and produce:
1. An ADR documenting the performance architecture decision
2. A detailed performance improvement plan with three approaches
3. No implementation — planning only

Benchmarks driving the work:
- 18 pages: 80–120 ms (acceptable)
- 300+ pages: 2 000–2 700 ms (unusable)
- Target: ≤ 20 ms per keystroke at 300 pages

---

## Code Analysed

| File | Lines Read | Key Finding |
|---|---|---|
| `Draw.ts` | 1593–1700 | `computeRowList()` creates throwaway canvas each call, O(n) all elements |
| `Draw.ts` | 3667–3780 | `_drawPage()` full per-page paint pipeline |
| `Draw.ts` | 3782–3820 | `_lazyRender()` — IntersectionObserver already implemented |
| `Draw.ts` | 3817–3990 | `render()` full pipeline with `isCompute`/`isLazy` flags |
| `Position.ts` | 338–420 | `computePositionList()` — O(n) arithmetic, no canvas ops |
| `HistoryManager.ts` | 1–70 | Closure-based undo, `getSlimCloneElementList()` for snapshots |
| `TextParticle.ts` | grep | `cacheMeasureText` Map, `precomputeContextualWidths()` |

---

## Key Discoveries

1. **Lazy painting already exists** — `_lazyRender()` uses `IntersectionObserver` to
   only call `_drawPage()` for visible pages. This is the right architecture.

2. **Layout is NOT lazy** — `computeRowList()` runs for all N elements before any
   painting, even for a single character change.

3. **Throwaway canvas** — `computeRowList()` creates `document.createElement('canvas')`
   on every call (~line 1614 in Draw.ts). Can be replaced with a persistent singleton.

4. **600 live canvases** — 300 pages × 2 canvas layers = 600 live GPU allocations.
   Canvas virtualization (free bitmap when > N pages from viewport) would fix this.

5. **`isCompute = false` fast path exists** — cursor-only moves already skip layout.
   The incremental layout cache will extend this pattern to partial document edits.

6. **HistoryManager is efficient** — uses slim clone (not deep clone) for snapshot storage.
   Undo/redo restores with `deepClone()` but that's unavoidable. The history system is
   NOT a bottleneck.

7. **Text metrics already cached** — `TextParticle.cacheMeasureText` Map caches by
   font+character key. However, it's cleared on font change, and the throwaway canvas
   for measurement still exists inside `computeRowList`.

---

## Documents Created

### `.ai/decisions/adr-0005-performance-architecture.md`

Contains:
- Measured benchmarks table
- Full render pipeline diagram with bottleneck annotations
- Memory profile analysis (300 pages × 2 canvases)
- Decision: adopt phased incremental-layout strategy
- Consequences, risks, and alternatives considered

### `.ai/plans/PERFORMANCE-IMPROVEMENT.md`

Contains:

**Plan A — Incremental Layout (Recommended)**
- A.1: Persistent metrics canvas (quick win, ~30 min)
- A.2: Dirty-page layout cache with `pageElementBounds` tracking
- A.3: Canvas virtualization (destroy off-screen bitmaps)
- A.4: Incremental position computation
- Session breakdown: 6–8 sessions
- Expected result: 2 700 ms → 100–200 ms

**Plan B — OffscreenCanvas + Web Worker (Optional)**
- Move `computeRowList` to Web Worker using `OffscreenCanvas`
- Keystroke buffering during async layout
- Builds on Plan A, 8–10 additional sessions
- Expected result: 200 ms → 20–40 ms

**Plan C — WebGL/WebGPU (Not Recommended)**
- SDF glyph atlas, GPU text rendering, spatial index hit-testing
- 20–30 sessions, very high risk
- Deferred indefinitely — Plan A+B already achieves 20 ms target

**Quick-win checklist** (implementable in 1 session):
- Persistent metrics canvas
- Visible page clipping in `_immediateRender`
- rAF coalescing for rapid edits

---

## Recommended Next Session

Start Phase 0 of Plan A:
1. Add `this.metricsCanvas` / `this.metricsCtx` fields to Draw.ts constructor
2. Replace throwaway `createElement('canvas')` in `computeRowList()` with `this.metricsCtx`
3. Add rAF coalescing wrapper around `render()`
4. Benchmark before/after with 300-page document

This is a 1-session quick win requiring ~30 lines of change with no architectural risk.
