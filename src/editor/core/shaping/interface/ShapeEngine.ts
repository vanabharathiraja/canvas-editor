/**
 * Shaping Engine Interfaces
 *
 * Core type definitions for HarfBuzz + OpenType.js based text shaping.
 * These types define the data flow:
 *   TextRun → ShapeEngine.shape() → ShapeResult (GlyphInfo[])
 */

/** Direction of a text run */
export type TextDirection = 'ltr' | 'rtl'

/** A run of text with uniform properties for shaping */
export interface ITextRun {
  /** The text content to shape */
  text: string
  /** Text direction */
  direction: TextDirection
  /** ISO 15924 script tag (e.g., 'Arab', 'Latn') */
  script?: string
  /** BCP 47 language tag (e.g., 'ar', 'en') */
  language?: string
  /** Start index in the original text */
  startIndex: number
  /** End index in the original text */
  endIndex: number
}

/** Information about a single shaped glyph */
export interface IGlyphInfo {
  /** Glyph ID in the font */
  glyphId: number
  /** Cluster index (maps back to original text) */
  cluster: number
  /** Horizontal advance in font units */
  xAdvance: number
  /** Vertical advance in font units */
  yAdvance: number
  /** Horizontal displacement/offset */
  xOffset: number
  /** Vertical displacement/offset */
  yOffset: number
  /** Glyph flags (e.g., unsafe-to-break) */
  flags: number
}

/** Result of shaping a text run */
export interface IShapeResult {
  /** Individual glyph results */
  glyphs: IGlyphInfo[]
  /** Direction used for shaping */
  direction: TextDirection
  /** Total advance width in font units */
  totalAdvance: number
}

/** Configuration for ShapeEngine initialization */
export interface IShapeEngineConfig {
  /** URL or path to the HarfBuzz WASM file (if not using default) */
  wasmUrl?: string
}

/** OpenType feature settings (e.g., liga, kern, calt) */
export interface IOpenTypeFeatures {
  [tag: string]: boolean
}

/** Cache key components for shaped text */
export interface IShapeCacheKey {
  text: string
  fontUrl: string
  fontSize: number
  direction: TextDirection
  features?: string
  script?: string
  language?: string
}

/** Font metrics from OpenType.js font */
export interface IFontMetrics {
  /** Units per em in the font */
  unitsPerEm: number
  /** Ascender value in font units */
  ascender: number
  /** Descender value in font units (negative) */
  descender: number
}
