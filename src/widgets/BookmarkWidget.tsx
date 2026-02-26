import { useState, useCallback, useEffect } from 'react'
import { Pencil, Trash2, Plus, X, Link, AlertTriangle, Check, GripVertical } from 'lucide-react'
import { BookmarkWidgetConfig } from '../types'
import { getBookmarkIconDisplay } from '../utils/favicon'

interface BookmarkWidgetProps {
  title: string
  config: BookmarkWidgetConfig
  onConfigChange?: (newConfig: BookmarkWidgetConfig) => void
  showAddForm?: boolean
  onAddFormClose?: () => void
}

export function BookmarkWidget({ title: _title, config, onConfigChange }: BookmarkWidgetProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editTitle, setEditTitle] = useState('')
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
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'text/html,application/xhtml+xml' },
      })
      if (!response.ok) return null
      const text = await response.text()
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i)
      return match && match[1] ? match[1].trim() : null
    } catch {
      return null
    } finally {
      setIsFetching(false)
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
    setShowAddForm(false)
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

  const handleStartEdit = (bookmark: { id: string; url: string; title: string; icon?: string }) => {
    setEditingBookmarkId(bookmark.id)
    setEditUrl(bookmark.url)
    setEditTitle(bookmark.title)
  }

  const handleSaveEdit = () => {
    if (!editingBookmarkId || !isValidUrl(editUrl)) return
    onConfigChange?.({
      bookmarks: bookmarks.map(b =>
        b.id === editingBookmarkId ? { ...b, url: editUrl, title: editTitle } : b
      ),
    })
    setEditingBookmarkId(null)
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
              draggable={editingBookmarkId !== bookmark.id}
              onDragStart={() => handleDragStart(bookmark.id)}
              onDragOver={(e) => handleDragOver(e, bookmark.id)}
              onDragLeave={() => setDragOverBookmarkId(null)}
              onDrop={(e) => handleDrop(e, bookmark.id)}
              onDragEnd={() => { setDraggedBookmarkId(null); setDragOverBookmarkId(null) }}
              className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-all ${
                draggedBookmarkId === bookmark.id ? 'opacity-50 scale-95' :
                dragOverBookmarkId === bookmark.id ? 'border border-primary bg-primary/5' :
                'hover:bg-surface'
              }`}
            >
              {editingBookmarkId === bookmark.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="url"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="URL"
                    className="flex-1 min-w-0 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-secondary"
                    autoFocus
                  />
                   <button onClick={handleSaveEdit} className="p-1 text-accent hover:bg-surface rounded" title="Save">
                     <Check className="w-4 h-4" />
                   </button>
                   <button onClick={() => { setEditingBookmarkId(null); setEditUrl(''); setEditTitle(''); }} className="p-1 text-text-muted hover:bg-surface rounded" title="Cancel">
                     <X className="w-4 h-4" />
                   </button>
                </div>
              ) : (
                <>
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
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleStartEdit(bookmark)} className="p-1.5 text-neutral hover:text-secondary hover:bg-surface rounded transition-all" title="Edit">
                       <Pencil className="w-3.5 h-3.5" />
                     </button>
                     <button onClick={() => handleDeleteBookmark(bookmark.id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-all" title="Delete">
                       <Trash2 className="w-3.5 h-3.5" />
                     </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {showAddForm ? (
        <div className="pt-2 border-t border-border-subtle space-y-2">
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://example.com"
                    className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-secondary"
            disabled={isFetching}
            autoFocus
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {isFetching && <p className="text-xs text-text-muted">Fetching title...</p>}
          <div className="flex gap-2">
            <button onClick={handleAddBookmark} disabled={!newUrl.trim() || isFetching} className="flex-1 btn-primary text-sm disabled:opacity-50">
              Add
            </button>
            <button onClick={() => { setShowAddForm(false); setNewUrl(''); setNewTitle(''); }} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)} className="w-full mt-2 btn-secondary text-sm flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-modal rounded-lg p-5 max-w-xs mx-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
               <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                 <AlertTriangle className="w-4 h-4 text-red-500" />
               </div>
              <h3 className="font-semibold">Delete bookmark?</h3>
            </div>
            <p className="text-sm text-text-secondary mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDeleteConfirm(false); setBookmarkToDelete(null); }} className="btn-secondary text-sm">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-button hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
