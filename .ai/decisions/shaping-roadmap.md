# ADR: Shaping Engine Rendering Quality & Multi-Font Strategy

**Date**: 2025-02-10 (updated 2025-02-12)
**Status**: Implemented (Phases A-C complete, commit `3b1076e`)
**Context**: ShapeEngine path rendering vs native Canvas API quality

---

## 1. Rendering Sharpness — Problem & Root Cause

### Observed
Text rendered via ShapeEngine (OpenType.js glyph paths → `path.draw(ctx)`)
has visible aliasing/"pixelated steps" at glyph edges compared to native
Canvas API `ctx.fillText()`.

### Root Cause (Inherent)
1. **Subpixel AA**: Native `fillText()` uses ClearType (Windows) / subpixel
   anti-aliasing (Mac). Path drawing only gets grayscale AA.
2. **Font Hinting**: TrueType fonts contain hinting instructions that align
   outlines to the pixel grid. `fillText()` applies these; OpenType.js supports
   this via `{hinting: true}` option (implemented in Session 004).
3. **DPR handling is correct**: The editor's `ctx.scale(dpr, dpr)` properly
   scales path drawing to device resolution. This is NOT the issue.
4. **Font size matters**: At 48px (POC), aliasing is barely visible. At 12-16px
   (editor), it's pronounced.

---

## 2. Solution: Script-Aware Smart Routing

### Principle
Only use ShapeEngine for text that **needs** complex shaping. Simple scripts
continue using the superior native Canvas API.

### Implementation Plan

#### Phase A: Script Detection Utility (Priority: HIGH)
Create `src/editor/utils/unicode.ts`:

```typescript
/**
 * Unicode ranges that require complex text shaping.
 * These scripts have contextual glyph forms, ligatures, or
 * reordering that Canvas API fillText() cannot handle correctly.
 */
const COMPLEX_SCRIPT_RANGES: [number, number][] = [
  [0x0600, 0x06FF],   // Arabic
  [0x0750, 0x077F],   // Arabic Supplement
  [0x0870, 0x089F],   // Arabic Extended-B
  [0x08A0, 0x08FF],   // Arabic Extended-A
  [0xFB50, 0xFDFF],   // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF],   // Arabic Presentation Forms-B
  [0x0900, 0x097F],   // Devanagari
  [0x0980, 0x09FF],   // Bengali
  [0x0A00, 0x0A7F],   // Gurmukhi
  [0x0A80, 0x0AFF],   // Gujarati
  [0x0B00, 0x0B7F],   // Oriya
  [0x0B80, 0x0BFF],   // Tamil
  [0x0C00, 0x0C7F],   // Telugu
  [0x0C80, 0x0CFF],   // Kannada
  [0x0D00, 0x0D7F],   // Malayalam
  [0x0D80, 0x0DFF],   // Sinhala
  [0x0E00, 0x0E7F],   // Thai
  [0x0E80, 0x0EFF],   // Lao
  [0x0F00, 0x0FFF],   // Tibetan
  [0x1000, 0x109F],   // Myanmar
  [0x1780, 0x17FF],   // Khmer
]

export function needsComplexShaping(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!
    for (const [start, end] of COMPLEX_SCRIPT_RANGES) {
      if (code >= start && code <= end) return true
    }
    if (code > 0xFFFF) i++ // skip surrogate pair
  }
  return false
}
```

#### Phase B: Smart Routing in TextParticle (Priority: HIGH)
Modify `_render()` and `measureText()` to check `needsComplexShaping(text)`:
- If text needs shaping AND ShapeEngine font is ready → use ShapeEngine
- If text is simple Latin/CJK → always use Canvas API fillText()
- Optional: add `forceShaping` option for testing/debugging

#### Phase C: CSS @font-face Registration (Priority: MEDIUM)
When ShapeEngine loads a font file, also register it as a CSS `@font-face`:

```typescript
async registerCSSFontFace(fontName: string, fontData: ArrayBuffer): Promise<void> {
  const face = new FontFace(fontName, fontData)
  await face.load()
  document.fonts.add(face)
}
```

This ensures native `fillText()` can use ShapeEngine-registered fonts, so
Latin text in "Noto Sans" still uses the loaded .ttf file via CSS, not a
system fallback.

---

## 3. Multi-Font Strategy

### Current State
- Font mapping in `IShapingOption.fontMapping` — per-font opt-in
- Lazy loading via `ensureShapingFont()` — fonts loaded on first use
- Canvas API fallback for unmapped fonts — zero cost

### Architecture (No major changes needed)

```
Text Rendering Decision Tree:
┌─────────────────────┐
│ Element to render    │
├─────────────────────┤
│ 1. Is shaping       │──No──→ Canvas API fillText()
│    enabled?          │
│ 2. Is font mapped?  │──No──→ Canvas API fillText()
│ 3. Is font loaded?  │──No──→ Canvas API fillText() + trigger lazy load
│ 4. Does text need   │──No──→ Canvas API fillText() (using CSS @font-face)
│    complex shaping?  │
│ 5. YES to all       │──Yes─→ ShapeEngine renderGlyphs()
└─────────────────────┘
```

### Future Optimizations (Phase 8+)

| Optimization | Benefit | Effort | Priority |
|---|---|---|---|
| **WOFF2 compression** | 30-50% smaller downloads | Low | Medium |
| **Font subsetting** | CJK fonts: 20MB → <1MB per subset | Medium | High for CJK |
| **Glyph atlas cache** | Bitmap cache for repeated glyphs | High | Low |
| **Web Worker shaping** | Non-blocking shaping for large docs | High | Low |
| **Local font detection** | Skip download for installed fonts | Medium | Medium |
| **Font streaming** | Progressive font loading | High | Low |

### Practical Guidelines
1. **Register only fonts that need shaping** — Arabic (Amiri, Noto Sans Arabic),
   Devanagari (Noto Sans Devanagari), etc.
2. **Latin fonts don't need ShapeEngine** — Canvas API handles them perfectly
3. **CJK fonts are large** — consider subsetting before registering
4. **Keep font files in `/public/fonts/`** — served statically, cacheable

---

## 4. Measurement Consistency Note

Found during analysis: measurement and rendering use different fontSize sources:
- **Measuring**: `_getElementFontSize(element)` → unscaled px (e.g., 16)
- **Rendering**: `_parseFontSize(curStyle)` → scaled px (e.g., 24 at 1.5x)

This is **intentional and correct** because:
- Measurement: done at 1x scale, result multiplied by `options.scale` in Draw.ts
- Rendering: done at scaled coordinates (canvas is `width * scale * dpr`)
- Font metrics (width, advance) scale linearly, so both paths produce consistent results

---

## 5. Implementation Status

- [x] **Script detection utility** — `needsComplexShaping()` in `src/editor/utils/unicode.ts`
- [x] **Smart routing** — `_shouldUseShaping()` in TextParticle
- [x] **CSS @font-face** — `_registerCSSFontFace()` in ShapeEngine
- [x] **TrueType hinting** — `{hinting: true}` in `renderGlyphs()`
- [ ] **Test with Arabic** — load Amiri or Noto Sans Arabic, verify shaping quality
- [ ] **Performance benchmark** — compare ShapeEngine vs Canvas API rendering times
