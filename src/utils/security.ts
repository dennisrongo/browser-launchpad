/**
 * Security utilities for API key storage
 * Implements encoding for API keys to prevent casual inspection
 */

/**
 * Encode an API key using Base64 encoding
 * Note: This is encoding, not encryption. It prevents casual inspection
 * but is not a substitute for proper security practices.
 */
export function encodeApiKey(apiKey: string): string {
  if (!apiKey) return ''
  try {
    // Use btoa for Base64 encoding
    return btoa(apiKey)
  } catch (error) {
    console.error('Failed to encode API key:', error)
    return apiKey // Return original if encoding fails
  }
}

/**
 * Decode a Base64-encoded API key
 */
export function decodeApiKey(encodedKey: string): string {
  if (!encodedKey) return ''
  try {
    // Use atob for Base64 decoding
    return atob(encodedKey)
  } catch (error) {
    console.error('Failed to decode API key:', error)
    return encodedKey // Return original if decoding fails (might not be encoded)
  }
}

/**
 * Check if a string appears to be Base64-encoded
 * This is a simple heuristic check
 */
export function isBaseEncoded(value: string): boolean {
  if (!value || value.length < 4) return false
  try {
    // Try to decode - if it succeeds, it's likely Base64
    const decoded = atob(value)
    // Check if decoded result looks like a valid API key
    return decoded.length > 0
  } catch {
    return false
  }
}

/**
 * Safely log API key information (logs only length and first/last chars)
 * Use this instead of console.log for API keys
 */
export function logApiKeyInfo(apiKey: string, context: string = 'API key'): void {
  if (!apiKey) {
    console.log(`${context}: <empty>`)
    return
  }
  const len = apiKey.length
  const firstTwo = apiKey.substring(0, 2)
  const lastTwo = apiKey.substring(len - 2)
  console.log(`${context}: ${firstTwo}...${lastTwo} (length: ${len})`)
}

/**
 * Validate that API key doesn't contain suspicious patterns
 * This helps prevent accidentally logging or storing malicious content
 */
export function validateApiKeyContent(apiKey: string): { valid: boolean; reason?: string } {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, reason: 'API key is empty or invalid' }
  }

  // Check for script tags or HTML (potential XSS)
  if (apiKey.includes('<script') || apiKey.includes('javascript:')) {
    return { valid: false, reason: 'API key contains suspicious patterns' }
  }

  // Check for excessive length (likely not a real API key)
  if (apiKey.length > 1000) {
    return { valid: false, reason: 'API key is too long' }
  }

  // Check for non-printable characters
  const printableRegex = /^[\x20-\x7E]+$/
  if (!printableRegex.test(apiKey)) {
    return { valid: false, reason: 'API key contains invalid characters' }
  }

  return { valid: true }
}
