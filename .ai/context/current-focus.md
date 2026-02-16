# Current Focus

**Last Updated**: 2026-02-17
**Active Sprint**: Shape Engine Integration — RTL Selection Fix

## Current Objective

Step 5 (RTL Particle Adaptation) mostly complete (commit `a260acb`):
- ListParticle: RTL marker format (.1), checkbox RTL positioning
- LineBreakParticle: RTL arrow direction + mirrored position
- Hyperlink: Contextual shaping for Arabic hyperlinks
- Position: RTL list row offset handling
- Mock data: 15 Arabic/BiDi test scenarios

**CURRENT BUG**: RTL selection/formatting broken in pure Arabic text.
Selecting text and applying formatting applies to wrong position.
Copy/cut/delete also affected. BiDi mixed rows work correctly.

## Roadmap: Steps 3-5

### Step 3: BiDi Foundations (Phase 5.5 tasks) — ✅ DONE
- ✅ Integrate `bidi-js` UAX#9 library (commit `1d6feecc`)
- ✅ Implement paragraph-level BiDi algorithm
- ✅ Split text into directional runs
- ✅ Handle neutral characters (spaces, punctuation, numbers)
- ✅ Reorder runs for visual display
- ✅ Fix overflow bug for mixed BiDi rendering (commit `78d121b1`)

### Step 4: Mixed-Direction Layout & Interaction (Phase 7) — ✅ DONE
- ✅ Render mixed LTR/RTL text on the same line
- ✅ Arabic line breaking fix — word backtracking + RTL detection (session 010)
- ✅ BiDi cursor placement — skip mirror for `isBidiMixed` rows (session 010)
- ✅ BiDi hit testing — skip mirror for `isBidiMixed` rows (session 010)
- ✅ BiDi selection — skip mirror for `isBidiMixed` rows (session 010)
- ✅ Word-backtrack height/ascent recalculation (session 010)
- ✅ BiDi midpoint hit testing — visual boundary matching (session 010)
- ✅ Selection RTL mirror for getIsPointInRange + drag-check (session 010)
- ✅ BiDi mixed per-visual-run selection rects (session 010)
- ✅ Table cells — verified recursive pipeline handles BiDi correctly
- ✅ Commands audit — Copy/Cut/Paste/Undo/Redo/Delete all BiDi-transparent
- ✅ Arrow key navigation — logical movement works, visual cursor correct
- ✅ Ctrl+Arrow word jump — Arabic in LETTER_REG when shaping enabled
- ✅ Up/Down — uses visual x coordinates, works with BiDi positions
- ✅ Double-click word selection — Intl.Segmenter handles Arabic
- ⚠️ Home/End keys — not implemented in editor (general gap, not BiDi-specific)
- ⚠️ Visual arrow movement at BiDi boundaries — cursor jumps logically (acceptable)

### Step 5: RTL Particle Adaptation (Phase 9 — NEW)
- ✅ **ListParticle**: RTL marker format (.1), checkbox RTL positioning,
  right-side marker placement (commit `a260acb`)
- ✅ **LineBreakParticle**: Mirror arrow icon position and shape direction
  (commit `a260acb`)
- ✅ **Hyperlink**: Arabic hyperlink contextual shaping (commit `a260acb`)
- ⬜ **TableParticle**: RTL column ordering in `computeRowColInfo()` (deferred)
- ⬜ **PageBreakParticle**: Route label through `renderText()` gateway (assessed, no change needed)

## Bug Status

- ~~Arabic typing whitespace accumulation~~ — **FIXED** (commit `9360cfba`)
- ~~BiDi mixed text overflow~~ — **FIXED** (commit `78d121b1`)
- ~~Arabic line breaking mid-word~~ — **FIXED** (session 010)
- ~~BiDi cursor jumping edge/wrong position~~ — **FIXED** (session 010)
- ~~Word-backtrack height/ascent stale~~ — **FIXED** (session 010)
- ~~BiDi midpoint cursor placement incorrect~~ — **FIXED** (session 010)
- ~~Selection getIsPointInRange fails on RTL text~~ — **FIXED** (session 010)
- ~~Mousemove drag-check fails on RTL text~~ — **FIXED** (session 010)
- ~~BiDi mixed selection draws single rect for non-contiguous~~ — **FIXED** (session 010)
- **RTL selection/formatting in pure Arabic text** — **OPEN** (session 011)
  - Formatting applies to wrong position in pure RTL rows
  - Copy/cut/delete also affected
  - BiDi mixed rows work correctly

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

## Testing Constraints Coverage

### Fully Covered (code verified):
- R1-R13: Rendering ✓
- M1-M9: Measurement/cursor/selection ✓
- C1-C9: Commands ✓
- F1-F13: Formatting ✓
- N1-N2, N7-N10: Navigation ✓
- S1-S4: Search ✓
- E1-E10: Edge cases ✓ (E9 table verified)
- D1-D5: Decorations ✓
- I1-I6: InterOp ✓
- P7-5 to P7-16: RTL cursor/hit testing ✓
- P7-17, P7-18: Arrow keys (logical movement) ✓
- P7-25 to P7-29: Selection highlighting ✓
- P7-30 to P7-34: Mixed direction boundaries ✓
- All 5 architecture invariants ✓

### Not Applicable / Deferred:
- N3-N6: Up/Down works; Home/End not implemented (general gap)
- P7-1 to P7-4: Cluster-aware ligature splitting (future Phase 7.1)
- P7-19 to P7-24: Visual arrow movement at boundaries (acceptable as logical)

## Completed Phases

- ✅ Phase 0: POC (HarfBuzz WASM + OpenType.js)
- ✅ Phase 1: Foundation
- ✅ Phase 2: ShapeEngine class
- ✅ Phase 3: Draw integration
- ✅ Phase 3.5: Rendering quality
- ✅ Phase 4: TextParticle
- ✅ Phase 4.5: Contextual measurement
- ✅ Phase 4.6: Arabic word-break fix
- ✅ Phase 4.7: Font fallback
- ✅ Phase 5.5: RTL paragraph auto-alignment
- ✅ Phase 5A: Measurement–rendering consistency
- ✅ Phase 5B: Arabic whitespace accumulation fix
- ✅ Phase 5.5.1-5.5.3: BiDi foundations
- ✅ Phase 7: Mixed-Direction Interaction (cursor, hit testing, selection)
