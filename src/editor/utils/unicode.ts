/**
 * Unicode script detection utilities for smart text routing.
 *
 * Determines whether text contains characters from "complex" scripts
 * that require HarfBuzz shaping (contextual forms, ligatures, reordering)
 * versus "simple" scripts that the native Canvas API handles well.
 *
 * The distinction matters for rendering quality: native ctx.fillText()
 * uses subpixel anti-aliasing + font hinting which produces sharper
 * results at small sizes than OpenType.js path drawing.
 */

/**
 * Unicode code-point ranges for scripts that require complex shaping.
 *
 * These scripts have one or more of:
 * - Contextual glyph forms (Arabic initial/medial/final/isolated)
 * - Mandatory ligatures (Arabic lam-alef, Devanagari conjuncts)
 * - Glyph reordering (Indic scripts: vowel signs move before consonants)
 * - Above/below mark positioning (Thai, Lao, Tibetan)
 * - Cluster-based rendering (Myanmar, Khmer)
 *
 * Scripts NOT included (handled well by Canvas API):
 * - Latin, Cyrillic, Greek — simple left-to-right
 * - CJK (Han, Hiragana, Katakana, Hangul) — fixed-width, no shaping
 * - Emoji — rendered by system
 */
const COMPLEX_SCRIPT_RANGES: [number, number][] = [
  // Arabic family
  [0x0600, 0x06FF],   // Arabic
  [0x0750, 0x077F],   // Arabic Supplement
  [0x0870, 0x089F],   // Arabic Extended-B
  [0x08A0, 0x08FF],   // Arabic Extended-A
  [0xFB50, 0xFDFF],   // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF],   // Arabic Presentation Forms-B

  // Hebrew (less complex but benefits from shaping for nikud/cantillation)
  [0x0590, 0x05FF],   // Hebrew
  [0xFB1D, 0xFB4F],   // Hebrew Presentation Forms

  // Indic scripts (all have reordering / conjuncts)
  [0x0900, 0x097F],   // Devanagari
  [0x0980, 0x09FF],   // Bengali
  [0x0A00, 0x0A7F],   // Gurmukhi
  [0x0A80, 0x0AFF],   // Gujarati
  [0x0B00, 0x0B7F],   // Oriya
  [0x0B80, 0x0BFF],   // Tamil
  [0x0C00, 0x0C7F],   // Telugu
  [0x0C80, 0x0CFF],   // Kannada
  [0x0D00, 0x0D7F],   // Malayalam
  [0x0D80, 0x0DFF],   // Sinhala

  // Southeast Asian (tone marks, stacking)
  [0x0E00, 0x0E7F],   // Thai
  [0x0E80, 0x0EFF],   // Lao
  [0x0F00, 0x0FFF],   // Tibetan
  [0x1000, 0x109F],   // Myanmar
  [0x1780, 0x17FF],   // Khmer
  [0x1A00, 0x1A1F],   // Buginese
  [0x1B00, 0x1B7F],   // Balinese
  [0xA9E0, 0xA9FF],   // Myanmar Extended-B
  [0xAA60, 0xAA7F],   // Myanmar Extended-A

  // Additional complex scripts
  [0x10900, 0x1091F], // Phoenician
  [0x10A00, 0x10A5F], // Kharoshthi
  [0x11000, 0x1107F], // Brahmi
  [0x11100, 0x1114F], // Chakma
  [0x11600, 0x1165F], // Modi
  [0x11700, 0x1174F], // Ahom
]

/**
 * Precomputed sorted ranges for binary search.
 * Sorted by start code point.
 */
const SORTED_RANGES = COMPLEX_SCRIPT_RANGES.slice().sort(
  (a, b) => a[0] - b[0]
)

/**
 * Check if a single code point falls within a complex-script range.
 * Uses binary search for O(log n) lookup.
 */
function isComplexCodePoint(code: number): boolean {
  let lo = 0
  let hi = SORTED_RANGES.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1
    const [start, end] = SORTED_RANGES[mid]
    if (code < start) {
      hi = mid - 1
    } else if (code > end) {
      lo = mid + 1
    } else {
      return true // code >= start && code <= end
    }
  }
  return false
}

