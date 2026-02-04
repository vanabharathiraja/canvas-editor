# ADR-0001: Shape Engine Integration for Complex Scripts

**Status**: Proposed  
**Date**: 2026-02-04  
**Deciders**: vraja, AI Assistant (GitHub Copilot)  
**Tags**: text-rendering, complex-scripts, rtl, bidi, harfbuzz, opentype

## Context

The canvas-editor currently uses the Canvas 2D API methods `fillText()` and `measureText()` for text rendering. This approach has fundamental limitations:

1. **Word-Level Rendering**: Text is currently rendered at word granularity, making character-level operations difficult
2. **No Complex Script Support**: Languages like Arabic, Devanagari, Thai require context-dependent character shaping
3. **Inaccurate Metrics**: Character widths vary based on context (ligatures, kerning, contextual forms)
4. **RTL/BiDi Issues**: While basic BiDi support exists, cursor positioning and selection in RTL text is problematic
5. **Partial Styling**: Cannot properly style individual characters within shaped clusters

### Current Architecture

```
Text → Canvas fillText() → Rendered Word
       ↓
    measureText() → Approximate Metrics
```

### Problems with Current Approach

**Arabic Text Example**: "مرحبا"
- Characters change shape based on position (isolated/initial/medial/final)
- Canvas API doesn't handle shaping: م-ر-ح-ب-ا renders as م ر ح ب ا (disconnected)
- Correct shaping requires: مرحبا (connected forms)

**Devanagari Example**: "नमस्ते"
- Requires conjunct formation and vowel mark positioning
- Canvas API treats each Unicode codepoint independently

**Partial Styling**: To render "Hello" with 'H' in red and rest in black:
- Current word-level approach cannot handle mid-word style changes cleanly
- Character-level rendering needed

## Decision

We will integrate **HarfBuzzJS** (text shaping engine) and **OpenType.js** (font parsing) to implement proper text shaping while maintaining backward compatibility with the existing Canvas API approach.

### Architecture

```
Text Input
  ↓
Unicode Analysis → BiDi Algorithm → Directional Runs
  ↓                                  ↓
Script Detection → Split into Script Runs
  ↓
Shaping Decision
  ├─→ Simple LTR Latin? → Canvas API (fast path)
  └─→ Complex/RTL Text? → Shape Engine (accurate path)
      ↓
    HarfBuzzJS → Shape Text → Glyph IDs + Positions
      ↓
    OpenType.js → Glyph Paths/Metrics
      ↓
    Canvas Rendering → Path drawing or font rendering
```

### Implementation Approach

**Phased Integration** (8 phases + POC):
- **Phase 0**: POC - Validate technical approach
- **Phase 1**: Foundation - Add direction-aware interfaces
- **Phase 2**: Shaping Engine - Core shaping implementation
- **Phase 3**: Draw Integration - Connect with existing draw system
- **Phase 4**: TextParticle - Update text rendering
- **Phase 5**: Row Computation - Character-level layout
- **Phase 5.5**: BiDi Integration - Full bidirectional support
- **Phase 6**: Cursor/Selection - Bidirectional navigation
- **Phase 7**: Hit Testing - RTL-aware click positioning
- **Phase 8**: Polish - Performance & edge cases

### Key Components

1. **ShapeEngine** - Manages HarfBuzz and font loading
2. **TextRun** - Represents uniform text runs (same script, direction, font)
3. **ShapeCache** - Caches shaped text runs for performance
4. **BiDiAnalyzer** - Unicode BiDi algorithm implementation
5. **ScriptDetector** - Detects Unicode script for each character
6. **GlyphRenderer** - Renders shaped glyphs to Canvas

## Consequences

### Positive

1. **Correct Complex Script Support**
   - Arabic, Devanagari, Thai, and other complex scripts will render correctly
   - Context-dependent shaping handled properly
   - Ligatures and conjuncts formed correctly

2. **Accurate Text Metrics**
   - Character-level metrics based on actual glyph positioning
   - Proper bounding boxes for shaped clusters
   - Enables accurate cursor positioning and selection

3. **Better RTL/BiDi Support**
   - Proper bidirectional text handling per Unicode UAX#9
   - Visual vs. logical cursor movement
   - Correct selection in mixed-direction text

4. **Partial Styling**
   - Can style individual characters or grapheme clusters
   - Maintains shaping across style boundaries

5. **Standards Compliance**
   - Follows Unicode standards (BiDi, script detection)
   - Uses industry-standard shaping (HarfBuzz)
   - OpenType feature support

### Negative

1. **Bundle Size Increase**
   - HarfBuzzJS: ~150-200KB (WASM + JS wrapper)
   - OpenType.js: ~100KB
   - Total: ~250-300KB additional
   - Mitigation: Code splitting, lazy loading for complex scripts

2. **Performance Impact**
   - Shaping is slower than Canvas API measureText()
   - Initial load time for HarfBuzz WASM
   - Mitigation: Aggressive caching, fast path for simple text

3. **Complexity**
   - More complex codebase
   - More edge cases to handle
   - Steeper learning curve for contributors

4. **Browser Compatibility**
   - Requires WebAssembly support (HarfBuzz)
   - Typed arrays for font data
   - Mitigation: Graceful degradation, Canvas API fallback

5. **Font Loading**
   - Need access to full font files (not just browser fonts)
   - Font loading and parsing overhead
   - Mitigation: Font caching, lazy loading

