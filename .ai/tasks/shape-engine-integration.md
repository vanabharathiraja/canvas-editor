# Active Tasks - Shape Engine Integration

**Last Updated**: 2026-02-05  
**Current Phase**: Phase 0 - POC

## Legend
- `[ ]` Not Started
- `[~]` In Progress
- `[x]` Completed
- `[!]` Blocked

---

## Overview

**Total Tasks**: ~85+ tasks across 11 phases  
**New Additions** (2026-02-05):
- Phase 1: Added auto-direction detection tasks (1.5, 1.6)
- Phase 5.5: Added dynamic direction handling (5.5.4, 5.5.5)
- **Phase 6.5**: NEW - UI Controls & Direction Management (6 tasks)
- Phase 8: Added comprehensive edge case tasks (8.2.1, 8.2.2, 8.2.3)
- Phase 8: Added i18n tasks (8.6.1)
- Phase 8: Added direction-specific E2E tests (8.8.1, 8.8.2)

**Key Features Now Covered**:
✅ Auto-direction detection (Google Docs-like behavior)  
✅ Dynamic direction switching as user types  
✅ Direction toolbar controls  
✅ Keyboard shortcuts for direction  
✅ Edge cases for mixed BiDi text  
✅ Empty line direction inheritance  

---

## Phase 0: POC (Proof of Concept)
**Goal**: Validate the technical approach

### Tasks
- [ ] **0.1** - Research and select HarfBuzzJS distribution
  - Compare harfbuzz.js implementations (photopea, rustybuzz-wasm, etc.)
  - Evaluate bundle size and browser compatibility
  - Decision: Document choice in ADR
  
- [ ] **0.2** - Research and select OpenType.js version
  - Check latest opentype.js release
  - Verify Canvas integration capabilities
  - Test glyph path extraction

- [ ] **0.3** - Create minimal POC environment
  - Create `src/editor/core/shaping/` directory structure
  - Add POC test page (`poc-shaping.html`)
  - Set up minimal TypeScript interfaces

- [ ] **0.4** - Implement basic HarfBuzz integration
  - Load HarfBuzz WASM/JS in browser
  - Create font blob from OpenType.js
  - Shape simple Arabic text ("مرحبا")

- [ ] **0.5** - Render shaped glyphs to Canvas
  - Extract glyph paths from OpenType.js
  - Draw glyph paths to Canvas at correct positions
  - Verify visual output matches expected Arabic shaping

- [ ] **0.6** - Test RTL text direction
  - Shape RTL text run
  - Render right-to-left
  - Verify cursor positions make sense

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

### Tasks
- [ ] **1.1** - Define TextRun interface
  ```typescript
  interface TextRun {
    text: string
    direction: 'ltr' | 'rtl'
    script: string
    startIndex: number
    endIndex: number
  }
  ```

- [ ] **1.2** - Define ShapeResult interface
  ```typescript
  interface ShapeResult {
    glyphs: GlyphInfo[]
    direction: 'ltr' | 'rtl'
    advance: number
  }
  ```

- [ ] **1.3** - Add Unicode BiDi utilities
  - Implement Unicode BiDi algorithm (or use library)
  - Detect paragraph direction
  - Split text into directional runs

- [ ] **1.4** - Script detection utility
  - Detect script for each character (Latin, Arabic, Devanagari, etc.)
  - Split text into script runs
  - Handle common characters (spaces, punctuation)

- [ ] **1.5** - Auto-direction detection utilities
  - Detect paragraph direction from first strong character
  - Detect direction from content (strong directional chars)
  - Handle empty paragraphs (inherit from previous or default)
  - Support manual direction override

- [ ] **1.6** - Direction detection algorithms
  - Implement UAX#9 P2-P3 (paragraph level detection)
  - Handle weak characters (spaces, punctuation)
  - Handle neutral characters
  - Support direction estimation for mixed content

- [ ] **1.7** - Update existing interfaces
  - Add `direction` field to relevant interfaces
  - Add `directionMode` field ('auto' | 'ltr' | 'rtl')
  - Update `IElement` interface if needed
  - Ensure backward compatibility

- [ ] **1.8** - Write unit tests
  - Test BiDi run detection
  - Test script detection
  - Test auto-direction detection (various scenarios)
  - Test interface utilities

---

## Phase 2: Shaping Engine
**Goal**: Implement core text shaping

### Tasks
- [ ] **2.1** - Create ShapeEngine class
  - Singleton or factory pattern
  - Initialize HarfBuzz
  - Manage font loading

- [ ] **2.2** - Implement font management
  - Load OpenType fonts
  - Create HarfBuzz font instances
  - Cache loaded fonts

- [ ] **2.3** - Implement text shaping method
  ```typescript
  shapeText(
    run: TextRun,
    font: Font,
    fontSize: number,
    features?: string[]
  ): ShapeResult
  ```

- [ ] **2.4** - Add feature support
  - Common features (liga, calt, kern)
  - Language-specific features (Arabic: init, medi, fina, isol)
  - Feature detection and fallback

- [ ] **2.5** - Implement glyph positioning
  - Convert HarfBuzz positions to Canvas coordinates
  - Handle sub-pixel positioning
  - Account for font scaling

- [ ] **2.6** - Add shaping cache
  - Cache key: (text, font, size, features, direction)
  - LRU eviction policy
  - Cache size limits

- [ ] **2.7** - Write unit tests
  - Test shaping simple LTR text
  - Test shaping RTL Arabic text
  - Test cache functionality
  - Test feature application

