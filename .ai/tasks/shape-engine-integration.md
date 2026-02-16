# Active Tasks - Shape Engine Integration

**Last Updated**: 2026-02-16
**Current Phase**: Step 4 — Mixed-Direction Interaction (Phase 7)

## Legend
- `[ ]` Not Started
- `[~]` In Progress
- `[x]` Completed
- `[!]` Blocked

---

## Overview

**Total Tasks**: ~110+ tasks across 13 phases  
**Latest Update** (2026-02-16):
- Arabic line breaking fixed: word-backtracking + unterminated word handling
- BiDi cursor/hit-testing/selection fixed: isBidiMixed guard skips mirror formula
- RTL detection added for wrap-created rows at end of content
- Overall progress: ~55% complete

**Key Features Now Covered**:
✅ Auto-direction detection (Google Docs-like behavior)  
✅ Dynamic direction switching as user types  
✅ Direction toolbar controls  
✅ Keyboard shortcuts for direction  
✅ Edge cases for mixed BiDi text  
✅ Empty line direction inheritance  
✅ Measurement–rendering consistency  

---

## Phase 0: POC (Proof of Concept)
**Goal**: Validate the technical approach

### Tasks
- [x] **0.1** - Research and select HarfBuzzJS distribution
  - Selected `harfbuzzjs` v0.8.0 (official HarfBuzz WASM build)
  - 3.21 MB unpacked, MIT license, WASM-based
  - Decision: Use official harfbuzzjs package via npm
  
- [x] **0.2** - Research and select OpenType.js version
  - Selected `opentype.js` v1.3.4
  - Supports glyph path extraction, font parsing, Canvas drawing
  - Arabic text rendering supported via PR #359 #361

- [x] **0.3** - Create minimal POC environment
  - Created `src/editor/core/shaping/` directory structure
  - Added POC test page (`src/poc/poc-shaping.html`)
  - Set up TypeScript interfaces

- [x] **0.4** - Implement basic HarfBuzz integration
  - ShapeEngine class with HarfBuzz WASM loading
  - Font loading into both HarfBuzz (shaping) and OpenType.js (paths)
  - Text shaping with configurable direction/script/language/features
  - **Fix**: Vite CJS/WASM compat issue — switched from `import()` to static 
    script loading (`public/harfbuzz/`) + global functions
  - POC page confirmed: "ShapeEngine initialized successfully!"

- [x] **0.5** - Render shaped glyphs to Canvas
  - Extract glyph paths from OpenType.js ✅
  - Draw glyph paths to Canvas at correct positions ✅
  - Verified: rendering works, but inherent quality difference vs native fillText()
    (see `.ai/decisions/shaping-roadmap.md` for analysis)

- [x] **0.6** - Test RTL text direction
  - Shape RTL text run ✅
  - Render right-to-left ✅
  - Cursor positions need Phase 5 work

- [ ] **0.7** - Performance benchmark
  - Measure shaping time for various text lengths
  - Measure rendering time vs. current Canvas API
  - Document performance characteristics

- [ ] **0.8** - Document POC findings
  - Create `.ai/sessions/2026-02-04-poc-results.md`
  - Decision: Go/No-Go for full integration
  - Update ADR with findings

---

## Phase 1: Foundation
**Goal**: Add direction-aware interfaces
**Status**: Audited — most tasks completed implicitly in Phases 2–5A

### Tasks
- [x] **1.1** - Define TextRun interface
  - Already exists as `ITextRun` in `src/editor/core/shaping/interface/ShapeEngine.ts`
  - Fields: text, direction, script, language, startIndex, endIndex

- [x] **1.2** - Define ShapeResult interface
  - Already exists as `IShapeResult` in `src/editor/core/shaping/interface/ShapeEngine.ts`
  - Fields: glyphs (IGlyphInfo[]), direction, totalAdvance

- [ ] **1.3** - Add Unicode BiDi utilities *(deferred — needed for mixed LTR/RTL on same line)*
  - Full UAX#9 algorithm not yet needed for pure RTL paragraphs
  - Will be required when implementing mixed-direction row layout

- [x] **1.4** - Script detection utility
  - Implemented in `src/editor/utils/unicode.ts`
  - `needsComplexShaping()` — binary-search over 27 Unicode ranges
  - `detectScript()` — returns ISO 15924 tags (Arab, Deva, Latn, etc.)
  - Handles common characters (ASCII passthrough)

- [x] **1.5** - Auto-direction detection utilities
  - `detectDirection()` in `unicode.ts` — first-strong-char algorithm
  - Used in `computeRowList()` to auto-set RTL alignment
  - Empty paragraph handling via row direction inheritance

- [ ] **1.6** - Direction detection algorithms *(deferred — needed for mixed BiDi)*
  - First-strong-char detection done (sufficient for pure RTL)
  - Full UAX#9 P2-P3 with weak/neutral char resolution deferred

- [x] **1.7** - Update existing interfaces
  - `isRTL?: boolean` on `IRow` (Row.ts)
  - `isRTL?: boolean` on `IElementPosition` (Element.ts)
  - Propagated in `computePageRowPosition()` (Position.ts)
  - `directionMode` deferred until UI controls (Phase 6.5)

- [ ] **1.8** - Write unit tests *(deferred)*

---

