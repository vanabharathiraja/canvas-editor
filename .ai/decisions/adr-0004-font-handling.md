# ADR-0004: Multi-Font Handling with Dual Rendering System

**Status**: Proposed
**Date**: 2026-02-18
**Deciders**: Developer
**Context**: The editor uses two rendering paths — native Canvas `fillText()` for
simple scripts and HarfBuzz/OpenType.js (ShapeEngine) for complex scripts. Font
handling must work correctly across both paths as we add multi-font support.

---

## Context

### Current State

The editor has a **dual rendering system**:

| Path | Trigger | Font Resolution | Rendering |
|------|---------|----------------|-----------|
| **Native Canvas** | Simple text (Latin, CJK) | `ctx.font = "bold 16px Arial"` — browser resolves from system/CSS fonts | `ctx.fillText()` |
| **ShapeEngine** | Complex text (Arabic, Devanagari, Thai) | `resolveWithFallback(fontName, 'Amiri', bold, italic)` — requires explicit font blob loaded via `loadFont()` | HarfBuzz shaping → OpenType.js glyph paths |

**Font flow today:**
1. `IElement.font` ← per-element font (optional)
2. `options.defaultFont` ← fallback (`'Microsoft YaHei'`)
3. For native path: browser resolves → works if font is installed or loaded via `@font-face`
4. For shaping path: `ShapeEngine.fontRegistry` must contain an entry → falls back to `complexScriptFallback` (`'Amiri'`) if not found

**Problems:**
- Only **one Arabic font (Amiri)** is loaded into ShapeEngine currently
- If a user pastes text with `font: 'Arial'` and that text contains Arabic characters, ShapeEngine falls back to Amiri regardless
- No font atlas or texture caching — every glyph is rendered individually via `getPath()` (expensive)
- No mechanism to map CSS font families to ShapeEngine-loadable font files
- `@font-face` registration in `loadFont()` enables native Canvas to use the same font, but this only works for fonts explicitly loaded into ShapeEngine

### Impact on Paste (P1/P2)

During paste, `convertTextNodeToElement()` captures `style.fontFamily`. This font name
may not be available in ShapeEngine's registry. Current approach: capture the font name
into `IElement.font`, let the rendering pipeline handle fallback:
- Native path: browser resolves the font (may fall back to system default)
- Shaping path: `resolveWithFallback()` falls back to Amiri

This is acceptable for now but creates inconsistency between the two paths.

---

## Decision

### Phase 1: Paste-Time Font Capture (Current — P2)

Capture `font-family` from pasted HTML into `IElement.font`. Accept that:
- Native Canvas may render with a different fallback than ShapeEngine
- ShapeEngine always falls back to `complexScriptFallback` for unregistered fonts
- This is **correct behavior** — the font name is preserved in the data model; rendering improves as fonts are registered

### Phase 2: Font Registry Enhancement (Future — F1)

Expand `ShapeEngine.fontRegistry` to support multiple fonts with lazy loading.

```
Proposed architecture:
┌───────────────────────────────────────────────────┐
│ FontManager                                       │
│                                                   │
│ fontManifest: Map<familyName, FontManifestEntry>  │
│   entry = { url, variants, loaded, scripts[] }    │
│                                                   │
│ resolveFont(familyName, bold, italic, script)     │
│   → if manifest has entry & not loaded → lazy load│
│   → if no entry → fallback chain                  │
│   → return LoadedFont                             │
│                                                   │
│ fallbackChain: [complexScriptFallback, default]   │
└───────────────────────────────────────────────────┘
```

**Key changes:**
- `FontManifestEntry` contains URLs for regular/bold/italic/boldItalic variants
- `scripts[]` declares which Unicode script blocks the font supports (e.g., `['Arabic', 'Latin']`)
- Lazy loading: font blob fetched + parsed only when first needed
- CSS `@font-face` registered in parallel so native path can use same font

### Phase 3: Font Atlas & Caching (Future — F2)

Replace per-glyph `getPath()` rendering with a glyph atlas for frequently-used fonts.

```
GlyphAtlas
├── atlas texture (OffscreenCanvas or ImageBitmap)
├── glyph map: Map<glyphId, { x, y, w, h, xOffset, yOffset }>
├── populateFromShapingResult(result, font)
└── renderFromAtlas(ctx, glyphId, x, y, scale)
```

