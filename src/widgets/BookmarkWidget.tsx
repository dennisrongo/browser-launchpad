import { useState, useCallback } from 'react'
import { Pencil, Trash2, X, Link, AlertTriangle, GripVertical, RefreshCw } from 'lucide-react'
import { BookmarkWidgetConfig } from '../types'
import { getBookmarkIconDisplay } from '../utils/favicon'

interface BookmarkWidgetProps {
  title: string
  config: BookmarkWidgetConfig
  onConfigChange?: (newConfig: BookmarkWidgetConfig) => void
  showAddForm?: boolean
  onAddFormClose?: () => void
}

export function BookmarkWidget({ title: _title, config, onConfigChange, showAddForm: externalShowAddForm, onAddFormClose }: BookmarkWidgetProps) {
  const [internalShowAddForm, setInternalShowAddForm] = useState(false)
  const showAddForm = externalShowAddForm ?? internalShowAddForm
  
  const handleCloseAddForm = useCallback(() => {
    if (externalShowAddForm !== undefined && onAddFormClose) {
      onAddFormClose()
    }
    setInternalShowAddForm(false)
  }, [externalShowAddForm, onAddFormClose])
  
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingBookmark, setEditingBookmark] = useState<{ id: string; url: string; title: string } | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editIsFetching, setEditIsFetching] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [bookmarkToDelete, setBookmarkToDelete] = useState<string | null>(null)
  const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null)
  const [dragOverBookmarkId, setDragOverBookmarkId] = useState<string | null>(null)

  const bookmarks = config.bookmarks || []

  const fetchPageTitle = useCallback(async (url: string): Promise<string | null> => {
    if (!url || !url.match(/^https?:\/\//i)) {
      return null
    }
    try {
      setIsFetching(true)
      console.log('[BookmarkWidget] Fetching title for:', url)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await chrome.runtime.sendMessage({ type: 'FETCH_PAGE_TITLE', url })
        console.log('[BookmarkWidget] Response:', response)
        return response?.success ? response.title : null
      }
      console.log('[BookmarkWidget] Chrome runtime not available')
      return null
    } catch (error) {
      console.error('[BookmarkWidget] Error:', error)
      return null
    } finally {
      setIsFetching(false)
    }
  }, [])

  const fetchTitleForEdit = useCallback(async (url: string): Promise<string | null> => {
    if (!url || !url.match(/^https?:\/\//i)) {
      return null
    }
    try {
      setEditIsFetching(true)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const response = await chrome.runtime.sendMessage({ type: 'FETCH_PAGE_TITLE', url })
        return response?.success ? response.title : null
      }
      return null
    } catch {
      return null
    } finally {
      setEditIsFetching(false)
    }
  }, [])

  const handleUrlBlur = async () => {
    if (newUrl && !newTitle) {
      const fetchedTitle = await fetchPageTitle(newUrl)
      if (fetchedTitle) setNewTitle(fetchedTitle)
    }
  }

  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return false
    try {
      const urlObj = new URL(url)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleAddBookmark = () => {
    if (!newUrl.trim() || !isValidUrl(newUrl)) return
    const newBookmark = {
      id: 'bookmark-' + Date.now(),
      url: newUrl.trim(),
      title: newTitle.trim() || newUrl,
      icon: undefined,
    }
    onConfigChange?.({ bookmarks: [...bookmarks, newBookmark] })
    setNewUrl('')
    setNewTitle('')
    handleCloseAddForm()
  }

  const handleDeleteBookmark = (id: string) => {
    setBookmarkToDelete(id)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (!bookmarkToDelete) return
    onConfigChange?.({ bookmarks: bookmarks.filter(b => b.id !== bookmarkToDelete) })
    setShowDeleteConfirm(false)
    setBookmarkToDelete(null)
  }

  const handleStartEdit = (bookmark: { id: string; url: string; title: string }) => {
    setEditingBookmark(bookmark)
    setEditUrl(bookmark.url)
    setEditTitle(bookmark.title)
    setShowEditDialog(true)
  }

  const handleFetchEditTitle = async () => {
    if (!editUrl) return
    const fetchedTitle = await fetchTitleForEdit(editUrl)
    if (fetchedTitle) setEditTitle(fetchedTitle)
  }

  const handleSaveEdit = () => {
    if (!editingBookmark || !isValidUrl(editUrl)) return
    onConfigChange?.({
      bookmarks: bookmarks.map(b =>
        b.id === editingBookmark.id ? { ...b, url: editUrl.trim(), title: editTitle.trim() || editUrl.trim() } : b
      ),
    })
    setShowEditDialog(false)
    setEditingBookmark(null)
    setEditUrl('')
    setEditTitle('')
  }

  const handleCloseEditDialog = () => {
    setShowEditDialog(false)
    setEditingBookmark(null)
    setEditUrl('')
    setEditTitle('')
  }

  const handleDragStart = (id: string) => setDraggedBookmarkId(id)

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (draggedBookmarkId && draggedBookmarkId !== id) setDragOverBookmarkId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedBookmarkId || draggedBookmarkId === targetId) {
      setDraggedBookmarkId(null)
      setDragOverBookmarkId(null)
      return
    }
    const oldIndex = bookmarks.findIndex(b => b.id === draggedBookmarkId)
    const newIndex = bookmarks.findIndex(b => b.id === targetId)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...bookmarks]
    const [removed] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, removed)
    onConfigChange?.({ bookmarks: reordered })
    setDraggedBookmarkId(null)
    setDragOverBookmarkId(null)
  }

  const renderIcon = (bookmark: { url: string; icon?: string }) => {
    const display = getBookmarkIconDisplay(bookmark.url, bookmark.icon)
    if (display.type === 'image') {
      return (
        <img
          src={display.content}
          alt=""
          className="w-4 h-4 flex-shrink-0 object-contain rounded"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )
    }
    return <Link className="w-4 h-4 flex-shrink-0 text-text-muted" />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center mb-2">
              <Link className="w-5 h-5 text-text-muted" />
            </div>
            <p className="text-text-muted text-xs">No bookmarks</p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              draggable
              onDragStart={() => handleDragStart(bookmark.id)}
              onDragOver={(e) => handleDragOver(e, bookmark.id)}
              onDragLeave={() => setDragOverBookmarkId(null)}
              onDrop={(e) => handleDrop(e, bookmark.id)}
              onDragEnd={() => { setDraggedBookmarkId(null); setDragOverBookmarkId(null) }}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-100 ${
                draggedBookmarkId === bookmark.id ? 'opacity-50 scale-95' :
                dragOverBookmarkId === bookmark.id ? 'border border-primary bg-primary/5' :
                'hover:bg-surface'
              }`}
            >
              <span className="cursor-grab text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-3 h-3" />
              </span>
              {renderIcon(bookmark)}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm font-medium text-text hover:text-secondary transition-colors truncate"
                title={bookmark.url}
              >
                {bookmark.title}
              </a>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                <button onClick={() => handleStartEdit(bookmark)} className="p-1.5 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-100" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteBookmark(bookmark.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-button transition-all duration-100" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddForm ? (
        <div className="pt-2 border-t border-border-subtle/60 space-y-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">URL</label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://example.com"
              className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all duration-100"
              disabled={isFetching}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Title</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title"
                className="flex-1 px-2.5 py-1.5 text-sm bg-background border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-100"
              />
              <button 
                onClick={async () => {
                  if (newUrl) {
                    const title = await fetchPageTitle(newUrl)
                    if (title) setNewTitle(title)
                  }
                }}
                disabled={!newUrl || isFetching || !isValidUrl(newUrl)}
                className="px-2.5 py-1.5 text-sm btn-ghost border border-border rounded-input hover:bg-surface disabled:opacity-50 transition-all"
                title="Fetch title from URL"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {isFetching && <p className="text-xs text-text-muted mt-1">Fetching title...</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddBookmark} disabled={!newUrl.trim() || isFetching} className="flex-1 btn-primary text-sm disabled:opacity-50">
              Add
            </button>
            <button onClick={() => { handleCloseAddForm(); setNewUrl(''); setNewTitle(''); }} className="btn-ghost text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-modal rounded-lg p-5 max-w-sm mx-4 w-full animate-modal-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Edit Bookmark</h3>
              <button onClick={handleCloseEditDialog} className="p-1 text-text-muted hover:text-text hover:bg-surface rounded transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">URL</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all duration-100"
                  disabled={editIsFetching}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Title</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Bookmark title"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-100"
                    disabled={editIsFetching}
                  />
                  <button 
                    onClick={handleFetchEditTitle} 
                    disabled={!editUrl || editIsFetching || !isValidUrl(editUrl)}
                    className="px-3 py-2 text-sm btn-ghost border border-border rounded-input hover:bg-surface disabled:opacity-50 transition-all"
                    title="Fetch title from URL"
                  >
                    <RefreshCw className={`w-4 h-4 ${editIsFetching ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {editIsFetching && <p className="text-xs text-text-muted mt-1">Fetching title...</p>}
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={handleCloseEditDialog} className="btn-ghost text-sm">
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit} 
                disabled={!editUrl.trim() || !isValidUrl(editUrl)} 
                className="px-4 py-2 text-sm btn-primary disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="glass-modal rounded-lg p-5 max-w-xs mx-4 animate-modal-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <h3 className="font-semibold">Delete bookmark?</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setBookmarkToDelete(null); }} className="btn-ghost text-sm">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-button hover:bg-red-600 transition-all duration-150 active:scale-98">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