### Risks

1. **Performance Regression**
   - Risk: Shaping overhead makes typing laggy
   - Mitigation: Fast path for simple text, shape caching, profiling

2. **Bundle Size**
   - Risk: Too large for some use cases
   - Mitigation: Optional module, lazy loading, tree shaking

3. **Cross-Browser Bugs**
   - Risk: Different Canvas/WASM behavior across browsers
   - Mitigation: Comprehensive cross-browser testing

4. **Maintenance Burden**
   - Risk: Complex code hard to maintain
   - Mitigation: Good documentation, unit tests, clear architecture

5. **Breaking Changes**
   - Risk: Metrics change breaks existing code
   - Mitigation: Backward compatibility mode, clear migration guide

## Alternatives Considered

### Alternative 1: Use Browser Text Rendering (DOM)

**Approach**: Switch from Canvas to DOM-based rendering (contentEditable or similar)

**Pros**:
- Browser handles all text complexity
- No bundle size increase
- No performance overhead
- Accessibility built-in

**Cons**:
- Loses pixel-perfect Canvas control (core value proposition of canvas-editor)
- Limited styling flexibility
- Harder to implement custom features
- Fundamentally changes the project architecture

**Decision**: Rejected - Goes against core design of canvas-editor

### Alternative 2: Canvas API with Unicode Normalization

**Approach**: Use Unicode normalization (NFC/NFD) and hope browsers handle shaping

**Pros**:
- Minimal code changes
- No bundle size increase
- Simple implementation

**Cons**:
- Does NOT solve complex script shaping (browsers don't shape in fillText)
- Still inaccurate metrics
- No control over shaping
- RTL/BiDi still problematic

**Decision**: Rejected - Doesn't actually solve the problem

### Alternative 3: Server-Side Rendering

**Approach**: Render text to images on server, display in Canvas

**Pros**:
- No client bundle size increase
- Can use any server-side shaping library

**Cons**:
- Requires server dependency
- Network latency for every text change
- Editing experience would be terrible
- Not suitable for client-side editor

**Decision**: Rejected - Not feasible for interactive editor

### Alternative 4: Use a Different Shaping Library

**Options Considered**:
- **rustybuzz-wasm**: Rust port of HarfBuzz compiled to WASM
- **Sheenbidi**: BiDi-only library
- **Custom shaping**: Implement basic shaping ourselves

**Analysis**:
- rustybuzz-wasm: Similar to HarfBuzz, slightly smaller but less mature
- Sheenbidi: Only handles BiDi, not shaping
- Custom: Way too complex, reinventing the wheel

**Decision**: HarfBuzz is the industry standard, most mature, best documentation

### Alternative 5: Gradual Enhancement

**Approach**: Only enable shaping for specific scripts when detected

**Pros**:
- Better performance for simple text
- Smaller bundle via code splitting
- Progressive enhancement

**Cons**:
- More complex detection logic
- Potential inconsistencies between rendering modes

**Decision**: **ACCEPTED as part of the main approach** - This is how we'll implement it:
- Fast path: Simple LTR Latin → Canvas API
- Slow path: Complex/RTL → Shape Engine

## Implementation Plan

See detailed task breakdown in `.ai/tasks/shape-engine-integration.md`

**Timeline**: 8-12 weeks (depending on complexity)

**Phases**:
1. POC (1 week) - Validate approach
2. Foundation (1 week) - Interfaces and utilities
3. Shaping Engine (2 weeks) - Core implementation
4. Draw Integration (1 week) - Connect to existing system
5. TextParticle (1 week) - Update rendering
6. Row Computation (1 week) - Layout updates
7. BiDi Integration (1 week) - Full BiDi support
8. Cursor/Selection (1 week) - Navigation
9. Hit Testing (1 week) - Click positioning
10. Polish (2 weeks) - Performance, edge cases, testing

## References

### Technical Specifications
- [Unicode Bidirectional Algorithm (UAX#9)](https://www.unicode.org/reports/tr9/)
- [Unicode Script Property (UAX#24)](https://www.unicode.org/reports/tr24/)
- [OpenType Specification](https://docs.microsoft.com/en-us/typography/opentype/spec/)
- [HarfBuzz Documentation](https://harfbuzz.github.io/)

### Libraries
- [HarfBuzzJS](https://github.com/harfbuzz/harfbuzzjs) - Official HarfBuzz WASM port
- [OpenType.js](https://github.com/opentypejs/opentype.js) - OpenType font parser

### Research
- [Text Rendering Hates You](https://gankra.github.io/blah/text-hates-you/) - Comprehensive overview of text rendering complexity
- [Modern Text Rendering with Linux](https://mrandri19.github.io/2019/07/24/modern-text-rendering-linux-overview.html) - Text rendering pipeline

### Similar Projects
- [Mozilla Servo](https://github.com/servo/servo) - Uses HarfBuzz for text shaping
- [React Native](https://github.com/facebook/react-native) - Uses HarfBuzz on Android
- [Pango](https://pango.gnome.org/) - Text layout library using HarfBuzz

## Follow-Up

- [ ] Create POC after ADR approval
- [ ] Benchmark performance impact
- [ ] Measure bundle size impact
- [ ] Create font loading strategy
- [ ] Plan cache invalidation strategy
- [ ] Design public API for shape engine configuration
