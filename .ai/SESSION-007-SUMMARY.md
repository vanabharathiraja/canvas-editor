# Session 007 Summary — Pure RTL Cursor & Interaction

**Date**: 2026-02-12
**Branch**: `shape-engine`
**Commits**: `7d3ff60`, `3ea6915`

---

## What Was Done

### 1. Phase 1 Audit
Reviewed all Phase 1 (Foundation) tasks against implemented code:
- **1.1 TextRun interface** → Already exists as `ITextRun` in ShapeEngine interface
- **1.2 ShapeResult interface** → Already exists as `IShapeResult`
- **1.4 Script detection** → Done in `unicode.ts` (`needsComplexShaping`, `detectScript`)
- **1.5 Auto-direction** → Done (`detectDirection` in unicode.ts)
- **1.7 Update interfaces** → Done (`isRTL` on IRow, IElementPosition)
- **1.3 BiDi, 1.6 UAX#9** → Deferred (only needed for mixed LTR/RTL on same line)

### 2. Phase 7 — Pure RTL Cursor, Hit Testing, Selection
Implemented the core mirror formula approach for all three systems:

**Mirror Formula**: `visualX = rowStart + rowEnd - logicalX`

| System | File | Change |
|--------|------|--------|
| Cursor | `Cursor.ts` | `drawCursor()` mirrors cursor X for RTL rows |
| Hit Test | `Position.ts` | `getPositionByXY()` mirrors click X, finds correct logical element |
| Hit Test Fallback | `Position.ts` | Non-hit area: right-of-content = logical start for RTL |
| Selection | `Draw.ts` | `drawRow()` mirrors selection rect X for RTL rows |

### 3. Phase 5A (previous session, committed this session)
- `flushIfNotContextual()` — prevent ZWSP batch pollution
- Contextual batch protection — skip punctuation splits
- Per-element glyph mapping via cluster IDs

---

## Key Architecture Decisions

1. **Mirror at read-time, not write-time**: Positions stay in LTR logical order.
   Cursor, hit-testing, and selection apply the mirror formula when reading positions
   for visual purposes. This avoids the Phase 6 mistake of modifying coordinates.

2. **Same formula everywhere**: All three systems (cursor, hit-test, selection) use
   the identical `rowStart + rowEnd - x` formula for consistency.

3. **Arrow keys unchanged**: Logical index movement (left arrow = index-1, right = index+1)
   is correct for RTL text. The cursor placement fix makes the visual result correct
   automatically.

---

## Known Bugs

### BUG: Arabic typing whitespace accumulation
- **Symptom**: As Arabic text is typed, whitespace keeps increasing on the right side
- **When**: During live typing of Arabic characters
- **Cursor**: Moves correctly (mirror formula works)
- **Probable cause**: Measurement/position recalculation when inserting new characters
  into a contextual group. Row width or right margin offset may be double-counting.
- **Files to investigate**:
  - `computeRowList()` in Draw.ts — word width accounting (`curRowWidth += wordWidth - metrics.width`)
  - `precomputeContextualWidths()` in TextParticle.ts — re-measurement after insertion
  - `computePageRowPosition()` in Position.ts — isRTL row alignment offset
  - Row `offsetX` or RTL alignment calculation in `computePageRowPosition()`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/editor/core/cursor/Cursor.ts` | RTL cursor mirror in `drawCursor()` |
| `src/editor/core/position/Position.ts` | RTL hit-test mirror + non-hit fallback |
| `src/editor/core/draw/Draw.ts` | RTL selection rect mirror |
| `.ai/tasks/shape-engine-integration.md` | Phase 1 audit, Phase 7 task updates |
| `.ai/context/current-focus.md` | Updated with Phase 7 progress + known bugs |
| `.ai/progress/milestones.md` | Milestone 8 progress + known bugs |

---

## Next Session Plan

1. **Fix whitespace accumulation bug** — Priority #1
   - Start dev server, type Arabic, observe the growing gap
   - Add console.logs to `computeRowList()` word width calculation
   - Check if `precomputeContextualWidths()` is re-run correctly on edit
   - Check RTL alignment offset in `computePageRowPosition()`

2. **Continue Phase 7 edge cases** — After bug fix
   - 7.2.3: Cursor direction indicator (visual wedge)
   - 7.2.4-5: Cursor at boundaries (LTR/RTL, row wrap)
   - 7.3.4: Click on ligature
   - 7.5.3-6: Selection edge cases

3. **Future: BiDi Algorithm** — For mixed LTR/RTL
   - Required before Phase 7.6 (mixed boundary handling)
   - Consider bidi-js or similar library vs. manual UAX#9
