# Current Focus

**Last Updated**: 2026-02-12
**Active Sprint**: Shape Engine Integration — Phase 7 (Cursor & Hit Testing)

## Current Objective

Pure RTL cursor/hit-testing/selection implemented using mirror formula.
Next: fix known bugs, then edge cases.

## Known Bugs (to fix next session)

1. **Arabic typing whitespace accumulation**: As Arabic text is typed, whitespace
   keeps increasing on the right side. The cursor moves correctly, but excess
   space appears to the right of the Arabic text. Likely a measurement/position
   recalculation issue when new characters are inserted into a contextual group —
   the row width or right margin offset may be double-counting something.
   - **Files to investigate**: `computeRowList()` in Draw.ts (word width accounting),
     `precomputeContextualWidths()` in TextParticle.ts (re-measurement on edit),
     `computePageRowPosition()` in Position.ts (isRTL row offset calculation)
   - **Symptom**: Right-side gap grows with each character typed

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

## Current Phase: Phase 7 — Pure RTL Cursor & Interaction

### Sub-phases

| Phase | Description | Status |
|-------|-------------|--------|
| 7.1 | Cluster-aware coordinate mapping | Not started |
| 7.2 | RTL cursor placement (mirror formula) | **Core done** — edge cases remain |
| 7.3 | RTL hit testing (mirror click X) | **Core done** — edge cases remain |
| 7.4 | Arrow key navigation in RTL text | Not needed — logical movement correct |
| 7.5 | Selection highlighting for RTL text | **Core done** — edge cases remain |
| 7.6 | Mixed LTR/RTL boundary handling | Blocked by BiDi (Phase 5.5) |

### Mirror Formula (used by 7.2, 7.3, 7.5)

```
visualX = rowStart + rowEnd - logicalX
```
where rowStart = first position's leftTop[0], rowEnd = last position's rightTop[0]

### Key Files Modified This Session

- `src/editor/core/cursor/Cursor.ts` — mirror cursor X for RTL in `drawCursor()`
- `src/editor/core/position/Position.ts` — mirror click X in `getPositionByXY()`, RTL non-hit fallback
- `src/editor/core/draw/Draw.ts` — mirror selection rect X for RTL in `drawRow()`

### Remaining Edge Cases (after bug fix)

- 7.1: Cluster coordinate mapping for ligature cursor splitting
- 7.2.3: Cursor visual direction indicator (wedge)
- 7.2.4: Cursor at LTR/RTL boundary
- 7.2.5: Cursor at row boundary with RTL
- 7.3.3: Mixed LTR/RTL hit testing
- 7.3.4: Click on ligature (Lam-Alef)
- 7.3.6: Empty row after RTL text
- 7.5.3-6: Mixed-direction selection, shift+click/arrow, cross-row
