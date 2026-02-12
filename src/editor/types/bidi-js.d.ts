declare module 'bidi-js' {
  interface BidiParagraph {
    start: number
    end: number
    level: number
  }

  interface EmbeddingLevelsResult {
    levels: Uint8Array
    paragraphs: BidiParagraph[]
  }

  interface BidiInstance {
    getEmbeddingLevels(
      text: string,
      explicitDirection?: 'ltr' | 'rtl'
    ): EmbeddingLevelsResult

    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number
    ): [number, number][]

    getMirroredCharactersMap(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number
    ): Map<number, string>

    getMirroredCharacter(char: string): string | null

    getBidiCharTypeName(char: string): string
  }

  function bidiFactory(): BidiInstance
  export default bidiFactory
}
