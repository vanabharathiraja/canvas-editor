import bidiFactory from 'bidi-js'
import { IElement } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'

export interface IBidiRun {
  start: number // Logical index in elementList
  end: number // Logical index
  level: number // Embedding level (0=LTR, 1=RTL, 2+=nested)
  direction: 'ltr' | 'rtl'
  elements: IRowElement[] // Elements in this run
}

export class BidiManager {
  private bidi: ReturnType<typeof bidiFactory>

  constructor() {
    // Initialize the bidi function from the factory
    this.bidi = bidiFactory()
  }

  /**
   * Analyze a row's elements and split into bidi runs
   */
  public analyzeRow(elements: IRowElement[]): IBidiRun[] {
    if (!elements || elements.length === 0) {
      return []
    }

    // Concatenate all values to get full text
    const text = elements.map(el => el.value || '').join('')

    // Empty or whitespace-only text - treat as single LTR run
    if (!text.trim()) {
      return [
        {
          start: 0,
          end: elements.length - 1,
          level: 0,
          direction: 'ltr',
          elements
        }
      ]
    }

    // Use bidi-js to get embedding levels
    const levels = this.bidi.getEmbeddingLevels(text)

    // Map character indices to element indices
    const runs: IBidiRun[] = []
    let charIndex = 0
    let currentRun: IBidiRun | null = null

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const elementLength = element.value?.length || 0

      // Skip elements with no text content
      if (elementLength === 0) {
        charIndex += elementLength
        continue
      }

      // Get level for first character of this element
      const level = levels[charIndex] || 0
      const direction: 'ltr' | 'rtl' = level % 2 === 0 ? 'ltr' : 'rtl'

      // Start new run if direction changed or style changed
      if (
        !currentRun ||
        currentRun.level !== level ||
        this._styleChanged(
          currentRun.elements[currentRun.elements.length - 1],
          element
        )
      ) {
        if (currentRun) runs.push(currentRun)

        currentRun = {
          start: i,
          end: i,
          level,
          direction,
          elements: [element]
        }
      } else {
        currentRun.end = i
        currentRun.elements.push(element)
      }

      charIndex += elementLength
    }

    if (currentRun) runs.push(currentRun)

    // If only one run and it's LTR, return empty to skip bidi processing
    if (runs.length === 1 && runs[0].direction === 'ltr') {
      return []
    }

    return runs
  }

  /**
   * Reorder runs for visual display (Unicode Bidirectional Algorithm)
   */
  public reorderRuns(runs: IBidiRun[]): IBidiRun[] {
    if (!runs || runs.length === 0) {
      return runs
    }

    // Implement UAX#9 L2 (reorder resolved levels)
    const maxLevel = Math.max(...runs.map(r => r.level), 0)
    const orderedRuns = [...runs]

    // Reverse runs from highest to lowest level
    for (let level = maxLevel; level > 0; level--) {
      for (let i = 0; i < orderedRuns.length; i++) {
        if (orderedRuns[i].level >= level) {
          let j = i
          while (j < orderedRuns.length && orderedRuns[j].level >= level) {
            j++
          }
          // Reverse runs[i...j-1]
          const segment = orderedRuns.slice(i, j).reverse()
          orderedRuns.splice(i, j - i, ...segment)
          i = j - 1
        }
      }
    }

    return orderedRuns
  }

  private _styleChanged(el1: IElement, el2: IElement): boolean {
    return (
      el1.size !== el2.size ||
      el1.font !== el2.font ||
      el1.bold !== el2.bold ||
      el1.italic !== el2.italic ||
      el1.color !== el2.color
    )
  }
}
