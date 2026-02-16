# Current Focus

**Last Updated**: 2026-02-16
**Active Sprint**: Shape Engine Integration — Phase A (Popup/Control RTL)

## Current Objective

Implementing RTL support for editor controls and popups. Phase A focuses on
popup positioning: SelectControl, DatePicker, and Calculator popups must
position correctly and display RTL text for Arabic content.

**Policy**: Every feature/fix MUST evaluate LTR, RTL, and BiDi mixed behavior.

### Root Cause Analysis (Session 012)

The core issue is the **logical↔visual order confusion** in pure RTL rows:

1. **Position storage**: Positions are stored in **logical** (LTR) order.
   Element 0 = first character in memory (rightmost visually in RTL).

2. **Hit testing** (`getPositionByXY`): Uses mirror formula
   `mirrorX = rowStart + rowEnd - clickX` to map visual click to logical
   position. Returns a **positionList index** (= logical index).

3. **Range**: `setRange(startIndex, endIndex)` stores logical indices.

4. **Selection rendering** (`drawRow`): Accumulates `rangeRecord.x` from
   logical positions, then mirrors the rect. But the accumulation walks
   elements in logical order (L→R), so `rangeRecord.x` starts at the
   first *logical* selected element's x — which is on the RIGHT visually.

5. **Formatting** (`getSelection`): Returns `elementList.slice(start+1, end+1)`.
   These are the correct logical elements. But the user *thinks* they
   selected the visual-left text, while they actually got logical-left text
   (= visual-right in RTL).

**The fundamental problem**: The mirror formula in hit testing maps
click position to the *wrong* logical index. When clicking on the LEFT
side of an RTL row (which is the END of the text visually), the mirror
formula maps it to a HIGH logical index (end of logical array). But
visually, the user sees the END of the paragraph on the left. So the
mapping is actually correct for "which character did I click on", but
the selection *range* (startIndex→endIndex) then highlights and operates
on the wrong visual region because the mirrored selection rect doesn't
match what the user dragged over.

### Key Insight

The mirror approach works for **single-point** operations (cursor placement,
single click) but breaks for **range** operations (drag selection) because:
- mousedown returns logical index A (mirror of visual start)
- mousemove returns logical index B (mirror of visual end)  
- if A > B, they get swapped: `[start, end] = [B, A]`
- But this swap is based on logical ordering, not visual ordering
- The resulting range may not correspond to what the user visually selected

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
- ~~Arabic placeholder text shows isolated forms~~ — **FIXED** (session 013)
  - Root cause: `isTextType` in `precomputeContextualWidths()` excluded `ElementType.CONTROL`
  - Fix: Added PLACEHOLDER and VALUE control components to contextual shaping
- ~~Curly braces not mirrored in RTL controls~~ — **FIXED** (session 013)
  - Root cause: Visual reorder reverses bracket positions; UAX #9 requires
    character mirroring (`{`→`}`, `}`→`{`) to restore correct visual form.
  - Fix: Apply BIDI_BRACKET_MIRROR during rendering for RTL-resolved elements,
    restore original value after draw.
- ~~Cursor off-by-one at end of RTL text~~ — **FIXED** (session 013)
  - Root cause: (1) Cursor rendered at `rightTop[0]` for RTL elements in BiDi mixed
    rows, but should be `leftTop[0]`; (2) Hit-testing left-half click decremented
    position for RTL elements
  - Fix: Use `leftTop[0]` for RTL cursor in BiDi mixed rows; skip decrement for
    RTL left-half clicks; add right-half RTL handler
- **RTL selection/formatting in pure Arabic text** — **OPEN** (session 011-012)
  - Selecting leftmost (visual) text selects rightmost (logical) text
  - Mirror formula correct for cursor, wrong for range selection
  - Copy/cut/delete/formatting all affected
  - BiDi mixed rows work correctly (use bidiVisualX positions)
  - Batch rendering isolation fix committed (`076899d`) but doesn't solve root cause

## Next Steps — RTL Selection Fix Plan

### Approach: Treat Pure RTL Rows Like BiDi Mixed Rows

The BiDi mixed row architecture already solves this problem correctly:
- Positions have visual-order x coordinates (via `bidiVisualX`)
- Hit testing returns correct logical index without mirror formula
- Selection rects are collected per-element (not accumulated)
- No mirror formula needed anywhere

**Plan**: For pure RTL rows, compute `bidiVisualX` in reverse order
(last logical element first) so positions have visual-order coordinates.
This eliminates the need for the mirror formula entirely.

### Step-by-Step Implementation

1. **`computePageRowPosition()` in Position.ts**:
   - For pure RTL rows (isRTL && !isBidiMixed), compute x positions
     in reverse logical order: start from right edge, walk elements
     right-to-left, assign visual x coordinates
   - OR: synthesize a `visualOrder` array = `[n-1, n-2, ..., 1, 0]`
     and set `isBidiMixed = true` so existing bidiVisualX code handles it

2. **Remove mirror formula from all locations**:
   - `getPositionByXY()` — remove `isRTL && !isBidiMixed` mirror block
   - `drawCursor()` in Cursor.ts — remove cursor mirror
   - `drawRow()` selection rect — remove RTL mirror
   - `getIsPointInRange()` — remove RTL mirror cache
   - The row-boundary handling (click left/right of content) may still
     need adjustment

3. **Verify rendering still works**:
   - `drawRow()` reads x,y from positionList for rendering
   - If positions now have visual x, rendering should still work because
     HarfBuzz `renderGlyphs()` draws glyphs left-to-right from the
     provided x position, and each element's x is now its visual position
   - BUT: batch rendering (`record()`+`complete()`) uses the FIRST
     recorded element's x as the batch start position. For RTL, this
     would be the rightmost element visually — exactly where HarfBuzz
     should start rendering. Need to verify this.

4. **Alternative simpler approach** — Keep positions logical, fix the
   range computation:
   - In `mousemove.ts`, when computing selection range for RTL rows,
     DON'T swap start/end based on numeric comparison
   - Instead, keep the indices in the order the user dragged (visual order)
   - This is simpler but requires changes in many places that assume
     startIndex < endIndex

### Recommended Approach

Option 1 (synthesize visualOrder for pure RTL) is cleanest because:
- Reuses existing BiDi mixed infrastructure
- Eliminates ALL mirror formula code (simpler codebase)
- Selection, formatting, copy/cut/delete all work automatically
- No special-casing in mousedown/mousemove

### Files to Modify

| File | Change |
|------|--------|
| `Position.ts` | Synthesize `visualOrder` for pure RTL rows in `computePageRowPosition` |
| `Position.ts` | Remove mirror formula from `getPositionByXY` |
| `Cursor.ts` | Remove mirror formula from `drawCursor` |
| `Draw.ts` | Remove mirror from selection rect rendering |
| `RangeManager.ts` | Remove mirror from `getIsPointInRange` |
| `Draw.ts` | May need per-element rendering for pure RTL (like BiDi mixed) |

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
