import { useState, useCallback } from 'react'
import { BookmarkWidgetConfig, Bookmark } from '../types'

interface BookmarkWidgetProps {
  title: string
  config: BookmarkWidgetConfig
  onConfigChange?: (newConfig: BookmarkWidgetConfig) => void
}

export function BookmarkWidget({ title: _title, config, onConfigChange }: BookmarkWidgetProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newIcon, setNewIcon] = useState('🔗')
  const [newCustomIcon, setNewCustomIcon] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editCustomIcon, setEditCustomIcon] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [bookmarkToDelete, setBookmarkToDelete] = useState<string | null>(null)

  // Drag and drop state for bookmark reordering
  const [draggedBookmarkId, setDraggedBookmarkId] = useState<string | null>(null)
  const [dragOverBookmarkId, setDragOverBookmarkId] = useState<string | null>(null)

  const bookmarks = config.bookmarks || []

  // Emoji icons for quick selection
  const emojiIcons = ['🔗', '📁', '⭐', '💼', '🎮', '🎵', '📚', '🛒', '💻', '📰', '🎬', '🏠']

  // Fetch page title from URL
  const fetchPageTitle = useCallback(async (url: string): Promise<string | null> => {
    if (!url || !url.match(/^https?:\/\//i)) {
      return null
    }

    try {
      setIsFetching(true)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
        },
      })

      if (!response.ok) {
        console.warn('Failed to fetch page title:', response.status)
        return null
      }

      const text = await response.text()
      const match = text.match(/<title[^>]*>([^<]+)<\/title>/i)

      if (match && match[1]) {
        return match[1].trim()
      }

      return null
    } catch (error) {
      console.error('Error fetching page title:', error)
      return null
    } finally {
      setIsFetching(false)
    }
  }, [])

  // Handle URL blur - auto-fetch title
  const handleUrlBlur = async () => {
    if (newUrl && !newTitle) {
      const fetchedTitle = await fetchPageTitle(newUrl)
      if (fetchedTitle) {
        setNewTitle(fetchedTitle)
      }
    }
  }

  // Handle custom icon upload
  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 100KB to avoid storage issues)
    if (file.size > 100 * 1024) {
      alert('Image file too large. Please select an image under 100KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (isEdit) {
        setEditCustomIcon(dataUrl)
        setEditIcon('') // Clear emoji when using custom icon
      } else {
        setNewCustomIcon(dataUrl)
        setNewIcon('') // Clear emoji when using custom icon
      }
    }
    reader.onerror = () => {
      alert('Failed to read image file')
    }
    reader.readAsDataURL(file)
  }

  // Clear custom icon
  const handleClearCustomIcon = (isEdit: boolean = false) => {
    if (isEdit) {
      setEditCustomIcon(null)
      setEditIcon('🔗')
    } else {
      setNewCustomIcon(null)
      setNewIcon('🔗')
    }
  }

  // Add new bookmark
  const handleAddBookmark = () => {
    if (!newUrl.trim()) return

    const newBookmark: Bookmark = {
      id: 'bookmark-' + Date.now(),
      url: newUrl.trim(),
      title: newTitle.trim() || newUrl,
      icon: newCustomIcon || newIcon,
    }

    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: [...bookmarks, newBookmark],
    }

    onConfigChange?.(updatedConfig)

    // Reset form
    setNewUrl('')
    setNewTitle('')
    setNewIcon('🔗')
    setNewCustomIcon(null)
    setShowAddForm(false)
  }

  // Delete bookmark
  const handleDeleteBookmark = (bookmarkId: string) => {
    setBookmarkToDelete(bookmarkId)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    if (!bookmarkToDelete) return

    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: bookmarks.filter(b => b.id !== bookmarkToDelete),
    }
    onConfigChange?.(updatedConfig)
    setShowDeleteConfirm(false)
    setBookmarkToDelete(null)
  }

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setBookmarkToDelete(null)
  }

  // Start editing bookmark
  const handleStartEdit = (bookmark: Bookmark) => {
    setEditingBookmarkId(bookmark.id)
    setEditUrl(bookmark.url)
    setEditTitle(bookmark.title)
    // Check if icon is a data URL (custom image) or emoji
    if (bookmark.icon?.startsWith('data:')) {
      setEditCustomIcon(bookmark.icon)
      setEditIcon('')
    } else {
      setEditIcon(bookmark.icon || '🔗')
      setEditCustomIcon(null)
    }
  }

  // Save bookmark edit
  const handleSaveEdit = () => {
    if (!editingBookmarkId) return

    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: bookmarks.map(b =>
        b.id === editingBookmarkId
          ? { ...b, url: editUrl, title: editTitle, icon: editCustomIcon || editIcon }
          : b
      ),
    }

    onConfigChange?.(updatedConfig)
    setEditingBookmarkId(null)
    setEditUrl('')
    setEditTitle('')
    setEditIcon('')
    setEditCustomIcon(null)
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingBookmarkId(null)
    setEditUrl('')
    setEditTitle('')
    setEditIcon('')
    setEditCustomIcon(null)
  }

  // Drag and drop handlers for bookmark reordering
  const handleBookmarkDragStart = (bookmarkId: string) => {
    setDraggedBookmarkId(bookmarkId)
  }

  const handleBookmarkDragOver = (e: React.DragEvent, bookmarkId: string) => {
    e.preventDefault()
    if (draggedBookmarkId && draggedBookmarkId !== bookmarkId) {
      setDragOverBookmarkId(bookmarkId)
    }
  }

  const handleBookmarkDragLeave = () => {
    setDragOverBookmarkId(null)
  }

  const handleBookmarkDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (!draggedBookmarkId || draggedBookmarkId === targetId) {
      setDraggedBookmarkId(null)
      setDragOverBookmarkId(null)
      return
    }

    // Find positions
    const oldIndex = bookmarks.findIndex(b => b.id === draggedBookmarkId)
    const newIndex = bookmarks.findIndex(b => b.id === targetId)

    if (oldIndex === -1 || newIndex === -1) {
      setDraggedBookmarkId(null)
      setDragOverBookmarkId(null)
      return
    }

    // Reorder bookmarks array
    const reorderedBookmarks = [...bookmarks]
    const [removed] = reorderedBookmarks.splice(oldIndex, 1)
    reorderedBookmarks.splice(newIndex, 0, removed)

    // Update config with new order
    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: reorderedBookmarks,
    }

    onConfigChange?.(updatedConfig)

    // Clear drag state
    setDraggedBookmarkId(null)
    setDragOverBookmarkId(null)
  }

  const handleBookmarkDragEnd = () => {
    setDraggedBookmarkId(null)
    setDragOverBookmarkId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-text-secondary text-sm">No bookmarks yet</p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              draggable={editingBookmarkId !== bookmark.id}
              onDragStart={() => handleBookmarkDragStart(bookmark.id)}
              onDragOver={(e) => handleBookmarkDragOver(e, bookmark.id)}
              onDragLeave={handleBookmarkDragLeave}
              onDrop={(e) => handleBookmarkDrop(e, bookmark.id)}
              onDragEnd={handleBookmarkDragEnd}
              className={`group flex items-center gap-2 p-2 rounded transition-all ${
                draggedBookmarkId === bookmark.id
                  ? 'opacity-50 scale-95 shadow-lg'
                  : dragOverBookmarkId === bookmark.id
                  ? 'border-2 border-primary scale-[1.02] shadow-md'
                  : 'hover:bg-surface'
              }`}
            >
              {editingBookmarkId === bookmark.id ? (
                // Edit mode
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="URL"
                    className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />

                  {/* Icon Selection for Edit */}
                  <div className="space-y-2">
                    {/* Custom Icon Upload */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 px-2 py-1 text-xs bg-background border border-border rounded hover:bg-surface cursor-pointer transition-colors">
                        <span>📷</span>
                        <span>Upload Image</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          onChange={(e) => handleIconUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                      {editCustomIcon && (
                        <button
                          onClick={() => handleClearCustomIcon(true)}
                          className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Remove custom icon"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>

                    {/* Custom Icon Preview */}
                    {editCustomIcon && (
                      <div className="flex items-center gap-2 p-2 bg-surface rounded">
                        <img
                          src={editCustomIcon}
                          alt="Custom icon preview"
                          className="w-6 h-6 object-contain rounded"
                        />
                        <span className="text-xs text-text-secondary">Custom icon</span>
                      </div>
                    )}

                    {/* Or Emoji Selection */}
                    {!editCustomIcon && (
                      <>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editIcon}
                            onChange={(e) => setEditIcon(e.target.value)}
                            placeholder="Emoji"
                            className="w-16 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {emojiIcons.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                setEditIcon(emoji)
                                setEditCustomIcon(null)
                              }}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                editIcon === emoji
                                  ? 'bg-primary text-white'
                                  : 'bg-background hover:bg-surface'
                              }`}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-sm bg-background border border-border rounded hover:bg-surface"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  {/* Drag handle */}
                  <span className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary">
                    ⋮⋮
                  </span>
                  {bookmark.icon?.startsWith('data:') ? (
                    <img
                      src={bookmark.icon}
                      alt=""
                      className="w-5 h-5 flex-shrink-0 object-contain rounded"
                    />
                  ) : (
                    <span className="text-xl flex-shrink-0">{bookmark.icon || '🔗'}</span>
                  )}
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm font-medium text-text hover:text-primary transition-colors truncate"
                    title={bookmark.title}
                  >
                    {bookmark.title}
                  </a>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(bookmark)}
                      className="p-1 text-xs text-text-secondary hover:text-primary transition-colors"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="p-1 text-xs text-text-secondary hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Bookmark Section */}
      {showAddForm ? (
        <div className="pt-2 border-t border-border space-y-2">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="URL (e.g., https://example.com)"
            className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isFetching}
          />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (auto-fetched from URL)"
            className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Icon Selection */}
          <div className="space-y-2">
            {/* Custom Icon Upload */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 px-2 py-1 text-sm bg-background border border-border rounded hover:bg-surface cursor-pointer transition-colors">
                <span>📷</span>
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => handleIconUpload(e, false)}
                  className="hidden"
                />
              </label>
              {newCustomIcon && (
                <button
                  onClick={() => handleClearCustomIcon(false)}
                  className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  title="Remove custom icon"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Custom Icon Preview */}
            {newCustomIcon && (
              <div className="flex items-center gap-2 p-2 bg-surface rounded">
                <img
                  src={newCustomIcon}
                  alt="Custom icon preview"
                  className="w-8 h-8 object-contain rounded"
                />
                <span className="text-xs text-text-secondary">Custom icon selected</span>
              </div>
            )}

            {/* Or Emoji Selection */}
            {!newCustomIcon && (
              <>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    placeholder="Emoji"
                    className="w-16 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-xs text-text-secondary">or pick one:</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {emojiIcons.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewIcon(emoji)
                        setNewCustomIcon(null)
                      }}
                      className={`px-2 py-1 text-sm rounded transition-colors ${
                        newIcon === emoji
                          ? 'bg-primary text-white'
                          : 'bg-background hover:bg-surface'
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {isFetching && (
            <p className="text-xs text-text-secondary">Fetching page title...</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAddBookmark}
              disabled={!newUrl.trim() || isFetching}
              className="flex-1 px-3 py-1 text-sm bg-primary text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Bookmark
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewUrl('')
                setNewTitle('')
                setNewIcon('🔗')
                setNewCustomIcon(null)
              }}
              className="px-3 py-1 text-sm bg-background border border-border rounded hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full mt-2 px-3 py-2 text-sm bg-primary text-white rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>+ Add Bookmark</span>
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background border border-border rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-text mb-2">Delete Bookmark</h3>
            <p className="text-sm text-text-secondary mb-4">
              Are you sure you want to delete this bookmark? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm bg-background border border-border rounded hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
