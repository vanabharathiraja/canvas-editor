# Technical Constraints & Guidelines

**Last Updated**: 2026-02-04

## Language & Style Requirements

### TypeScript Configuration
- **Strict Mode**: Enabled - all type checking rules enforced
- **Target**: ESNext
- **Module**: ESNext
- **No Implicit Any**: Must type all variables
- **Unused Checks**: Enabled for locals and parameters

### Code Style (ESLint + Prettier)
```typescript
// ✓ Correct
const text = 'Hello World'
const items = [1, 2, 3]

function processText(input: string): string {
  return input.trim()
}

// ✗ Wrong
const text = "Hello World";  // No semicolons, use single quotes
const items = [1, 2, 3,];    // No trailing commas
```

**Key Rules**:
- No semicolons: `semi: [1, "never"]`
- Single quotes: `quotes: [1, "single"]`
- 2-space indentation
- 80 character line limit
- Arrow parens avoided when possible: `item => item.id`
- LF line endings

### Naming Conventions
- **Classes/Interfaces**: `PascalCase` - `ShapeEngine`, `ITextMetrics`
- **Functions/Variables**: `camelCase` - `shapeText`, `glyphMetrics`
- **Constants**: `UPPER_SNAKE_CASE` - `MAX_GLYPH_CACHE_SIZE`
- **Enums**: `PascalCase` - `enum ShapingLevel`
- **Files**: Match content - `ShapeEngine.ts`, `textUtils.ts`

## Build & Quality Gates

### Pre-commit Checks
All commits automatically run:
```bash
npm run lint && npm run type:check
```

Commit messages must follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code restructuring
- `test:` - Test additions/changes
- `docs:` - Documentation
- `chore:` - Build/tooling changes

### Build Process
```bash
npm run lib  # Runs: lint → type:check → build
```

## Performance Constraints

### Canvas Rendering
- **Target**: 60fps for typing and cursor movement
- **Max Frame Time**: ~16ms per render cycle
- **Cache Strategy**: Aggressive caching for shaped text
- **Memory Limit**: Keep glyph cache under 50MB

### Bundle Size
- **Current Library**: ~XXX KB (need to measure)
- **Shape Engine Addition**: Should stay under +200KB
- **Code Splitting**: Consider lazy loading for complex script support
- **Tree Shaking**: Ensure unused languages can be eliminated

## Browser Support

### Minimum Requirements
- **ES Version**: ES2015+ (no polyfills needed)
- **Canvas 2D**: Full support required
- **TextEncoder/TextDecoder**: For character encoding
- **Typed Arrays**: For binary font data

### Known Limitations
- Safari font loading quirks
- Firefox Canvas performance differences
- Chrome Canvas text rendering optimizations

## Architecture Constraints

### Immutability & Side Effects
- Prefer pure functions where possible
- Document side effects clearly
- Avoid global state mutations

### Error Handling
```typescript
// ✓ Preferred
if (!font) {
  throw new Error(`Font not loaded: ${fontFamily}`)
}

// ✓ Also acceptable for recoverable errors
try {
  return shapeText(text, font)
} catch (error) {
  console.warn('Shaping failed, falling back to simple rendering')
  return fallbackShape(text)
}
```

### Module Dependencies
- **Core editor**: No external dependencies in runtime
- **Plugins**: Can depend on external libraries
- **Dev dependencies**: No restrictions
- **New dependencies**: Document rationale in ADR

## Shape Engine Specific Constraints

### Integration Requirements
1. **Non-Breaking**: Must not break existing simple text rendering
2. **Progressive**: Complex script support should be opt-in/automatic
3. **Fallback**: Always have Canvas API fallback for unsupported scenarios
4. **Lazy Loading**: Consider lazy loading HarfBuzz for bundle size

### Data Flow
```
Text Input
  ↓
Unicode Analysis (detect scripts, BiDi levels)
  ↓
Font Shaping (HarfBuzzJS) → Glyph IDs + Positions
  ↓
Glyph Metrics (OpenType.js)
  ↓
Canvas Rendering (path drawing or font rendering)
```

### Caching Strategy
- **Shape Cache**: Cache shaped runs by (text, font, features, direction)
- **Glyph Cache**: Cache glyph paths/metrics
- **Invalidation**: Clear on font change or style change
- **Size Limits**: LRU eviction when cache grows too large

## Testing Requirements

### Test Coverage
- **Unit Tests**: Critical algorithms (BiDi, shaping, metrics)
- **E2E Tests**: Visual regression for text rendering
- **Performance Tests**: Benchmark shaping operations
- **Browser Tests**: Cross-browser Canvas rendering

### Cypress E2E
- Located in `cypress/e2e/`
- Run interactively: `npm run cypress:open`
- Run headless: `npm run cypress:run`
- Viewport: 1366x720

## Import/Export Patterns

### Preferred Import Style
```typescript
// External libraries
import type { HarfbuzzFont } from 'harfbuzzjs'

// Internal - absolute from src/
import { Editor } from '@/editor'

// Internal - relative
import { measureText } from '../utils/textMetrics'
import type { ShapeResult } from './types'
```

### Export Pattern
```typescript
// Named exports preferred
export class ShapeEngine { }
export interface IShapeResult { }

// Default export for main entry point only
export default Editor
```

## Documentation Requirements

### Code Comments
```typescript
/**
 * Shapes a text run using HarfBuzz
 * @param text - The text to shape (single script run)
 * @param font - HarfBuzz font object
 * @param features - OpenType features to apply
 * @param direction - Text direction (ltr/rtl)
 * @returns Shaped glyph information with positions
 */
export function shapeText(
  text: string,
  font: HarfbuzzFont,
  features: string[],
  direction: 'ltr' | 'rtl'
): ShapeResult {
  // ...
}
```

### Architecture Decisions
- Document major decisions in `.ai/decisions/adr-NNNN-<title>.md`
- Use ADR template format
- Include context, decision, consequences

## Security Considerations

- **Font Loading**: Validate font file sources
- **User Input**: Sanitize before rendering
- **XSS Prevention**: No eval(), no Function() constructor
- **Resource Limits**: Prevent DoS with large texts or fonts
