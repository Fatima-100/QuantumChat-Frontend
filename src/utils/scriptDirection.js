/**
 * Unicode and RTL script detection utilities for QuantumChat.
 * Supports English, Urdu, Arabic, Turkish, Persian, Hebrew, Hindi, and other global scripts.
 */

export const RTL_LANGUAGES = new Set([
  'ar', // Arabic
  'ur', // Urdu
  'fa', // Persian/Farsi
  'he', // Hebrew
  'ps', // Pashto
  'sd', // Sindhi
  'ug', // Uyghur
  'yi', // Yiddish
]);

/**
 * Returns true if the given language code is Right-to-Left.
 * @param {string} lang 
 * @returns {boolean}
 */
export function isRTL(lang) {
  if (!lang || typeof lang !== 'string') return false;
  const base = lang.split('-')[0].toLowerCase();
  return RTL_LANGUAGES.has(base);
}

/**
 * Regex matching strong RTL Unicode ranges:
 * - \u0590-\u05FF: Hebrew
 * - \u0600-\u06FF: Arabic, Urdu, Persian
 * - \u0750-\u077F: Arabic Supplement
 * - \u08A0-\u08FF: Arabic Extended-A
 * - \uFB50-\uFDFF: Arabic Presentation Forms-A (contains Nastaliq glyphs)
 * - \uFE70-\uFEFF: Arabic Presentation Forms-B
 */
const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Regex matching strong LTR Unicode ranges (Latin, Cyrillic, Greek, Devanagari, CJK, etc.)
 */
const LTR_REGEX = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0900-\u097F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;

/**
 * Detects whether a piece of text is primarily RTL or LTR by examining
 * its first strong directional character.
 * 
 * @param {string} text 
 * @returns {'rtl' | 'ltr'}
 */
export function detectTextDirection(text) {
  if (!text || typeof text !== 'string') return 'ltr';

  // Strip leading whitespace, numbers, symbols, and emojis to find first directional char
  for (const char of text) {
    if (RTL_REGEX.test(char)) return 'rtl';
    if (LTR_REGEX.test(char)) return 'ltr';
  }

  return 'ltr';
}

export const getTextDirection = detectTextDirection;
