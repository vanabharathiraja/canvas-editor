# Beautification & Fixes Plan

**Branch**: `shape-engine`
**Created**: 2026-02-17
**Status**: In Progress

---

## Overview

This plan covers visual modernization, upstream bug fixes, and RTL alignment fixes.
Phase 11 (Performance) is deferred for separate detailed planning.

---

## Work Items

### 1. Upstream Bug Fix: Control POSTFIX Cursor (ea650f6)

**Problem**: When clicking control postfix and it's the last element in the document,
the `moveCursor()` method's POSTFIX branch walks forward but never returns if
`startIndex` reaches `elementList.length - 1` without finding a different `controlId`.

**Fix**: In `Control.ts` `moveCursor()`, the POSTFIX branch already handles
`startIndex === elementList.length - 1`. Verified our code matches upstream.
**Status**: ✅ Already implemented (the `if (startIndex === elementList.length - 1)` guard exists at line 747).

**Note**: The titleId fix (`0b659ef`) was also already implemented in a previous session
in both `backspace.ts` and `enter.ts`.

---

### 2. Selection Overlay Beautification

**Goal**: Google Docs-style selection — semi-transparent blue overlay BELOW text
so text remains crisp and readable.

**Current State**:
- Selection rendered LAST in drawRow (after text, borders, underlines, etc.)
- `rangeAlpha: 0.6`, `rangeColor: '#AECBFA'` — decent color but opaque over text
- Standard `ctx.fillRect` with `globalAlpha`

**Changes**:
1. **Move selection rendering before text** in drawRow pipeline
   - Move the selection block (BiDi rects + standard rect + table range) to
     execute BEFORE `textParticle.complete()` call
2. **Update selection color** to match Google Docs blue: `#C8DAF8` with alpha `0.4`
   - Google Docs uses a lighter, more transparent blue
   - Lower alpha since it's behind text (doesn't obscure)
3. **Keep `rangeMinWidth`** for collapsed-but-visible selections

**Files Modified**:
- `src/editor/core/draw/Draw.ts` — reorder drawRow rendering
- `src/editor/utils/option.ts` — update default `rangeAlpha` and `rangeColor`

---

### 3. Modern Checkbox Controls

**Goal**: Rounded corners, softer unselected border, modern check animation feel.

**Current State**:
- Sharp-cornered `ctx.rect()` squares, 14×14px
- Black border when unchecked, `#5175f4` fill + white checkmark when checked
- No hover/active/disabled visual states

**Changes**:
1. **Rounded corners** — use `ctx.roundRect()` with 3px radius
2. **Softer unchecked border** — change default strokeStyle from black to `#d0d5dd`
3. **Better checked styling** — maintain `#5175f4` fill with rounded corners
4. **Improved checkmark** — thicker lines with rounded lineCap for modern feel

**Files Modified**:
- `src/editor/core/draw/particle/CheckboxParticle.ts` — rendering logic
- `src/editor/dataset/constant/Checkbox.ts` — update default strokeStyle

Note: Canvas-based rendering means true hover/active effects require mouse tracking
infrastructure. For now, focus on static visual modernization. Hover effects can
be added later with position-based detection.

---

### 4. Modern Radio Controls

**Goal**: Softer border, modern proportions.

**Current State**:
- Circle via `ctx.arc()`, 14×14px
- Black border when unselected (`#000000`)
- `#5175f4` border + inner dot when selected

**Changes**:
1. **Softer unselected border** — change to `#d0d5dd` (matching checkbox)
2. **Thicker border** — 1.5px line width for better visibility
3. **Better proportions** — inner dot at `width / 4` instead of `width / 3`

**Files Modified**:
- `src/editor/core/draw/particle/RadioParticle.ts` — rendering logic
- `src/editor/dataset/constant/Radio.ts` — update default strokeStyle

---

### 5. Other Beautification Changes

**Color modernization** — replace harsh Web 1.0 colors:

| Item | Current | New | File |
|------|---------|-----|------|
| Hyperlink color | `#0000FF` | `#1a73e8` | `option.ts` |
| Hyperlink popup | `#0000ff` | `#1a73e8` | `hyperlink.css` |
| Cursor drag color | `#0000FF` | `#5175f4` | `Cursor.ts` constant |
| Search highlight | `#FFFF00` | `#FCE8B2` | `option.ts` |
| Radio unselected border | `#000000` | `#d0d5dd` | `Radio.ts` constant |
| Context menu radius | `2px` | `8px` | `contextmenu.css` |
| Context menu hover | `rgba(25,55,88,.04)` | `rgba(25,55,88,.08)` | `contextmenu.css` |
| Context menu animation | none | 120ms fadeIn | `contextmenu.css` |

---

### 6. RTL Selection/Formatting Check

**Goal**: Verify visualOrder synthesis for pure RTL rows eliminates mirror formula.

**Finding**: Already implemented! Pure RTL rows get `visualOrder` synthesized at
line ~2245 of Draw.ts. The legacy mirror codepaths in Draw.ts (line 2948),
Cursor.ts, mousemove.ts, and RangeManager.ts are now effectively dead code.

**Status**: ✅ Working correctly. Dead legacy mirror paths serve as fallback for
single-element RTL rows (length ≤ 1) where synthesis is skipped.

---

### 7. Arabic RTL Alignment Behavior

**Goal**: Ensure LEFT/RIGHT/CENTER alignment commands work correctly with RTL text.

**Current Behavior**:
- Auto-detection sets `RowFlex.RIGHT` for RTL content when no explicit alignment
- Manual LEFT alignment: physically left-aligns RTL text (correct for explicit override)
- Manual RIGHT alignment: right-aligns (correct for RTL default)
- CENTER: centers text (direction-independent, correct)
- `isRTL` flag is set independently of alignment via BiDi analysis

**Issue**: When user explicitly sets LEFT alignment on Arabic text, then changes to
RIGHT, the auto-detection logic (`!curRow.rowFlex` check) may not trigger because
`rowFlex` is already set on data elements. This is actually **correct behavior** —
explicit alignment overrides auto-detection.

**Potential Issue**: No logical START/END alignment values. The RowFlex enum only has
physical LEFT/RIGHT. For a proper RTL editor, START should map to RIGHT for RTL.
This is a FUTURE enhancement, not a current bug.

**Status**: ✅ Current behavior is correct for physical alignment model.
**Future**: Add logical START/END alignment values later.

---

## Implementation Order

1. ~~Upstream POSTFIX cursor fix~~ ✅ Already done
2. Selection overlay beautification (render order + color)
3. Checkbox modernization (rounded corners)
4. Radio modernization (softer border)
5. Color/UI beautification (hyperlink, cursor, search, context menu)
6. ~~RTL selection check~~ ✅ Already working
7. ~~RTL alignment check~~ ✅ Current behavior correct

---

## Deferred

- **Phase 11 — Performance**: Needs separate detailed plan
- **Hover/Active effects on checkbox/radio**: Requires mouse tracking infrastructure
- **Logical START/END alignment**: Future RTL enhancement
- **Arrow key RTL navigation**: Previously identified, separate task