---

## Phase 3: Draw Integration
**Goal**: Connect shaping engine with existing draw system

### Tasks
- [ ] **3.1** - Analyze current Draw.ts architecture
  - Document current text rendering flow
  - Identify integration points
  - Plan minimal invasive changes

- [ ] **3.2** - Update BiDiManager
  - Integrate with ShapeEngine
  - Use shaping for RTL text
  - Maintain existing behavior for simple LTR

- [ ] **3.3** - Add fallback mechanism
  - Detect when shaping is needed
  - Fall back to Canvas API for simple text
  - Handle shaping errors gracefully

- [ ] **3.4** - Create rendering helper
  - Convert ShapeResult to drawing commands
  - Handle glyph path drawing vs. font rendering
  - Optimize for performance

- [ ] **3.5** - Write integration tests
  - Test LTR text still works
  - Test RTL text works with shaping
  - Test fallback mechanism

---

## Phase 4: TextParticle Update
**Goal**: Update text rendering with shaping support

### Tasks
- [ ] **4.1** - Analyze TextParticle.ts
  - Document current rendering logic
  - Identify change points
  - Plan refactoring approach

- [ ] **4.2** - Add shaping path to TextParticle
  - Check if text needs shaping
  - Call ShapeEngine when needed
  - Render shaped glyphs

- [ ] **4.3** - Update text metrics calculation
  - Use shaped glyph advances
  - Calculate accurate bounding boxes
  - Handle ligatures and clusters

- [ ] **4.4** - Handle partial styling
  - Split styled runs properly
  - Preserve shaping across style boundaries
  - Render styled clusters correctly

- [ ] **4.5** - Write rendering tests
  - Test Arabic text rendering
  - Test styled text rendering
  - Test mixed LTR/RTL rendering

---

## Phase 5: Row Computation
**Goal**: Character-level layout for mixed-direction text

### Tasks
- [ ] **5.1** - Analyze row/line breaking logic
  - Document current word-based breaking
  - Identify where character metrics are needed
  - Plan transition to character-aware breaking

- [ ] **5.2** - Implement character position tracking
  - Track logical position (in text)
  - Track visual position (on canvas)
  - Map between logical and visual

- [ ] **5.3** - Update line breaking
  - Use character metrics from shaping
  - Handle cluster boundaries (don't break ligatures)
  - Respect BiDi run boundaries

- [ ] **5.4** - Handle mixed direction runs
  - LTR run followed by RTL run
  - Proper visual ordering
  - Correct cursor positions at boundaries

- [ ] **5.5** - Write layout tests
  - Test simple LTR line breaking
  - Test RTL line breaking
  - Test mixed LTR/RTL line breaking

---

## Phase 5.5: BiDi Integration
**Goal**: Full bidirectional paragraph handling

### Tasks
- [ ] **5.5.1** - Implement Unicode BiDi algorithm
  - Full UAX#9 implementation or library integration
  - Resolve embedding levels
  - Reorder runs for display

- [ ] **5.5.2** - Update paragraph layout
  - Apply BiDi algorithm to paragraphs
  - Handle nested embeddings
  - Support explicit directional controls (LRM, RLM, etc.)

- [ ] **5.5.3** - Handle neutral characters
  - Spaces between LTR and RTL
  - Punctuation resolution
  - Number handling in RTL context

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

## Phase 6: Cursor & Selection
**Goal**: Bidirectional cursor navigation

### Tasks
- [ ] **6.1** - Analyze cursor positioning logic
  - Document current cursor code
  - Identify RTL-specific issues
  - Plan logical vs. visual cursor movement

- [ ] **6.2** - Implement logical cursor movement
  - Left/right arrow keys move logically
  - Home/End keys
  - Word boundaries in RTL

- [ ] **6.3** - Implement visual cursor movement
  - Option for visual left/right (if needed)
  - Handle direction boundaries
  - Cursor shape/direction indicator

- [ ] **6.4** - Update selection logic
  - Visual selection highlighting
  - Handle RTL selections
  - Handle mixed-direction selections

- [ ] **6.5** - Keyboard navigation
  - Arrow keys in RTL text
  - Shift+arrows for selection
  - Ctrl/Cmd+arrows for word movement

- [ ] **6.6** - Write cursor tests
  - Test LTR cursor movement
  - Test RTL cursor movement
  - Test cursor at LTR/RTL boundaries
  - Test selection in mixed text

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

## Phase 7: Hit Testing
**Goal**: RTL-aware click positioning

### Tasks
- [ ] **7.1** - Analyze click-to-position logic
  - Document current hit testing
  - Identify RTL issues
  - Plan character-cluster-aware hit testing

- [ ] **7.2** - Implement character hit testing
  - Map canvas X position to character offset
  - Handle clusters (ligatures, multi-char glyphs)
  - Account for RTL direction

- [ ] **7.3** - Handle mixed-direction hit testing
  - Determine which run was clicked
  - Calculate position within run
  - Handle boundary cases

- [ ] **7.4** - Double-click word selection
  - Define "word" in RTL context
  - Select logical words
  - Handle mixed-direction words

- [ ] **7.5** - Triple-click line selection
  - Select full line including RTL runs
  - Visual vs. logical selection

- [ ] **7.6** - Write hit testing tests
  - Test LTR click positioning
  - Test RTL click positioning
  - Test mixed-direction click positioning
  - Test word/line selection

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
