# Current Focus

**Last Updated**: 2026-02-13
**Active Sprint**: Shape Engine Integration — Step 3 (BiDi Foundations)

## Current Objective

Begin BiDi Foundations: integrate UAX#9-compliant bidirectional algorithm for
mixed LTR/RTL text on the same line. Arabic whitespace bug is fixed.

## Roadmap: Steps 3-5

### Step 3: BiDi Foundations (Phase 5.5 tasks)
- Integrate `bidi-js` or similar UAX#9 library
- Implement paragraph-level BiDi algorithm
- Split text into directional runs
- Handle neutral characters (spaces, punctuation, numbers)
- Reorder runs for visual display

### Step 4: Mixed-Direction Layout & Interaction (Phase 7 remaining)
- Render mixed LTR/RTL text on the same line
- Cursor placement at direction boundaries
- Hit testing across directional runs
- Selection highlighting for mixed-direction text
- Arrow key navigation across direction boundaries

### Step 5: RTL Particle Adaptation (Phase 9 — NEW)
- **ListParticle**: Move markers to right side; reverse indent direction;
  route marker text through `renderText()` gateway
- **LineBreakParticle**: Mirror arrow icon position and shape direction
- **TableParticle**: RTL column ordering in `computeRowColInfo()`
- **PageBreakParticle**: Route label through `renderText()` gateway

## Bug Status

- ~~Arabic typing whitespace accumulation~~ — **FIXED** (commit `9360cfba`)
  - Root cause: shared contextualWidths maps cleared by recursive computeRowList
  - Fix: `clearContextualCache()` called once per render cycle in `Draw.render()`

## Critical Architecture Constraints

1. **Positions MUST remain LTR logical order** — `drawRow()` reads x,y from
   `positionList` for rendering. Changing positions breaks rendering.
2. **Batch rendering is required for RTL** — `renderGlyphs()` draws left-to-right
   using HarfBuzz's visual-order glyph output. Per-element rendering breaks RTL.
3. **Contextual group = measurement + render boundary** — The full contextual
   group must be both measured and rendered as one unit. Any split produces
   measurement/rendering mismatches.
4. **Mirror formula for RTL interaction** — `visualX = rowStart + rowEnd - logicalX`
   applied at read-time in cursor, hit testing, and selection rendering.
5. **Cache cleared once per render cycle** — `clearContextualCache()` in
   `Draw.render()`, NOT per-`computeRowList`. Recursive calls must share data.

## Completed Phases

- ✅ Phase 0: POC (HarfBuzz WASM + OpenType.js)
- ✅ Phase 1: Foundation (audited — most tasks done implicitly)
- ✅ Phase 2: ShapeEngine class (singleton, font loading, shaping, cache)
- ✅ Phase 3: Draw integration (feature flag, font registry, init, fallback)
- ✅ Phase 3.5: Rendering quality (smart routing, CSS @font-face, hinting)
- ✅ Phase 4: TextParticle (measureText, _render, bold/italic variants, lazy load)
- ✅ Phase 4.5: Contextual measurement (cluster IDs, precompute, per-element widths)
- ✅ Phase 4.6: Arabic word-break fix (LETTER_CLASS.ARABIC)
- ✅ Phase 4.7: Font fallback for complex scripts (complexScriptFallback)
- ✅ Phase 5.5: RTL paragraph auto-alignment + isRTL flag
- ✅ Phase 5A: Measurement–rendering consistency fix (batch text clean-up)
- ✅ Phase 5B: Arabic whitespace accumulation fix (clearContextualCache)

## Current Phase: Step 3 — BiDi Foundations (Phase 5.5)

### Key Tasks
| Task | Description | Status |
|------|-------------|--------|
| 5.5.1 | UAX#9 BiDi algorithm (library integration) | Not started |
| 5.5.2 | Update paragraph layout with BiDi reordering | Not started |
| 5.5.3 | Handle neutral characters (spaces, punctuation, numbers) | Not started |
| 5.5.4 | Dynamic direction handling (auto-detect as user types) | Partially done |
| 5.5.5 | Direction state management | Not started |
| 5.5.6 | Write BiDi tests | Not started |

### Key Files to Modify
- `src/editor/utils/unicode.ts` — BiDi algorithm integration
- `src/editor/core/draw/Draw.ts` — directional run reordering in drawRow
- `src/editor/core/position/Position.ts` — mixed-direction position calculation
- `src/editor/interface/Element.ts` — per-element direction/run info