**Benefits:**
- Amortize glyph rendering cost across repeated characters
- Enable GPU-accelerated rendering via `drawImage()` from atlas
- Reduce per-frame CPU cost for documents with repeated text

**Trade-offs:**
- Memory overhead for atlas textures (~1-4MB per font at common sizes)
- Complexity increase in cache invalidation (font size changes, zoom)
- Need to handle atlas overflow (LRU eviction of least-used glyph pages)

### Phase 4: Unified Font Resolution (Future — F3)

Bridge the gap between native Canvas and ShapeEngine font resolution:

```ts
// Proposed unified resolution
function resolveRenderingFont(element: IElement, text: string): {
  path: 'native' | 'shaping'
  font: string         // CSS font string for native, fontId for shaping
  fallbackUsed: boolean
} {
  const fontName = element.font || defaultFont
  const needsShaping = needsComplexShaping(text)

  if (needsShaping) {
    const fontId = engine.resolveWithFallback(fontName, fallback, bold, italic)
    return { path: 'shaping', font: fontId, fallbackUsed: fontId !== fontName }
  }

  // Native path: check if font is available via document.fonts.check()
  const cssFont = buildCSSFont(fontName, element)
  const available = document.fonts.check(cssFont)
  return {
    path: 'native',
    font: cssFont,
    fallbackUsed: !available
  }
}
```

---

## Detailed Task Breakdown

### F1: Font Registry Enhancement
| Task | Description | Effort |
|------|-------------|--------|
| F1.1 | Define `FontManifestEntry` interface (family, variants, scripts, urls) | Low |
| F1.2 | Create `FontManager` class wrapping `ShapeEngine.fontRegistry` | Medium |
| F1.3 | Implement lazy font loading with Promise queue (avoid duplicate fetches) | Medium |
| F1.4 | Add `registerFontManifest(manifest[])` API for bulk registration | Low |
| F1.5 | Implement script-aware fallback chain (Arabic→Amiri, Devanagari→Noto, etc.) | Medium |
| F1.6 | Add `document.fonts.check()` probe for native path availability | Low |
| F1.7 | Expose `editor.command.execute*` API for runtime font loading | Low |

### F2: Glyph Atlas
| Task | Description | Effort |
|------|-------------|--------|
| F2.1 | Design atlas data structure (pages, glyph rects, metrics) | Medium |
| F2.2 | Implement atlas population from OpenType.js paths | High |
| F2.3 | Implement `renderFromAtlas()` using `ctx.drawImage()` | Medium |
| F2.4 | Add size-bucketed atlas pages (group by similar font sizes) | Medium |
| F2.5 | LRU eviction for atlas pages when memory threshold exceeded | Medium |
| F2.6 | Benchmark vs current per-glyph rendering | Low |

### F3: Unified Font Resolution
| Task | Description | Effort |
|------|-------------|--------|
| F3.1 | Implement `resolveRenderingFont()` with dual-path resolution | Medium |
| F3.2 | Add font availability indicator in toolbar (grey out unavailable fonts) | Low |
| F3.3 | Implement font substitution notification when fallback is used | Low |
| F3.4 | Handle mixed-script text segments (Latin+Arabic in same element) | High |

---

## Consequences

### Positive
- Font names from pasted content are preserved in IElement, enabling future font loading
- Dual rendering paths remain independent — no coupling between ShapeEngine and native
- Atlas caching will significantly improve rendering performance for complex-script documents
- Lazy loading prevents upfront download of all font variants

### Negative
- Until F1 is implemented, pasted text with custom fonts renders with fallback on the shaping path
- Atlas memory overhead may be significant for documents using many fonts at many sizes
- Mixed-script segments (F3.4) are inherently complex — may need per-character path switching

### Risks
- Font licensing: loading arbitrary fonts from URLs requires CORS support
- HarfBuzz WASM memory: each loaded font blob consumes WASM linear memory
- Browser font API (`document.fonts`) availability varies in older browsers

---

## References

- ShapeEngine: `src/editor/core/shaping/ShapeEngine.ts`
- Font resolution: `TextParticle._resolveShapingFontId()`
- Complex script detection: `src/editor/utils/unicode.ts` → `needsComplexShaping()`
- Default fonts: `src/editor/utils/option.ts` → `defaultFont: 'Microsoft YaHei'`
- Shaping fallback: `src/editor/dataset/constant/Shaping.ts` → `complexScriptFallback: 'Amiri'`
