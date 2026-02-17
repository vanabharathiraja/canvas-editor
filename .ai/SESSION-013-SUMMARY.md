# Session 013 Summary — Upstream Tracking & Splice Fixes

**Date**: 2026-02-17
**Branch**: `shape-engine`
**Commits**: `eb55c37` (splice position fixes)

---

## What Was Done

### 1. Mock.ts Splice Position Fixes (commit `eb55c37`)

Fixed all element splice positions that were breaking words mid-character:

| Element | Old Position | New Position | Fixed Issue |
|---------|-------------|-------------|-------------|
| Text control "Additional notes" | splice(12) | splice(12) + splice(13, space) | No trailing space |
| Select control "Yes/No" | splice(94) | splice(101) | Was breaking "ob\|vious" |
| COVID hyperlink | splice(116) | splice(118) | Was breaking "day\|s" |
| Text control "Other: content" | splice(335) | splice(334) | Was breaking "in\|fectious" |
| Subscript "∆" | splice(346) | splice(347) | Corrected word boundary |
| List 1 (diseases) | splice(451) | splice(405) | Was breaking "sus\|pected" |
| List 2 (procedures) | splice(453) | splice(406) | Follows list 1 |
| Superscript "9" | splice(430) | splice(1402) | Moved from "con\|firmed" to "0.75*10⁹/L" |

### 2. Upstream Tracking Setup

Created `.ai/UPSTREAM-TRACKING.md` — comprehensive tracking of all upstream
(Hufe921/canvas-editor) commits after our last merge point (`570b9c1`).

**17 upstream commits analyzed**:
- 2 bug fixes marked **IMPORTANT** (titleId, control postfix cursor)
- 6 features/fixes marked for evaluation
- 9 skipped (release tags, dev tooling, docs)

### 3. Next Steps Planning

Documented implementation priorities and identified conflict zones where
upstream changes touch code we've heavily modified for Arabic/BiDi support.

---

## Files Modified

| File | Change |
|------|--------|
| `src/mock.ts` | Fixed 8 splice positions to word boundaries |
| `.ai/UPSTREAM-TRACKING.md` | NEW — upstream commit tracking |
| `.ai/SESSION-013-SUMMARY.md` | NEW — this summary |

---

## Key Decisions

1. **No direct merge from upstream**: Our shaping/BiDi changes are too deep.
   Cherry-picking or merging would cause subtle bugs. Instead, track and
   reimplement changes manually.

2. **Two bug fixes prioritized**: titleId restoration (`0b659ef`) and control
   postfix cursor (`ea650f6`) are core bugs that affect our editor too.

3. **List style inheritance needs care**: Upstream's `0b99406` modifies
   `ListParticle.ts` which we've heavily changed for RTL. Will need careful
   integration.

4. **Image caption needs shaping gateway**: Upstream uses `ctx.fillText()`
   directly. If we adopt it, Arabic captions must route through our
   `renderString()` method.

---

## Current State

### Branch Progress (63 commits on shape-engine)
- ✅ Phases 0-5B: Shaping engine, measurement, rendering, all working
- ✅ Phase 7: Full BiDi support (UAX#9, visual ordering)
- ✅ Phase 8-9: Cursor, selection, hit testing for RTL/BiDi
- ✅ Phase 10: RTL particle adaptation (90%)
- ⬜ Phase 10 remaining: RTL selection fix for pure Arabic text
- ⬜ Phase 11: Polish & Release

### Upstream Gap
- 17 commits behind upstream/main (from `570b9c1` to `6fe3e70`)
- 2 critical bug fixes to reimplement
- 6 features to optionally adopt

---

## Next Steps Priority

1. **Reimplement titleId fix** (`0b659ef`) — core bug in backspace.ts/enter.ts
2. **Reimplement control postfix cursor fix** (`ea650f6`) — core bug in Control.ts
3. **Fix RTL selection in pure Arabic text** — deferred from Phase 10
4. **Phase 11 planning** — performance, testing, documentation
5. **Optional upstream features** — separator lineWidth, image caption, etc.
