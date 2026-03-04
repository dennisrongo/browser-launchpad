chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'FETCH_PAGE_TITLE' && request.url) {
    console.log('[Background] Fetching title for:', request.url)
    fetchPageTitle(request.url)
      .then(title => {
        console.log('[Background] Fetched title:', title)
        sendResponse({ success: true, title })
      })
      .catch(error => {
        console.error('[Background] Fetch error:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const text = await response.text()
    const match = text.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match && match[1] ? match[1].trim() : null
  } catch {
    return null
  }
}

export {}
