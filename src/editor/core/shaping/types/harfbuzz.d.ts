/**
 * HarfBuzz.js Type Declarations
 *
 * Minimal type declarations for the harfbuzzjs hbjs wrapper.
 * These describe the object returned by `require('harfbuzzjs')`.
 */

export interface HBGlyphResult {
  /** Glyph ID */
  g: number
  /** Cluster index */
  cl: number
  /** Horizontal advance */
  ax: number
  /** Vertical advance */
  ay: number
  /** X displacement */
  dx: number
  /** Y displacement */
  dy: number
  /** Glyph flags */
  flags: number
}

export interface HBBlob {
  ptr: number
  destroy(): void
}

export interface HBFace {
  ptr: number
  upem: number
  collectUnicodes(): Uint32Array
  getAxisInfos(): Record<string, { min: number; default: number; max: number }>
  destroy(): void
}

export interface HBFont {
  ptr: number
  setScale(xScale: number, yScale: number): void
  setVariations(variations: Record<string, number>): void
  glyphName(glyphId: number): string
  glyphToPath(glyphId: number): string
  glyphToJson(glyphId: number): Array<{ type: string; values: number[] }>
  glyphHAdvance(glyphId: number): number
  glyphVAdvance(glyphId: number): number
  glyphExtents(glyphId: number): {
    xBearing: number
    yBearing: number
    width: number
    height: number
  } | null
  hExtents(): {
    ascender: number
    descender: number
    lineGap: number
  }
  destroy(): void
}

export interface HBBuffer {
  ptr: number
  addText(text: string): void
  guessSegmentProperties(): void
  setDirection(direction: 'ltr' | 'rtl' | 'ttb' | 'btt'): void
  setScript(script: string): void
  setLanguage(language: string): void
  setClusterLevel(level: number): void
  getLength(): number
  getGlyphInfos(): Array<{ codepoint: number; cluster: number }>
  getGlyphPositions(): Array<{
    x_advance: number
    y_advance: number
    x_offset: number
    y_offset: number
  }>
  json(font?: HBFont): HBGlyphResult[]
  destroy(): void
}

export interface HBjs {
  createBlob(data: ArrayBuffer | Uint8Array): HBBlob
  createFace(blob: HBBlob, index: number): HBFace
  createFont(face: HBFace): HBFont
  createBuffer(): HBBuffer
  shape(font: HBFont, buffer: HBBuffer, features?: string): void
  shapeWithTrace(
    font: HBFont,
    buffer: HBBuffer,
    features?: string,
    stopAt?: number,
    stopPhase?: number
  ): any[]
  version(): number
  version_string(): string
}
