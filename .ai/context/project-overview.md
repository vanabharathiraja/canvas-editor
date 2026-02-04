# Canvas Editor - Project Overview

**Last Updated**: 2026-02-04

## What is Canvas Editor?

A TypeScript-based rich text editor library that renders content using HTML5 Canvas/SVG instead of traditional DOM-based contentEditable. This approach provides pixel-perfect control over rendering but introduces unique challenges for complex text rendering.

## Current Architecture

### Text Rendering System

- **Current Approach**: Uses Canvas 2D API `fillText()` and `measureText()`
- **Rendering Unit**: Word-level (not character-level)
- **Text Measurement**: Canvas metrics without complex shaping
- **Limitations**:
  - No support for complex scripts (Arabic, Devanagari, Thai, etc.)
  - Context-dependent shaping not handled
  - Partial word styling is problematic
  - Cursor positioning and selection logic assumes simple left-to-right character mapping

### Key Components

1. **Draw System** (`src/editor/core/draw/`)
   - `Draw.ts` - Main rendering orchestrator
   - `particle/` - Individual element renderers
   - Text drawing currently in particle renderers

2. **BiDi Manager** (`src/editor/core/draw/interactive/BiDiManager.ts`)
   - Existing BiDi support (basic)
   - Currently handles paragraph direction
   - Needs integration with shape engine

3. **Cursor & Selection** (`src/editor/core/cursor/`, `src/editor/core/range/`)
   - Assumes simple character mapping
   - Needs RTL-aware positioning

4. **Row Computation** (Layout system)
   - Word-based line breaking
   - Needs character-level awareness for proper shaping

## Technical Stack

- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **Testing**: Cypress (E2E)
- **Module Format**: ES modules + UMD
- **Target**: Modern browsers with Canvas support

## Code Style

- No semicolons
- Single quotes
- 2-space indentation
- 80 character line limit
- Strict TypeScript checking

## Development Commands

```bash
npm run dev           # Development server
npm run lib           # Build library
npm run type:check    # Type checking
npm run lint          # Linting
npm run cypress:open  # Interactive tests
```

## Constraints & Considerations

1. **Performance**: Canvas rendering must remain fast
2. **Bundle Size**: Keep library lightweight
3. **Backward Compatibility**: Don't break existing API
4. **Progressive Enhancement**: Complex script support should be optional
5. **Browser Support**: Modern browsers (ES2015+)

## Current Challenge

Integrating a proper text shaping engine (HarfBuzzJS + OpenType.js) to support:
- Complex scripts (Arabic, Devanagari, Thai, etc.)
- Context-dependent character shaping
- Proper bidirectional text handling
- Character-level cursor positioning and selection
- Partial character styling (different colors/styles within shaped clusters)
