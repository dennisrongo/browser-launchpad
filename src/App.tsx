import { useState, useEffect } from 'react'
import { pagesStorage, verifyStorageConnection } from './services/storage'

function App() {
  const [pages, setPages] = useState<any[]>([])
  const [activePage, setActivePage] = useState(0)
  const [storageVerified, setStorageVerified] = useState(false)

  useEffect(() => {
    // Verify Chrome Storage API connection first
    const verifyAndInit = async () => {
      const verification = await verifyStorageConnection()

      if (!verification.connected) {
        console.error('Chrome Storage API verification failed:', verification.error)
      } else {
        console.log('✓ Chrome Storage API verified - using real persistent storage')
        setStorageVerified(true)
      }

      // Load pages from storage (or create default)
      const result = await pagesStorage.getAll()

      if (result.data && result.data.length > 0) {
        console.log('Loaded', result.data.length, 'pages from Chrome storage')
        setPages(result.data)
      } else {
        // Create default page and save to Chrome storage
        const defaultPage = {
          id: 'page-' + Date.now(),
          name: 'My Page',
          order: 0,
          widgets: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const newPages = [defaultPage]
        const saveResult = await pagesStorage.set(newPages)

        if (saveResult.success) {
          console.log('✓ Created default page in Chrome storage')
          setPages(newPages)
        } else {
          console.error('Failed to save default page:', saveResult.error)
        }
      }
    }

    verifyAndInit()
  }, [])

  // Listen for storage changes from other contexts
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.pages) {
        console.log('Storage changed, reloading pages')
        setPages((changes.pages.newValue ?? []) as any[])
      }
    }

    chrome.storage.onChanged.addListener(listener)

    return () => {
      chrome.storage.onChanged.removeListener(listener)
    }
  }, [])

  // Keyboard navigation for pages
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setActivePage((prev) => {
          if (pages.length === 0) return 0
          return prev < pages.length - 1 ? prev + 1 : 0 // Wrap to first page
        })
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActivePage((prev) => {
          if (pages.length === 0) return 0
          return prev > 0 ? prev - 1 : pages.length - 1 // Wrap to last page
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pages.length])

  const handleAddPage = async () => {
    const newPage = {
      id: 'page-' + Date.now(),
      name: 'New Page',
      order: pages.length,
      widgets: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const result = await pagesStorage.add(newPage)

    if (result.success) {
      const updatedPages = [...pages, newPage]
      setPages(updatedPages)
      setActivePage(updatedPages.length - 1)
      console.log('✓ Page added to Chrome storage')
    } else {
      console.error('Failed to add page:', result.error)
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Browser Launchpad</h1>
            {storageVerified && (
              <span className="text-xs text-green-500">✓ Chrome Storage Connected</span>
            )}
          </div>
          <button className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90">
            Settings
          </button>
        </div>
        {/* Page Navigation */}
        <div className="flex gap-2 mt-4">
          {pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => setActivePage(index)}
              className={`px-4 py-2 rounded-button ${
                activePage === index
                  ? 'bg-primary text-white'
                  : 'bg-background text-text hover:bg-surface'
              }`}
            >
              {page.name}
            </button>
          ))}
          <button
            onClick={handleAddPage}
            className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border"
          >
            + Add Page
          </button>
        </div>
      </header>

      <main className="p-6">
        {pages[activePage] && pages[activePage].widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">No widgets yet</h2>
            <p className="text-text-secondary mb-4">Add widgets to customize your dashboard</p>
            <button className="px-6 py-3 bg-primary text-white rounded-button hover:opacity-90">
              + Add Widget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Widgets will be rendered here */}
            <div className="border border-border rounded-card p-6 bg-surface shadow-card">
              <div className="text-4xl mb-2">👋</div>
              <h3 className="text-lg font-semibold">Welcome!</h3>
              <p className="text-text-secondary">Start customizing your dashboard</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
