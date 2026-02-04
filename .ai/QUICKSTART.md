# Shape Engine Integration - Quick Start

**Last Updated**: 2026-02-04

## For AI Agents Resuming Work

When starting a new session on this project, follow these steps:

### 1. Read Context (Priority Order)
1. [`.ai/context/current-focus.md`](.ai/context/current-focus.md) - What we're working on NOW
2. [`.ai/tasks/shape-engine-integration.md`](.ai/tasks/shape-engine-integration.md) - Detailed task list
3. [`.ai/sessions/session-log.md`](.ai/sessions/session-log.md) - Latest session notes
4. [`.ai/decisions/adr-0001-shape-engine-integration.md`](.ai/decisions/adr-0001-shape-engine-integration.md) - Architecture decisions

### 2. Optional Context
- [`.ai/context/project-overview.md`](.ai/context/project-overview.md) - Project background
- [`.ai/context/technical-constraints.md`](.ai/context/technical-constraints.md) - Code style & constraints
- [`.ai/progress/milestones.md`](.ai/progress/milestones.md) - Progress tracking

### 3. Start Working
Use prompt templates from [`.ai/prompts/templates.md`](.ai/prompts/templates.md)

### 4. Before Ending Session
- Update task status in [`.ai/tasks/shape-engine-integration.md`](.ai/tasks/shape-engine-integration.md)
- Add session entry to [`.ai/sessions/session-log.md`](.ai/sessions/session-log.md)
- Update [`.ai/context/current-focus.md`](.ai/context/current-focus.md) if needed
- Commit all `.ai/` changes

---

## Current Status

**Phase**: Phase 0 - POC (Proof of Concept)  
**Next Task**: Task 0.1 - Research HarfBuzzJS distributions  
**Blockers**: None

---

## Project Overview (TL;DR)

We're integrating HarfBuzzJS + OpenType.js to enable:
- Complex script rendering (Arabic, Devanagari, Thai, etc.)
- Proper bidirectional text support
- Character-level metrics for accurate cursor/selection
- Partial word styling

**Why?**: Current Canvas API (`fillText()`) doesn't handle context-dependent character shaping.

**Approach**: Phased integration (0-8) with backward compatibility.

---

## Key Files to Know

### Core Editor (Existing)
- `src/editor/core/draw/Draw.ts` - Main rendering
- `src/editor/core/draw/particle/TextParticle.ts` - Text rendering
- `src/editor/core/draw/interactive/BiDiManager.ts` - Existing BiDi support

### New (To Be Created)
- `src/editor/core/shaping/ShapeEngine.ts` - Main shaping engine
- `src/editor/core/shaping/utils/bidi.ts` - BiDi utilities
- `src/editor/core/shaping/utils/script.ts` - Script detection

---

## Quick Commands

```bash
# Development
npm run dev                 # Start dev server
npm run type:check         # Type check
npm run lint               # Lint

# Testing
npm run cypress:open       # Interactive tests
npm run cypress:run        # Headless tests

# Building
npm run lib                # Build library
```

---

## Code Style Reminders

```typescript
// ✓ No semicolons, single quotes, 2-space indent
const text = 'Hello'
const items = [1, 2, 3]

function process(input: string): string {
  return input.trim()
}

// Arrow functions without parens
const doubled = items.map(x => x * 2)
```

---

## Useful Links

- [AGENTS.md](../AGENTS.md) - Agent development guide
- [README.md](../README.md) - Project README
- [HarfBuzz Docs](https://harfbuzz.github.io/)
- [Unicode BiDi (UAX#9)](https://www.unicode.org/reports/tr9/)
