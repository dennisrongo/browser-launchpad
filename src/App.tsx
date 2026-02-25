import { useState, useEffect } from 'react'
import { pagesStorage, verifyStorageConnection } from './services/storage'
import { WidgetTypeSelector, WidgetType } from './components/WidgetTypeSelector'
import { WidgetCard } from './components/WidgetCard'
import type { Widget } from './types'

const MAX_PAGES = 10

// Default configurations for each widget type
const DEFAULT_WIDGET_CONFIGS: Record<WidgetType, any> = {
  clock: {
    timezone: '',
    format12Hour: true,
    showSeconds: false,
  },
  weather: {
    city: '',
    units: 'celsius',
  },
  'ai-chat': {
    provider: 'openai',
    model: '',
  },
  bookmark: {
    bookmarks: [],
  },
}

const DEFAULT_WIDGET_TITLES: Record<WidgetType, string> = {
  clock: 'Clock',
  weather: 'Weather',
  'ai-chat': 'AI Chat',
  bookmark: 'Bookmarks',
}

function App() {
  const [pages, setPages] = useState<any[]>([])
  const [activePage, setActivePage] = useState(0)
  const [storageVerified, setStorageVerified] = useState(false)
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [editingPageName, setEditingPageName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pageToDelete, setPageToDelete] = useState<string | null>(null)
  const [showLimitMessage, setShowLimitMessage] = useState(false)
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null)
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null)
  const [showWidgetSelector, setShowWidgetSelector] = useState(false)
  const [widgetToDelete, setWidgetToDelete] = useState<string | null>(null)
  const [showWidgetDeleteConfirm, setShowWidgetDeleteConfirm] = useState(false)
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null)
  const [editingWidgetTitle, setEditingWidgetTitle] = useState('')

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
    // Check if limit is reached
    if (pages.length >= MAX_PAGES) {
      setShowLimitMessage(true)
      // Auto-hide the message after 5 seconds
      setTimeout(() => setShowLimitMessage(false), 5000)
      return
    }

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

  // Start editing page name
  const handleStartRename = (pageId: string, currentName: string) => {
    setEditingPageId(pageId)
    setEditingPageName(currentName)
  }

  // Save page name
  const handleSaveRename = async (pageId: string) => {
    if (!editingPageName.trim()) {
      setEditingPageId(null)
      return
    }

    const updatedPages = pages.map((page) =>
      page.id === pageId
        ? { ...page, name: editingPageName.trim(), updated_at: new Date().toISOString() }
        : page
    )

    const result = await pagesStorage.set(updatedPages)

    if (result.success) {
      setPages(updatedPages)
      console.log('✓ Page renamed in Chrome storage')
    } else {
      console.error('Failed to rename page:', result.error)
    }

    setEditingPageId(null)
    setEditingPageName('')
  }

  // Cancel editing
  const handleCancelRename = () => {
    setEditingPageId(null)
    setEditingPageName('')
  }

  // Handle key press in rename input
  const handleRenameKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(pageId)
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  // Start delete page
  const handleStartDelete = (pageId: string) => {
    setPageToDelete(pageId)
    setShowDeleteConfirm(true)
  }

  // Confirm delete page
  const handleConfirmDelete = async () => {
    if (!pageToDelete) return

    // Don't allow deleting the last page
    if (pages.length <= 1) {
      console.warn('Cannot delete the last page')
      setShowDeleteConfirm(false)
      setPageToDelete(null)
      return
    }

    const updatedPages = pages.filter((page) => page.id !== pageToDelete)
    const result = await pagesStorage.set(updatedPages)

    if (result.success) {
      // If deleting active page, switch to another page
      if (pages.findIndex((p) => p.id === pageToDelete) === activePage) {
        setActivePage(0)
      } else if (activePage >= updatedPages.length) {
        setActivePage(updatedPages.length - 1)
      }

      setPages(updatedPages)
      console.log('✓ Page deleted from Chrome storage')
    } else {
      console.error('Failed to delete page:', result.error)
    }

    setShowDeleteConfirm(false)
    setPageToDelete(null)
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setPageToDelete(null)
  }

  // Drag and drop handlers for page reordering
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault()
    if (draggedPageId && draggedPageId !== pageId) {
      setDragOverPageId(pageId)
    }
  }

  const handleDragLeave = () => {
    setDragOverPageId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault()

    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null)
      setDragOverPageId(null)
      return
    }

    // Find indices
    const draggedIndex = pages.findIndex((p) => p.id === draggedPageId)
    const targetIndex = pages.findIndex((p) => p.id === targetPageId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPageId(null)
      setDragOverPageId(null)
      return
    }

    // Reorder pages
    const newPages = [...pages]
    const [draggedPage] = newPages.splice(draggedIndex, 1)
    newPages.splice(targetIndex, 0, draggedPage)

    // Update order field
    const updatedPages = newPages.map((page, index) => ({
      ...page,
      order: index,
      updated_at: new Date().toISOString(),
    }))

    // Save to storage
    const result = await pagesStorage.set(updatedPages)

    if (result.success) {
      setPages(updatedPages)
      // Update active page index if needed
      if (activePage === draggedIndex) {
        setActivePage(targetIndex)
      } else if (draggedIndex < activePage && targetIndex >= activePage) {
        setActivePage(activePage - 1)
      } else if (draggedIndex > activePage && targetIndex <= activePage) {
        setActivePage(activePage + 1)
      }
      console.log('✓ Pages reordered in Chrome storage')
    } else {
      console.error('Failed to reorder pages:', result.error)
    }

    setDraggedPageId(null)
    setDragOverPageId(null)
  }

  const handleDragEnd = () => {
    setDraggedPageId(null)
    setDragOverPageId(null)
  }

  // Widget handlers
  const handleAddWidget = () => {
    setShowWidgetSelector(true)
  }

  const handleSelectWidgetType = async (type: WidgetType) => {
    const currentPage = pages[activePage]
    if (!currentPage) return

    const newWidget: Widget = {
      id: 'widget-' + Date.now(),
      type,
      page_id: currentPage.id,
      order: currentPage.widgets.length,
      title: DEFAULT_WIDGET_TITLES[type],
      config: DEFAULT_WIDGET_CONFIGS[type],
      created_at: new Date().toISOString(),
    }

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets: [...currentPage.widgets, newWidget],
      updated_at: new Date().toISOString(),
    }

    const result = await pagesStorage.set(updatedPages)

    if (result.success) {
      setPages(updatedPages)
      console.log('✓ Widget added to Chrome storage')
    } else {
      console.error('Failed to add widget:', result.error)
    }

    setShowWidgetSelector(false)
  }

  const handleCancelWidgetSelector = () => {
    setShowWidgetSelector(false)
  }

  const handleDeleteWidget = (widgetId: string) => {
    setWidgetToDelete(widgetId)
    setShowWidgetDeleteConfirm(true)
  }

  const handleConfirmDeleteWidget = async () => {
    if (!widgetToDelete) return

    const currentPage = pages[activePage]
    if (!currentPage) return

    const updatedWidgets = currentPage.widgets.filter((w: Widget) => w.id !== widgetToDelete)

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets: updatedWidgets,
      updated_at: new Date().toISOString(),
    }

    const result = await pagesStorage.set(updatedPages)

    if (result.success) {
      setPages(updatedPages)
      console.log('✓ Widget deleted from Chrome storage')
    } else {
      console.error('Failed to delete widget:', result.error)
    }

    setShowWidgetDeleteConfirm(false)
    setWidgetToDelete(null)
  }

  const handleCancelDeleteWidget = () => {
    setShowWidgetDeleteConfirm(false)
    setWidgetToDelete(null)
  }

  const handleEditWidget = (widgetId: string) => {
    const currentPage = pages[activePage]
    if (!currentPage) return

    const widget = currentPage.widgets.find((w: Widget) => w.id === widgetId)
    if (!widget) return

    setEditingWidgetId(widgetId)
    setEditingWidgetTitle(widget.title)
  }

  const handleSaveWidgetTitle = async (widgetId: string) => {
    if (!editingWidgetTitle.trim()) {
      setEditingWidgetId(null)
      return
    }

    const currentPage = pages[activePage]
    if (!currentPage) return

    const updatedWidgets = currentPage.widgets.map((w: Widget) =>
      w.id === widgetId
        ? { ...w, title: editingWidgetTitle.trim() }
        : w
    )

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets: updatedWidgets,
      updated_at: new Date().toISOString(),
    }

    const result = await pagesStorage.set(updatedPages)

    if (result.success) {
      setPages(updatedPages)
      console.log('✓ Widget title updated in Chrome storage')
    } else {
      console.error('Failed to update widget title:', result.error)
    }

    setEditingWidgetId(null)
    setEditingWidgetTitle('')
  }

  const handleCancelWidgetEdit = () => {
    setEditingWidgetId(null)
    setEditingWidgetTitle('')
  }

  const handleWidgetTitleKeyDown = (e: React.KeyboardEvent, widgetId: string) => {
    if (e.key === 'Enter') {
      handleSaveWidgetTitle(widgetId)
    } else if (e.key === 'Escape') {
      handleCancelWidgetEdit()
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
            <div
              key={page.id}
              draggable={editingPageId !== page.id}
              onDragStart={(e) => handleDragStart(e, page.id)}
              onDragOver={(e) => handleDragOver(e, page.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, page.id)}
              onDragEnd={handleDragEnd}
              className={`group relative flex items-center rounded-button transition-all duration-200 ease-in-out cursor-move ${
                activePage === index
                  ? 'bg-primary text-white font-semibold shadow-md'
                  : 'bg-background text-text hover:bg-surface'
              } ${
                draggedPageId === page.id
                  ? 'opacity-50 scale-95 shadow-lg'
                  : ''
              } ${
                dragOverPageId === page.id && draggedPageId !== page.id
                  ? 'shadow-md scale-105 border-2 border-primary'
                  : ''
              }`}
            >
              {editingPageId === page.id ? (
                <input
                  type="text"
                  value={editingPageName}
                  onChange={(e) => setEditingPageName(e.target.value)}
                  onKeyDown={(e) => handleRenameKeyDown(e, page.id)}
                  onBlur={() => handleSaveRename(page.id)}
                  className="px-3 py-2 bg-white text-text border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  maxLength={50}
                />
              ) : (
                <>
                  {/* Drag handle */}
                  <div className="absolute left-0 top-0 bottom-0 px-1 flex items-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                    <span className="text-lg">⋮⋮</span>
                  </div>
                  <button
                    onClick={() => setActivePage(index)}
                    onDoubleClick={() => handleStartRename(page.id, page.name)}
                    className="px-4 py-2 min-w-[80px] pl-6"
                  >
                    {page.name}
                  </button>
                  {/* Action buttons - shown on hover */}
                  <div className="absolute right-0 top-0 hidden group-hover:flex items-center h-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartRename(page.id, page.name)
                      }}
                      className="px-2 py-2 hover:bg-black/10 rounded-r-button transition-colors"
                      title="Rename page (double-click)"
                    >
                      ✏️
                    </button>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartDelete(page.id)
                        }}
                        className="px-2 py-2 hover:bg-black/10 rounded-r-button transition-colors hover:text-red-500"
                        title="Delete page"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="relative">
            <button
              onClick={handleAddPage}
              disabled={pages.length >= MAX_PAGES}
              className={`px-4 py-2 rounded-button transition-all duration-200 ease-in-out ${
                pages.length >= MAX_PAGES
                  ? 'bg-gray-100 text-gray-400 border border-gray-300 cursor-not-allowed opacity-50'
                  : 'bg-background text-text hover:bg-surface border border-border'
              }`}
              title={pages.length >= MAX_PAGES ? `Maximum ${MAX_PAGES} pages allowed` : 'Add a new page'}
            >
              + Add Page
            </button>
            {showLimitMessage && (
              <div className="absolute top-full mt-2 left-0 bg-yellow-50 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-button text-sm shadow-lg animate-fade-in z-50 whitespace-nowrap">
                ⚠️ Maximum page limit reached ({MAX_PAGES} pages). Delete a page to add more.
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-2">Delete Page?</h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete this page? This action cannot be undone.
                {pages[pageToDelete ? pages.findIndex((p) => p.id === pageToDelete) : 0]?.widgets &&
                  pages[pageToDelete ? pages.findIndex((p) => p.id === pageToDelete) : 0]?.widgets.length > 0 &&
                  ' All widgets on this page will also be deleted.'}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-button hover:bg-red-600"
                >
                  Delete Page
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="p-6">
        <div className="animate-fade-in" key={pages[activePage]?.id}>
          {pages[activePage] && pages[activePage].widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-xl font-semibold mb-2">No widgets yet</h2>
              <p className="text-text-secondary mb-4">Add widgets to customize your dashboard</p>
              <button
                onClick={handleAddWidget}
                className="px-6 py-3 bg-primary text-white rounded-button hover:opacity-90 transition-opacity"
              >
                + Add Widget
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleAddWidget}
                  className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <span className="text-lg">+</span>
                  Add Widget
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pages[activePage]?.widgets.map((widget: Widget) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    onEdit={handleEditWidget}
                    onDelete={handleDeleteWidget}
                    editingWidgetId={editingWidgetId}
                    editingWidgetTitle={editingWidgetTitle}
                    onTitleChange={(_, newTitle) => setEditingWidgetTitle(newTitle)}
                    onSaveTitle={handleSaveWidgetTitle}
                    onTitleKeyDown={handleWidgetTitleKeyDown}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Widget Type Selector Modal */}
      <WidgetTypeSelector
        isOpen={showWidgetSelector}
        onSelect={handleSelectWidgetType}
        onCancel={handleCancelWidgetSelector}
      />

      {/* Widget Delete Confirmation Modal */}
      {showWidgetDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-md mx-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-2">Delete Widget?</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete this widget? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDeleteWidget}
                className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteWidget}
                className="px-4 py-2 bg-red-500 text-white rounded-button hover:bg-red-600"
              >
                Delete Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
