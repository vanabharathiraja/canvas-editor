# Current Focus

**Last Updated**: 2026-02-16
**Active Sprint**: Shape Engine Integration — Step 4 (Mixed-Direction Interaction)

## Current Objective

Step 4A (Arabic line breaking) and Step 4B (BiDi cursor) fixed in session 010.
Next: remaining Step 4 work (arrow keys, edge cases) and Step 5 (RTL particles).

## Roadmap: Steps 3-5

### Step 3: BiDi Foundations (Phase 5.5 tasks) — ✅ DONE
- ✅ Integrate `bidi-js` UAX#9 library (commit `1d6feecc`)
- ✅ Implement paragraph-level BiDi algorithm
- ✅ Split text into directional runs
- ✅ Handle neutral characters (spaces, punctuation, numbers)
- ✅ Reorder runs for visual display
- ✅ Fix overflow bug for mixed BiDi rendering (commit `78d121b1`)

### Step 4: Mixed-Direction Layout & Interaction (Phase 7 remaining) — CURRENT
- ✅ Render mixed LTR/RTL text on the same line
- ✅ Arabic line breaking fix — word backtracking + RTL detection (session 010)
- ✅ BiDi cursor placement — skip mirror for `isBidiMixed` rows (session 010)
- ✅ BiDi hit testing — skip mirror for `isBidiMixed` rows (session 010)
- ✅ BiDi selection — skip mirror for `isBidiMixed` rows (session 010)
- ⬜ Arrow key navigation across direction boundaries
- ⬜ Edge cases: ligature cursor, run boundaries

### Step 5: RTL Particle Adaptation (Phase 9 — NEW)
- **ListParticle**: Move markers to right side; reverse indent direction;
  route marker text through `renderText()` gateway
- **LineBreakParticle**: Mirror arrow icon position and shape direction
- **TableParticle**: RTL column ordering in `computeRowColInfo()`
- **PageBreakParticle**: Route label through `renderText()` gateway

## Bug Status

- ~~Arabic typing whitespace accumulation~~ — **FIXED** (commit `9360cfba`)
- ~~BiDi mixed text overflow~~ — **FIXED** (commit `78d121b1`)
- ~~Arabic line breaking mid-word~~ — **FIXED** (session 010)
- ~~BiDi cursor jumping edge/wrong position~~ — **FIXED** (session 010)

## Critical Architecture Constraints

1. **Positions MUST remain LTR logical order** — `drawRow()` reads x,y from
   `positionList` for rendering. Changing positions breaks rendering.
2. **Per-element rendering for BiDi mixed rows** — batch rendering causes
   overflow. Each element rendered individually at its BiDi-computed x.
3. **Batch rendering for pure RTL** — `renderGlyphs()` draws left-to-right
   using HarfBuzz's visual-order glyph output. Per-element rendering breaks RTL.
4. **Contextual group = measurement + render boundary** — The full contextual
   group must be both measured and rendered as one unit.
5. **Mirror formula for pure RTL interaction** — `visualX = rowStart + rowEnd - logicalX`
   applied at read-time in cursor, hit testing, and selection rendering.
6. **Cache cleared once per render cycle** — `clearContextualCache()` in
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
- ✅ Phase 5.5.1-5.5.3: BiDi foundations (bidi-js, visual ordering, mixed rendering)

## Current Phase: Step 4 — Mixed-Direction Interaction (Phase 7)

### Key Tasks
| Task | Description | Status |
|------|-------------|--------|
| 7.1 | Cursor placement at BiDi direction boundaries | Not started |
| 7.2 | Hit testing across mixed directional runs | Not started |
| 7.3 | Selection highlighting for mixed-direction text | Not started |
| 7.4 | Arrow key navigation across direction boundaries | Not started |
| 7.5 | Ligature cursor splitting (Lam-Alef) | Not started |

### Key Files to Modify
- `src/editor/core/cursor/Cursor.ts` — mixed BiDi cursor rendering
- `src/editor/core/position/Position.ts` — mixed BiDi hit testing
- `src/editor/core/draw/Draw.ts` — mixed BiDi selection rendering
- `src/editor/core/event/handlers/keydown/index.ts` — arrow key BiDi logic
