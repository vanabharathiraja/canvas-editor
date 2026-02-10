/**
 * ShapeEngine - Core text shaping engine using HarfBuzz.js + OpenType.js
 *
 * This is the central class for text shaping. It:
 * 1. Loads HarfBuzz WASM and manages its lifecycle
 * 2. Loads and caches fonts via OpenType.js (for glyph paths) and HarfBuzz (for shaping)
 * 3. Shapes text runs and returns glyph info with positions
 * 4. Provides glyph path rendering to Canvas
 *
 * Usage:
 *   const engine = ShapeEngine.getInstance()
 *   await engine.init()
 *   await engine.loadFont('my-font', '/fonts/MyFont.ttf')
 *   const result = engine.shapeText('مرحبا', 'my-font', 24, { direction: 'rtl' })
 *   engine.renderGlyphs(ctx, result, 'my-font', 24, x, y)
 */

import type { HBjs, HBFont, HBFace, HBBlob } from './types/harfbuzz'
import type {
  IShapeResult,
  IGlyphInfo,
  TextDirection,
  IFontMetrics
} from './interface/ShapeEngine'

// Declare the global function that hb.js creates
declare function createHarfBuzz(): Promise<any>

// We load hbjs.js via a <script> tag; it exposes a global `hbjs` function
declare function hbjs(module: any): HBjs

// @ts-ignore - opentype.js types from @types/opentype.js
import * as opentype from 'opentype.js'

// OpenType.js font type (minimal for what we use)
interface OTFont {
  unitsPerEm: number
  ascender: number
  descender: number
  glyphs: { get(index: number): OTGlyph }
  charToGlyph(char: string): OTGlyph
  stringToGlyphs(str: string): OTGlyph[]
  getPath(text: string, x: number, y: number, fontSize: number, options?: any): OTPath
  getAdvanceWidth(text: string, fontSize: number, options?: any): number
  draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, options?: any): void
}

interface OTGlyph {
  index: number
  name: string
  unicode: number
  unicodes: number[]
  advanceWidth: number
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  path: OTPath
  getPath(x: number, y: number, fontSize: number): OTPath
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number): void
}

interface OTPath {
  commands: Array<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }>
  fill: string
  stroke: string | null
  strokeWidth: number
  draw(ctx: CanvasRenderingContext2D): void
  getBoundingBox(): { x1: number; y1: number; x2: number; y2: number }
  toPathData(decimalPlaces?: number): string
  toSVG(decimalPlaces?: number): string
}

/** Loaded font entry with both HarfBuzz and OpenType.js references */
interface LoadedFont {
  hbFont: HBFont
  hbFace: HBFace
  hbBlob: HBBlob
  otFont: OTFont
  metrics: IFontMetrics
}

/** Options for shaping a text run */
export interface IShapeOptions {
  direction?: TextDirection
  script?: string
  language?: string
  features?: string
}

export class ShapeEngine {
  private static instance: ShapeEngine | null = null

  private hb: HBjs | null = null
  private fonts: Map<string, LoadedFont> = new Map()
  private initialized = false
  private initializing: Promise<void> | null = null

  // Shaping cache: key → ShapeResult
  private shapeCache: Map<string, IShapeResult> = new Map()
  private readonly CACHE_MAX_SIZE = 1000

  // Font registry: CSS font name → { url, loading promise }
  private fontRegistry: Map<string, { url: string; loading: Promise<IFontMetrics> | null }> = new Map()

  private constructor() {
    // singleton - use ShapeEngine.getInstance()
  }

  /** Get the singleton instance */
  static getInstance(): ShapeEngine {
    if (!ShapeEngine.instance) {
      ShapeEngine.instance = new ShapeEngine()
    }
    return ShapeEngine.instance
  }

  /** Check if the engine is initialized */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Initialize HarfBuzz WASM.
   * Safe to call multiple times - subsequent calls return the same promise.
   * @param basePath Base URL for HarfBuzz assets (hb.js, hbjs.js, hb.wasm).
   *                 Defaults to '/harfbuzz' (served from public/).
   */
  async init(basePath = '/harfbuzz'): Promise<void> {
    if (this.initialized) return
    if (this.initializing) return this.initializing

    this.initializing = this._doInit(basePath)
    await this.initializing
  }

  private async _doInit(basePath: string): Promise<void> {
    try {
      // Load the hb.js and hbjs.js scripts into the page
      await this._loadScript(`${basePath}/hb.js`)
      await this._loadScript(`${basePath}/hbjs.js`)

      // hb.js exposes global `createHarfBuzz` which loads hb.wasm
      // hbjs.js exposes global `hbjs` wrapper function
      const hbModule = await (window as any).createHarfBuzz({
        locateFile: (file: string) => `${basePath}/${file}`
      })
      this.hb = (window as any).hbjs(hbModule) as HBjs
      this.initialized = true
      console.log(
        '[ShapeEngine] HarfBuzz initialized, version:',
        this.hb!.version_string()
      )
    } catch (err) {
      this.initializing = null
      console.error('[ShapeEngine] Failed to initialize HarfBuzz:', err)
      throw err
    }
  }

