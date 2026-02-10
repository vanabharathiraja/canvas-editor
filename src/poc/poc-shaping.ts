/**
 * POC Shaping Engine Test
 *
 * Interactive test page for validating HarfBuzz.js + OpenType.js integration.
 * Loads fonts, shapes text, and renders using glyph paths.
 * Compare with native Canvas fillText for visual validation.
 */

import { ShapeEngine } from '../editor/core/shaping/ShapeEngine'
import type { IShapeResult } from '../editor/core/shaping/interface/ShapeEngine'

const statusEl = document.getElementById('status') as HTMLDivElement
const fontFileInput = document.getElementById('fontFile') as HTMLInputElement
const fontUrlInput = document.getElementById('fontUrl') as HTMLInputElement
const loadFontBtn = document.getElementById('loadFontBtn') as HTMLButtonElement
const textInput = document.getElementById('textInput') as HTMLInputElement
const directionSelect = document.getElementById(
  'directionSelect'
) as HTMLSelectElement
const fontSizeSelect = document.getElementById(
  'fontSizeSelect'
) as HTMLSelectElement
const featuresInput = document.getElementById(
  'featuresInput'
) as HTMLInputElement
const shapeBtn = document.getElementById('shapeBtn') as HTMLButtonElement
const canvasRef = document.getElementById('canvasRef') as HTMLCanvasElement
const canvasShaped = document.getElementById(
  'canvasShaped'
) as HTMLCanvasElement
const glyphInfoEl = document.getElementById('glyphInfo') as HTMLDivElement

let engine: ShapeEngine
let currentFontId = ''
let currentFontFace: FontFace | null = null

function setStatus(msg: string, type: 'info' | 'error' | 'success' = 'info') {
  statusEl.textContent = msg
  statusEl.className = `status-${type}`
}

function appendStatus(msg: string) {
  statusEl.textContent += '\n' + msg
}

// ---- Initialize ----
async function initialize() {
  setStatus('Initializing ShapeEngine (loading HarfBuzz WASM)...')

  try {
    engine = ShapeEngine.getInstance()
    // Resolve the base path for HarfBuzz assets (Vite serves public/ under base)
    const base = import.meta.env.BASE_URL || '/'
    await engine.init(`${base}harfbuzz`)
    setStatus('ShapeEngine initialized successfully!', 'success')
    loadFontBtn.disabled = false
  } catch (err: any) {
    setStatus(`Failed to initialize: ${err.message}`, 'error')
    console.error(err)
  }
}

// ---- Font Loading ----
loadFontBtn.addEventListener('click', async () => {
  const file = fontFileInput.files?.[0]
  const url = fontUrlInput.value.trim()

  if (!file && !url) {
    setStatus('Please select a font file or enter a URL.', 'error')
    return
  }

  loadFontBtn.disabled = true
  setStatus('Loading font...')

  try {
    if (file) {
      // Load from file - create an object URL
      const objectUrl = URL.createObjectURL(file)
      currentFontId = file.name.replace(/\.[^.]+$/, '')

      // Also load into browser CSS for reference canvas
      const fontData = await file.arrayBuffer()
      currentFontFace = new FontFace(currentFontId, fontData)
      await currentFontFace.load()
      ;(document.fonts as any).add(currentFontFace)

      await engine.loadFont(currentFontId, objectUrl)
    } else {
      // Load from URL
      currentFontId = url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'custom'

      // Load into browser for reference
      currentFontFace = new FontFace(currentFontId, `url(${url})`)
      await currentFontFace.load()
      ;(document.fonts as any).add(currentFontFace)

      await engine.loadFont(currentFontId, url)
    }

    const metrics = engine.getFontMetrics(currentFontId)
    setStatus(
      `Font "${currentFontId}" loaded successfully!\n` +
        `  unitsPerEm: ${metrics?.unitsPerEm}\n` +
        `  ascender: ${metrics?.ascender}\n` +
        `  descender: ${metrics?.descender}`,
      'success'
    )

    shapeBtn.disabled = false
  } catch (err: any) {
    setStatus(`Failed to load font: ${err.message}`, 'error')
    console.error(err)
  } finally {
    loadFontBtn.disabled = false
  }
})

