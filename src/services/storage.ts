/**
 * Chrome Storage Service
 *
 * This service provides a consistent interface for all data operations using Chrome Storage API.
 * All data must be stored using chrome.storage.local to ensure persistence across browser sessions.
 *
 * IMPORTANT: No in-memory storage, mock data, or temporary variables for persistent data.
 */

// Generic types for storage operations
export type StorageResult<T> = {
  data: T | null
  error: string | null
}

/**
 * Get data from Chrome storage
 * @param keys - Storage key(s) to retrieve
 * @returns Promise with storage result
 */
export function getFromStorage<T>(keys: string | string[] | Record<string, unknown>): Promise<StorageResult<T>> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage get error:', chrome.runtime.lastError.message)
          resolve({ data: null, error: chrome.runtime.lastError.message ?? null })
          return
        }

        // Handle different key formats
        let data: T | null = null
        if (typeof keys === 'string') {
          data = (result as Record<string, T>)[keys] ?? null
        } else if (Array.isArray(keys)) {
          data = result as T
        } else {
          data = result as T
        }

        resolve({ data, error: null })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Chrome storage get exception:', errorMessage)
      resolve({ data: null, error: errorMessage })
    }
  })
}

/**
 * Set data in Chrome storage
 * @param items - Key-value pairs to store
 * @returns Promise with success status
 */
export function setToStorage(items: Record<string, unknown>): Promise<{ success: boolean; error: string | null }> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage set error:', chrome.runtime.lastError.message)
          resolve({ success: false, error: chrome.runtime.lastError.message ?? null })
          return
        }

        // Verify write by reading back
        chrome.storage.local.get(Object.keys(items), (result) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome storage verification error:', chrome.runtime.lastError.message)
            resolve({ success: false, error: chrome.runtime.lastError.message ?? null })
            return
          }

          console.log('Storage write verified:', result)
          resolve({ success: true, error: null })
        })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Chrome storage set exception:', errorMessage)
      resolve({ success: false, error: errorMessage })
    }
  })
}

/**
 * Remove data from Chrome storage
 * @param keys - Storage key(s) to remove
 * @returns Promise with success status
 */
export function removeFromStorage(keys: string | string[]): Promise<{ success: boolean; error: string | null }> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage remove error:', chrome.runtime.lastError.message)
          resolve({ success: false, error: chrome.runtime.lastError.message ?? null })
          return
        }

        console.log('Storage removed:', keys)
        resolve({ success: true, error: null })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Chrome storage remove exception:', errorMessage)
      resolve({ success: false, error: errorMessage })
    }
  })
}

/**
 * Clear all data from Chrome storage
 * WARNING: This will delete all stored data
 * @returns Promise with success status
 */
export function clearStorage(): Promise<{ success: boolean; error: string | null }> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage clear error:', chrome.runtime.lastError.message)
          resolve({ success: false, error: chrome.runtime.lastError.message ?? null })
          return
        }

        console.log('All storage cleared')
        resolve({ success: true, error: null })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Chrome storage clear exception:', errorMessage)
      resolve({ success: false, error: errorMessage })
    }
  })
}

/**
 * Listen to storage changes
 * @param callback - Function to call when storage changes
 * @returns Function to unsubscribe from changes
 */
export function onStorageChanged(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === 'local') {
      callback(changes)
    }
  }

  chrome.storage.onChanged.addListener(listener)

  // Return unsubscribe function
  return () => {
    chrome.storage.onChanged.removeListener(listener)
  }
}

/**
 * Verify storage is working by writing and reading test data
 * This is used for infrastructure testing
 * @returns Promise with verification result
 */
export async function verifyStorageConnection(): Promise<{ connected: boolean; error: string | null }> {
  const testKey = 'storage-connection-test'
  const testValue = { timestamp: Date.now(), verified: true }

  try {
    // Write test data
    const writeResult = await setToStorage({ [testKey]: testValue })
    if (!writeResult.success) {
      return { connected: false, error: `Write failed: ${writeResult.error}` }
    }

    // Read test data
    const readResult = await getFromStorage<{ timestamp: number; verified: boolean }>(testKey)
    if (readResult.error) {
      return { connected: false, error: `Read failed: ${readResult.error}` }
    }

    if (!readResult.data) {
      return { connected: false, error: 'Read returned null' }
    }

    // Verify data matches
    if (readResult.data.timestamp !== testValue.timestamp || readResult.data.verified !== testValue.verified) {
      return { connected: false, error: 'Data mismatch' }
    }

    // Clean up test data
    await removeFromStorage(testKey)

    return { connected: true, error: null }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { connected: false, error: errorMessage }
  }
}

// Page-specific storage operations
export const pagesStorage = {
  getAll: (): Promise<StorageResult<any[]>> => getFromStorage<any[]>('pages'),
  set: (pages: any[]): Promise<{ success: boolean; error: string | null }> => setToStorage({ pages }),
  add: (page: any): Promise<{ success: boolean; error: string | null }> => {
    return getFromStorage<any[]>('pages').then((result) => {
      const pages = result.data ?? []
      pages.push(page)
      return setToStorage({ pages })
    })
  },
  update: (pageId: string, updates: Partial<any>): Promise<{ success: boolean; error: string | null }> => {
    return getFromStorage<any[]>('pages').then((result) => {
      const pages = result.data ?? []
      const index = pages.findIndex((p) => p.id === pageId)
      if (index === -1) {
        return { success: false, error: 'Page not found' }
      }
      pages[index] = { ...pages[index], ...updates, updated_at: new Date().toISOString() }
      return setToStorage({ pages })
    })
  },
  delete: (pageId: string): Promise<{ success: boolean; error: string | null }> => {
    return getFromStorage<any[]>('pages').then((result) => {
      const pages = result.data ?? []
      const filtered = pages.filter((p) => p.id !== pageId)
      return setToStorage({ pages: filtered })
    })
  },
}

// Settings-specific storage operations
export const settingsStorage = {
  get: (): Promise<StorageResult<any>> => getFromStorage('settings'),
  set: (settings: any): Promise<{ success: boolean; error: string | null }> => setToStorage({ settings }),
}

// Chat history storage operations
export const chatHistoryStorage = {
  get: (widgetId: string): Promise<StorageResult<any[]>> => getFromStorage(`chat-history-${widgetId}`),
  set: (widgetId: string, messages: any[]): Promise<{ success: boolean; error: string | null }> =>
    setToStorage({ [`chat-history-${widgetId}`]: messages }),
  clear: (widgetId: string): Promise<{ success: boolean; error: string | null }> =>
    removeFromStorage(`chat-history-${widgetId}`),
}

export default {
  get: getFromStorage,
  set: setToStorage,
  remove: removeFromStorage,
  clear: clearStorage,
  onChanged: onStorageChanged,
  verifyConnection: verifyStorageConnection,
  pages: pagesStorage,
  settings: settingsStorage,
  chatHistory: chatHistoryStorage,
}
