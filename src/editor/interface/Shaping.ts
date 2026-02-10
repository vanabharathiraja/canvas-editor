/**
 * Shaping Engine Configuration Options
 *
 * Controls how the ShapeEngine (HarfBuzz.js + OpenType.js) integrates
 * with the editor's text measurement and rendering pipeline.
 */

/** Font mapping entry: maps a CSS font name to a font file URL */
export interface IFontMapping {
  /** URL to the font file (.ttf, .otf, .woff) */
  url: string
}

export interface IShapingOption {
  /** Enable the shaping engine for text measurement and rendering */
  enabled?: boolean
  /** Base path for HarfBuzz WASM assets (default: '/harfbuzz') */
  basePath?: string
  /**
   * Font mappings: CSS font name → font file URL.
   * Only fonts listed here will use the shaping engine;
   * unmapped fonts fall back to Canvas API.
   *
   * Example:
   * ```
   * { 'Noto Sans Arabic': { url: '/fonts/NotoSansArabic.ttf' } }
   * ```
   */
  fontMapping?: Record<string, IFontMapping>
}