// ---- Shaping & Rendering ----
shapeBtn.addEventListener('click', () => {
  const text = textInput.value
  const direction = directionSelect.value as 'ltr' | 'rtl'
  const fontSize = parseInt(fontSizeSelect.value, 10)
  const features = featuresInput.value.trim() || undefined

  if (!text) {
    setStatus('Enter text to shape.', 'error')
    return
  }

  if (!currentFontId || !engine.hasFont(currentFontId)) {
    setStatus('Load a font first.', 'error')
    return
  }

  try {
    // Time the shaping
    const t0 = performance.now()
    const result = engine.shapeText(text, currentFontId, fontSize, {
      direction,
      features
    })
    const shapingTime = performance.now() - t0

    // Render reference (native Canvas API)
    renderReference(text, fontSize, direction)

    // Render shaped glyphs
    const t1 = performance.now()
    renderShaped(result, fontSize)
    const renderTime = performance.now() - t1

    // Display results
    appendStatus(
      `\nShaped "${text}" (${direction.toUpperCase()}) @ ${fontSize}px` +
        `\n  Shaping time: ${shapingTime.toFixed(2)}ms` +
        `\n  Render time:  ${renderTime.toFixed(2)}ms` +
        `\n  Total advance: ${result.totalAdvance.toFixed(2)}px` +
        `\n  Glyph count:  ${result.glyphs.length}`
    )

    // Show glyph info
    displayGlyphInfo(result, text)
  } catch (err: any) {
    setStatus(`Shaping error: ${err.message}`, 'error')
    console.error(err)
  }
})

function renderReference(text: string, fontSize: number, direction: string) {
  const ctx = canvasRef.getContext('2d')!
  ctx.clearRect(0, 0, canvasRef.width, canvasRef.height)

  // Draw baseline
  const baseline = 80
  ctx.strokeStyle = '#e0e0e0'
  ctx.beginPath()
  ctx.moveTo(0, baseline)
  ctx.lineTo(canvasRef.width, baseline)
  ctx.stroke()

  // Draw text using native Canvas API
  ctx.font = `${fontSize}px "${currentFontId}", sans-serif`
  ctx.fillStyle = '#333'
  ctx.direction = direction as CanvasDirection
  ctx.textBaseline = 'alphabetic'

  const x = direction === 'rtl' ? canvasRef.width - 20 : 20
  ctx.fillText(text, x, baseline)

  // Show measured width
  const measured = ctx.measureText(text)
  ctx.fillStyle = '#999'
  ctx.font = '11px system-ui'
  ctx.direction = 'ltr'
  ctx.fillText(`Canvas measured width: ${measured.width.toFixed(2)}px`, 10, 110)
}

function renderShaped(result: IShapeResult, fontSize: number) {
  const ctx = canvasShaped.getContext('2d')!
  ctx.clearRect(0, 0, canvasShaped.width, canvasShaped.height)

  // Draw baseline
  const baseline = 80
  ctx.strokeStyle = '#e0e0e0'
  ctx.beginPath()
  ctx.moveTo(0, baseline)
  ctx.lineTo(canvasShaped.width, baseline)
  ctx.stroke()

  // Render shaped glyphs
  const startX = result.direction === 'rtl' ? canvasShaped.width - 20 : 20
  const x =
    result.direction === 'rtl'
      ? startX - result.totalAdvance
      : startX

  engine.renderGlyphs(
    ctx,
    result,
    currentFontId,
    fontSize,
    x,
    baseline,
    '#333'
  )

  // Show shaped width
  ctx.fillStyle = '#999'
  ctx.font = '11px system-ui'
  ctx.fillText(
    `Shaped advance width: ${result.totalAdvance.toFixed(2)}px`,
    10,
    110
  )
}

function displayGlyphInfo(result: IShapeResult, text: string) {
  const lines = [
    `Text: "${text}"  |  Direction: ${result.direction}  |  Total advance: ${result.totalAdvance.toFixed(2)}px`,
    `${'─'.repeat(80)}`,
    `${'Idx'.padEnd(5)}${'GlyphID'.padEnd(10)}${'Cluster'.padEnd(10)}${'xAdv'.padEnd(12)}${'yAdv'.padEnd(12)}${'xOff'.padEnd(12)}${'yOff'.padEnd(12)}Flags`
  ]

  result.glyphs.forEach((g, i) => {
    lines.push(
      `${String(i).padEnd(5)}` +
        `${String(g.glyphId).padEnd(10)}` +
        `${String(g.cluster).padEnd(10)}` +
        `${g.xAdvance.toFixed(2).padEnd(12)}` +
        `${g.yAdvance.toFixed(2).padEnd(12)}` +
        `${g.xOffset.toFixed(2).padEnd(12)}` +
        `${g.yOffset.toFixed(2).padEnd(12)}` +
        `${g.flags}`
    )
  })

  glyphInfoEl.textContent = lines.join('\n')
}

// Also allow Enter key to trigger shaping
textInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !shapeBtn.disabled) {
    shapeBtn.click()
  }
})

// Start initialization
initialize()
