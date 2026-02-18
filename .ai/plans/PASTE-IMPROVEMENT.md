# Paste Improvement Plan — Word / Google Docs / Excel Support

**Created**: 2026-02-18
**Branch**: `shape-engine`
**Status**: Planning (P1-P6 defined)
**ADR**: [adr-0003-paste-improvement.md](../decisions/adr-0003-paste-improvement.md)

---

## Overview

Improve paste fidelity from MS Word, Google Docs, and Excel. Currently
pasting from these sources loses formatting (font-family, spacing),
mishandles vendor-specific HTML (conditional comments, mso-* CSS, namespace
elements), and doesn't support TSV → table or paste-as-plain-text.

---

## Current Paste Support

| Capability | Status |
|-----------|--------|
| Plain text paste | ✅ via `host.input()` |
| HTML paste | ✅ via `getElementListByHTML()` |
| Image paste | ✅ via FileReader + data URL |
| Internal round-trip | ✅ via localStorage `IElement[]` |
| Table paste (basic) | ✅ colgroup, colspan/rowspan, per-cell borders |
| Source detection | ❌ All HTML treated the same |
| Word list conversion | ❌ `MsoListParagraph` → plain text |
| Word conditional comments | ❌ Passed to DOM |
| Google Docs `<b>` unwrap | ⚠️ Incidentally works (inherits styles) |
| Excel class-based styles | ❌ `<style>` may not attach |
| font-family capture | ❌ Missing from `convertTextNodeToElement()` |
| letter-spacing capture | ❌ Missing |
| Cell padding from paste | ❌ `ITd.padding` not populated |
| `<pre>`/`<code>` handling | ❌ Falls through as generic text |
| TSV → Table | ❌ No detection |
| Paste as plain text | ❌ No shortcut/context menu |
| XSS sanitization | ❌ No explicit filtering |

---

## Phase P1: Foundation — Source Detection + Sanitization

**Effort**: Medium | **Priority**: Critical | **Testable**: Yes

### P1.1 — Create `src/editor/utils/paste-normalizer.ts`

New module with:
- `detectPasteSource(html: string): 'word' | 'google-docs' | 'excel' | 'unknown'`
- `sanitizeHTML(html: string): string` — strip `<script>`, `on*` attrs, `javascript:` href
- `normalizePasteHTML(html: string): { html: string, source: string }` — orchestrator

### P1.2 — Wire into Paste Pipeline

Update `pasteHTML()` in `paste.ts`:
```
- Before: pasteHTML(host, htmlText) → getElementListByHTML(htmlText)
+ After:  pasteHTML(host, htmlText) → normalizePasteHTML(htmlText) → getElementListByHTML(cleanHtml)
```

### P1.3 — Generic Sanitization
- Strip `<!--StartFragment-->` / `<!--EndFragment-->` comments
- Strip `<script>`, `<style>` (except when needed for class resolution)
- Strip `on*` event handler attributes
- Sanitize `href` values (block `javascript:`, `vbscript:`)
- Normalize whitespace

### Test: Unit test `detectPasteSource()` with Word/Docs/Excel sample strings

---

## Phase P2: Property Capture Enhancement

**Effort**: Low | **Priority**: High | **Testable**: Yes

### P2.1 — font-family Capture
Add to `convertTextNodeToElement()`:
```ts
const fontFamily = style.fontFamily
if (fontFamily) {
  element.font = fontFamily.replace(/['"]/g, '').split(',')[0].trim()
}
```

### P2.2 — letter-spacing Capture
```ts
const letterSpacing = parseFloat(style.letterSpacing)
if (letterSpacing && !isNaN(letterSpacing)) {
  element.letterSpacing = letterSpacing
}
```

### P2.3 — Cell Padding from Paste
In table parsing section of `getElementListByHTML()`:
```ts
const paddingTop = parseFloat(cellStyle.paddingTop)
const paddingRight = parseFloat(cellStyle.paddingRight)
const paddingBottom = parseFloat(cellStyle.paddingBottom)
const paddingLeft = parseFloat(cellStyle.paddingLeft)
if (paddingTop || paddingRight || paddingBottom || paddingLeft) {
  td.padding = [paddingTop, paddingRight, paddingBottom, paddingLeft]
}
```

### P2.4 — `<pre>`/`<code>` → Monospace Text
When encountering `<pre>` or `<code>` elements, parse children as text
with `font: 'Courier New'` applied to each element.

### Test: Paste styled text from web page → verify `font` field populated

---

## Phase P3: Google Docs Normalizer

**Effort**: Medium | **Priority**: High | **Testable**: Yes

### P3.1 — Unwrap `docs-internal-guid` Wrapper
```ts
function normalizeGoogleDocsHTML(html: string): string {
  // Remove <b id="docs-internal-guid-..." style="font-weight:normal"> wrapper
  html = html.replace(
    /<b[^>]+id="docs-internal-guid-[^"]*"[^>]*>([\s\S]*?)<\/b>/gi,
    '$1'
  )
  return html
}
```

