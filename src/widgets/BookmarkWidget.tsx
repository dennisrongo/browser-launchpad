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
  const [isFetching, setIsFetching] = useState(false)
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editIcon, setEditIcon] = useState('')

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

  // Add new bookmark
  const handleAddBookmark = () => {
    if (!newUrl.trim()) return

    const newBookmark: Bookmark = {
      id: 'bookmark-' + Date.now(),
      url: newUrl.trim(),
      title: newTitle.trim() || newUrl,
      icon: newIcon,
    }

    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: [...bookmarks, newBookmark],
    }

    onConfigChange?.(updatedConfig)

    // Reset form
    setNewUrl('')
    setNewTitle('')
    setNewIcon('🔗')
    setShowAddForm(false)
  }

  // Delete bookmark
  const handleDeleteBookmark = (bookmarkId: string) => {
    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: bookmarks.filter(b => b.id !== bookmarkId),
    }
    onConfigChange?.(updatedConfig)
  }

  // Start editing bookmark
  const handleStartEdit = (bookmark: Bookmark) => {
    setEditingBookmarkId(bookmark.id)
    setEditUrl(bookmark.url)
    setEditTitle(bookmark.title)
    setEditIcon(bookmark.icon || '🔗')
  }

  // Save bookmark edit
  const handleSaveEdit = () => {
    if (!editingBookmarkId) return

    const updatedConfig: BookmarkWidgetConfig = {
      bookmarks: bookmarks.map(b =>
        b.id === editingBookmarkId
          ? { ...b, url: editUrl, title: editTitle, icon: editIcon }
          : b
      ),
    }

    onConfigChange?.(updatedConfig)
    setEditingBookmarkId(null)
    setEditUrl('')
    setEditTitle('')
    setEditIcon('')
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingBookmarkId(null)
    setEditUrl('')
    setEditTitle('')
    setEditIcon('')
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
              className="group flex items-center gap-2 p-2 rounded hover:bg-surface transition-colors"
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
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      placeholder="Icon"
                      className="w-16 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex gap-1 flex-1">
                      {emojiIcons.slice(0, 6).map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => setEditIcon(emoji)}
                          className={`px-2 py-1 text-sm rounded transition-colors ${
                            editIcon === emoji
                              ? 'bg-primary text-white'
                              : 'bg-background hover:bg-surface'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
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
                  <span className="text-xl flex-shrink-0">{bookmark.icon || '🔗'}</span>
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
          <div className="flex gap-1">
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="Icon"
              className="w-16 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {emojiIcons.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setNewIcon(emoji)}
                  className={`px-2 py-1 text-sm rounded transition-colors flex-shrink-0 ${
                    newIcon === emoji
                      ? 'bg-primary text-white'
                      : 'bg-background hover:bg-surface'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
    </div>
  )
}
