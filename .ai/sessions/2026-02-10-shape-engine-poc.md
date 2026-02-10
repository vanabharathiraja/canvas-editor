# Session: Shape Engine POC Implementation

**Date**: 2026-02-10  
**Agent**: GitHub Copilot (Claude Opus 4.6)  
**Phase**: Phase 0 + Phase 2 (POC + Shaping Engine skeleton)

## Summary

Implemented the initial Shape Engine integration using HarfBuzz.js + OpenType.js.
Created a working POC page for interactive testing and validation.

## What Was Done

### 1. Dependencies Installed
- `harfbuzzjs` v0.8.0 — HarfBuzz WASM text shaping library
- `opentype.js` v1.3.4 — OpenType font parser with glyph path extraction
- Removed `bidi-js` (was previously installed, replaced by our approach)
- Installed via `pnpm add harfbuzzjs opentype.js`

### 2. Directory Structure Created
```
src/editor/core/shaping/
├── index.ts                    # Barrel exports
├── ShapeEngine.ts              # Main shaping engine class
├── interface/
│   └── ShapeEngine.ts          # TypeScript interfaces
└── types/
    └── harfbuzz.d.ts           # HarfBuzz.js type declarations
```

### 3. Key Files

#### `src/editor/core/shaping/interface/ShapeEngine.ts`
Core type definitions:
- `TextDirection` — 'ltr' | 'rtl'
- `ITextRun` — Input text run with direction/script/language
- `IGlyphInfo` — Shaped glyph with ID, cluster, advances, offsets
- `IShapeResult` — Full shaping result (glyphs array + totalAdvance)
- `IFontMetrics` — Font unitsPerEm, ascender, descender
- `IShapeCacheKey`, `IOpenTypeFeatures`, `IShapeEngineConfig`

#### `src/editor/core/shaping/types/harfbuzz.d.ts`
Type declarations for harfbuzzjs `hbjs` wrapper API:
- `HBBlob`, `HBFace`, `HBFont`, `HBBuffer` — wrapped HarfBuzz objects
- `HBGlyphResult` — shape output (g, cl, ax, ay, dx, dy, flags)
- `HBjs` — main API (createBlob, createFace, createFont, createBuffer, shape)

#### `src/editor/core/shaping/ShapeEngine.ts`
Singleton class with:
- `init()` — Loads HarfBuzz WASM via dynamic import
- `loadFont(fontId, fontUrl)` — Loads font into both HarfBuzz and OpenType.js
- `shapeText(text, fontId, fontSize, options)` — Shapes text, returns glyph positions
- `renderGlyphs(ctx, result, fontId, fontSize, x, y, color)` — Draws glyph paths to Canvas
- `getShapedWidth()` — Convenience for text width measurement
- LRU shaping cache (max 1000 entries)
- Proper resource cleanup via `destroy()`

#### `src/poc/poc-shaping.html` + `src/poc/poc-shaping.ts`
Interactive POC page with:
- Font file upload or URL loading
- Text input with direction (LTR/RTL) control
- Font size selection
- OpenType feature string input
- Side-by-side comparison: Canvas fillText vs ShapeEngine rendering
- Glyph info table showing shaped glyph details
- Performance timing (shaping + rendering)

### 4. Vite Config Updated
- Added multi-page input configuration for POC page
- POC accessible at `/src/poc/poc-shaping.html` during dev

## Architecture Decisions

### HarfBuzz.js Loading Strategy
- **CRITICAL**: harfbuzzjs is a CJS module with WASM that Vite v2.9.18 cannot pre-bundle.
  Dynamic `import('harfbuzzjs')` fails with "Failed to fetch dynamically imported module".
- **Solution**: Copy `hb.wasm`, `hb.js`, `hbjs.js` from `node_modules/harfbuzzjs/` to `public/harfbuzz/`.
  These are served as static files by Vite's dev server.
- `ShapeEngine._doInit(basePath)` injects `<script>` tags for `hb.js` and `hbjs.js`.
  - `hb.js` exposes global `createHarfBuzz()` (Emscripten async WASM loader)
  - `hbjs.js` exposes global `hbjs()` (HarfBuzz JS wrapper)
