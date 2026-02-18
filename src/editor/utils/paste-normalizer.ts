/**
 * Paste Normalizer — Source detection, sanitization, and HTML
 * pre-processing for clipboard content from external applications.
 *
 * This module runs BEFORE getElementListByHTML() to clean up
 * vendor-specific HTML (Word, Google Docs, Excel) and strip
 * potentially dangerous content (XSS vectors).
 */

export type PasteSource = 'word' | 'google-docs' | 'excel' | 'unknown'

/**
 * Detect the source application from clipboard HTML markers.
 * Order matters — Excel check must come before Word because
 * Excel also includes Word-like `<meta>` tags.
 */
export function detectPasteSource(html: string): PasteSource {
  if (/ProgId\s*=?\s*["']?Excel\.Sheet/i.test(html)) return 'excel'
  if (/class\s*=\s*"?Mso|ProgId\s*=?\s*["']?Word\.Document/i.test(html)) {
    return 'word'
  }
  if (/id\s*=\s*"docs-internal-guid-/.test(html)) return 'google-docs'
  return 'unknown'
}

/**
 * Strip XSS vectors and dangerous content from HTML.
 * - Removes <script> tags and content
 * - Removes on* event handler attributes
 * - Sanitizes javascript:/vbscript: hrefs
 * - Strips <!--StartFragment-->...<!--EndFragment--> comments
 * - Removes <meta> tags (often injected by Word/Docs)
 */
export function sanitizeHTML(html: string): string {
  // Remove <script> tags and their content
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')

  // Remove on* event attributes (onclick, onload, onerror, etc.)
  html = html.replace(
    /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
    ''
  )

  // Neutralize javascript: and vbscript: in href/src attributes
  html = html.replace(
    /(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi,
    '$1=""'
  )
  html = html.replace(
    /(href|src)\s*=\s*(?:"vbscript:[^"]*"|'vbscript:[^']*')/gi,
    '$1=""'
  )

  // Strip fragment comments
  html = html.replace(/<!--\s*StartFragment\s*-->/gi, '')
  html = html.replace(/<!--\s*EndFragment\s*-->/gi, '')

  // Strip <meta> tags
  html = html.replace(/<meta[^>]*>/gi, '')

  return html
}

/**
 * Normalize whitespace artifacts common across paste sources.
 * - Converts non-breaking spaces (&nbsp;) that appear outside tags
 * - Trims leading/trailing whitespace from the HTML body
 */
function normalizeWhitespace(html: string): string {
  // Replace sequences of &nbsp; used as spacers with regular spaces
  // (but keep single &nbsp; as they may be intentional)
  html = html.replace(/(&nbsp;){2,}/gi, match => {
    return ' '.repeat(match.split('&nbsp;').length - 1)
  })
  return html.trim()
}

/**
 * Main entry point — detect source, sanitize, and return cleaned HTML.
 * Source-specific normalizers (Word, Google Docs, Excel) will be added
 * in future phases (P3, P4, P5).
 */
export function normalizePasteHTML(html: string): {
  html: string
  source: PasteSource
} {
  const source = detectPasteSource(html)

  // Generic sanitization (all sources)
  html = sanitizeHTML(html)
  html = normalizeWhitespace(html)

  // Source-specific normalization will be added here:
  // switch (source) {
  //   case 'word':       html = normalizeWordHTML(html); break
  //   case 'google-docs': html = normalizeGoogleDocsHTML(html); break
  //   case 'excel':      html = normalizeExcelHTML(html); break
  // }

  return { html, source }
}
