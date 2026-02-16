# Session 011 Summary — Phase B: RTL Particle Adaptation

**Date**: 2026-02-17
**Branch**: `shape-engine`
**Commits**: `a260acb`

---

## What Was Done

### 1. ListParticle RTL Marker Format

**Symptom**: Arabic list markers displayed as "1." (LTR format) instead of ".1"
(RTL format) for Arabic text.

**Fix**: Changed marker text from `${marker}.` to `.${marker}` when `isRTL` is
true. The `isRTL` flag uses `!!row.isRTL` without checking `isBidiMixed` because
the ZWSP first-element in every list row produces a false-positive "mixed" result.

Also added RTL checkbox positioning — checkbox placed at right side of text for
RTL list rows.

### 2. RTL List Row Direction Inheritance

**Symptom**: Pressing Enter in an RTL list started the new row on the left side
instead of the right.

**Root Cause**: When `computeRowList()` wraps text to a new row, the new row
only inherits `isList` but not `isRTL` or `rowFlex`. Since the new row starts
with just ZWSP, RTL detection doesn't fire.

**Fix**: After row-end RTL detection in `computeRowList()`, if `curRow.isRTL &&
curRow.isList` and a wrap just created a new list row, propagate `rowFlex=RIGHT`
and `isRTL=true` to the new row.

### 3. LineBreakParticle RTL Adaptation

**Changes**:
- Added `isRTL` parameter to `render()` method
- RTL arrow points rightward (→) instead of leftward (←)
- RTL arrow positioned to the left of the element (mirrored)
- Draw.ts passes `curRow.isRTL` to `lineBreakParticle.render()`

### 4. Hyperlink RTL Contextual Shaping

**Symptom**: Arabic hyperlink text "رابط التقرير الطبي" displayed reversed as
"يبطلا ريرقتلا طبار".

**Root Cause**: `precomputeContextualWidths()` in TextParticle.ts excluded
`ElementType.HYPERLINK` from contextual shaping groups (only `TEXT` type was
included in the `isTextType` check).

**Fix**:
1. TextParticle.ts: Added `el.type === ElementType.HYPERLINK` to `isTextType`
2. Draw.ts `drawRow`: HYPERLINK elements with contextual render info now route
   through `renderContextualElement()` with hyperlink styling (color + underline)
   instead of basic `hyperlinkParticle.render()`

### 5. Position RTL List Row Offset

**Fix**: In `computePageRowPosition()`, skip adding `offsetX` for RTL list rows
(`if (!(curRow.isRTL && curRow.isList))`). The right-alignment formula already
subtracts `offsetX` via `curRowWidth`, and skipping the re-addition leaves space
for the marker on the right side.

### 6. Mock Data Expansion

Added 15 Arabic/BiDi test scenarios to `mock.ts`:
1. Arabic ordered list (RTL marker format .1 .2 .3)
2. Arabic unordered list (bullet positioning)
3. Mixed Arabic+English ordered list (BiDi in list items)
4. Arabic with numbers/phone/dates
5. Arabic bold+italic styled text
6. Arabic with many English terms (heavy BiDi switching)
7. English with multiple Arabic names
8. Long Arabic paragraph (line wrapping)
9. Arabic highlighted+colored text
10. Arabic hyperlink
11. Parentheses/brackets in Arabic (mirroring)
12. Arabic table (100% width: 139+139+138+138=554px)
13. Arabic + LaTeX formula
14. Arabic-Indic numerals with Western digits
15. Short single-word RTL lines

---

## Files Changed

| File | Changes |
|------|---------|
| `ListParticle.ts` | RTL marker format, checkbox RTL positioning |
| `LineBreakParticle.ts` | RTL arrow direction + position |
| `Draw.ts` | RTL row inheritance, hyperlink contextual route |
| `TextParticle.ts` | HYPERLINK in contextual shaping groups |
| `Position.ts` | Skip offsetX for RTL list rows |
| `mock.ts` | 15 Arabic/BiDi test scenarios |

---

## Known Issues

### RTL Selection/Formatting in Pure Arabic Text (NEW)
**Status**: Open — investigated, root cause identified, fix plan documented
**Commits**: `a260acb` (Phase B), `076899d` (batch isolation — partial fix)
**Symptom**: In pure RTL Arabic text (non-BiDi), selecting leftmost (visual)
text actually selects rightmost (logical) text. Formatting, copy/cut/delete
all apply to the wrong text. BiDi mixed rows work correctly.

**Root Cause**: The mirror formula `mirrorX = rowStart + rowEnd - x` in
`getPositionByXY()` maps a visual click to a logical position index. For
single-point ops (cursor), this works. But for range selection (drag):
- mousedown returns logical index A (mirror of visual click start)
- mousemove returns logical index B (mirror of visual click end)
- In `mousemove.ts`, if A > B they get swapped (assumes startIndex < endIndex)
- The swapped range doesn't correspond to what the user visually selected
- Selection rect is mirrored back, but the range was wrong from the start

**Fix Plan**: Treat pure RTL rows like BiDi mixed rows:
1. Synthesize `visualOrder = [n-1, n-2, ..., 1, 0]` for pure RTL rows
2. Let the existing `bidiVisualX` code compute visual positions
3. Remove all mirror formula code from Position.ts, Cursor.ts, Draw.ts, RangeManager.ts
4. Pure RTL rows use per-element rendering (like BiDi mixed)

See `.ai/context/current-focus.md` for detailed step-by-step plan.
