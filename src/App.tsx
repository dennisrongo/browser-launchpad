import { useState, useEffect } from 'react'
import { pagesStorage, settingsStorage, verifyStorageConnection } from './services/storage'
import { WidgetTypeSelector } from './components/WidgetTypeSelector'
import { WidgetCard } from './components/WidgetCard'
import { WidgetConfigModal } from './components/WidgetConfigModal'
import { SettingsModal } from './components/SettingsModal'
import type { Widget, WidgetType, Settings } from './types'

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
    model: 'gpt-3.5-turbo',
    messages: [],
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
  const [isInitialized, setIsInitialized] = useState(false)
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
  const [showWidgetConfigModal, setShowWidgetConfigModal] = useState(false)
  const [configuringWidget, setConfiguringWidget] = useState<Widget | null>(null)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    id: 'global-settings',
    theme: 'modern-light',
    grid_columns: 3,
    grid_gap: 24,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  useEffect(() => {
    // Optimized initialization with parallel loading for fast initial load
    const initializeApp = async () => {
      const startTime = performance.now()

      // Verify Chrome Storage API connection first (Feature 1)
      const connectionCheck = await verifyStorageConnection()
      if (connectionCheck.connected) {
        console.log('✓ Chrome Storage API connection verified')
      } else {
        console.error('Chrome Storage API connection failed:', connectionCheck.error)
      }

      // Load pages and settings in parallel for faster initial load
      const [pagesResult, settingsResult] = await Promise.all([
        pagesStorage.getAll(),
        settingsStorage.get(),
      ])

      // Handle pages
      if (pagesResult.data && pagesResult.data.length > 0) {
        console.log('Loaded', pagesResult.data.length, 'pages from Chrome storage')
        setPages(pagesResult.data)
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

      // Handle settings
      if (settingsResult.data) {
        console.log('Loaded settings from Chrome storage')
        setSettings(settingsResult.data)
      } else {
        // Create default settings
        const defaultSettings: Settings = {
          id: 'global-settings',
          theme: 'modern-light',
          grid_columns: 3,
          grid_gap: 24,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const settingsSaveResult = await settingsStorage.set(defaultSettings)
        if (settingsSaveResult.success) {
          console.log('✓ Created default settings in Chrome storage')
          setSettings(defaultSettings)
        }
      }

      const loadTime = performance.now() - startTime
      console.log(`✓ App initialized in ${loadTime.toFixed(2)}ms`)
      setStorageVerified(true)
      setIsInitialized(true)
    }

    initializeApp()
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

  // Handle Straico models fetched event
  useEffect(() => {
    const handleModelsFetched = async (event: Event) => {
      const customEvent = event as CustomEvent<{ widgetId: string; models: any[] }>
      const { widgetId, models } = customEvent.detail
      const currentPage = pages[activePage]
      if (!currentPage) return

      const updatedWidgets = currentPage.widgets.map((w: Widget) =>
        w.id === widgetId
          ? {
              ...w,
              config: {
                ...w.config,
                straicoModels: models,
                fetchModels: false,
              },
            }
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
        console.log('✓ Straico models saved to Chrome storage')
      } else {
        console.error('Failed to save Straico models:', result.error)
      }
    }

    const handleFetchComplete = async (event: Event) => {
      const customEvent = event as CustomEvent<{ widgetId: string }>
      const { widgetId } = customEvent.detail
      const currentPage = pages[activePage]
      if (!currentPage) return

      const updatedWidgets = currentPage.widgets.map((w: Widget) =>
        w.id === widgetId
          ? {
              ...w,
              config: {
                ...w.config,
                fetchModels: false,
              },
            }
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
      }
    }

    window.addEventListener('straico-models-fetched', handleModelsFetched)
    window.addEventListener('straico-models-fetch-complete', handleFetchComplete)

    return () => {
      window.removeEventListener('straico-models-fetched', handleModelsFetched)
      window.removeEventListener('straico-models-fetch-complete', handleFetchComplete)
    }
  }, [pages, activePage])

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

    // Optimistic UI update - show page immediately
    const updatedPages = [...pages, newPage]
    const previousPages = pages
    setPages(updatedPages)
    setActivePage(updatedPages.length - 1)

    // Save to storage in background
    const result = await pagesStorage.add(newPage)

    if (result.success) {
      console.log('✓ Page added to Chrome storage')
    } else {
      // Rollback on error
      console.error('Failed to add page, rolling back:', result.error)
      setPages(previousPages)
      setActivePage(pages.length > 0 ? pages.length - 1 : 0)
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

    // Optimistic UI update - show new name immediately
    const previousPages = pages
    setPages(updatedPages)
    setEditingPageId(null)
    setEditingPageName('')

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to rename page, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Page renamed in Chrome storage')
    }
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

    const deletedPageIndex = pages.findIndex((p) => p.id === pageToDelete)
    const updatedPages = pages.filter((page) => page.id !== pageToDelete)

    // Optimistic UI update - remove page immediately
    const previousPages = pages
    const previousActivePage = activePage

    // Update active page if needed
    if (deletedPageIndex === activePage) {
      setActivePage(0)
    } else if (deletedPageIndex < activePage) {
      setActivePage(activePage - 1)
    }

    setPages(updatedPages)
    setShowDeleteConfirm(false)
    setPageToDelete(null)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to delete page, rolling back:', result.error)
      setPages(previousPages)
      setActivePage(previousActivePage)
    } else {
      console.log('✓ Page deleted from Chrome storage')
    }
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

    // Optimistic UI update - show reorder immediately
    const previousPages = pages
    const previousActivePage = activePage
    let newActivePage = activePage

    // Update active page index if needed
    if (activePage === draggedIndex) {
      newActivePage = targetIndex
    } else if (draggedIndex < activePage && targetIndex >= activePage) {
      newActivePage = activePage - 1
    } else if (draggedIndex > activePage && targetIndex <= activePage) {
      newActivePage = activePage + 1
    }

    setPages(updatedPages)
    setActivePage(newActivePage)
    setDraggedPageId(null)
    setDragOverPageId(null)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to reorder pages, rolling back:', result.error)
      setPages(previousPages)
      setActivePage(previousActivePage)
    } else {
      console.log('✓ Pages reordered in Chrome storage')
    }
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

    // Optimistic UI update - show widget immediately
    const previousPages = pages
    setPages(updatedPages)
    setShowWidgetSelector(false)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to add widget, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widget added to Chrome storage')
    }
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

    // Optimistic UI update - remove widget immediately
    const previousPages = pages
    setPages(updatedPages)
    setShowWidgetDeleteConfirm(false)
    setWidgetToDelete(null)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to delete widget, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widget deleted from Chrome storage')
    }
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

    setConfiguringWidget(widget)
    setShowWidgetConfigModal(true)
  }

  const handleEditWidgetTitle = (widgetId: string) => {
    const currentPage = pages[activePage]
    if (!currentPage) return

    const widget = currentPage.widgets.find((w: Widget) => w.id === widgetId)
    if (!widget) return

    setEditingWidgetId(widgetId)
    setEditingWidgetTitle(widget.title)
  }

  const handleSaveWidgetConfig = async (widgetId: string, newConfig: any, newTitle: string) => {
    const currentPage = pages[activePage]
    if (!currentPage) return

    const updatedWidgets = currentPage.widgets.map((w: Widget) =>
      w.id === widgetId
        ? { ...w, title: newTitle, config: newConfig }
        : w
    )

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets: updatedWidgets,
      updated_at: new Date().toISOString(),
    }

    // Optimistic UI update - show changes immediately
    const previousPages = pages
    setPages(updatedPages)
    setShowWidgetConfigModal(false)
    setConfiguringWidget(null)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to update widget configuration, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widget configuration updated in Chrome storage')
    }
  }

  const handleCancelWidgetConfig = () => {
    setShowWidgetConfigModal(false)
    setConfiguringWidget(null)
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

    // Optimistic UI update - show new title immediately
    const previousPages = pages
    setPages(updatedPages)
    setEditingWidgetId(null)
    setEditingWidgetTitle('')

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to update widget title, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widget title updated in Chrome storage')
    }
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

  const handleWidgetConfigChange = async (widgetId: string, newConfig: any) => {
    const currentPage = pages[activePage]
    if (!currentPage) return

    const updatedWidgets = currentPage.widgets.map((w: Widget) =>
      w.id === widgetId
        ? { ...w, config: { ...w.config, ...newConfig } }
        : w
    )

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets: updatedWidgets,
      updated_at: new Date().toISOString(),
    }

    // Optimistic UI update - show config change immediately
    const previousPages = pages
    setPages(updatedPages)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to update widget config, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widget config updated in Chrome storage')
    }
  }

  // Widget Drag and Drop Handlers
  const handleWidgetDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId)
  }

  const handleWidgetDragOver = (targetWidgetId: string) => {
    // Don't show drag over if hovering over the dragged widget itself
    if (draggedWidgetId && draggedWidgetId !== targetWidgetId) {
      setDragOverWidgetId(targetWidgetId)
    }
  }

  const handleWidgetDragLeave = () => {
    // Clear drag over state when leaving a widget
    setDragOverWidgetId(null)
  }

  const handleWidgetDrop = async () => {
    if (!draggedWidgetId || !dragOverWidgetId) return
    if (draggedWidgetId === dragOverWidgetId) {
      setDragOverWidgetId(null)
      return
    }

    const currentPage = pages[activePage]
    if (!currentPage) return

    const widgets = [...currentPage.widgets]
    const draggedIndex = widgets.findIndex((w: Widget) => w.id === draggedWidgetId)
    const targetIndex = widgets.findIndex((w: Widget) => w.id === dragOverWidgetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedWidgetId(null)
      setDragOverWidgetId(null)
      return
    }

    // Remove dragged widget and insert at new position
    const [draggedWidget] = widgets.splice(draggedIndex, 1)
    widgets.splice(targetIndex, 0, draggedWidget)

    // Update order field for all widgets
    widgets.forEach((w: Widget, index: number) => {
      w.order = index
    })

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets,
      updated_at: new Date().toISOString(),
    }

    // Optimistic UI update - show reorder immediately
    const previousPages = pages
    setPages(updatedPages)
    setDraggedWidgetId(null)
    setDragOverWidgetId(null)

    // Save to storage in background
    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      // Rollback on error
      console.error('Failed to reorder widgets, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widgets reordered in Chrome storage')
    }
  }

  const handleWidgetDragEnd = () => {
    setDraggedWidgetId(null)
    setDragOverWidgetId(null)
  }

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings)
    // Apply theme to document
    if (newSettings.theme === 'dark-elegance') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-text-secondary">Loading Browser Launchpad...</p>
        </div>
      </div>
    )
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
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity flex items-center gap-2"
            title="Open settings"
          >
            <span className="text-lg">⚙️</span>
            <span>Settings</span>
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
              <div
                className={`grid ${
                  settings.grid_columns === 1
                    ? 'grid-cols-1'
                    : settings.grid_columns === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : settings.grid_columns === 3
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : settings.grid_columns === 4
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : settings.grid_columns === 5
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'
                }`}
                style={{ gap: `${settings.grid_gap}px` }}
              >
                {pages[activePage]?.widgets.map((widget: Widget) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    onEdit={handleEditWidget}
                    onEditTitle={handleEditWidgetTitle}
                    onDelete={handleDeleteWidget}
                    onConfigChange={handleWidgetConfigChange}
                    editingWidgetId={editingWidgetId}
                    editingWidgetTitle={editingWidgetTitle}
                    onTitleChange={(_, newTitle) => setEditingWidgetTitle(newTitle)}
                    onSaveTitle={handleSaveWidgetTitle}
                    onTitleKeyDown={handleWidgetTitleKeyDown}
                    draggedWidgetId={draggedWidgetId}
                    dragOverWidgetId={dragOverWidgetId}
                    onDragStart={handleWidgetDragStart}
                    onDragOver={handleWidgetDragOver}
                    onDragLeave={handleWidgetDragLeave}
                    onDrop={handleWidgetDrop}
                    onDragEnd={handleWidgetDragEnd}
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

      {/* Widget Configuration Modal */}
      <WidgetConfigModal
        isOpen={showWidgetConfigModal}
        widget={configuringWidget}
        onSave={handleSaveWidgetConfig}
        onCancel={handleCancelWidgetConfig}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
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