## Phase 2: Shaping Engine
**Goal**: Implement core text shaping

### Tasks
- [x] **2.1** - Create ShapeEngine class
  - Singleton pattern (ShapeEngine.getInstance())
  - Initialize HarfBuzz via dynamic import
  - Manage font loading (dual: HarfBuzz + OpenType.js)

- [x] **2.2** - Implement font management
  - Load OpenType fonts via fetch + ArrayBuffer
  - Create HarfBuzz font instances (blob → face → font)
  - Cache loaded fonts in Map<fontId, LoadedFont>

- [x] **2.3** - Implement text shaping method
  ```typescript
  shapeText(
    text: string,
    fontId: string,
    fontSize: number,
    options?: IShapeOptions
  ): IShapeResult
  ```

- [x] **2.4** - Add feature support
  - Features passed as comma-separated string to HarfBuzz
  - Supports all OpenType features (liga, calt, kern, etc.)
  - Configurable per shapeText() call

- [x] **2.5** - Implement glyph positioning
  - Convert HarfBuzz positions to Canvas coords via scaleFactor
  - scaleFactor = fontSize / unitsPerEm
  - Handles xAdvance, yAdvance, xOffset, yOffset

- [x] **2.6** - Add shaping cache
  - Cache key: text|fontId|fontSize|direction|features|script|language
  - LRU eviction (delete oldest Map entry)
  - Max 1000 entries

- [ ] **2.7** - Write unit tests
  - Test shaping simple LTR text
  - Test shaping RTL Arabic text
  - Test cache functionality
  - Test feature application

---

## Phase 3: Draw Integration
**Goal**: Connect shaping engine with existing draw system

### Tasks
- [x] **3.1** - Analyze current Draw.ts architecture
  - Documented current text rendering flow (TextParticle.record → _render → ctx.fillText)
  - Identified integration points (measureText, _render in TextParticle)
  - Planned minimal invasive changes with feature flag + fallback

- [x] **3.2** - Add IShapingOption interface & feature flag
  - Created `src/editor/interface/Shaping.ts` (IShapingOption, IFontMapping)
  - Added `shaping` option to IEditorOption
  - Created `src/editor/dataset/constant/Shaping.ts` (default: disabled)
  - Merged in option.ts mergeOption()
  - Exported IShapingOption, IFontMapping from editor index

- [x] **3.3** - Add font registry to ShapeEngine
  - Added fontRegistry Map for CSS font name → URL mapping
  - registerFont(), registerFontMapping(), isFontRegistered()
  - ensureFontLoaded() with dedup loading promises
  - isFontReady() for synchronous hot-path checks

- [x] **3.4** - Initialize ShapeEngine in Draw
  - Import ShapeEngine in Draw.ts
  - Added _initShapeEngine() method
  - Fire-and-forget async init (fonts load in background)
  - Auto re-render when fonts are loaded
  - Fallback to Canvas API until fonts are ready

- [x] **3.5** - Add fallback mechanism
  - _isShapingReady() checks: enabled + initialized + font loaded
  - Falls back to Canvas API when any condition is false
  - Zero impact on existing functionality when shaping disabled

- [ ] **3.6** - Write integration tests
  - Test LTR text still works
  - Test RTL text works with shaping
  - Test fallback mechanism

---

## Phase 3.5: Rendering Quality (NEW)
**Goal**: Improve ShapeEngine rendering quality for Latin text
**Reference**: `.ai/decisions/shaping-roadmap.md`

### Tasks
- [x] **3.5.1** - Script detection utility
  - Created `src/editor/utils/unicode.ts`
  - `needsComplexShaping(text)` with binary-search over 27 Unicode ranges
  - `detectScript(text)` returns ISO 15924 tags (Arab, Deva, Latn, etc.)
  - `detectDirection(text)` returns 'ltr'/'rtl' from first strong char

- [x] **3.5.2** - Smart routing in TextParticle
  - Added `_shouldUseShaping()` method — gates on `forceShaping` OR `needsComplexShaping()`
  - `measureText()` uses ShapeEngine only for complex scripts
  - `_render()` uses ShapeEngine only for complex scripts
  - Latin/CJK always uses native Canvas API (sharper rendering)
  - Added `forceShaping` option to `IShapingOption`

- [x] **3.5.3** - CSS @font-face registration
  - `_registerCSSFontFace()` auto-registers loaded fonts as CSS @font-face
  - `_parseFontIdForCSS()` maps composite keys to CSS weight/style descriptors
  - Uses FontFace API: `new FontFace(family, buffer, descriptors)`
  - Ensures native fillText() can render with ShapeEngine-loaded fonts