### P3.2 — Handle Empty Paragraphs
Google Docs uses `<p><br></p>` for blank lines — ensure these produce
proper `\n` elements.

### P3.3 — Table Paste Verification
Verify that Google Docs tables maintain:
- Per-cell border styles (already partially handled)
- Cell background colors
- Merged cells (colspan/rowspan)
- Column widths via `<colgroup>`

### P3.4 — Nested List Depth
Parse `padding-inline-start` on `<ul>`/`<ol>` to determine nesting level.
Convert flat `querySelectorAll('li')` to recursive depth-aware parsing.

### Test: Paste Google Docs content with styled table → verify output matches

---

## Phase P4: MS Word Normalizer

**Effort**: High | **Priority**: Medium-High | **Testable**: Yes

### P4.1 — Strip Office Markup
```ts
function normalizeWordHTML(html: string): string {
  // 1. Remove conditional comments
  html = html.replace(/<!--\[if[\s\S]*?endif\]-->/gi, '')
  // 2. Remove namespace elements (<o:p>, <w:sdt>, etc.)
  html = html.replace(/<\/?(o|w|v|m|st1):[^>]*>/gi, '')
  // 3. Remove XML declarations
  html = html.replace(/<xml[\s\S]*?<\/xml>/gi, '')
  // 4. Remove <meta> tags
  html = html.replace(/<meta[^>]*>/gi, '')
  return html
}
```

### P4.2 — Convert Word Lists to HTML Lists
Detect consecutive `<p class="MsoListParagraph...">` elements and convert
to proper `<ul>`/`<ol>`/`<li>` structure:
- Parse `mso-list:l{N} level{M} lfo{X}` for list ID and nesting level
- Strip `<!--[if !supportLists]-->...<!--[endif]-->` bullet markers
- Group consecutive list paragraphs with same `l{N}` into one list

### P4.3 — Handle `mso-spacerun`
Replace `<span style='mso-spacerun:yes'> </span>` sequences with actual
non-breaking spaces.

### P4.4 — Table Border Alt Parsing
For Word tables, parse `mso-border-alt:solid windowtext .5pt` to extract
the real border width (the CSS `border` property is inflated).

### P4.5 — Unit Conversion
Convert `pt` and `in` dimensions to `px`:
- 1pt ≈ 1.333px
- 1in = 96px

### Test: Paste Word document with lists + table → verify LIST elements created

---

## Phase P5: Excel Normalizer + TSV

**Effort**: Medium | **Priority**: Medium | **Testable**: Yes

### P5.1 — Resolve Excel Style Classes
Parse the `<style>` block from Excel HTML to extract `xl*` class definitions,
then convert those classes to inline styles before DOM insertion.

### P5.2 — Build Colgroup
Excel puts `<col>` as direct children of `<table>` without `<colgroup>`.
Add detection to handle this pattern.

### P5.3 — TSV Auto-Detection
When `text/html` is absent but `text/plain` contains tab characters:
```ts
function isTSV(text: string): boolean {
  return text.includes('\t') && text.includes('\n')
}

function tsvToTableElement(text: string, innerWidth: number): IElement {
  const rows = text.split('\n').filter(r => r.trim())
  const data = rows.map(r => r.split('\t'))
  // Build TABLE IElement with colgroup, trList, tdList
}
```

### P5.4 — Handle Merged Cell Gaps
Excel omits `<td>` elements for cells hidden by merged ranges. Detect
missing cells by comparing expected column count to actual and fill gaps.

### Test: Paste Excel cells → verify TABLE element created with styles

---

## Phase P6: Paste as Plain Text

**Effort**: Low | **Priority**: Medium | **Testable**: Yes

### P6.1 — Keyboard Shortcut
Register `Ctrl+Shift+V` shortcut in the keyboard handler:
- Call `pasteByApi({ isPlainText: true })` 
- Or in `pasteByEvent`, detect `Shift` modifier

### P6.2 — Context Menu Entry
Add "Paste without formatting" entry to the editor context menu.

### Test: Ctrl+Shift+V in editor → verify plain text inserted

---

## Implementation Order

```
P1 ──→ P2 ──→ P3 ──→ P4 ──→ P5 ──→ P6
Found.  Props   GDocs   Word   Excel   Plain
                                       Text
```

P1 + P2 are foundational and should be done first. P3-P5 are independent
normalizers that can be done in any order (recommended: Docs first since
it's simpler and high-impact). P6 is standalone.

---

## Success Criteria

1. **P1**: `detectPasteSource()` correctly identifies Word/Docs/Excel HTML
2. **P2**: Pasted text preserves font-family and letter-spacing
3. **P3**: Google Docs table paste matches source formatting
4. **P4**: Word document with lists pastes as proper LIST elements
5. **P5**: Excel paste creates styled TABLE; TSV paste creates TABLE
6. **P6**: Ctrl+Shift+V inserts plain text without formatting
