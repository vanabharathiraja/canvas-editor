/**
 * Bidirectional (BiDi) text utilities for mixed LTR/RTL text layout.
 *
 * Wraps the `bidi-js` library (UAX#9 conformant) to provide:
 * - Embedding level computation for mixed-direction text
 * - Directional run segmentation (contiguous same-direction ranges)
 * - Visual reordering of element arrays for display
 *
 * Architecture note: the position array stays in LOGICAL order.
 * BiDi reordering affects the X coordinates assigned to elements,
 * not the order of the position array itself.
 */
import bidiFactory from 'bidi-js'

const bidi = bidiFactory()

/**
 * A contiguous run of characters sharing the same embedding level
 * (and therefore the same direction).
 */
export interface IDirectionalRun {
  /** Start index in the logical element array (inclusive) */
  startIndex: number
  /** End index in the logical element array (exclusive) */
  endIndex: number
  /** BiDi embedding level (odd = RTL, even = LTR) */
  level: number
  /** Whether this run is RTL */
  isRTL: boolean
  /** Concatenated text of all elements in this run */
  text: string
}

/**
 * Result of BiDi analysis for a row of elements.
 */
export interface IBidiResult {
  /** The resolved embedding levels per character */
  levels: Uint8Array
  /** Paragraph base direction: 0 = LTR, 1 = RTL */
  paragraphLevel: number
  /** Directional runs in logical order */
  runs: IDirectionalRun[]
  /** Whether the row contains mixed directions */
  isMixed: boolean
  /**
   * Visual order mapping: visualOrder[visualIndex] = logicalIndex.
   * For each visual position (left-to-right on screen), gives the
   * logical element index.
   */
  visualOrder: number[]
}

/**
 * Compute BiDi embedding levels for a string of text.
 *
 * This is the core UAX#9 algorithm that determines the nesting
 * level of each character. Odd levels = RTL, even levels = LTR.
 *
 * @param text - The text to analyze
 * @param direction - Explicit paragraph direction, or 'auto' to detect
 * @returns Object with levels (Uint8Array) and paragraph info
 */
export function computeEmbeddingLevels(
  text: string,
  direction: 'ltr' | 'rtl' | 'auto' = 'auto'
): { levels: Uint8Array; paragraphLevel: number } {
  const explicitDir = direction === 'auto' ? undefined : direction
  const result = bidi.getEmbeddingLevels(text, explicitDir)
  // Extract paragraph level from the paragraphs array
  const paragraphLevel =
    result.paragraphs.length > 0 ? result.paragraphs[0].level : 0
  return {
    levels: result.levels,
    paragraphLevel
  }
}

/**
 * Extract directional runs from embedding levels.
 *
 * Groups consecutive characters with the same embedding level into
 * runs. Each run represents a contiguous sequence that flows in
 * one direction.
 *
 * @param text - The original text
 * @param levels - Embedding levels from computeEmbeddingLevels()
 * @returns Array of directional runs in logical order
 */
export function getDirectionalRuns(
  text: string,
  levels: Uint8Array
): IDirectionalRun[] {
  if (text.length === 0) return []

  const runs: IDirectionalRun[] = []
  let runStart = 0
  let currentLevel = levels[0]

  for (let i = 1; i <= text.length; i++) {
    // End of text or level changed → emit run
    if (i === text.length || levels[i] !== currentLevel) {
      runs.push({
        startIndex: runStart,
        endIndex: i,
        level: currentLevel,
        isRTL: (currentLevel & 1) === 1,
        text: text.slice(runStart, i)
      })
      if (i < text.length) {
        runStart = i
        currentLevel = levels[i]
      }
    }
  }

  return runs
}

/**
 * Compute the visual order of logical indices for a row.
 *
 * Uses the UAX#9 L2 reordering algorithm to determine how
 * characters should be rearranged for display. The returned
 * array maps visual positions to logical indices.
 *
 * @param text - The full row text
 * @param levels - Embedding levels
 * @param start - Start index in text (for line-level reordering)
 * @param end - End index in text (inclusive)
 * @returns Array where result[visualPos] = logicalPos
 */
export function computeVisualOrder(
  text: string,
  levels: Uint8Array,
  start = 0,
  end = text.length - 1
): number[] {
  // Get the reversal segments from bidi-js
  const reorderSegments = bidi.getReorderSegments(
    text,
    { levels, paragraphs: [{ start: 0, end: text.length - 1, level: 0 }] },
    start,
    end
  )

  // Start with identity mapping
  const order: number[] = []
  for (let i = start; i <= end; i++) {
    order.push(i)
  }

  // Apply each reversal segment in order
  reorderSegments.forEach((segment: [number, number]) => {
    const [segStart, segEnd] = segment
    // Convert to local indices
    const localStart = segStart - start
    const localEnd = segEnd - start
    // Reverse this range in-place
    let lo = localStart
    let hi = localEnd
    while (lo < hi) {
      const tmp = order[lo]
      order[lo] = order[hi]
      order[hi] = tmp
      lo++
      hi--
    }
  })

  return order
}

