/**
 * Convert a string to a URL-friendly slug (lowercase, hyphens, alphanumeric).
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
    if (text == null || typeof text !== 'string') return ''
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}