  /** Load a JS script by URL, returns when loaded */
  private _loadScript(src: string): Promise<void> {
    // Skip if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      return Promise.resolve()
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = () => resolve()
      script.onerror = () =>
        reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })
  }

  /**
   * Load a font for shaping and rendering.
   * The font is loaded into both HarfBuzz (for shaping) and OpenType.js (for paths).
   *
   * @param fontId Unique identifier for this font
   * @param fontUrl URL to the font file (.ttf, .otf, .woff)
   */
  async loadFont(fontId: string, fontUrl: string): Promise<IFontMetrics> {
    if (!this.initialized || !this.hb) {
      throw new Error('[ShapeEngine] Not initialized. Call init() first.')
    }

    // Return cached font metrics if already loaded
    const existing = this.fonts.get(fontId)
    if (existing) return existing.metrics

    // Fetch font data
    const response = await fetch(fontUrl)
    const fontBuffer = await response.arrayBuffer()

    // Load into HarfBuzz
    const hbBlob = this.hb.createBlob(new Uint8Array(fontBuffer))
    const hbFace = this.hb.createFace(hbBlob, 0)
    const hbFont = this.hb.createFont(hbFace)

    // Load into OpenType.js
    const otFont = opentype.parse(fontBuffer) as unknown as OTFont

    const metrics: IFontMetrics = {
      unitsPerEm: otFont.unitsPerEm,
      ascender: otFont.ascender,
      descender: otFont.descender
    }

    this.fonts.set(fontId, {
      hbFont,
      hbFace,
      hbBlob,
      otFont,
      metrics
    })

    console.log(
      `[ShapeEngine] Font "${fontId}" loaded. upem=${metrics.unitsPerEm}`
    )
    return metrics
  }

  /**
   * Shape a text string using HarfBuzz.
   *
   * @param text The text to shape
   * @param fontId The font ID (must be loaded first)
   * @param fontSize Font size in pixels
   * @param options Shaping options (direction, script, language, features)
   * @returns Shape result with glyph positions
   */
  shapeText(
    text: string,
    fontId: string,
    fontSize: number,
    options: IShapeOptions = {}
  ): IShapeResult {
    if (!this.hb) {
      throw new Error('[ShapeEngine] Not initialized.')
    }

    const font = this.fonts.get(fontId)
    if (!font) {
      throw new Error(`[ShapeEngine] Font "${fontId}" not loaded.`)
    }

    const direction = options.direction || 'ltr'

    // Check cache
    const cacheKey = this._buildCacheKey(
      text,
      fontId,
      fontSize,
      direction,
      options
    )
    const cached = this.shapeCache.get(cacheKey)
    if (cached) return cached

    // Set scale for the font (use upem for consistent results)
    font.hbFont.setScale(font.metrics.unitsPerEm, font.metrics.unitsPerEm)

    // Create buffer and shape
    const buffer = this.hb.createBuffer()
    try {
      buffer.addText(text)

      // Set properties
      buffer.setDirection(direction)
      if (options.script) {
        buffer.setScript(options.script)
      }
      if (options.language) {
        buffer.setLanguage(options.language)
      }

      // If no explicit script/language, let HarfBuzz guess
      if (!options.script && !options.language) {
        buffer.guessSegmentProperties()
        // Re-set direction since guess may override it
        buffer.setDirection(direction)
      }

      // Shape!
      this.hb.shape(font.hbFont, buffer, options.features)

      // Extract results
      const jsonResult = buffer.json(font.hbFont)
      const scaleFactor = fontSize / font.metrics.unitsPerEm

      const glyphs: IGlyphInfo[] = jsonResult.map((g: any) => ({
        glyphId: g.g,
        cluster: g.cl,
        xAdvance: g.ax * scaleFactor,
        yAdvance: g.ay * scaleFactor,
        xOffset: g.dx * scaleFactor,
        yOffset: g.dy * scaleFactor,
        flags: g.flags
      }))

      const totalAdvance = glyphs.reduce(
        (sum, g) => sum + g.xAdvance,
        0
      )

      const result: IShapeResult = {
        glyphs,
        direction,
        totalAdvance
      }

      // Cache result
      this._cacheResult(cacheKey, result)

      return result
    } finally {
      buffer.destroy()
    }
  }

  /**
   * Render shaped glyphs onto a Canvas context using OpenType.js glyph paths.
   *
   * @param ctx Canvas 2D rendering context
   * @param result Shape result from shapeText()
   * @param fontId Font ID (must be loaded)
   * @param fontSize Font size in pixels
   * @param x Starting X position
   * @param y Baseline Y position
   * @param color Fill color (default: 'black')
   */
  renderGlyphs(
    ctx: CanvasRenderingContext2D,
    result: IShapeResult,
    fontId: string,
    fontSize: number,
    x: number,
    y: number,
    color = 'black'
  ): void {
    const font = this.fonts.get(fontId)
    if (!font) {
      throw new Error(`[ShapeEngine] Font "${fontId}" not loaded.`)
    }

    ctx.save()
    ctx.fillStyle = color

    let cursorX = x
    const cursorY = y

    for (const glyph of result.glyphs) {
      const glyphX = cursorX + glyph.xOffset
      const glyphY = cursorY - glyph.yOffset // Canvas Y is inverted

      // Get the OpenType.js glyph by ID and draw its path
      const otGlyph = font.otFont.glyphs.get(glyph.glyphId)
      if (otGlyph) {
        const path = otGlyph.getPath(glyphX, glyphY, fontSize)
        path.fill = color
        path.draw(ctx)
      }

      cursorX += glyph.xAdvance
    }

    ctx.restore()
  }

  /**
   * Get the advance width of shaped text (convenience method).
   */
  getShapedWidth(
    text: string,
    fontId: string,
    fontSize: number,
    options: IShapeOptions = {}
  ): number {
    const result = this.shapeText(text, fontId, fontSize, options)
    return result.totalAdvance
  }

  /** Get font metrics for a loaded font */
  getFontMetrics(fontId: string): IFontMetrics | null {
    return this.fonts.get(fontId)?.metrics ?? null
  }

  /** Check if a font is loaded */
  hasFont(fontId: string): boolean {
    return this.fonts.has(fontId)
  }

  /**
   * Register a CSS font name with a font file URL.
   * The font will be lazily loaded when first needed.
   */
  registerFont(fontName: string, fontUrl: string): void {
    if (!this.fontRegistry.has(fontName)) {
      this.fontRegistry.set(fontName, { url: fontUrl, loading: null })
    }
  }

  /**
   * Register multiple fonts from a mapping object.
   * @param mapping Record<fontName, { url }> from IShapingOption.fontMapping
   */
  registerFontMapping(mapping: Record<string, { url: string }>): void {
    for (const [fontName, { url }] of Object.entries(mapping)) {
      this.registerFont(fontName, url)
    }
  }

  /** Check if a CSS font name is registered (may not be loaded yet) */
  isFontRegistered(fontName: string): boolean {
    return this.fontRegistry.has(fontName)
  }

  /**
   * Ensure a font is loaded and ready for shaping.
   * Uses the font name as the fontId internally.
   * Returns true if font is ready, false if not registered.
   */
  async ensureFontLoaded(fontName: string): Promise<boolean> {
    // Already loaded in HarfBuzz
    if (this.fonts.has(fontName)) return true

    const entry = this.fontRegistry.get(fontName)
    if (!entry) return false

    // Already loading — wait for it
    if (entry.loading) {
      await entry.loading
      return true
    }

    // Start loading
    entry.loading = this.loadFont(fontName, entry.url)
    try {
      await entry.loading
      return true
    } catch (err) {
      console.error(`[ShapeEngine] Failed to load font "${fontName}":`, err)
      entry.loading = null
      return false
    }
  }

  /**
   * Check if a font is ready for shaping (registered AND loaded).
   * This is a synchronous check — use for hot paths.
   */
  isFontReady(fontName: string): boolean {
    return this.fonts.has(fontName)
  }

  /** Clear shaping cache */
  clearCache(): void {
    this.shapeCache.clear()
  }

  /** Destroy and release all resources */
  destroy(): void {
    for (const [, font] of this.fonts) {
      font.hbFont.destroy()
      font.hbFace.destroy()
      font.hbBlob.destroy()
    }
    this.fonts.clear()
    this.shapeCache.clear()
    this.fontRegistry.clear()
    this.hb = null
    this.initialized = false
    this.initializing = null
    ShapeEngine.instance = null
  }

  // ---- Private helpers ----

  private _buildCacheKey(
    text: string,
    fontId: string,
    fontSize: number,
    direction: TextDirection,
    options: IShapeOptions
  ): string {
    return `${text}|${fontId}|${fontSize}|${direction}|${options.features || ''}|${options.script || ''}|${options.language || ''}`
  }

  private _cacheResult(key: string, result: IShapeResult): void {
    // Simple LRU: evict oldest when full
    if (this.shapeCache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.shapeCache.keys().next().value
      if (firstKey !== undefined) {
        this.shapeCache.delete(firstKey)
      }
    }
    this.shapeCache.set(key, result)
  }
}
