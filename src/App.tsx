import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Plus, Pencil, Trash2, GripVertical, Package, AlertTriangle } from 'lucide-react'
import { pagesStorage, settingsStorage, verifyStorageConnection } from './services/storage'
import { applyTheme } from './utils/theme'
import { WidgetTypeSelector } from './components/WidgetTypeSelector'
import { WidgetCard } from './components/WidgetCard'
import { WidgetConfigModal } from './components/WidgetConfigModal'
import { SettingsModal } from './components/SettingsModal'
import { MoveWidgetDialog } from './components/MoveWidgetDialog'
import { Header } from './components/Header'
import { MainContainer } from './components/MainContainer'
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
    messages: [],
  },
  bookmark: {
    bookmarks: [],
  },
  todo: {
    items: [],
    tags: [],
    sortBy: 'manual',
    filter: 'all',
  },
  pomodoro: {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    soundEnabled: true,
  },
  calendar: {
    viewMode: 'month',
    firstDayOfWeek: 0,
    showWeekNumbers: false,
    googleConnected: false,
  },
}

const DEFAULT_WIDGET_TITLES: Record<WidgetType, string> = {
  clock: 'Clock',
  weather: 'Weather',
  'ai-chat': 'AI Chat',
  bookmark: 'Bookmarks',
  todo: 'Todo List',
  pomodoro: 'Pomodoro',
  calendar: 'Calendar',
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
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [widgetToMove, setWidgetToMove] = useState<string | null>(null)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ column: number; index: number } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
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
        
        const migratedPages = pagesResult.data.map((page: any) => ({
          ...page,
          widgets: page.widgets.map((widget: Widget, index: number) => ({
            ...widget,
            column: widget.column ?? 0,
            order: widget.order ?? index,
          })),
        }))
        
        setPages(migratedPages)
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
        applyTheme(settingsResult.data.theme)
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
          applyTheme(defaultSettings.theme)
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
      if (areaName === 'local') {
        if (changes.pages) {
          console.log('Storage changed, reloading pages')
          setPages((changes.pages.newValue ?? []) as any[])
        }
        if (changes.settings) {
          const newSettings = changes.settings.newValue as Settings
          console.log('Settings changed, updating theme')
          setSettings(newSettings)
          applyTheme(newSettings.theme)
        }
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

    const columnCounts = getWidgetsByColumn(currentPage.widgets, settings.grid_columns)
      .map(col => col.length)
    const minCount = Math.min(...columnCounts)
    const targetColumn = columnCounts.findIndex(count => count === minCount)

    const newWidget: Widget = {
      id: 'widget-' + Date.now(),
      type,
      page_id: currentPage.id,
      column: targetColumn,
      order: minCount,
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

    const previousPages = pages
    setPages(updatedPages)
    setShowWidgetSelector(false)

    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
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

  const handleMoveWidget = (widgetId: string) => {
    setWidgetToMove(widgetId)
    setShowMoveDialog(true)
  }

  const handleConfirmMoveWidget = async (targetPageId: string) => {
    if (!widgetToMove) return

    const currentPage = pages[activePage]
    if (!currentPage) return

    const widget = currentPage.widgets.find((w: Widget) => w.id === widgetToMove)
    if (!widget) return

    const targetPageIndex = pages.findIndex((p) => p.id === targetPageId)
    if (targetPageIndex === -1) return

    const targetPage = pages[targetPageIndex]
    const targetColumnWidgets = targetPage.widgets.filter((w: Widget) => w.column === 0)
    const maxOrder = targetColumnWidgets.length > 0
      ? Math.max(...targetColumnWidgets.map((w: Widget) => w.order))
      : -1

    const movedWidget: Widget = {
      ...widget,
      page_id: targetPageId,
      column: 0,
      order: maxOrder + 1,
    }

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets: currentPage.widgets.filter((w: Widget) => w.id !== widgetToMove),
      updated_at: new Date().toISOString(),
    }
    updatedPages[targetPageIndex] = {
      ...targetPage,
      widgets: [...targetPage.widgets, movedWidget],
      updated_at: new Date().toISOString(),
    }

    const previousPages = pages
    setPages(updatedPages)
    setShowMoveDialog(false)
    setWidgetToMove(null)

    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      console.error('Failed to move widget, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widget moved to another page in Chrome storage')
    }
  }

  const handleCancelMoveWidget = () => {
    setShowMoveDialog(false)
    setWidgetToMove(null)
  }

  // Helper: Get widgets organized by column
  const getWidgetsByColumn = useCallback((widgets: Widget[], numColumns: number): Widget[][] => {
    const columns: Widget[][] = Array.from({ length: numColumns }, () => [])
    const sortedWidgets = [...widgets].sort((a, b) => {
      if (a.column !== b.column) return a.column - b.column
      return a.order - b.order
    })
    sortedWidgets.forEach(widget => {
      const col = Math.min(widget.column || 0, numColumns - 1)
      columns[col].push(widget)
    })
    return columns
  }, [])

  // Widget Drag and Drop Handlers
  const handleWidgetDragStart = (widgetId: string) => {
    setDraggedWidgetId(widgetId)
    setDropTarget(null)
  }

  const handleColumnDragOver = (e: React.DragEvent, column: number) => {
    e.preventDefault()
    if (!draggedWidgetId) return

    const currentPage = pages[activePage]
    if (!currentPage) return

    const columnWidgets = getWidgetsByColumn(currentPage.widgets, settings.grid_columns)[column]
      .filter(w => w.id !== draggedWidgetId)

    if (columnWidgets.length === 0) {
      setDropTarget({ column, index: 0 })
      return
    }

    const container = e.currentTarget
    const containerRect = container.getBoundingClientRect()
    const mouseY = e.clientY

    let targetIndex = columnWidgets.length
    for (let i = 0; i < columnWidgets.length; i++) {
      const widgetEl = container.querySelector(`[data-widget-id="${columnWidgets[i].id}"]`)
      if (widgetEl) {
        const rect = widgetEl.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (mouseY < midY) {
          targetIndex = i
          break
        }
      }
    }

    setDropTarget({ column, index: targetIndex })
  }

  const handleColumnDrop = async (e: React.DragEvent, targetColumn: number) => {
    e.preventDefault()
    if (!draggedWidgetId || !dropTarget) {
      setDraggedWidgetId(null)
      setDropTarget(null)
      return
    }

    const currentPage = pages[activePage]
    if (!currentPage) return

    const widgets = [...currentPage.widgets]
    const draggedIndex = widgets.findIndex((w: Widget) => w.id === draggedWidgetId)

    if (draggedIndex === -1) {
      setDraggedWidgetId(null)
      setDropTarget(null)
      return
    }

    const draggedWidget = widgets[draggedIndex]
    const oldColumn = draggedWidget.column || 0

    const targetColumnWidgets = widgets
      .filter(w => (w.column || 0) === targetColumn && w.id !== draggedWidgetId)
      .sort((a, b) => a.order - b.order)

    const insertIndex = Math.min(dropTarget.index, targetColumnWidgets.length)

    widgets.splice(draggedIndex, 1)

    const updatedWidget = { ...draggedWidget, column: targetColumn }
    widgets.push(updatedWidget)

    if (oldColumn === targetColumn) {
      const columnWidgets = widgets.filter(w => (w.column || 0) === targetColumn).sort((a, b) => a.order - b.order)
      const draggedFromOrder = draggedWidget.order
      const targetOrder = insertIndex

      columnWidgets.forEach(w => {
        if (w.id === draggedWidget.id) return
        const currentOrder = w.order
        if (draggedFromOrder < targetOrder) {
          if (currentOrder > draggedFromOrder && currentOrder <= targetOrder) {
            w.order = currentOrder - 1
          }
        } else {
          if (currentOrder >= targetOrder && currentOrder < draggedFromOrder) {
            w.order = currentOrder + 1
          }
        }
      })
      updatedWidget.order = targetOrder
    } else {
      const newColumnWidgets = widgets.filter(w => (w.column || 0) === targetColumn)
      newColumnWidgets.forEach(w => {
        if (w.order >= insertIndex) {
          w.order += 1
        }
      })
      updatedWidget.order = insertIndex

      const oldColumnWidgets = widgets.filter(w => (w.column || 0) === oldColumn)
      oldColumnWidgets.sort((a, b) => a.order - b.order).forEach((w, idx) => {
        w.order = idx
      })
    }

    const updatedPages = [...pages]
    updatedPages[activePage] = {
      ...currentPage,
      widgets,
      updated_at: new Date().toISOString(),
    }

    const previousPages = pages
    setPages(updatedPages)
    setDraggedWidgetId(null)
    setDropTarget(null)

    const result = await pagesStorage.set(updatedPages)

    if (!result.success) {
      console.error('Failed to reorder widgets, rolling back:', result.error)
      setPages(previousPages)
    } else {
      console.log('✓ Widgets reordered in Chrome storage')
    }
  }

  const handleWidgetDragEnd = () => {
    setDraggedWidgetId(null)
    setDropTarget(null)
  }

  const handleSettingsChange = (newSettings: Settings) => {
    setSettings(newSettings)
    applyTheme(newSettings.theme)
  }

  // Show loading state during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background text-text bg-gradient-mesh">
        {/* Header Skeleton */}
        <header className="border-b border-border-subtle px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-surface animate-pulse rounded"></div>
            <div className="flex gap-2">
              <div className="w-9 h-9 bg-surface animate-pulse rounded-lg"></div>
              <div className="w-9 h-9 bg-surface animate-pulse rounded-lg"></div>
            </div>
          </div>
          {/* Page tabs skeleton */}
          <div className="flex gap-2 mt-3">
            <div className="h-10 w-20 bg-surface animate-pulse rounded-button"></div>
            <div className="h-10 w-24 bg-surface animate-pulse rounded-button"></div>
            <div className="h-10 w-16 bg-surface animate-pulse rounded-button"></div>
          </div>
        </header>
        
        {/* Main Content Skeleton */}
        <main className="p-6">
          <div 
            className="grid gap-6"
            style={{
              gridTemplateColumns: `repeat(${settings.grid_columns}, minmax(0, 1fr))`
            }}
          >
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="glass-card rounded-card p-4 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 w-24 bg-surface rounded"></div>
                  <div className="h-6 w-6 bg-surface rounded"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-20 bg-surface rounded"></div>
                  <div className="h-4 w-3/4 bg-surface rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <Header
        storageVerified={storageVerified}
        isEditMode={isEditMode}
        onSettingsClick={() => setShowSettings(true)}
        onEditToggle={() => setIsEditMode(!isEditMode)}
      >
        {/* Page Navigation */}
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2 flex-wrap">
          {pages.map((page, index) => (
            <div
              key={page.id}
              draggable={isEditMode && editingPageId !== page.id}
              onDragStart={(e) => handleDragStart(e, page.id)}
              onDragOver={(e) => handleDragOver(e, page.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, page.id)}
              onDragEnd={handleDragEnd}
              className={`group relative flex items-center rounded-button transition-all duration-200 ease-in-out ${
                isEditMode ? 'cursor-move' : ''
              } ${
                activePage === index
                  ? 'bg-secondary text-[var(--color-on-secondary)] font-semibold shadow-md'
                  : 'bg-background text-text hover:bg-surface'
              } ${
                draggedPageId === page.id
                  ? 'opacity-50 scale-95 shadow-lg'
                  : ''
              } ${
                dragOverPageId === page.id && draggedPageId !== page.id
                  ? 'shadow-md scale-105 border-2 border-accent'
                  : ''
              } ${
                isEditMode && activePage === index
                  ? 'ring-2 ring-secondary/30'
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
                  className="px-3 py-2 bg-surface text-text border border-border rounded-button focus:outline-none focus:ring-2 focus:ring-secondary"
                  autoFocus
                  maxLength={50}
                />
              ) : (
                <>
                  {isEditMode && (
                    <div className="px-1 flex items-center cursor-grab active:cursor-grabbing text-lg opacity-50 hover:opacity-100 transition-opacity">
                      <span>⋮⋮</span>
                    </div>
                  )}
                  <button
                    onClick={() => setActivePage(index)}
                    onDoubleClick={isEditMode ? () => handleStartRename(page.id, page.name) : undefined}
                    className={`px-3 py-2 min-w-[60px]`}
                  >
                    {page.name}
                  </button>
                  {isEditMode && (
                    <div className="flex items-center pr-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(page.id, page.name)
                        }}
                        className="p-1.5 hover:bg-black/10 rounded transition-colors opacity-50 hover:opacity-100"
                        title="Rename page"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartDelete(page.id)
                          }}
                          className="p-1.5 hover:bg-black/10 rounded transition-colors hover:text-red-500 opacity-50 hover:opacity-100"
                          title="Delete page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          {isEditMode && (
            <div className="relative">
              <button
                onClick={handleAddPage}
                disabled={pages.length >= MAX_PAGES}
                className={`px-4 py-2 rounded-button transition-all duration-200 ease-in-out flex items-center gap-2 ${
                  pages.length >= MAX_PAGES
                    ? 'bg-surface text-text-muted border border-border cursor-not-allowed opacity-50'
                    : 'btn-secondary'
                }`}
                title={pages.length >= MAX_PAGES ? `Maximum ${MAX_PAGES} pages allowed` : 'Add a new page'}
              >
                <Plus className="w-4 h-4" />
                Add Page
              </button>
              {showLimitMessage && (
                <div className="absolute top-full mt-2 left-0 glass-card px-3 py-2 rounded-button text-sm shadow-lg animate-fade-in z-50 whitespace-nowrap flex items-center gap-2 text-amber-600 border-amber-500/20">
                  <AlertTriangle className="w-4 h-4" />
                  Maximum page limit reached ({MAX_PAGES} pages). Delete a page to add more.
                </div>
              )}
            </div>
          )}
          </div>
          {isEditMode && (
            <button
              onClick={handleAddWidget}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Widget
            </button>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-modal rounded-lg p-6 max-w-md mx-4 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold">Delete Page?</h3>
              </div>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete this page? This action cannot be undone.
                {pages[pageToDelete ? pages.findIndex((p) => p.id === pageToDelete) : 0]?.widgets &&
                  pages[pageToDelete ? pages.findIndex((p) => p.id === pageToDelete) : 0]?.widgets.length > 0 &&
                  ' All widgets on this page will also be deleted.'}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-button hover:bg-red-600 transition-colors"
                >
                  Delete Page
                </button>
              </div>
            </div>
          </div>
        )}
      </Header>

      <MainContainer>
        <div className="animate-fade-in" key={pages[activePage]?.id}>
          {pages[activePage] && pages[activePage].widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No widgets yet</h2>
              {isEditMode ? (
                <>
                  <p className="text-text-secondary mb-4">Add widgets to customize your dashboard</p>
                  <button
                    onClick={handleAddWidget}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </button>
                </>
              ) : (
                <p className="text-text-secondary">Enter edit mode to add widgets</p>
              )}
            </div>
          ) : (
            <div 
              className="columns-container"
              style={{ gap: `${settings.grid_gap}px` }}
            >
              {Array.from({ length: settings.grid_columns }).map((_, columnIndex) => {
                const columnWidgets = getWidgetsByColumn(
                  pages[activePage]?.widgets || [],
                  settings.grid_columns
                )[columnIndex] || []
                
                return (
                  <div
                    key={columnIndex}
                    className="column"
                    style={{ gap: `${settings.grid_gap}px` }}
                    onDragOver={(e) => handleColumnDragOver(e, columnIndex)}
                    onDrop={(e) => handleColumnDrop(e, columnIndex)}
                  >
                    {columnWidgets.map((widget, index) => (
                      <div key={widget.id} data-widget-id={widget.id}>
                        {draggedWidgetId && 
                         dropTarget?.column === columnIndex && 
                         dropTarget?.index === index && (
                          <div className="drop-indicator" style={{ marginBottom: `${settings.grid_gap}px` }} />
                        )}
                        <div style={{ marginBottom: `${settings.grid_gap}px` }}>
                           <WidgetCard
                              widget={widget}
                              pageWidgets={pages[activePage]?.widgets || []}
                              onEdit={handleEditWidget}
                              onEditTitle={handleEditWidgetTitle}
                              onMove={handleMoveWidget}
                              onDelete={handleDeleteWidget}
                              onConfigChange={handleWidgetConfigChange}
                              editingWidgetId={editingWidgetId}
                              editingWidgetTitle={editingWidgetTitle}
                              onTitleChange={(_, newTitle) => setEditingWidgetTitle(newTitle)}
                              onSaveTitle={handleSaveWidgetTitle}
                              onTitleKeyDown={handleWidgetTitleKeyDown}
                              draggedWidgetId={draggedWidgetId}
                              onDragStart={handleWidgetDragStart}
                              onDragEnd={handleWidgetDragEnd}
                            />
                         </div>
                      </div>
                    ))}
                    {draggedWidgetId && 
                     dropTarget?.column === columnIndex && 
                     dropTarget?.index === columnWidgets.length && (
                      <div className="drop-indicator" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </MainContainer>

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
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Move Widget Dialog */}
      <MoveWidgetDialog
        isOpen={showMoveDialog}
        pages={pages}
        currentPageId={pages[activePage]?.id}
        onSelect={handleConfirmMoveWidget}
        onCancel={handleCancelMoveWidget}
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
