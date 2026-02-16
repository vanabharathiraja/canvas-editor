# Testing Constraints — Shape Engine Integration

**Purpose**: Validation checklist to run before every commit on the `shape-engine` branch.
**Last Updated**: 2026-02-16

---

## BiDi/RTL Implementation Policy

**Every feature, bug fix, or new component MUST evaluate and test all three text directions:**

1. **LTR (Latin/English)** — Standard left-to-right text behavior
2. **RTL (Arabic/Hebrew)** — Pure right-to-left text (right-aligned, mirrored UI)
3. **BiDi Mixed** — Mixed LTR+RTL text on the same line (visual reordering)

### Checklist for Every Change

- [ ] Does the feature render correctly with English (LTR) text?
- [ ] Does the feature render correctly with Arabic (RTL) text?
- [ ] Does the feature render correctly with mixed English+Arabic (BiDi) text?
- [ ] Are popup/dialog positions correct for RTL content?
- [ ] Is `direction: rtl` set on DOM elements when displaying RTL content?
- [ ] Does the feature use `TextParticle.renderText()` for any text rendering (not `ctx.fillText()`)?
- [ ] Are position coordinates used as visual (not assumed LTR logical)?
- [ ] Does selection/formatting apply to the correct elements in RTL rows?
- [ ] Do keyboard interactions (arrow, delete, backspace) work correctly in RTL?

### Mock Data Requirements

When adding new features, include test data for:
- Pure English text (LTR baseline)
- Pure Arabic text (RTL baseline)
- Mixed Arabic+English text (BiDi stress test)
- Arabic text inside controls (checkbox, select, date, etc.)

---

## How to Test

1. Run `npm run dev` to start the dev server
2. Open the editor in browser
3. Work through each category below
4. Mark pass/fail before committing

---

## 1. Rendering — Visual Verification

| # | Test | Steps | Expected |
|---|------|-------|----------|
| R1 | Latin text renders sharp | Type English text at 16px | Crisp edges, subpixel AA (Canvas API path) |
| R2 | Arabic text renders shaped | Scroll to Arabic section (Amiri font) | Ligatures connect properly, contextual forms correct |
| R3 | Mixed script in same line | See "Mixed: مرحبا Hello" sample | Both scripts render correctly, no overlap |
| R4 | Bold Arabic text | Select Arabic text, apply bold | Amiri-Bold loads, renders bold glyphs |
| R5 | Italic Arabic text | Select Arabic text, apply italic | Amiri-Italic loads, renders italic glyphs |
| R6 | Superscript with Arabic | Create Arabic superscript | Text renders at correct offset via renderText() |
| R7 | Subscript with Arabic | Create Arabic subscript | Text renders at correct offset via renderText() |
| R8 | Hyperlink with Arabic | Create Arabic hyperlink | Shaped rendering, underline aligned |
| R9 | Label with Arabic | Create Arabic label | Background rect aligned to text, shaped rendering |
| R10 | TrueType hinting | Complex script at 12-14px | Glyph outlines snapped to pixel grid, minimal fuzz |
| R11 | No word spacing gaps | Arabic paragraph text | No excessive gaps between Arabic words |
| R12 | RTL paragraph alignment | Arabic paragraphs | Flush-right alignment (auto-detected) |
| R13 | Arabic at row boundary | Long Arabic text wrapping | Consistent spacing after line break |

## 2. Measurement — Cursor & Selection

| # | Test | Steps | Expected |
|---|------|-------|----------|
| M1 | Cursor on Latin text | Click in English word | Cursor lands at correct character boundary |
| M2 | Cursor on Arabic text | Click in Arabic word | Cursor lands at correct position |
| M3 | Selection across Latin | Drag-select English text | Highlight covers rendered glyphs exactly |
| M4 | Selection across Arabic | Drag-select Arabic text | Highlight covers rendered glyphs exactly |
| M5 | Selection across mixed script | Drag from English into Arabic | Highlight spans correctly, no gap/overlap |
| M6 | Line breaking with Arabic | Type long Arabic text | Wraps at correct width, no overlap |
| M7 | Line breaking mixed | Long line with English + Arabic | Wraps correctly, no text outside margins |
| M8 | Contextual width accuracy | Arabic word width | Sum of contextual widths ≤ isolated-form sum |
| M9 | Whitespace in Arabic | Spaces between Arabic words | Space width from HarfBuzz, not Canvas API |

