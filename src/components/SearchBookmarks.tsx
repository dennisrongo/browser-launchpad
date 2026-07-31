import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, X } from 'lucide-react'

import type { Page, Bookmark, BookmarkWidgetConfig } from '../types'
import { BookmarkIcon } from './BookmarkIcon'
import { isEditableTarget } from '../utils/isEditableTarget'

const MAX_RESULTS = 20

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url)

interface SearchResult {
  bookmark: Bookmark
  pageName: string
}

interface SearchBookmarksProps {
  pages: Page[]
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile: boolean
  takeover: boolean
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(escaped, 'i').exec(text)
  if (!match) return <>{text}</>
  return (
    <>
      {text.slice(0, match.index)}
      <mark className="bg-transparent text-secondary font-semibold">{match[0]}</mark>
      {text.slice(match.index + match[0].length)}
    </>
  )
}

export function SearchBookmarks({ pages, open, onOpenChange, isMobile, takeover }: SearchBookmarksProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const trimmedQuery = query.trim()

  const results = useMemo(() => {
    const q = trimmedQuery.toLowerCase()
    if (!q) return []

    const matches: SearchResult[] = []
    for (const page of pages) {
      for (const widget of page.widgets) {
        if (widget.type !== 'bookmark') continue
        const bookmarks = (widget.config as BookmarkWidgetConfig).bookmarks || []
        for (const bookmark of bookmarks) {
          if (
            bookmark.title.toLowerCase().includes(q) ||
            bookmark.url.toLowerCase().includes(q)
          ) {
            matches.push({ bookmark, pageName: page.name })
          }
        }
      }
    }
    return matches.slice(0, MAX_RESULTS)
  }, [pages, trimmedQuery])

  const closeSearch = useCallback(() => {
    // If the input holds focus (e.g. Esc), return focus to the trigger so a
    // keyboard user doesn't lose their place in the header.
    const returnFocus = document.activeElement === inputRef.current
    onOpenChange(false)
    setQuery('')
    setActiveIndex(0)
    if (returnFocus) buttonRef.current?.focus()
  }, [onOpenChange])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  // Two effects by design: reset to the first result on a new query, and clamp
  // when synced data shrinks the result set without a query change.
  useEffect(() => {
    setActiveIndex(0)
  }, [trimmedQuery])

  useEffect(() => {
    setActiveIndex((prev) => (prev >= results.length ? 0 : prev))
  }, [results.length])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSearch()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, closeSearch])

  // "/" opens search from anywhere, mirroring the app's global key handlers
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || open) return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      onOpenChange(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  useEffect(() => {
    const activeElement = listRef.current?.children[activeIndex] as HTMLElement | undefined
    activeElement?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, trimmedQuery])

  const status = !open || !trimmedQuery
    ? ''
    : results.length === 0
      ? 'No matching bookmarks'
      : `${results.length} bookmark${results.length === 1 ? '' : 's'} found`

  const activeDescendant = open && results[activeIndex]
    ? `bookmark-search-option-${results[activeIndex].bookmark.id}`
    : undefined

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeSearch()
      return
    }
    if (results.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const active = results[activeIndex]
      if (active && isHttpUrl(active.bookmark.url)) {
        window.open(active.bookmark.url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const renderResultRow = (result: SearchResult, index: number) => {
    const safe = isHttpUrl(result.bookmark.url)
    return (
      <a
        key={result.bookmark.id}
        id={`bookmark-search-option-${result.bookmark.id}`}
        href={safe ? result.bookmark.url : undefined}
        onClick={safe ? undefined : (e) => e.preventDefault()}
        target="_blank"
        rel="noopener noreferrer"
        role="option"
        tabIndex={-1}
        aria-selected={index === activeIndex}
        onMouseEnter={() => setActiveIndex(index)}
        className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors duration-100 ${
          index === activeIndex ? 'bg-surface' : ''
        }`}
      >
        <BookmarkIcon url={result.bookmark.url} icon={result.bookmark.icon} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text truncate">
            <HighlightedText text={result.bookmark.title} query={trimmedQuery} />
          </div>
          <div className="text-xs text-text-muted truncate">
            {getDomain(result.bookmark.url)}
          </div>
        </div>
        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-surface border border-border-subtle/60 rounded max-w-20 truncate">
          {result.pageName}
        </span>
      </a>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center ${takeover ? 'flex-1' : ''}`}
    >
      <span className="sr-only" role="status" aria-live="polite">{status}</span>

      {open && (
        <div
          className={`relative origin-right animate-expand-in ${
            isMobile ? 'flex-1 mr-2' : 'w-64 mr-1.5'
          }`}
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bookmarks..."
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={results.length > 0 ? 'bookmark-search-results' : undefined}
            aria-activedescendant={activeDescendant}
            aria-label="Search bookmarks across all pages"
            className={`w-full pl-8 pr-7 bg-background border border-border rounded-input focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all duration-100 ${
              isMobile ? 'py-2 text-base' : 'py-1.5 text-sm'
            }`}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-text-muted hover:text-text rounded transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => { if (open) closeSearch(); else onOpenChange(true) }}
        className={`p-2 rounded-button transition-all duration-150 ease-out ${
          open
            ? 'bg-secondary/15 text-secondary shadow-sm'
            : 'text-text-muted hover:text-secondary hover:bg-surface'
        }`}
        title={open ? 'Close search' : 'Search bookmarks ( / )'}
        aria-label={open ? 'Close search' : 'Search bookmarks'}
        aria-expanded={open}
      >
        {open ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
      </button>

      {open && results.length > 0 && (
        <div
          className={`absolute top-full mt-2 glass-dropdown rounded-card p-2 animate-dropdown-in z-50 ${
            isMobile ? 'left-0 right-0' : 'right-0 w-80'
          }`}
        >
          <div
            ref={listRef}
            id="bookmark-search-results"
            role="listbox"
            className={`overflow-y-auto space-y-0.5 scrollbar-thin ${
              isMobile ? 'max-h-[60vh]' : 'max-h-80'
            }`}
          >
            {results.map(renderResultRow)}
          </div>
        </div>
      )}
    </div>
  )
}
