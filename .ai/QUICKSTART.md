# Canvas Editor AI — Quick Start

**Last Updated**: 2026-02-20  
**Current Branch**: `perf/incremental-layout`  
**Current HEAD**: `4bebd96f`

## For AI Agents Resuming Work

### 1. Read Context First
1. **This file** — current state and next steps
2. [`.ai/sessions/SESSION-017-SUMMARY.md`](.ai/sessions/SESSION-017-SUMMARY.md) — last session detail
3. [`.ai/plans/PERFORMANCE-IMPROVEMENT.md`](.ai/plans/PERFORMANCE-IMPROVEMENT.md) — full performance plan
4. [`.ai/progress.md`](.ai/progress.md) — overall project status

### 2. Next Work
**Plan B.4 — Correctness testing on 185-page document**

Bounded visible layout (B.3) is complete and committed. Test all element types:
- Tables (multi-page split, rowspan), images, controls, BiDi/RTL, lists, page breaks
- Selection/copy/paste across page boundary
- Undo/redo after idle full layout

**Then B.5 — Benchmark** (mid-doc target: ≤70ms, last-page: ≤10ms)

### 3. Suggested Resumption Prompt

> "I'm continuing on the perf/incremental-layout branch (HEAD 4bebd96f).
> Plan B.3 bounded visible layout is complete with all regressions fixed.
> Start B.4 correctness testing with a 185-page document paste.
> Read `.ai/sessions/SESSION-017-SUMMARY.md` for full context."  

---

## Current Architecture State (as of Session 017)

### Bounded Visible Layout (B.3) — How it works

```
User types keystroke
  ↓
render() → _shouldDebounceLayout()?
  YES (isSubmitHistory + >5000 elements + last layout ≥20ms)
    ↓
  _debouncedRender() [waits 100-300ms]
  _updateCursorIndex(curIndex) [patches .index only — no canvas ops]
                                         ↓
                          [after debounce: _renderInternal]
                                         ↓
                          canIncremental = true AND useBounded = true?
                            YES: compute pages [dirtyFrom .. dirtyFrom+3]
                                 pad rest with empty pageRowList[]
                                 save _boundedLayoutDirtyFrom = dirtyFrom
                                 schedule _scheduleFullLayout(500ms)
                            NO: full compute (paste/undo/first-page/etc)
                                         ↓
                          _lazyRender() → IntersectionObserver per wrapper
                            → visible page enters viewport
                            → version check (discard stale callbacks)
                            → _drawPage() [bounded skip for empty pages]

[After 500ms idle]
  _scheduleFullLayout fires
    → _renderInternal({ isIdleFullLayout:true, curIndex:idleCurIndex })
    → incremental path from _boundedLayoutDirtyFrom
    → _lazyRender() repaints all pages gradually

[Scale/paper/margin change]
  setPageScale → resize all canvases → freedPageSet.clear()
  → _resetBoundedLayoutState()
  → render({ isSubmitHistory:false }) [NOT debounced]
  → _repaintVisiblePages() [synchronous, sidesteps IO race]
```

### Key Constants
```typescript
BOUNDED_PAGE_WINDOW = 3      // dirty page + 2 forward
FULL_LAYOUT_IDLE_MS = 500    // idle timer delay
ASYNC_LAYOUT_THRESHOLD = 5000 // min elements to use bounded
CANVAS_VIEWPORT_BUFFER = 3   // pages kept alive around viewport
```

### Key Private State
```typescript
_isBoundedLayoutActive: boolean     // true while bounded window active
_boundedLayoutMaxPage: number       // last computed page index
_boundedLayoutDirtyFrom: number     // saved dirty page for idle layout
_lazyRenderVersion: number          // bump on each _lazyRender() call
_lastFullPageCount: number          // cached total page count
freedPageSet: Set<number>           // pages with 1x1 bitmaps (virtualized)
```

---

## Project Overview (TL;DR)

Canvas editor using HTML5 Canvas/SVG. Performance project to bring keystroke
latency from 2700ms (300 pages) to ≤20ms.

**Done**: Plan A (incremental layout, canvas virtualization, incremental positions),
Plan B.1 (worker infra), B.2 (adaptive debounce), B.3 (bounded visible layout).

**Next**: B.4 correctness testing, B.5 benchmarking.

---

## Quick Commands

```bash
npm run dev          # Start dev server (port 3000 or 3001)
npm run type:check   # TypeScript check
npm run lint         # ESLint (warnings only, 0 errors)
npm run lib          # Build library
git log --oneline -5 # Check recent commits
```

## Code Style
```typescript
// No semicolons, single quotes, 2-space indent, 80-char lines
// No trailing commas, arrow functions without parens where possible
const x = 'hello'
const f = (a: string) => a.trim()
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/editor/core/draw/Draw.ts` | Main render pipeline (~5159 lines) |
| `src/editor/interface/Draw.ts` | `IDrawOption` interface (incl. `isIdleFullLayout`) |
| `src/editor/core/worker/WorkerManager.ts` | Catalog defer during bounded layout |
| `src/editor/core/observer/ScrollObserver.ts` | Viewport tracking, `getPageVisibleInfo()` |
| `src/main.ts` | Demo app, `updateCatalog()` with null guard |
| `.ai/plans/PERFORMANCE-IMPROVEMENT.md` | Full performance plan with all phases |
| `.ai/sessions/SESSION-017-SUMMARY.md` | Last session detail |

## Useful Links

- [AGENTS.md](../AGENTS.md) - Agent development guide
- [README.md](../README.md) - Project README
- [HarfBuzz Docs](https://harfbuzz.github.io/)
- [Unicode BiDi (UAX#9)](https://www.unicode.org/reports/tr9/)
