# Important Code Context Snippets

Code patterns, interfaces, and snippets that are frequently referenced during AI sessions.

---

## Current Text Rendering Flow

### How Text is Currently Rendered

```typescript
// In TextParticle.ts (simplified)
class TextParticle {
  render(ctx: CanvasRenderingContext2D) {
    // Current approach: word-level rendering
    ctx.fillStyle = this.style.color
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`
    
    // fillText renders entire word at once
    ctx.fillText(this.text, this.x, this.y)
  }
  
  measure(ctx: CanvasRenderingContext2D) {
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`
    
    // measureText gives approximate metrics
    const metrics = ctx.measureText(this.text)
    return metrics.width
  }
}
```

**Problem**: No character-level control, no shaping, inaccurate for complex scripts.

---

## BiDi Manager (Existing)

### Current BiDi Support

```typescript
// Location: src/editor/core/draw/interactive/BiDiManager.ts
class BiDiManager {
  // Currently handles basic paragraph direction
  getParagraphDirection(text: string): 'ltr' | 'rtl' {
    // Simple detection based on first strong character
    // ...
  }
  
  // This will need to integrate with shape engine
  reorderRuns(runs: TextRun[]): TextRun[] {
    // Current implementation is basic
    // Will need full Unicode BiDi algorithm
  }
}
```

**Integration Point**: ShapeEngine will need to work with BiDiManager.

---

## Target Shape Engine Architecture

### ShapeEngine Interface (To Be Implemented)

```typescript
// Location: src/editor/core/shaping/ShapeEngine.ts (new file)

interface TextRun {
  text: string
  direction: 'ltr' | 'rtl'
  script: string        // 'Latn', 'Arab', 'Deva', etc.
  startIndex: number    // Logical position in original text
  endIndex: number
  language?: string     // 'en', 'ar', 'hi', etc. (for language-specific features)
}

interface GlyphInfo {
  glyphId: number       // Glyph ID from font
  cluster: number       // Character cluster this glyph belongs to
  xAdvance: number      // Horizontal advance
  yAdvance: number      // Vertical advance
  xOffset: number       // Horizontal offset
  yOffset: number       // Vertical offset
}

interface ShapeResult {
  glyphs: GlyphInfo[]
  direction: 'ltr' | 'rtl'
  advance: number       // Total advance width
  boundingBox: {
    xMin: number
    yMin: number
    xMax: number
    yMax: number
  }
}

class ShapeEngine {
  private harfbuzz: HarfBuzz
  private fontCache: Map<string, Font>
  private shapeCache: LRUCache<string, ShapeResult>
  
  /**
   * Shape a text run into positioned glyphs
   */
  shapeText(
    run: TextRun,
    fontFamily: string,
    fontSize: number,
    features?: string[]  // OpenType features: ['liga', 'calt', 'kern']
  ): ShapeResult {
    // Check cache
    const cacheKey = this.getCacheKey(run, fontFamily, fontSize, features)
    if (this.shapeCache.has(cacheKey)) {
      return this.shapeCache.get(cacheKey)!
    }
    
    // Load font
    const font = this.getFont(fontFamily)
    
    // Create HarfBuzz buffer
    const buffer = this.harfbuzz.createBuffer()
    buffer.addText(run.text)
    buffer.setDirection(run.direction === 'rtl' ? 'rtl' : 'ltr')
    buffer.setScript(run.script)
    buffer.setLanguage(run.language || 'en')
    
    // Shape
    this.harfbuzz.shape(font, buffer, features)
    
    // Extract glyph info
    const glyphs = buffer.getGlyphInfos()
    const positions = buffer.getGlyphPositions()
    
    // Convert to our format
    const result = this.convertToShapeResult(glyphs, positions, run.direction)
    
    // Cache and return
    this.shapeCache.set(cacheKey, result)
    return result
  }
  
  /**
   * Get glyph path for rendering
   */
  getGlyphPath(
    glyphId: number,
    fontFamily: string,
    fontSize: number
  ): Path2D {
    const font = this.getFont(fontFamily)
    const path = font.getPath(glyphId, 0, 0, fontSize)
    
    // Convert to Path2D
    const path2d = new Path2D()
    path.commands.forEach(cmd => {
      if (cmd.type === 'M') path2d.moveTo(cmd.x, cmd.y)
      else if (cmd.type === 'L') path2d.lineTo(cmd.x, cmd.y)
      else if (cmd.type === 'Q') path2d.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y)
      else if (cmd.type === 'C') path2d.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
      else if (cmd.type === 'Z') path2d.closePath()
    })
    
    return path2d
  }
}
```

---

## Unicode BiDi Utilities (To Be Implemented)

```typescript
// Location: src/editor/core/shaping/utils/bidi.ts (new file)

/**
 * Split text into bidirectional runs using Unicode BiDi algorithm
 */
export function analyzeBiDi(text: string, paragraphDirection: 'ltr' | 'rtl'): BiDiRun[] {
  // Implement UAX#9 Unicode Bidirectional Algorithm
  // Or use existing library like bidi-js
  
  // Returns runs with resolved levels and directions
  return runs
}

interface BiDiRun {
  text: string
  level: number         // Embedding level (0 = LTR base, 1 = RTL base, etc.)
  direction: 'ltr' | 'rtl'
  startIndex: number
  endIndex: number
}

/**
 * Detect paragraph base direction
 */
export function getParagraphDirection(text: string): 'ltr' | 'rtl' {
  // Find first strong directional character
  // L (left-to-right) or R/AL (right-to-left / Arabic-letter)
  for (const char of text) {
    const type = getBidiType(char)
    if (type === 'L') return 'ltr'
    if (type === 'R' || type === 'AL') return 'rtl'
  }
  return 'ltr' // Default to LTR
}
```

---

## Script Detection Utilities (To Be Implemented)

```typescript
// Location: src/editor/core/shaping/utils/script.ts (new file)

/**
 * Detect Unicode script for each character
 */
export function detectScript(char: string): string {
  const code = char.codePointAt(0)
  if (!code) return 'Zyyy' // Common
  
  // Use Unicode script ranges
  if (code >= 0x0600 && code <= 0x06FF) return 'Arab' // Arabic
  if (code >= 0x0900 && code <= 0x097F) return 'Deva' // Devanagari
  if (code >= 0x0E00 && code <= 0x0E7F) return 'Thai'
  if (code >= 0x0041 && code <= 0x007A) return 'Latn' // Latin (simplified)
  // ... more ranges
  
  return 'Zyyy' // Common/Unknown
}

/**
 * Split text into script runs
 */
export function splitIntoScriptRuns(text: string): ScriptRun[] {
  const runs: ScriptRun[] = []
  let currentScript: string | null = null
  let currentRun = ''
  let startIndex = 0
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const script = detectScript(char)
    
    // Common/Inherited characters inherit script from previous char
    const effectiveScript = (script === 'Zyyy' || script === 'Zinh')
      ? (currentScript || 'Latn')
      : script
    
    if (currentScript === null || currentScript === effectiveScript) {
      currentScript = effectiveScript
      currentRun += char
    } else {
      // New script, start new run
      runs.push({
        text: currentRun,
        script: currentScript,
        startIndex,
        endIndex: i
      })
      currentScript = effectiveScript
      currentRun = char
      startIndex = i
    }
  }
  
  // Push final run
  if (currentRun) {
    runs.push({
      text: currentRun,
      script: currentScript!,
      startIndex,
      endIndex: text.length
    })
  }
  
  return runs
}

interface ScriptRun {
  text: string
  script: string  // 'Latn', 'Arab', 'Deva', etc.
  startIndex: number
  endIndex: number
}
```

---

## Rendering Shaped Text (Target Implementation)

```typescript
// Updated TextParticle.ts with shaping support

class TextParticle {
  private shapeEngine: ShapeEngine
  
  render(ctx: CanvasRenderingContext2D) {
    // Decision point: simple text or complex?
    if (this.needsShaping()) {
      this.renderShaped(ctx)
    } else {
      this.renderSimple(ctx) // Existing Canvas API path
    }
  }
  
  private needsShaping(): boolean {
    // Check if text requires shaping
    // - Contains RTL characters?
    // - Contains complex script (Arabic, Devanagari, etc.)?
    // - Has partial styling requiring character-level rendering?
    
    const script = detectScript(this.text[0])
    if (script === 'Arab' || script === 'Deva' || script === 'Thai') {
      return true
    }
    
    const direction = getParagraphDirection(this.text)
    if (direction === 'rtl') {
      return true
    }
    
    // Check for partial styling
    if (this.hasPartialStyling) {
      return true
    }
    
    return false
  }
  
  private renderShaped(ctx: CanvasRenderingContext2D) {
    // Shape the text
    const run: TextRun = {
      text: this.text,
      direction: this.direction,
      script: this.script,
      startIndex: 0,
      endIndex: this.text.length
    }
    
    const shaped = this.shapeEngine.shapeText(
      run,
      this.style.fontFamily,
      this.style.fontSize,
      ['liga', 'calt', 'kern'] // OpenType features
    )
    
    // Render each glyph
    let currentX = this.x
    const currentY = this.y
    
    for (const glyph of shaped.glyphs) {
      // Get glyph path
      const path = this.shapeEngine.getGlyphPath(
        glyph.glyphId,
        this.style.fontFamily,
        this.style.fontSize
      )
      
      // Apply positioning
      ctx.save()
      ctx.translate(
        currentX + glyph.xOffset,
        currentY + glyph.yOffset
      )
      
      // Fill or stroke the path
      ctx.fillStyle = this.style.color
      ctx.fill(path)
      
      ctx.restore()
      
      // Advance position
      currentX += glyph.xAdvance
    }
  }
  
  private renderSimple(ctx: CanvasRenderingContext2D) {
    // Existing Canvas API rendering (fast path)
    ctx.fillStyle = this.style.color
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`
    ctx.fillText(this.text, this.x, this.y)
  }
}
```

---

## Cache Implementation Pattern

```typescript
// LRU Cache for shaped text runs

