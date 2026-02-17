# Session 003 - Font Variants, Fallback System & Sharpness Analysis

**Date**: 2025-02-10
**Branch**: `shape-engine`
**Previous Commit**: `81a8e6a` (ShapeEngine measurement + rendering pipeline)

## Objective

1. Add bold/italic font variant support to ShapeEngine
2. Implement multi-font coexistence (ShapeEngine fonts + Canvas API fonts)
3. Add fallback & caching strategy for font switching
4. Diagnose rendering sharpness difference (ShapeEngine vs Canvas API)

## Changes Made

### Modified Files

1. **`src/editor/interface/Shaping.ts`**
   - Extended `IFontMapping` with `boldUrl?`, `italicUrl?`, `boldItalicUrl?`
   - Enables per-font variant registration

2. **`src/editor/utils/option.ts`**
   - Normalizes fontMapping entries: fills in empty-string defaults for variant URLs
   - Ensures downstream code can safely check `entry.boldUrl` etc.

3. **`src/editor/core/shaping/ShapeEngine.ts`**
   - Added `registerFontMapping()` — registers base + variant keys
     (`"FontName|bold"`, `"FontName|italic"`, `"FontName|boldItalic"`)
   - Added `resolveFontId(fontName, bold, italic)` — resolves CSS font + style flags
     to the most specific available variant, with fallback chain:
     `boldItalic → bold → italic → base`
   - Added `isFontRegistered()` for lazy loading checks
   - `destroy()` clears fontRegistry

4. **`src/editor/core/draw/Draw.ts`**
   - `_initShapeEngine()` now registers all font variants and loads them concurrently
   - Clears `cacheMeasureText` before re-render after font loads
   - Added `ensureShapingFont(fontId)` for lazy font loading on font-switch
   - Cleaned up debug console.log/console.error to console.warn

5. **`src/editor/core/draw/particle/TextParticle.ts`**
   - Added `_resolveShapingFontId(element)` — resolves element's bold/italic/font
     to ShapeEngine font ID via `ShapeEngine.resolveFontId()`
   - `record()` now uses resolved font ID for style-change detection
   - `_render()` uses resolved font ID for shaping + rendering
   - `_isShapingReady()` triggers lazy font loading when font is registered but not loaded
   - Added `pendingFontLoads` Set to avoid duplicate lazy-load triggers
   - Cleaned up debug console.log/console.warn statements

6. **`src/mock.ts`**
   - Added shaping config with all 4 Noto Sans variants:
     Regular, Bold, Italic, BoldItalic

### New Font Files (untracked)
- `public/fonts/NotoSans-Bold.ttf` (~575KB)
- `public/fonts/NotoSans-Italic.ttf` (~552KB)
- `public/fonts/NotoSans-BoldItalic.ttf` (~555KB)
- `public/fonts/Amiri/` — Arabic font (for future RTL testing)

## Sharpness Analysis (Diagnosis)

### Problem
Text rendered via ShapeEngine (OpenType.js paths) appears less sharp than
native Canvas API `fillText()`, with visible "pixelated steps" at glyph edges.

### Root Cause
This is an **inherent rendering quality difference**, not a bug:

| Aspect | `ctx.fillText()` (Native) | OpenType.js `path.draw()` |
|--------|--------------------------|---------------------------|
| Anti-aliasing | Subpixel (ClearType on Windows) | Grayscale only |
| Font hinting | Yes — aligns outlines to pixel grid | No — raw mathematical outlines |
| Small text (12-16px) | Excellent quality | Noticeable aliasing |
| DPR handling | Built-in by browser | Via ctx.scale() — correct |

The editor's DPR handling (`ctx.scale(dpr, dpr)`) is correctly applied
and OpenType.js path drawing benefits from it.

The POC page appears sharper because it renders at 48px (larger font size),
where aliasing is much less visible. At the editor's typical 12-16px,
the difference is pronounced.

### Solution: Script-Aware Smart Routing (Planned)
Only route text that **needs** complex shaping (Arabic, Devanagari, Thai, etc.)
through ShapeEngine. Latin/CJK text continues using native `fillText()` for
superior quality. See `.ai/decisions/shaping-roadmap.md` for details.

## Architecture Decisions

### Font Variant Resolution
- Composite keys: `"FontName"`, `"FontName|bold"`, `"FontName|italic"`, `"FontName|boldItalic"`
- Graceful fallback: if boldItalic unavailable, tries bold → italic → regular
- Lazy loading: fonts loaded on first use, re-render triggered when ready

### Cache Invalidation
- `cacheMeasureText` cleared when ShapeEngine fonts finish loading
- Ensures stale Canvas API measurements are replaced with ShapeEngine measurements
- Critical for correct layout after async font load

## Verification
- Debug console.log/console.warn statements cleaned up
- Error logging preserved as console.warn for init/loading failures

## Next Session Tasks
1. Implement script-aware smart routing (see roadmap)
2. Add CSS `@font-face` registration for ShapeEngine fonts
3. Performance benchmarking
4. Interactive testing with Arabic/Devanagari text
