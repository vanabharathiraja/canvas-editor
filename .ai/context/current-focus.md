# Current Focus

**Last Updated**: 2026-02-04  
**Active Sprint**: Shape Engine Integration - Phase 0 (POC)

## Current Objective

Integrate HarfBuzzJS and OpenType.js to enable proper text shaping for complex scripts (Arabic, Devanagari, etc.) and improve bidirectional text support.

## Why This Matters

The current Canvas API text rendering (`fillText()`, `measureText()`) is insufficient for:

1. **Complex Scripts**: Arabic characters change shape based on position (isolated/initial/medial/final)
2. **Context-Dependent Shaping**: Ligatures, conjuncts, and contextual alternates
3. **Accurate Metrics**: Character-level metrics differ based on surrounding context
4. **Partial Styling**: Current word-level rendering prevents mid-cluster styling
5. **Cursor Positioning**: Logical vs. visual cursor positions in RTL/BiDi text
6. **Selection Ranges**: Visual selection in mixed LTR/RTL runs

## Current Phase: Phase 0 - POC

Validate the approach with a minimal proof-of-concept:
- [ ] HarfBuzzJS integration works in browser/Canvas context
- [ ] Can shape Arabic text correctly
- [ ] Can render shaped glyphs to Canvas
- [ ] RTL text displays correctly
- [ ] Measure performance impact

## Next Phases (Preview)

1. **Phase 1**: Foundation - Add direction-aware interfaces
2. **Phase 2**: Shaping Engine - RTL shaping support
3. **Phase 3**: Draw Integration - Connect with BiDiManager
4. **Phase 4**: TextParticle - RTL rendering path
5. **Phase 5**: Row Computation - Mixed direction runs
6. **Phase 5.5**: BiDi Integration - Full paragraph handling
7. **Phase 6**: Cursor/Selection - Bidirectional navigation
8. **Phase 7**: Hit Testing - RTL-aware positioning
9. **Phase 8**: Polish - Edge cases & performance

## Active Task List

See: `.ai/tasks/shape-engine-integration.md`

## Related Files Currently Under Investigation

- `src/editor/core/draw/Draw.ts` - Main draw orchestrator
- `src/editor/core/draw/particle/TextParticle.ts` - Text rendering
- `src/editor/core/draw/interactive/BiDiManager.ts` - Existing BiDi support
- `src/editor/core/position/` - Position calculation logic
- `src/editor/core/cursor/` - Cursor management

## Collaboration Notes

This is a multi-session, multi-machine effort. Before starting work:

1. Read this file for current status
2. Check `.ai/tasks/shape-engine-integration.md` for task details
3. Review latest session in `.ai/sessions/session-log.md`
4. Check for any blocking decisions in `.ai/decisions/`

Before ending session:

1. Update task status
2. Log progress in session log
3. Update this file if focus changes
4. Commit all `.ai/` changes
