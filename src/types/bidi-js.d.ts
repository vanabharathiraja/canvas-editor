declare module 'bidi-js' {
  interface BidiAPI {
    getEmbeddingLevels(text: string, explicitDirection?: 'ltr' | 'rtl'): number[]
    getReorderedIndices(text: string, explicitDirection?: 'ltr' | 'rtl'): number[]
    getReorderedString(text: string, explicitDirection?: 'ltr' | 'rtl'): string
    getBidiCharType(char: string): number
    getBidiCharTypeName(char: string): string
    // Add other exported methods if needed
  }

  function bidiFactory(): BidiAPI
  export default bidiFactory
}
