# Session 009 Summary — BiDi Integration & Overflow Fix

**Date**: 2026-02-13
**Branch**: `shape-engine`
**Commits**: `1d6feecc`, `78d121b1`

---

## What Was Done

### 1. BiDi Foundation Utilities — `bidi.ts` (commit `1d6feecc`)

Created `src/editor/utils/bidi.ts` wrapping the `bidi-js` library (UAX#9
conformant, Unicode 13.0.0). Exports:

- `computeEmbeddingLevels()` — UAX#9 paragraph + per-char embedding levels
- `getDirectionalRuns()` — split text into same-direction runs
- `computeVisualOrder()` — reorder logical indices to visual display order
- `getMirroredCharacters()` — Unicode BiDi mirroring (parentheses, brackets)
- `analyzeBidi()` — combined analysis returning levels, runs, visual order
- `computeElementVisualOrder()` — map element-level visual order from
  character-level BiDi analysis
- `mapElementLevels()` — per-element embedding level (majority vote)
- `isRTLLevel()` — check if embedding level is RTL (odd)
- `getBidiCharType()` — classify character as LTR, RTL, neutral, or number

### 2. BiDi Pipeline Integration (commit `78d121b1`)

Wired BiDi visual ordering into Draw/Position pipeline:

**`Draw.ts` — `computeRowList`**:
- After `detectDirection` RTL alignment block, runs
  `computeElementVisualOrder(elementValues)` when shaping is enabled and
  row has >1 element
- If mixed BiDi detected, stores `bidiLevels`, `visualOrder`, `isBidiMixed`
  on the `IRow` object
- Detects paragraph direction for proper alignment

**`Position.ts` — `computePageRowPosition`**:
- Pre-computes `bidiVisualX` array when `curRow.isBidiMixed`
- Iterates in visual order accumulating x positions with per-element offsets
- Maps back to logical indices for position array
- Per-element `isRTL` uses `curRow.bidiLevels` when available

**`Row.ts`**:
- Added `bidiLevels?: number[]`, `visualOrder?: number[]`,
  `isBidiMixed?: boolean` fields to `IRow` interface

**`mock.ts`**:
- Added 2 BiDi test sentences for validation

### 3. BiDi Overflow Bug — FIXED (commit `78d121b1`)

**Symptom**: Mixed Arabic + English text overflowed past page margins to the
right. English segments appeared reversed ("olleH" instead of "Hello").

**Root Cause**: The batch rendering path in `drawRow` (`record/complete`)
accumulated text from consecutive elements starting at the first logical
element's x position. For BiDi mixed rows, element x positions are
non-contiguous (Arabic elements positioned rightward by visual reordering),
so batching from the Arabic element's x caused the entire accumulated text
to render from the rightmost position extending further right off-page.

**Secondary Issue**: `computeVisualOrder` hardcoded `level: 0` for paragraph
level instead of using the actual detected paragraph level from
`computeEmbeddingLevels`.

**Fix**:
- For `curRow.isBidiMixed` rows, render each element individually at its own
  BiDi-computed x position instead of batching: Arabic elements use
  `renderContextualElement()` (precomputed contextual glyphs), English
  elements use `record() + complete()` per character
- Pass actual `paragraphLevel` to `getReorderSegments` instead of hardcoding 0

### 4. Known Issue — Cursor Handling (Deferred)

Cursor placement, hit-testing, and selection do not work correctly for mixed
BiDi rows. The mirror formula works for pure RTL rows but mixed-direction
cursor behavior requires additional logic (visual vs logical cursor movement,
direction boundary handling). Deferred to future phase (Step 4).

---

## Architecture Decisions

1. **Positions stay in logical order** — BiDi reordering only affects x
   coordinate assignment, not the position array order
2. **Per-element rendering for mixed BiDi** — batch rendering broken into
   individual element rendering when `isBidiMixed` is true
3. **Element-level BiDi** — character-level UAX#9 analysis mapped to
   element-level visual order via majority vote for embedding levels

## Files Modified This Session

- `src/editor/utils/bidi.ts` — NEW: BiDi utilities wrapping bidi-js
- `src/editor/core/draw/Draw.ts` — BiDi analysis in computeRowList,
  per-element rendering in drawRow for mixed BiDi
- `src/editor/core/position/Position.ts` — bidiVisualX pre-computation,
  per-element isRTL from bidiLevels
- `src/editor/interface/Row.ts` — bidiLevels, visualOrder, isBidiMixed fields
- `src/mock.ts` — BiDi test sentences

## Next Steps

- Step 4: Mixed-direction cursor/hit-testing/selection (Phase 7 remaining)
- Step 5: RTL Particle Adaptation (Phase 9 — list markers, linebreak, table)
- BiDi edge cases: nested embeddings, number handling, punctuation mirroring