- `createHarfBuzz({locateFile: (file) => basePath + '/' + file})` resolves `hb.wasm` path correctly.
- `hbjs(hbModule)` returns the typed `HBjs` API object.
- **NOTE**: If `harfbuzzjs` is updated via pnpm, the files in `public/harfbuzz/` must be
  manually re-copied from `node_modules/harfbuzzjs/`.
- OpenType.js uses a standard static ESM import (it has a `module` field in package.json).

### Dual Font Loading
- **HarfBuzz**: Font data loaded as blob → face → font for shaping
- **OpenType.js**: Same font data parsed for glyph path extraction
- Both kept in a `LoadedFont` map keyed by font ID

### Rendering Pipeline
1. User provides text + font + options → `shapeText()`
2. HarfBuzz shapes text → glyph IDs + positions (in font units)
3. Positions scaled by `fontSize / unitsPerEm`
4. `renderGlyphs()` iterates glyphs, gets OpenType.js paths, draws to Canvas

### Caching
- Cache key: `text|fontId|fontSize|direction|features|script|language`
- Simple LRU with Map (delete oldest when full)
- Max 1000 entries

## How to Test

1. `pnpm dev` (or `npx vite`)
2. Open `http://localhost:3000/canvas-editor/src/poc/poc-shaping.html`
3. Load a font file (e.g., NotoSansArabic-Regular.ttf)
4. Enter text (e.g., "مرحبا بالعالم") 
5. Select direction (RTL for Arabic)
6. Click "Shape & Render"
7. Compare Canvas fillText output with ShapeEngine output

## Recommended Test Fonts
- [Noto Sans Arabic](https://fonts.google.com/noto/specimen/Noto+Sans+Arabic) — For Arabic RTL testing
- [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans) — For Latin LTR baseline
- [Noto Sans Hebrew](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) — For Hebrew RTL
- Any `.ttf` or `.otf` file

## Files Modified
- `package.json` — Added harfbuzzjs, opentype.js dependencies
- `pnpm-lock.yaml` — Updated lockfile
- `vite.config.ts` — Added POC as additional input page

## Files Created
- `src/editor/core/shaping/index.ts`
- `src/editor/core/shaping/ShapeEngine.ts`
- `src/editor/core/shaping/interface/ShapeEngine.ts`
- `src/editor/core/shaping/types/harfbuzz.d.ts`
- `src/poc/poc-shaping.html`
- `src/poc/poc-shaping.ts`
- `public/harfbuzz/hb.wasm` — copied from `node_modules/harfbuzzjs/hb.wasm`
- `public/harfbuzz/hb.js` — copied from `node_modules/harfbuzzjs/hb.js`
- `public/harfbuzz/hbjs.js` — copied from `node_modules/harfbuzzjs/hbjs.js`

## Issues Encountered & Resolved

### WASM Loading Failure (Vite + CJS)
- **Problem**: `import('harfbuzzjs')` caused "Failed to fetch dynamically imported module"
  because Vite v2.9.18 cannot properly pre-bundle CJS modules with WASM file dependencies.
  The CJS→ESM conversion moved `hb.js` into `.vite/deps/` but `hb.wasm` wasn't copied alongside.
- **Fix**: Bypassed Vite's module system entirely for HarfBuzz.
  - Copied the 3 harfbuzz files to `public/harfbuzz/` (served as static assets).
  - Rewrote `ShapeEngine._doInit()` to inject `<script>` tags instead of dynamic import.
  - Changed OpenType.js to a static ESM import (Vite handles `.module` field correctly).
- **Also**: Had to delete `node_modules/.vite/` to clear stale dependency cache references.

## Next Steps
- Test with actual Arabic font to validate shaping output
- Benchmark performance vs native Canvas API
- Document POC results (Phase 0.8)
- If validated, proceed to Phase 1 (Foundation interfaces) and Phase 3 (Draw integration)
