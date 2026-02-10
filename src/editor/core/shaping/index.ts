/**
 * Shaping Engine Module - Barrel Export
 *
 * Provides HarfBuzz.js + OpenType.js based text shaping for complex scripts.
 */

export { ShapeEngine } from './ShapeEngine'
export type { IShapeOptions } from './ShapeEngine'
export type {
  ITextRun,
  IShapeResult,
  IGlyphInfo,
  TextDirection,
  IFontMetrics,
  IShapeEngineConfig,
  IOpenTypeFeatures,
  IShapeCacheKey
} from './interface/ShapeEngine'