/**
 * Determine if a text string contains any characters that require
 * complex text shaping via HarfBuzz.
 *
 * Returns true if ANY character in the string belongs to a complex
 * script range. For mixed-script text, even a single complex character
 * means the entire run should go through the shaping engine.
 *
 * @param text The text to check
 * @returns true if the text needs complex shaping (ShapeEngine),
 *          false if native Canvas API is sufficient
 */
export function needsComplexShaping(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!
    if (isComplexCodePoint(code)) return true
    // Skip trailing surrogate of astral code points
    if (code > 0xFFFF) i++
  }
  return false
}

/**
 * Detect the likely script of a text string based on the first
 * non-common character. Returns an ISO 15924 script tag for
 * HarfBuzz, or undefined if the script cannot be determined.
 *
 * This is a lightweight heuristic — HarfBuzz's guessSegmentProperties()
 * is more accurate for production use.
 */
export function detectScript(text: string): string | undefined {
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!
    // Skip common/inherited characters (spaces, punctuation, digits)
    if (code < 0x0080) { // ASCII
      if (code > 0xFFFF) i++
      continue
    }
    // Arabic
    if ((code >= 0x0600 && code <= 0x06FF) ||
        (code >= 0x0750 && code <= 0x077F) ||
        (code >= 0x08A0 && code <= 0x08FF) ||
        (code >= 0xFB50 && code <= 0xFDFF) ||
        (code >= 0xFE70 && code <= 0xFEFF)) {
      return 'Arab'
    }
    // Hebrew
    if ((code >= 0x0590 && code <= 0x05FF) ||
        (code >= 0xFB1D && code <= 0xFB4F)) {
      return 'Hebr'
    }
    // Devanagari
    if (code >= 0x0900 && code <= 0x097F) return 'Deva'
    // Bengali
    if (code >= 0x0980 && code <= 0x09FF) return 'Beng'
    // Tamil
    if (code >= 0x0B80 && code <= 0x0BFF) return 'Taml'
    // Thai
    if (code >= 0x0E00 && code <= 0x0E7F) return 'Thai'
    // Latin block
    if (code >= 0x0041 && code <= 0x024F) return 'Latn'
    // CJK
    if ((code >= 0x4E00 && code <= 0x9FFF) ||
        (code >= 0x3400 && code <= 0x4DBF)) {
      return 'Hani'
    }
    if (code > 0xFFFF) i++
  }
  return undefined
}

/**
 * Detect the likely text direction from content.
 * Returns 'rtl' if the first strong directional character is RTL,
 * 'ltr' otherwise.
 */
export function detectDirection(text: string): 'ltr' | 'rtl' {
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!
    // Arabic or Hebrew → RTL
    if ((code >= 0x0590 && code <= 0x05FF) || // Hebrew
        (code >= 0x0600 && code <= 0x06FF) || // Arabic
        (code >= 0x0750 && code <= 0x077F) || // Arabic Supplement
        (code >= 0x08A0 && code <= 0x08FF) || // Arabic Extended-A
        (code >= 0xFB1D && code <= 0xFB4F) || // Hebrew Presentation
        (code >= 0xFB50 && code <= 0xFDFF) || // Arabic Presentation A
        (code >= 0xFE70 && code <= 0xFEFF)) { // Arabic Presentation B
      return 'rtl'
    }
    // Latin, Cyrillic, Greek, CJK → LTR
    if ((code >= 0x0041 && code <= 0x005A) || // A-Z
        (code >= 0x0061 && code <= 0x007A) || // a-z
        (code >= 0x00C0 && code <= 0x024F) || // Latin Extended
        (code >= 0x0400 && code <= 0x04FF) || // Cyrillic
        (code >= 0x0370 && code <= 0x03FF) || // Greek
        (code >= 0x4E00 && code <= 0x9FFF)) { // CJK
      return 'ltr'
    }
    if (code > 0xFFFF) i++
  }
  return 'ltr'
}
