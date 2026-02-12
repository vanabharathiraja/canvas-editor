/**
 * Shaping Engine Configuration Options
 *
 * Controls how the ShapeEngine (HarfBuzz.js + OpenType.js) integrates
 * with the editor's text measurement and rendering pipeline.
 */

/** Font mapping entry: maps a CSS font name to font file URL(s) */
export interface IFontMapping {
  /** URL to the regular-weight font file (.ttf, .otf, .woff) */
  url: string
  /** URL to the bold font file (optional — falls back to Canvas API) */
  boldUrl?: string
  /** URL to the italic font file (optional — falls back to Canvas API) */
  italicUrl?: string
  /** URL to the bold-italic font file (optional — falls back to Canvas API) */
  boldItalicUrl?: string
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
  /**
   * Force ALL text through the ShapeEngine, even Latin/CJK text.
   * By default (false), only complex scripts (Arabic, Devanagari, etc.)
   * use the ShapeEngine — simple scripts use native Canvas API for
   * sharper rendering (subpixel AA + font hinting).
   *
   * Set to true for testing/debugging or when glyph-level consistency
   * across all scripts is more important than rendering sharpness.
   */
  forceShaping?: boolean
  /**
   * Fallback font name for complex scripts when the user's selected font
   * is not registered in fontMapping.
   *
   * When a user types Arabic text with "Arial" selected and Arial is not
   * in fontMapping, the ShapeEngine will use this font for shaping and
   * rendering instead. This is invisible to the user — no font change
   * appears in the toolbar.
   *
   * Must be a key in fontMapping. Default: 'Amiri'
   */
  complexScriptFallback?: string
}
