# Current Focus

**Last Updated**: 2026-02-12
**Active Sprint**: Shape Engine Integration — Phase 7 (Cursor & Hit Testing)

## Current Objective

Implement accurate cursor positioning and hit testing for complex-script (Arabic)
text. Currently, positions are in LTR logical order — cursor and mouse interaction
must correctly interpret these for RTL text without modifying the underlying
coordinates.

## Critical Architecture Constraints

1. **Positions MUST remain LTR logical order** — `drawRow()` reads x,y from
   `positionList` for rendering. Changing positions breaks rendering.
2. **Batch rendering is required for RTL** — `renderGlyphs()` draws left-to-right
   using HarfBuzz's visual-order glyph output. Per-element rendering breaks RTL.
3. **Contextual group = measurement + render boundary** — The full contextual
   group must be both measured and rendered as one unit. Any split produces
   measurement/rendering mismatches.

## Completed Phases

- ✅ Phase 0: POC (HarfBuzz WASM + OpenType.js)
- ✅ Phase 2: ShapeEngine class (singleton, font loading, shaping, cache)
- ✅ Phase 3: Draw integration (feature flag, font registry, init, fallback)
- ✅ Phase 3.5: Rendering quality (smart routing, CSS @font-face, hinting)
- ✅ Phase 4: TextParticle (measureText, _render, bold/italic variants, lazy load)
- ✅ Phase 4.5: Contextual measurement (cluster IDs, precompute, per-element widths)
- ✅ Phase 4.6: Arabic word-break fix (LETTER_CLASS.ARABIC)
- ✅ Phase 4.7: Font fallback for complex scripts (complexScriptFallback)
- ✅ Phase 5.5: RTL paragraph auto-alignment + isRTL flag
- ✅ Phase 5A: Measurement–rendering consistency fix (batch text clean-up)

## Current Phase: Phase 7 — Cursor & Hit Testing

### Sub-phases

| Phase | Description | Status |
|-------|-------------|--------|
| 7.1 | Cluster-aware coordinate mapping | Not started |
| 7.2 | RTL cursor placement (visual position from logical coords) | Not started |
| 7.3 | RTL hit testing (click → correct element index) | Not started |
| 7.4 | Arrow key navigation in RTL text | Not started |
| 7.5 | Selection highlighting for RTL text | Not started |
| 7.6 | Mixed LTR/RTL boundary handling | Not started |

### Key Challenges

1. **Ligature cursor**: When Lam-Alef forms a ligature, 2 chars share 1 cluster.
   Cursor must split the ligature's visual width proportionally.
2. **Visual vs logical order**: Arrow-right should move the cursor LEFT visually
   in RTL text. Position coordinates are logical (LTR), so cursor must be placed
   at the correct visual position.
3. **Hit testing inversion**: Clicking on the LEFT side of RTL text corresponds
   to the END of the text (last logical character). Must map x-coordinate to
   correct element index using cluster coordinates.
4. **Selection rendering**: Selection highlight for RTL text must cover the
   correct visual region even though positions are in logical order.

## Key Files

- `src/editor/core/draw/particle/TextParticle.ts` — contextual widths, glyph storage
- `src/editor/core/shaping/ShapeEngine.ts` — shapeText(), renderGlyphs()
- `src/editor/core/draw/Draw.ts` — drawRow(), computeRowList()
- `src/editor/core/position/Position.ts` — computePageRowPosition(), getPositionByXY()
- `src/editor/core/cursor/Cursor.ts` — cursor rendering
- `src/editor/core/event/handlers/keydown/` — arrow key navigation