class LRUCache<K, V> {
  private capacity: number
  private cache: Map<K, V>
  
  constructor(capacity: number) {
    this.capacity = capacity
    this.cache = new Map()
  }
  
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined
    
    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    
    return value
  }
  
  set(key: K, value: V): void {
    // If exists, delete first (will re-add at end)
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    
    // Add to end
    this.cache.set(key, value)
    
    // Evict oldest if over capacity
    if (this.cache.size > this.capacity) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }
  
  clear(): void {
    this.cache.clear()
  }
}
```

---

## Project Code Style Examples

### ✓ Correct Style

```typescript
// No semicolons, single quotes, 2-space indent
import { Editor } from './editor'
import type { EditorOptions } from './interface'

export class TextManager {
  private options: EditorOptions
  
  constructor(options: EditorOptions) {
    this.options = options
  }
  
  format(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    ctx.fillText(this.text, x, y)
  }
}

// Arrow functions without parens when possible
const items = [1, 2, 3]
const doubled = items.map(x => x * 2)

// Constants in UPPER_SNAKE_CASE
const MAX_CACHE_SIZE = 1000
const DEFAULT_FONT_SIZE = 16
```

### ✗ Incorrect Style

```typescript
// ✗ Semicolons (not allowed)
import { Editor } from './editor';

// ✗ Double quotes (use single)
const message = "Hello World";

// ✗ Trailing commas (not allowed)
const items = [1, 2, 3,];

// ✗ Arrow function parens when single param (avoid)
const doubled = items.map((x) => x * 2);
```

---

## Notes

- These snippets serve as reference for AI sessions
- Copy relevant sections when asking questions
- Update as implementation evolves
- Keep snippets concise and focused