/**
 * Get mirrored characters map for RTL characters.
 *
 * Some characters like parentheses need to be visually mirrored
 * when in an RTL context: ( becomes ), [ becomes ], etc.
 *
 * @param text - The text to check
 * @param levels - Embedding levels
 * @param start - Start index
 * @param end - End index (inclusive)
 * @returns Map of character index → replacement character
 */
export function getMirroredCharacters(
  text: string,
  levels: Uint8Array,
  start = 0,
  end = text.length - 1
): Map<number, string> {
  return bidi.getMirroredCharactersMap(
    text,
    { levels, paragraphs: [{ start: 0, end: text.length - 1, level: 0 }] },
    start,
    end
  )
}

/**
 * Perform full BiDi analysis on a row's text.
 *
 * This is the main entry point for BiDi processing. It computes
 * embedding levels, extracts directional runs, determines visual
 * order, and identifies whether the text has mixed directions.
 *
 * @param text - The concatenated text of all elements in the row
 * @param direction - Explicit paragraph direction or 'auto'
 * @returns Complete BiDi analysis result
 */
export function analyzeBidi(
  text: string,
  direction: 'ltr' | 'rtl' | 'auto' = 'auto'
): IBidiResult {
  if (text.length === 0) {
    return {
      levels: new Uint8Array(0),
      paragraphLevel: direction === 'rtl' ? 1 : 0,
      runs: [],
      isMixed: false,
      visualOrder: []
    }
  }

  const { levels, paragraphLevel } = computeEmbeddingLevels(text, direction)
  const runs = getDirectionalRuns(text, levels)
  const visualOrder = computeVisualOrder(text, levels)

  // Check if there's more than one unique level (= mixed directions)
  const isMixed = runs.length > 1 && runs.some(r => r.isRTL !== runs[0].isRTL)

  return {
    levels,
    paragraphLevel,
    runs,
    isMixed,
    visualOrder
  }
}

/**
 * Check if a character's embedding level indicates RTL.
 */
export function isRTLLevel(level: number): boolean {
  return (level & 1) === 1
}

/**
 * Get the bidi character type name for a character.
 * Returns values like 'L', 'R', 'AL', 'EN', 'AN', 'NSM', etc.
 *
 * Useful for debugging and understanding why characters resolve
 * to particular embedding levels.
 */
export function getBidiCharType(char: string): string {
  return bidi.getBidiCharTypeName(char)
}

/**
 * Map element-level indices to character-level BiDi data.
 *
 * Since each IElement typically holds one character (element.value),
 * this maps the per-character BiDi levels back to per-element levels.
 * Handles multi-character elements (e.g., ZERO_WIDTH_SPACE or tabs)
 * by using the level of the first character.
 *
 * @param elementValues - Array of element value strings
 * @param levels - Character-level embedding levels
 * @returns Per-element embedding levels
 */
export function mapElementLevels(
  elementValues: string[],
  levels: Uint8Array
): number[] {
  const elementLevels: number[] = []
  let charIdx = 0
  for (const value of elementValues) {
    elementLevels.push(levels[charIdx] ?? 0)
    charIdx += value.length
  }
  return elementLevels
}

/**
 * Compute visual element order for a row.
 *
 * Given element values and their embedding levels, determines
 * the visual order in which elements should be positioned
 * left-to-right on screen.
 *
 * @param elementValues - Array of element value strings
 * @param direction - Paragraph direction
 * @returns visualOrder[visualPos] = logicalElementIndex
 */
export function computeElementVisualOrder(
  elementValues: string[],
  direction: 'ltr' | 'rtl' | 'auto' = 'auto'
): { visualOrder: number[]; levels: number[]; isMixed: boolean } {
  // Concatenate all element values to form the row text
  const text = elementValues.join('')
  if (text.length === 0) {
    return { visualOrder: [], levels: [], isMixed: false }
  }

  // Get character-level BiDi analysis
  const { levels } = computeEmbeddingLevels(text, direction)
  const charVisualOrder = computeVisualOrder(text, levels)

  // Map character positions back to element indices
  const charToElement: number[] = []
  for (let elemIdx = 0; elemIdx < elementValues.length; elemIdx++) {
    const len = elementValues[elemIdx].length
    for (let j = 0; j < len; j++) {
      charToElement.push(elemIdx)
    }
  }

  // Build element visual order (deduplicated)
  const elementVisualOrder: number[] = []
  const seen = new Set<number>()
  for (const charLogicalIdx of charVisualOrder) {
    const elemIdx = charToElement[charLogicalIdx]
    if (elemIdx !== undefined && !seen.has(elemIdx)) {
      seen.add(elemIdx)
      elementVisualOrder.push(elemIdx)
    }
  }

  // Per-element levels
  const elementLevels = mapElementLevels(elementValues, levels)

  // Check for mixed directions
  const hasRTL = elementLevels.some(l => (l & 1) === 1)
  const hasLTR = elementLevels.some(l => (l & 1) === 0)
  const isMixed = hasRTL && hasLTR

  return {
    visualOrder: elementVisualOrder,
    levels: elementLevels,
    isMixed
  }
}