- [x] **3.5.4** - TrueType hinting for path rendering
  - Enabled `{hinting: true}` in OpenType.js `getPath()` calls
  - Passes font reference for proper hinting instruction execution
  - Aligns glyph outlines to pixel grid at small sizes (12-16px)
  - Evaluated Gemini's "glyph-by-glyph fillText" suggestion — rejected
    (glyphToCharCode doesn't exist; shaped Arabic glyphs have no Unicode mapping)

- [x] **3.5.5** - Test Arabic rendering quality & unified rendering gateway
  - Added Amiri font family to fontMapping (regular/bold/italic/boldItalic)
  - Added Arabic sample text + mixed-script sample to mock data
  - Created `TextParticle.renderText()` — single rendering gateway
  - Updated SuperscriptParticle, SubscriptParticle, HyperlinkParticle,
    LabelParticle to route through `renderText()` instead of `ctx.fillText()`
  - Created `.ai/TESTING-CONSTRAINTS.md` — comprehensive validation checklist
  - Architecture invariant: no particle calls `ctx.fillText()` directly

---

## Phase 4: TextParticle Update
**Goal**: Update text rendering with shaping support

### Tasks
- [x] **4.1** - Analyze TextParticle.ts
  - Documented: measureText uses ctx.measureText with caching
  - Documented: _render uses ctx.fillText, record batches same-style chars
  - Identified change points: measureText (width), _render (draw glyphs)

- [x] **4.2** - Add shaping path to TextParticle measureText
  - Added _getElementFontName(), _getElementFontSize() helpers
  - Added _isShapingReady() checks (enabled + initialized + font loaded)
  - measureText: Uses ShapeEngine.getShapedWidth() for width
  - Canvas API still used for vertical metrics (ascent/descent)
  - Results cached in same cacheMeasureText Map

- [x] **4.3** - Add shaping path to TextParticle _render
  - record() now tracks curFont (CSS font name)
  - _render() uses ShapeEngine.shapeText() + renderGlyphs() when ready
  - Added _parseFontSize() to extract px size from CSS font string
  - Falls back to ctx.fillText() when shaping unavailable

- [x] **4.3.1** - Bold/italic font variant support
  - Added _resolveShapingFontId() — resolves element bold/italic to font ID
  - ShapeEngine.resolveFontId() with fallback chain (boldItalic→bold→italic→base)
  - record() detects font/style changes and flushes text runs
  - IFontMapping extended with boldUrl, italicUrl, boldItalicUrl
  - Downloaded NotoSans Bold, Italic, BoldItalic font files

- [x] **4.3.2** - Lazy font loading on font-switch
  - _isShapingReady() triggers ensureShapingFont() for registered but unloaded fonts
  - pendingFontLoads Set prevents duplicate lazy-load triggers
  - Cache invalidation on font load (cacheMeasureText.clear())
  - Auto re-render when lazy-loaded font becomes available

- [ ] **4.4** - Handle partial styling (future)
  - Split styled runs properly
  - Preserve shaping across style boundaries
  - Render styled clusters correctly

---

## Phase 4.5: Contextual Measurement (NEW)
**Goal**: Fix per-element Arabic measurement to use contextual (connected) widths
**Problem**: Each Arabic character was measured individually (isolated form width ~8px each), but rendered connected (~6px each). Sum of isolated widths ≠ rendered width.

### Tasks
- [x] **4.5.1** - Add `getPerClusterAdvances()` to ShapeEngine
  - Shapes full text, uses cluster IDs to map glyph advances back to characters
  - Returns Map<charIndex, contextualWidth> for each source character
  - Handles ligatures (multi-char → single glyph)

- [x] **4.5.2** - Add `precomputeContextualWidths()` to TextParticle
  - Scans element list and groups consecutive complex-script same-font elements
  - Shapes each group as a unit via HarfBuzz
  - Distributes per-cluster advances back to individual elements
  - Stores contextual widths in `Map<IElement, number>` by reference

- [x] **4.5.3** - Wire precompute into `computeRowList` (Draw.ts)
  - Called before the main element iteration loop
  - Only activates when shaping is enabled and engine is initialized
  - Zero cost for non-complex-script documents

- [x] **4.5.4** - Update `measureText()` to use precomputed widths
  - Checks `contextualWidths.get(element)` before cache or ShapeEngine fallback
  - Still uses Canvas API for vertical metrics (ascent/descent)
  - Falls through to existing paths for non-precomputed elements

- [ ] **4.5.5** - Write measurement tests (deferred)

---

## Phase 4.6: Arabic Word-Break Fix (NEW — completed)
**Goal**: Prevent mid-word line breaks in Arabic text

### Tasks
- [x] **4.6.1** - Add Arabic ranges to LETTER_CLASS
  - Added `ARABIC` to `LETTER_CLASS` in `Common.ts`
  - Ranges: U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF, U+FE70–U+FEFF
  - Auto-extends `letterClass` in Draw constructor when shaping enabled
  - Makes `WORD_LIKE_REG` and `LETTER_REG` recognize Arabic as word chars

---

## Phase 4.7: Font Fallback for Complex Scripts (NEW — completed)
**Goal**: Auto-route Arabic text through ShapeEngine even with non-Arabic fonts

### Tasks
- [x] **4.7.1** - Add `complexScriptFallback` option
  - Added to `IShapingOption` interface (default: 'Amiri')
  - Added to `defaultShapingOption` constant
- [x] **4.7.2** - Add `resolveWithFallback()` to ShapeEngine
  - Tries requested font first, then complexScriptFallback
  - Works with bold/italic variant resolution
- [x] **4.7.3** - Update `_resolveShapingFontId()` with fallback
  - Now accepts optional `text` parameter
  - For complex scripts, auto-falls back to configured fallback font
  - Updated `_render()` to re-resolve font with accumulated text

---

## Phase 5.5: RTL Paragraph Alignment (NEW — completed)
**Goal**: Auto-right-align paragraphs with RTL content

### Tasks
- [x] **5.5.0** - Auto-detect RTL rows and set alignment
  - In `computeRowList()` row-end logic, detects RTL via `detectDirection()`
  - Sets `rowFlex: RowFlex.RIGHT` when no explicit alignment and text is RTL
  - Imported `detectDirection` from `unicode.ts` into Draw.ts
  - Users can still override with explicit alignment
  - Sets `curRow.isRTL = true` alongside alignment

---

## Phase 5A: Measurement–Rendering Consistency (NEW — completed)
**Goal**: Fix Arabic word spacing gaps caused by measurement/rendering mismatch

### Root Cause
`precomputeContextualWidths()` shapes the full contextual group (Arabic words + spaces).
`drawRow()` renders via `record()`/`complete()` batching, but non-group characters (ZWSP)
and punctuation splits caused the batch text to differ from what was shaped → cache miss →
re-shaping with different per-cluster advances → visible spacing gaps.

### Tasks
- [x] **5A.1** - Add `flushIfNotContextual()` to TextParticle
  - Flushes pending non-complex-script text when entering a contextual group
  - Prevents ZWSP and other non-group chars from polluting the Arabic batch
  
- [x] **5A.2** - Add contextual batch protection in `drawRow()`
  - Elements with `hasContextualRenderInfo()` skip punctuation/width splitting
  - Only `letterSpacing` forces a split within contextual groups
  - Calls `flushIfNotContextual()` before recording contextual elements

- [x] **5A.3** - Store per-element glyph data in `_processContextualGroup()`
  - Added `IContextualRenderInfo` interface (glyphs, fontId, fontSize)
  - Maps each HarfBuzz glyph to its source element via cluster IDs
  - Stored in `contextualRenderInfo` Map for batch boundary detection

- [x] **5A.4** - Add whitespace group continuation
  - Spaces/tabs continue active contextual group
  - Ensures space widths from HarfBuzz match rendering font

- [x] **5A.5** - Add utility methods
  - `hasContextualRenderInfo(element)` — checks for precomputed glyph data
  - `renderContextualElement()` — renders element from stored glyphs (utility, 
    not used in main render path due to RTL visual ordering requirement)

### Key Insight — Per-Element Rendering Breaks RTL
`renderGlyphs()` always draws left-to-right. For RTL, HarfBuzz returns glyphs in
visual order, so the batch approach works. Per-element rendering would place
logical-first elements at visual-left position, breaking RTL layout.

---

## Phase 5B: Arabic Whitespace Accumulation Fix (NEW — completed)
**Goal**: Fix growing whitespace on right side of Arabic text during typing
**Commit**: `9360cfba`

### Root Cause
`contextualWidths`/`contextualRenderInfo` maps on TextParticle are shared singleton
state. Each `computeRowList` call (header, footer, table cells) cleared these maps
via `precomputeContextualWidths()`. Table before Arabic text → table's recursive
`computeRowList` cleared Arabic contextual data mid-iteration.

### Tasks
- [x] **5B.1** - Add `clearContextualCache()` public method to TextParticle
  - Clears both `contextualWidths` and `contextualRenderInfo` maps
  - Single public API for cache lifecycle management

- [x] **5B.2** - Remove `.clear()` from `precomputeContextualWidths()`
  - Maps now accumulate across multiple `computeRowList` calls
  - Each call adds its contextual data without destroying previous entries

- [x] **5B.3** - Call `clearContextualCache()` once per render cycle
  - Added to `Draw.render()` before any `computeRowList` calls
  - Ensures fresh state per frame without mid-frame data loss

---

- [ ] **4.5** - Write rendering tests
  - Test Arabic text rendering
  - Test styled text rendering
  - Test mixed LTR/RTL rendering

---

## Phase 5: Row Computation
**Goal**: Character-level layout for mixed-direction text

### Tasks
- [x] **5.1** - Analyze row/line breaking logic
  - Documented current word-based breaking (WORD_LIKE_REG + measureWord)
  - Identified Arabic line break bug: measureWord returns null endElement
  - Fixed word-wrap backtracking for mid-word overflow

- [ ] **5.2** - Implement character position tracking
  - Track logical position (in text)
  - Track visual position (on canvas)
  - Map between logical and visual

- [x] **5.3** - Update line breaking
  - Use character metrics from shaping (contextual widths via precompute)
  - Handle cluster boundaries (don't break ligatures) — LETTER_CLASS.ARABIC
  - Word-backtracking moves partial words to next row on overflow
  - RTL detection on wrap-created rows at end of content

- [x] **5.4** - Handle mixed direction runs
  - LTR run followed by RTL run — BiDi visual ordering via bidi-js
  - Proper visual ordering — bidiVisualX in Position.ts
  - Correct cursor positions at boundaries — isBidiMixed flag on positions

- [ ] **5.5** - Write layout tests
  - Test simple LTR line breaking
  - Test RTL line breaking
  - Test mixed LTR/RTL line breaking

---

## Phase 5.5: BiDi Integration
**Goal**: Full bidirectional paragraph handling

### Tasks
- [x] **5.5.1** - Implement Unicode BiDi algorithm
  - Integrated `bidi-js` library (UAX#9 conformant, Unicode 13.0.0)
  - Created `src/editor/utils/bidi.ts` with full analysis pipeline
  - Resolve embedding levels via `computeEmbeddingLevels()`
  - Reorder runs for display via `computeVisualOrder()`

- [x] **5.5.2** - Update paragraph layout
  - Apply BiDi algorithm to paragraphs in `computeRowList()`
  - Handle nested embeddings — bidi-js handles UAX#9 nesting
  - `bidiVisualX` pre-computed in `computePageRowPosition()`

- [x] **5.5.3** - Handle neutral characters
  - Spaces between LTR and RTL — resolved by bidi-js
  - Punctuation resolution — resolved by bidi-js
  - Number handling in RTL context — resolved by bidi-js

- [ ] **5.5.4** - Dynamic direction handling
  - Auto-detect direction as user types
  - Switch direction on new empty line (like Google Docs)
  - Maintain direction in mixed BiDi text (English then Arabic)
  - Direction inheritance rules for new paragraphs

- [ ] **5.5.5** - Direction state management
  - Track paragraph direction mode (auto/manual)
  - Update direction on content change
  - Handle backspace/delete at paragraph boundaries
  - Preserve manual overrides when appropriate

- [ ] **5.5.6** - Write BiDi tests
  - Test simple BiDi cases
  - Test nested embeddings
  - Test edge cases (all from UAX#9 test suite)
  - Test auto-direction switching scenarios
  - Test mixed content direction handling

---

## Phase 6: Cursor & Selection — RTL Interaction ⚠️ REVERTED
**Goal**: Make cursor, hit testing, arrow keys, and text input work correctly for RTL text
**Status**: REVERTED — position reversal broke rendering (text overflow past margin)

### Architecture Note — LESSON LEARNED
`drawRow()` reads x,y from `positionList` for rendering. Reversing positions for
cursor support also reversed the rendering anchor. Position system serves dual purpose
(rendering + cursor), so coordinates MUST stay in LTR logical order.

### What's Kept
- [x] **6.1** - `isRTL` flag on IRow and IElementPosition (data only, no behavior)

### What's Reverted
- **6.2** - Position coordinate reversal (broke rendering)
- **6.3** - Cursor placement flip
- **6.4** - Hit-testing inversion
- **6.5** - Arrow key swap
- **6.6** - CursorAgent `dir` attribute

### Correct Future Approach
Keep positions LTR. For cursor/hit-testing, interpret position coordinates
for RTL text without modifying them. Cursor goes at `leftTop[0]` of the
NEXT element (or row start), not by reversing this element's coordinates.

---

## Phase 6.5: UI Controls & Direction Management
**Goal**: User interface for direction control

### Tasks
- [ ] **6.5.1** - Add direction toggle to toolbar
  - LTR button
  - RTL button
  - Auto-detect option (default)
  - Visual indicators for current direction

- [ ] **6.5.2** - Implement direction commands
  - Command: setParagraphDirection(direction: 'ltr' | 'rtl' | 'auto')
  - Apply to current paragraph
  - Apply to selection (multiple paragraphs)
  - Keyboard shortcuts (Ctrl+Shift+X for LTR, Ctrl+Shift+R for RTL)

- [ ] **6.5.3** - Visual direction indicators
  - Direction marker in editor (subtle indicator)
  - Cursor direction indicator
  - Selection direction clarity
  - Alignment follows direction (RTL = right-aligned)

- [ ] **6.5.4** - User preferences
  - Default direction mode (auto/ltr/rtl)
  - Default direction for new documents
  - Auto-detection sensitivity settings
  - Remember per-document direction preferences

- [ ] **6.5.5** - Context menu integration
  - Right-click menu option for direction
  - Show current direction state
  - Quick toggle between LTR/RTL/Auto

- [ ] **6.5.6** - Write UI tests
  - Test toolbar buttons work correctly
  - Test keyboard shortcuts
  - Test direction changes update UI
  - Test multi-paragraph direction changes

---

## Phase 7: Cursor & Hit Testing for Complex Scripts
**Goal**: Accurate cursor placement, hit testing, selection, and keyboard navigation for RTL/Arabic text
**Status**: In Progress — 7.2, 7.3, 7.5 core tasks done
**Constraint**: Positions MUST remain in LTR logical order (rendering depends on this)
**Key Technique**: Mirror formula `visualX = rowStart + rowEnd - logicalX` applied at read-time

### 7.1 — Cluster-Aware Coordinate Mapping
Build a mapping of `charIndex → { visualX, width }` for each contextual group,
reused by cursor, hit testing, and selection.

- [ ] **7.1.1** - Add `IClusterCoordinate` interface
  ```typescript
  interface IClusterCoordinate {
    charIndex: number      // Index in the contextual group
    element: IElement      // Source element
    visualStart: number    // Visual X start (relative to group start)
    visualEnd: number      // Visual X end
    width: number          // Visual width of this cluster
    isLigature: boolean    // Multiple chars share this cluster
  }
  ```

- [ ] **7.1.2** - Build cluster coordinate map in `_processContextualGroup()`
  - For each glyph, map `cluster → { visualStart, visualEnd }` in visual order
  - Handle ligatures: when N chars share 1 cluster, split width proportionally
  - Handle RTL: HarfBuzz returns glyphs in visual order (rightmost char first)
  - Store result on contextual group for cursor/hit-testing use

- [ ] **7.1.3** - Add `getClusterCoordinates(element)` public method
  - Returns the cluster coordinate data for cursor and hit-testing use
  - Serves as the single source of truth for "where is character X visually"

- [ ] **7.1.4** - Edge case: diacritics and combining marks
  - Combining marks (U+0610–U+061A, U+064B–U+065F) share cluster with base char
  - Must not create separate cursor positions for marks
  - Width attribution: full advance goes to the base character

- [ ] **7.1.5** - Edge case: Lam-Alef ligature
  - لا (Lam+Alef) renders as single glyph
  - Split the ligature width 50/50 between the two source chars
  - Cursor between them should be at the midpoint

### 7.2 — RTL Cursor Placement
Position the cursor correctly for RTL text without modifying position coordinates.

- [ ] **7.2.1** - Analyze current cursor drawing
  - Document `Cursor.ts` / `drawCursor()` / `CursorAgent` flow
  - Identify where cursor x,y is determined
  - map the flow: position → cursor x → cursor DOM element

- [x] **7.2.2** - Implement RTL cursor offset
  - Mirror formula: `cursorLeft = rowStart + rowEnd - ltrCursorLeft`
  - Scans positionList for row's first/last letter to find bounds
  - Both normal and hitLineStartIndex cases are mirrored
  - Implemented in `Cursor.ts drawCursor()`

- [ ] **7.2.3** - Cursor visual direction indicator
  - Add subtle directional flag to cursor (e.g. small wedge pointing RTL)
  - CSS-based on `CursorAgent` — use `dir` attribute or class
  - Shows user which direction text will flow from cursor

- [ ] **7.2.4** - Edge case: cursor at LTR/RTL boundary
  - When cursor is between LTR and RTL text, which side shows cursor?
  - Follow UAX#9: cursor affinity based on paragraph direction
  - Test: "Hello مرحبا" — cursor between 'o' and 'م'

- [ ] **7.2.5** - Edge case: cursor at row boundary with RTL
  - Cursor at end of RTL row → should be at visual left
  - Cursor at start of next row → should be at visual right
  - Test wrapping Arabic text

### 7.3 — RTL Hit Testing (Click → Element Index)
Map mouse click coordinates to the correct element for RTL text.

- [ ] **7.3.1** - Analyze current `getPositionByXY()` flow
  - Document how click x,y maps to element index
  - Identify the comparison logic: `x < leftTop[0] + metrics.width/2`
  - Understand `isLastArea` fallback

- [x] **7.3.2** - Implement RTL-aware hit testing
  - Mirror formula applied: `mirrorX = rowStart + rowEnd - x`
  - Direct-hit section: when position isRTL, mirror x and re-scan row
  - Midpoint check uses mirrorX (naturally handles RTL half-char logic)
  - Non-hit fallback: swapped left/right logic for RTL rows
  - Implemented in `Position.ts getPositionByXY()`

- [ ] **7.3.3** - Handle mixed LTR/RTL hit testing
  - Detect which run (LTR or RTL) the click is in
  - Within LTR run: normal left-to-right mapping
  - Within RTL run: reversed mapping
  - At boundaries: use adjacent element's direction

- [ ] **7.3.4** - Edge case: click on ligature
  - Lam-Alef ligature occupies one visual glyph for 2 chars
  - Click on left half → select the visually-left char
  - Click on right half → select the visually-right char
  - Use proportional splitting from 7.1.5

- [x] **7.3.5** - Edge case: click after last char on RTL row
  - RTL non-hit fallback: click right of content → logical start (hitLineStartIndex)
  - Click left of content → logical end (last element index)
  - Uses `lastRightTop[0]` for row end boundary
  - Implemented in `Position.ts` non-hit fallback section

- [ ] **7.3.6** - Edge case: empty row after RTL text
  - Clicking on empty line should respect direction inheritance
  - Cursor placed at visual right for inherited-RTL lines

### 7.4 — Arrow Key Navigation
Make arrow keys work correctly in RTL text.

- [ ] **7.4.1** - Analyze current arrow key handling
  - Document `keydown/index.ts` Left/Right/Up/Down handlers
  - Identify how index is incremented/decremented
  - Understand word-jump (Ctrl+Arrow) logic

- [ ] **7.4.2** - Implement RTL arrow key navigation
  - Arrow-Right in RTL text → move cursor LOGICALLY right (visually left)
  - Arrow-Left in RTL text → move cursor LOGICALLY left (visually right)
  - This matches Windows/Mac convention for Arabic text
  - Do NOT swap keys — logical movement is consistent

- [ ] **7.4.3** - Handle arrow keys at LTR/RTL boundaries
  - Moving from LTR into RTL: visual continuity vs logical continuity
  - Follow OS convention: logical movement stays consistent
  - Test: "Hello مرحبا" — arrow-right past 'o' goes to 'ا' (last logical Arabic char)

- [ ] **7.4.4** - Implement Ctrl+Arrow word jump for Arabic
  - Define word boundaries in Arabic text (space-delimited)
  - Ctrl+Right: jump to end of next word (logical)
  - Ctrl+Left: jump to start of previous word (logical)
  - Handle mixed: jumping from English word to Arabic word

- [ ] **7.4.5** - Implement Home/End for RTL rows
  - Home: cursor to logical start of line (visual right for RTL)
  - End: cursor to logical end of line (visual left for RTL)
  - Match OS convention

- [ ] **7.4.6** - Edge case: Up/Down arrow in RTL text
  - Should maintain approximate visual column position
  - Moving from RTL row to LTR row: map visual x to new row's element
  - Moving from RTL row to RTL row: maintain visual position

### 7.5 — Selection Highlighting for RTL
Draw selection rectangles correctly for RTL and mixed text.

- [ ] **7.5.1** - Analyze current selection rendering
  - Document how selection highlight rectangles are drawn
  - Identify the x, width calculation for highlight rects
  - Understand multi-row selection

- [x] **7.5.2** - RTL selection highlight
  - Mirror formula: `rangeX = rowStart + rowEnd - (rangeRecord.x + rangeW)`
  - Uses first/last position of current row for bounds
  - Width stays the same, only x is mirrored
  - Implemented in `Draw.ts drawRow()` selection rendering section

- [ ] **7.5.3** - Mixed-direction selection
  - Selection spanning LTR + RTL text on same row
  - May produce multiple non-contiguous highlight rects
  - Each directional run gets its own highlight rect

- [ ] **7.5.4** - Shift+Click selection for RTL
  - Click at position A, Shift+click at position B
  - Selection extends between logical A and B
  - Highlight follows visual ordering per-run

- [ ] **7.5.5** - Shift+Arrow selection for RTL
  - Shift+Right extends selection logically right (visually left in RTL)
  - Selection rect updates per-run
  - Test: select partial Arabic word

- [ ] **7.5.6** - Edge case: selection across row boundary in RTL
  - First row: highlight from selection start to visual left edge
  - Middle rows: full row highlight
  - Last row: highlight from visual right edge to selection end

### 7.6 — Mixed LTR/RTL Boundary Handling
Handle the tricky edge cases at script boundaries.

- [ ] **7.6.1** - Direction run segmentation
  - Segment row elements into directional runs (consecutive LTR or RTL)
  - Each run is a self-contained unit for cursor/hit-testing
  - Shared by cursor, hit test, and selection code

- [ ] **7.6.2** - Cursor at run boundary
  - Cursor between LTR and RTL run: which run owns it?
  - Default: cursor belongs to the paragraph direction's run
  - Visual indicator should show which direction new text will go

- [ ] **7.6.3** - Text input at run boundary
  - Typing Arabic at end of English text: starts new RTL run
  - Typing English within Arabic text: starts new LTR run
  - Input direction follows character's script

- [ ] **7.6.4** - Delete/Backspace at boundaries
  - Deleting at LTR→RTL boundary: cursor moves to correct position
  - Backspace from start of RTL run: moves into LTR run
  - Text re-shapes after deletion

- [ ] **7.6.5** - Word selection at boundaries
  - Double-click on Arabic word adjacent to English: selects only Arabic word
  - Double-click on space between scripts: selects the space
  - Word boundary detection respects script boundaries


---

## Phase 8: Polish & Performance
**Goal**: Edge cases, optimization, production readiness

### Tasks
- [ ] **8.1** - Performance optimization
  - Profile shaping performance
  - Optimize cache hit rates
  - Reduce memory allocations
  - Lazy load HarfBuzz if possible

- [ ] **8.2** - Edge case handling
  - Empty strings
  - Very long strings
  - Malformed Unicode
  - Missing fonts
  - Zero-width characters (ZWNJ, ZWJ, etc.)
  - Direction override characters (LRO, RLO, PDF)

- [ ] **8.2.1** - Google Docs-like behavior edge cases
  - New empty line auto-direction based on first character typed
  - Mixed BiDi text: English first keeps LTR, then Arabic
  - Direction persistence when deleting all content
  - Direction at paragraph boundaries (Enter key behavior)
  - Copy-paste with direction preservation
  - Direction handling with numbered/bulleted lists

- [ ] **8.2.2** - Auto-direction edge cases
  - Single character determination (weak vs strong)
  - Spaces-only paragraphs
  - Numbers-only paragraphs
  - Punctuation-only content
  - Emoji and symbols direction handling
  - Mixed script scenarios (Latin + Arabic + numbers)

- [ ] **8.2.3** - User interaction edge cases
  - Cursor position when switching direction mid-typing
  - Selection behavior during direction switch
  - Undo/redo with direction changes
  - Find/replace in RTL text
  - Spell check in RTL languages
  - Auto-complete in RTL context

- [ ] **8.3** - Error handling
  - Graceful degradation
  - Error reporting
  - Debug logging

- [ ] **8.4** - Cross-browser testing
  - Test on Chrome, Firefox, Safari, Edge
  - Handle browser-specific quirks
  - Verify Canvas rendering consistency

- [ ] **8.5** - Documentation
  - Update API documentation
  - Add usage examples
  - Document RTL/BiDi capabilities
  - Migration guide for existing users

- [ ] **8.6** - Accessibility
  - Screen reader support for RTL
  - Keyboard navigation works correctly
  - ARIA attributes if needed

- [ ] **8.6.1** - Internationalization (i18n)
  - UI text for direction controls (translate to multiple languages)
  - RTL UI layout for Arabic/Hebrew users
  - Language-specific keyboard shortcuts
  - Locale-aware direction defaults

- [ ] **8.7** - Bundle size optimization
  - Code splitting for shape engine
  - Tree shaking unused scripts
  - Minimize WASM size

- [ ] **8.8** - Final E2E tests
  - Comprehensive Cypress tests
  - Visual regression tests
  - Performance benchmarks

- [ ] **8.8.1** - Direction-specific E2E tests
  - Test: Type Arabic on new line → direction changes to RTL
  - Test: Type English first, then Arabic → stays LTR
  - Test: Empty line inherits smart direction
  - Test: Manual direction override persists
  - Test: Copy-paste preserves direction
  - Test: Toolbar direction buttons work
  - Test: Keyboard shortcuts work
  - Test: Multi-paragraph direction selection

- [ ] **8.8.2** - Real-world scenario tests
  - Arabic document with embedded English quotes
  - English document with Arabic names/terms
  - Mixed language forms (labels LTR, input RTL)
  - Bi-directional email composition
  - Code snippets in RTL documents
  - URLs in RTL text

---

## Phase 9: RTL Particle Adaptation (NEW)
**Goal**: Make non-text particles direction-aware for RTL languages
**Status**: Not Started
**Priority**: Step 5 (after BiDi foundations and mixed layout)

### Audit Summary
Particle audit identified 4 particles needing RTL changes out of 18 total.
5 particles already handled via `renderText()` gateway. 9 are direction-agnostic.

### 9.1 — ListParticle RTL (High Priority)
- [ ] **9.1.1** - RTL marker position
  - Move bullet/number marker from left side to right side for RTL paragraphs
  - Current: `x = startX - offsetX + tabWidth + baseIndent + levelIndent` (always left)
  - RTL: marker at `rowEnd - tabWidth - baseIndent - levelIndent`
  - Detect RTL from row's `isRTL` flag or `detectDirection()` on list content

- [ ] **9.1.2** - RTL indent direction
  - Current: `row.offsetX` pushes content rightward (indent from left)
  - RTL: indent should push content leftward (indent from right edge)
  - Affects nested list indentation at all levels

- [ ] **9.1.3** - Route list marker text through `renderText()` gateway
  - Current: `ctx.fillText()` at ListParticle.ts (bypasses shaping)
  - Change to `this.draw.getTextParticle().renderText()` for Arabic numerals
  - Affects: ordered list numbers, bullet characters

- [ ] **9.1.4** - In-list checkbox position
  - Current: checkbox drawn at `x - gap` (always left of text)
  - RTL: checkbox should be at right side, text flows leftward from it
  - Affects: task-list style checkboxes within list items

### 9.2 — LineBreakParticle RTL (Medium Priority)
- [ ] **9.2.1** - Mirror arrow icon position for RTL rows
  - Current: arrow is drawn at `x + element.metrics.width` (right end of element)
  - RTL: arrow should appear at left end of the row
  - Check `curRow.isRTL` to determine placement

- [ ] **9.2.2** - Mirror arrow shape direction
  - Current: arrow points left (↵ standard LTR line-break symbol)
  - RTL: arrow should point right (mirrored ↵)
  - Hard-coded path at LineBreakParticle.ts lines 38-47 needs conditional mirroring

### 9.3 — TableParticle RTL (Medium Priority)
- [ ] **9.3.1** - RTL column ordering
  - Current: `computeRowColInfo()` lays out columns left-to-right (`preX += width`)
  - RTL tables: column 0 should start at right edge, `preX -= width`
  - Detect table direction from first cell content or explicit table direction

- [ ] **9.3.2** - RTL table border drawing
  - Border rendering uses `td.x * scale + startX` — should follow whatever
    `computeRowColInfo` produces, but verify edge cases
  - Cell selection/highlight rectangles may need mirroring

- [ ] **9.3.3** - RTL table cell content alignment
  - Inner content already gets own `drawRow()` → direction auto-detected
  - Verify text within RTL table cells renders correctly
  - Test: Arabic text in table cells

### 9.4 — PageBreakParticle RTL (Low Priority)
- [ ] **9.4.1** - Route label text through `renderText()` gateway
  - Current: `ctx.fillText()` at PageBreakParticle.ts line 47
  - Change to `this.draw.getTextParticle().renderText()`
  - Only affects Arabic UI localization (label is "Page Break" display name)
  - Centered position is already direction-agnostic

### 9.5 — Verification & Testing
- [ ] **9.5.1** - Add Arabic list items to mock data
  - Ordered list with Arabic numerals
  - Unordered list with Arabic text
  - Nested lists mixing Arabic and English

- [ ] **9.5.2** - Add Arabic table to mock data
  - Table with Arabic column headers
  - Mixed LTR/RTL cell content

- [ ] **9.5.3** - Visual verification against Google Docs
  - Compare list marker positions
  - Compare table column ordering
  - Compare line-break icon placement

---

## Future Enhancements (Backlog)
- [ ] **F.1** - Support for additional complex scripts
  - Devanagari
  - Thai
  - Tibetan
  - etc.

- [ ] **F.2** - Vertical text support
  - Top-to-bottom text
  - Mongolian script

- [ ] **F.3** - Advanced OpenType features
  - Stylistic sets
  - Swash variants
  - Contextual alternates

- [ ] **F.4** - Color fonts
  - COLR/CPAL tables
  - SVG-in-OpenType
  - Bitmap fonts