## 3. Commands — Core Operations

| # | Test | Steps | Expected |
|---|------|-------|----------|
| C1 | Copy (Ctrl+C) | Select Arabic text, Ctrl+C, paste in notepad | Arabic text preserved |
| C2 | Cut (Ctrl+X) | Select Arabic text, Ctrl+X | Text removed, paste restores it |
| C3 | Paste (Ctrl+V) | Copy Arabic from external, paste | Arabic elements created with font |
| C4 | Undo (Ctrl+Z) | Type Arabic, then undo | Text removed, layout restored |
| C5 | Redo (Ctrl+Y) | After undo, redo | Text re-appears, layout correct |
| C6 | Select All (Ctrl+A) | Ctrl+A in mixed document | All text selected, highlight covers everything |
| C7 | Delete (Del key) | Cursor before Arabic char, press Del | Character deleted, remaining text re-shapes |
| C8 | Backspace | Cursor after Arabic char, press Backspace | Character deleted, ligatures update |
| C9 | Enter (new line) | Press Enter in Arabic text | Line splits, both parts render correctly |

## 4. Formatting Commands

| # | Test | Steps | Expected |
|---|------|-------|----------|
| F1 | Font change | Select text, change font to Amiri | Re-renders with Amiri, ShapeEngine path |
| F2 | Font change back | Change Amiri text to Noto Sans | Re-renders with Noto Sans |
| F3 | Size change | Select Arabic, change size to 24px | Text re-measures and re-renders at new size |
| F4 | Size add (Ctrl+]) | Select Arabic, increase size | Size increases, layout reflows |
| F5 | Size minus (Ctrl+[) | Select Arabic, decrease size | Size decreases, layout reflows |
| F6 | Bold (Ctrl+B) | Select Arabic text, toggle bold | Bold variant loads and renders |
| F7 | Italic (Ctrl+I) | Select Arabic text, toggle italic | Italic variant loads and renders |
| F8 | Underline (Ctrl+U) | Select Arabic text, add underline | Underline matches text width |
| F9 | Strikeout | Select Arabic text, add strikeout | Strikeout aligned with text center |
| F10 | Highlight | Select Arabic text, add highlight | Background rect covers text width |
| F11 | Color change | Select Arabic text, change color | Text renders in new color |
| F12 | Format painter | Copy style from bold Arabic, paint to plain | Style transfers correctly |
| F13 | Clear format | Select formatted Arabic, clear | Reverts to default style |

## 5. Navigation — Keyboard

| # | Test | Steps | Expected |
|---|------|-------|----------|
| N1 | Left arrow | Arrow through Arabic text | Moves by element (logical order) |
| N2 | Right arrow | Arrow through Arabic text | Moves by element (logical order) |
| N3 | Up arrow | Move up across Arabic lines | Maintains approximate column position |
| N4 | Down arrow | Move down across Arabic lines | Maintains approximate column position |
| N5 | Home | Press Home on Arabic line | Cursor moves to start of line |
| N6 | End | Press End on Arabic line | Cursor moves to end of line |
| N7 | Ctrl+Left | Word jump in mixed text | Jumps by word boundary |
| N8 | Ctrl+Right | Word jump in mixed text | Jumps by word boundary |
| N9 | Shift+Arrow | Shift+Left/Right in Arabic | Selection extends correctly |
| N10 | Ctrl+A | Select all | Full document selected |

## 6. Search & Replace

| # | Test | Steps | Expected |
|---|------|-------|----------|
| S1 | Search Arabic | Open search, type Arabic string | Matches highlighted at correct positions |
| S2 | Search navigation | Next/prev match in Arabic | Navigates between matches |
| S3 | Replace Arabic | Replace Arabic word with another | Text replaced, layout reflows |
| S4 | Search Latin in mixed doc | Search for English word | Finds it even near Arabic text |

## 7. Edge Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| E1 | Shaping disabled | Set `shaping.enabled: false` | All text uses Canvas API, zero errors |
| E2 | Font not loaded yet | Reload page, observe initial render | Fallback to Canvas API, re-render on load |
| E3 | forceShaping=true | Set `forceShaping: true` in options | ALL text goes through ShapeEngine |
| E4 | Empty document | Clear all, type Arabic | ShapeEngine handles fresh state |
| E5 | Very long Arabic line | Paste 500+ Arabic characters | No crash, correct line wrapping |
| E6 | Mixed bold/plain Arabic | Bold one letter mid-word | Style boundary flushes correctly |
| E7 | Delete all then retype | Ctrl+A, Del, type Arabic | Clean state, no stale cache |
| E8 | Rapid typing | Type Arabic quickly | No visual glitches or measurement lag |
| E9 | Table with Arabic | Insert table, type Arabic in cell | Correct measurement within table cell |
| E10 | Print | Print document with Arabic text | Arabic renders correctly in print output |

## 8. Decorations — Precise Alignment

| # | Test | Steps | Expected |
|---|------|-------|----------|
| D1 | Underline width | Underline Arabic text | Underline extends exactly to text width |
| D2 | Strikeout position | Strikeout Arabic text | Line at vertical center of text |
| D3 | Highlight rect | Highlight Arabic text | Background rect matches text bounds |
| D4 | Search highlight | Search match on Arabic | Yellow highlight covers matched text |
| D5 | Selection highlight | Drag-select Arabic | Blue selection covers rendered text |

## 9. InterOp — Other Element Types

| # | Test | Steps | Expected |
|---|------|-------|----------|
| I1 | Image next to Arabic | Insert image, type Arabic after | Both render correctly, no overlap |
| I2 | Checkbox next to Arabic | Insert checkbox, Arabic text | Checkbox renders, text follows |
| I3 | Date element | Insert date near Arabic text | Date renders correctly |
| I4 | Separator | Insert separator between Arabic paragraphs | Separator renders at correct position |
| I5 | Page break | Insert page break in Arabic document | Content splits across pages correctly |
| I6 | LaTeX | Insert LaTeX near Arabic text | Both render independently |

---

## Automated Checks (Pre-Commit)

These run automatically via pre-commit hook (`npm run lint && npm run type:check`):

- [ ] `npm run lint` — 0 errors (warnings OK)
- [ ] `npm run type:check` — 0 errors
- [ ] No circular dependency introduced

## Architecture Invariants

These MUST remain true after every change:

1. **Single rendering gateway**: All text rendering flows through `TextParticle.renderText()` or `TextParticle._render()`. No particle calls `ctx.fillText()` directly for element text.
2. **Measurement-render consistency**: `measureText()` and `renderText()/_render()` use the same decision path (`_isShapingReady && _shouldUseShaping`).
3. **Clean fallback**: When shaping is disabled or font not loaded, Canvas API path produces identical results to pre-shaping codebase.
4. **Cache invalidation**: `cacheMeasureText.clear()` is called whenever a ShapeEngine font loads.
5. **No breaking changes**: `shaping.enabled: false` (the default) produces zero behavioral changes.
6. **Contextual group = batch boundary**: A contextual group (consecutive complex-script elements + whitespace, same font/size) must be measured AND rendered as one unit. Splitting mid-group via ZWSP, punctuation, or decoration changes → cache miss → different HarfBuzz advances → spacing gaps.
7. **Positions stay LTR logical order**: `positionList` stores element positions in logical (insertion) order, NOT visual order. The draw pipeline reads x,y from positions; reversing them breaks rendering because `renderGlyphs()` always draws left-to-right using HarfBuzz's visual-order output.
8. **Batch rendering for RTL**: Per-element glyph rendering DOES NOT work for RTL. HarfBuzz returns glyphs in visual order; `renderGlyphs()` draws them sequentially left-to-right. Breaking this into individual element renders places logical-first elements at the wrong visual position.

## Phase 7 Testing Constraints (Cursor & Hit Testing)

These tests must pass before Phase 7 sub-phases can be considered complete:

### 7.1 — Cluster-Aware Coordinate Mapping

| # | Test | Expected |
|---|------|----------|
| P7-1 | Click on Lam-Alef ligature (لا) | Cursor distinguishes between Lam and Alef within the single glyph |
| P7-2 | Click on Shadda+Fatha (Arabic diacritics) | Cursor positions on base char, not on diacritic |
| P7-3 | getPositionByXY for Arabic word | Returns correct element index based on cluster boundaries, not glyph boundaries |
| P7-4 | Coordinate map cache invalidation | Resizing text → coordinate map regenerated |

### 7.2 — RTL Cursor Placement

| # | Test | Expected |
|---|------|----------|
| P7-5 | Cursor at start of Arabic text | Cursor renders at right edge of first element |
| P7-6 | Cursor between Arabic chars | Cursor at correct x between cluster boundaries |
| P7-7 | Cursor at end of Arabic text | Cursor at left edge of last element |
| P7-8 | Cursor at LTR→RTL boundary | Cursor visually jumps from left-side to right-side |
| P7-9 | Cursor at RTL→LTR boundary | Cursor visually jumps from right-side to left-side |
| P7-10 | Cursor at row start (RTL row) | Cursor at rightmost position |
| P7-11 | Cursor at row end (RTL row) | Cursor at leftmost position |

### 7.3 — RTL Hit Testing

| # | Test | Expected |
|---|------|----------|
| P7-12 | Click on Arabic character | Correct element identified despite visual reversal |
| P7-13 | Click on ligature glyph | Correct sub-ligature element chosen based on x offset within ligature |
| P7-14 | Click at LTR/RTL boundary | Correct element on correct side of boundary |
| P7-15 | Click past end of RTL row | Cursor at logical end (visual left) |
| P7-16 | Click before start of RTL row | Cursor at logical start (visual right) |

### 7.4 — Arrow Key Navigation

| # | Test | Expected |
|---|------|----------|
| P7-17 | Left arrow in Arabic text | Moves to next logical character (visually right) |
| P7-18 | Right arrow in Arabic text | Moves to previous logical character (visually left) |
| P7-19 | Arrow across LTR→RTL boundary | Direction reversal handled smoothly |
| P7-20 | Ctrl+Left in Arabic | Jumps to previous word boundary |
| P7-21 | Ctrl+Right in Arabic | Jumps to next word boundary |
| P7-22 | Home in RTL row | Cursor at visual right (logical start) |
| P7-23 | End in RTL row | Cursor at visual left (logical end) |
| P7-24 | Up/Down across RTL rows | Maintains approximate visual column |

### 7.5 — Selection Highlighting

| # | Test | Expected |
|---|------|----------|
| P7-25 | Shift+Right in Arabic text | Selection extends visually left (logical forward) |
| P7-26 | Shift+Click in Arabic text | Selection from cursor to click point, correct highlight |
| P7-27 | Drag-select in Arabic text | Correct contiguous highlight rectangle(s) |
| P7-28 | Selection across mixed direction | Multiple highlight rects for non-contiguous visual ranges |
| P7-29 | Select all in mixed document | Full coverage, no gaps or overlaps |

### 7.6 — Mixed Direction Boundaries

| # | Test | Expected |
|---|------|----------|
| P7-30 | Type at LTR→RTL boundary | Input inserts at correct logical position |
| P7-31 | Delete at RTL→LTR boundary | Correct character deleted |
| P7-32 | Backspace at LTR→RTL boundary | Correct character deleted |
| P7-33 | Double-click Arabic word | Full word selected (space-delimited) |
| P7-34 | Double-click at direction boundary | Selects word in correct direction run |

## 10. Controls & Popups — RTL Verification

| # | Test | Steps | Expected |
|---|------|-------|----------|
| CP-1 | Select control popup (LTR) | Click select control in English text | Popup appears below control, left-aligned, LTR text |
| CP-2 | Select control popup (RTL) | Click select control in Arabic text | Popup appears below control, right-aligned, RTL text direction |
| CP-3 | Select control popup (BiDi) | Click select control in mixed text | Popup appears at correct position, correct text direction |
| CP-4 | Date picker popup (LTR) | Click date control in English text | Calendar appears below, correct position |
| CP-5 | Date picker popup (RTL) | Click date control in Arabic text | Calendar appears below, correct position, RTL layout |
| CP-6 | Date picker popup (BiDi) | Click date control in mixed text | Calendar at correct position |
| CP-7 | Calculator popup (LTR) | Click number control in English text | Calculator appears below, correct position |
| CP-8 | Calculator popup (RTL) | Click number control in Arabic text | Calculator appears below, correct position |
| CP-9 | Checkbox in RTL row | Insert checkbox in Arabic text | Checkbox renders at correct visual position |
| CP-10 | Radio in RTL row | Insert radio in Arabic text | Radio renders at correct visual position |
| CP-11 | Text control (RTL) | Text control with Arabic content | Control displays RTL text correctly |
| CP-12 | Control border (RTL) | Text control with border in Arabic text | Border rect covers correct visual extent |
| CP-13 | Select value display (RTL) | Select Arabic value from dropdown | Selected value displays correctly in editor |
