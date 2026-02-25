/**
 * Fetch favicon for a URL using public favicon services
 * Attempts multiple services with fallbacks
 */

const FAVICON_SERVICES = [
  // Google's favicon service - most reliable
  (url: string) => `https://www.google.com/s2/favicons?domain=${url}&sz=64`,
  // DuckDuckGo's favicon service
  (url: string) => `https://icons.duckduckgo.com/ip3/${url}.ico`,
  // Favicon Grabber (alternative)
  (url: string) => `https://favicator.appspot.com/favicon?url=${url}`,
]

const FALLBACK_ICON = '🔗'

/**
 * Get favicon URL for a given URL
 * Uses the first available favicon service
 */
export function getFaviconUrl(url: string): string {
  try {
    // Extract domain from URL
    const urlObj = new URL(url)
    const domain = urlObj.hostname

    // Try the first favicon service (Google's is most reliable)
    return FAVICON_SERVICES[0](domain)
  } catch (error) {
    console.warn('Invalid URL for favicon:', url)
    return FALLBACK_ICON
  }
}

/**
 * Check if a bookmark should use favicon
 * Returns true if no custom icon (emoji or image) is set
 */
export function shouldUseFavicon(icon?: string): boolean {
  if (!icon) return true
  // Don't use favicon if custom icon is set (emoji or data URL)
  return false
}

/**
 * Get the display content for a bookmark icon
 * Returns either the custom icon, favicon URL, or fallback emoji
 */
export function getBookmarkIconDisplay(url: string, icon?: string): { type: 'emoji' | 'image' | 'fallback'; content: string } {
  // Custom emoji icon
  if (icon && !icon.startsWith('data:')) {
    return { type: 'emoji', content: icon || FALLBACK_ICON }
  }

  // Custom uploaded image (data URL)
  if (icon?.startsWith('data:')) {
    return { type: 'image', content: icon }
  }

  // Try favicon from URL
  try {
    const faviconUrl = getFaviconUrl(url)
    return { type: 'image', content: faviconUrl }
  } catch {
    // Fallback to default icon
    return { type: 'fallback', content: FALLBACK_ICON }
  }
}
