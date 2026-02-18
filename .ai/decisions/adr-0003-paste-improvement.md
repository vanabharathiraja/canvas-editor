# ADR-0003: Paste Improvement — MS Word, Google Docs, Excel Support

**Status**: Accepted
**Date**: 2026-02-18
**Deciders**: Developer
**Context**: Paste from external sources (MS Word, Google Docs, Excel) produces
degraded output due to missing source detection, vendor HTML normalization,
and incomplete CSS property capture.

---

## Context

The canvas-editor's paste pipeline converts clipboard HTML → IElement[] via
`getElementListByHTML()`. The function injects raw HTML into a hidden DOM div,
walks the DOM tree, and extracts elements using `window.getComputedStyle()`.

**Current flow:**
```
Clipboard HTML → getElementListByHTML() → IElement[] → insertElementList()
```

This works well for generic/clean HTML, but fails for vendor-specific clipboard
formats from MS Word, Google Docs, and Excel:

| Source | Key Issue |
|--------|-----------|
| **MS Word** | `mso-*` CSS properties, conditional comments, `<o:p>` namespace elements, lists encoded as `<p class=MsoListParagraph>` instead of `<ul>/<ol>` |
| **Google Docs** | `<b id="docs-internal-guid-...">` wrapper with `font-weight:normal`, pt-based sizes, heavy inline styles |
| **Excel** | Class-based formatting (`xl65`, `xl66`), `<style>` block may not attach to DOM, no `<colgroup>` element, TSV fallback absent |

Additionally, several CSS properties are not captured from **any** source:
- `font-family` (maps to `IElement.font`)
- `letter-spacing` (maps to `IElement.letterSpacing`)
- `line-height` (maps to `IElement.rowMargin`)
- Cell padding from pasted tables
- `<pre>`/`<code>` → no CODEBLOCK mapping

---

## Decision

Implement a **source-detection + pre-processing pipeline** that normalizes
vendor-specific HTML before it reaches `getElementListByHTML()`.

### Architecture

```
Raw HTML
  → detectSource()       → 'word' | 'google-docs' | 'excel' | 'unknown'
  → sanitize(html, src)  → clean semantic HTML
  → enhancedParsing()    → additional CSS property capture
  → getElementListByHTML(cleanHtml)
```

### Source Detection

```ts
function detectPasteSource(html: string):
  'word' | 'google-docs' | 'excel' | 'unknown' {
  if (/ProgId.*Excel\.Sheet/i.test(html))               return 'excel'
  if (/class="?Mso|ProgId.*Word\.Document/i.test(html)) return 'word'
  if (/id="docs-internal-guid-/.test(html))              return 'google-docs'
  return 'unknown'
}
```

### Normalizer Functions

Each is a pure function `(html: string) => string`:

1. **`normalizeWordHTML(html)`** — Strip conditional comments, `<o:p>`, XML
   namespace elements; convert `MsoListParagraph` to `<ul>/<ol>/<li>`;
   handle `mso-spacerun`, `mso-border-alt`; strip `<style>` block
2. **`normalizeGoogleDocsHTML(html)`** — Unwrap `docs-internal-guid` `<b>`;
   normalize font-weight; handle empty `<br>` paragraphs
3. **`normalizeExcelHTML(html)`** — Resolve `xl*` classes from `<style>` block
   to inline styles; strip XML; build `<colgroup>` from `<col>` elements
4. **`sanitizeHTML(html)`** — Common: strip `<script>`, `on*` attributes,
   `javascript:` hrefs, `<!--StartFragment-->` comments

### Enhanced Property Capture

Additions to `convertTextNodeToElement()`:
- `font-family` → `IElement.font`
- `letter-spacing` → `IElement.letterSpacing`

Additions to table parsing in `getElementListByHTML()`:
- Cell padding → `ITd.padding`

### New Feature: Paste as Plain Text

- Wire `Ctrl+Shift+V` shortcut to `pasteByApi({ isPlainText: true })`
- Add context menu entry "Paste without formatting"

### New Feature: TSV → Table

When `text/html` is absent but `text/plain` contains tab-separated values,
auto-detect and construct a TABLE element.

---

## Phases

### Phase P1: Foundation — Source Detection + Sanitization (Medium)
- `detectPasteSource()` function
- `sanitizeHTML()` — XSS protection (strip scripts, on* attrs, js: hrefs)
- Generic normalization (fragment comments, whitespace)
- Wire into paste pipeline before `getElementListByHTML()`

### Phase P2: Property Capture Enhancement (Low)
- `font-family` capture in `convertTextNodeToElement()`
- `letter-spacing` capture
- Cell `padding` capture in table parsing
- `<pre>`/`<code>` → styled text with monospace font

### Phase P3: Google Docs Normalizer (Medium)
- `normalizeGoogleDocsHTML()` — unwrap `<b>` guid wrapper
- Handle pt → px font-size conversion (if `getComputedStyle` doesn't handle)
- Validate table paste fidelity (colgroup, borders, cell styles)
- Handle nested list depth via `padding-inline-start`

### Phase P4: MS Word Normalizer (High)
- `normalizeWordHTML()` — strip conditional comments, namespace elements
- Convert `MsoListParagraph` to `<ul>/<ol>/<li>` with depth from `level{N}`
- Strip `mso-list:Ignore` spans (bullet markers)
- Handle `mso-spacerun:yes` whitespace
- Parse `mso-border-alt` for table borders
- Unit conversion for pt/in values where `getComputedStyle` doesn't help

### Phase P5: Excel Normalizer + TSV (Medium)
- `normalizeExcelHTML()` — resolve `xl*` classes to inline styles
- Build `<colgroup>` from `<col>` elements
- Handle merged cell gaps in row tdList
- TSV auto-detection from `text/plain` → TABLE element

### Phase P6: Paste as Plain Text (Low)
- `Ctrl+Shift+V` keyboard shortcut
- Context menu "Paste without formatting"
- Uses existing `IPasteOption.isPlainText` path

---

## Consequences

### Positive
- Copy-paste from Word/Docs/Excel produces accurate rendering
- Font family, spacing, and cell padding preserved from all sources
- XSS protection via explicit sanitization
- TSV → Table enables quick table creation from spreadsheets
- Paste as plain text gives users control over formatting

### Negative
- Increased code complexity in paste pipeline
- Word/Excel normalizers must track vendor format changes across versions
- Test coverage requires actual clipboard samples from each source

### Risks
- Word HTML varies between versions (2016, 2019, 365, Mac)
- Browser `getComputedStyle()` may already handle some normalizations
  (need to verify before over-engineering)
- RTF clipboard type (`text/rtf`) is NOT supported (requires full RTF parser)

---

## Test Strategy

Each phase includes testable verification:

| Phase | Test Method |
|-------|------------|
| P1 | Unit test `detectPasteSource()` with sample HTML strings |
| P2 | Paste styled text → verify `font` field set on elements |
| P3 | Paste Google Docs table → verify colgroup, borders, fonts intact |
| P4 | Paste Word doc with lists + tables → verify LIST elements with nesting |
| P5 | Paste Excel cells → verify TABLE with styling; paste TSV → verify TABLE |
| P6 | Ctrl+Shift+V → verify plain text inserted (no formatting) |

Store sample clipboard HTML in `cypress/fixtures/paste-samples/` for
reproducible E2E tests.

---

## References

- Current paste handler: `src/editor/core/event/handlers/paste.ts`
- HTML parser: `src/editor/utils/element.ts` → `getElementListByHTML()`
- Internal clipboard: `src/editor/utils/clipboard.ts`
- Paste analysis doc: `Canvas Editor - Paste-Analysis.md`
