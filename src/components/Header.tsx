import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Pencil, Settings, Check } from 'lucide-react'

import type { Page } from '../types'
import { SearchBookmarks } from './SearchBookmarks'

const MOBILE_QUERY = '(max-width: 639px)'

interface HeaderProps {
  isEditMode?: boolean
  onSettingsClick?: () => void
  onEditToggle?: () => void
  pages?: Page[]
  children?: ReactNode
}

export function Header({
  isEditMode = false,
  onSettingsClick,
  onEditToggle,
  pages = [],
  children,
}: HeaderProps) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  )
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // On mobile, an open search takes over the whole top row, so the edit and
  // settings buttons step out of the way and the search control stretches.
  const searchTakesOver = isMobile && searchOpen

  return (
    <header className="glass-card border-b border-border-subtle/60 px-4 sm:px-6 py-2 sm:py-3 sticky top-0 z-40">
      <div className="flex items-center justify-end">
        <div className={`flex items-center gap-1 ${searchTakesOver ? 'flex-1' : ''}`}>
          <SearchBookmarks
            pages={pages}
            open={searchOpen}
            onOpenChange={setSearchOpen}
            isMobile={isMobile}
            takeover={searchTakesOver}
          />
          {onEditToggle && !searchTakesOver && (
            <button
              onClick={onEditToggle}
              className={`p-2 rounded-button transition-all duration-150 ease-out ${
                isEditMode
                  ? 'bg-secondary/15 text-secondary shadow-sm'
                  : 'text-text-muted hover:text-secondary hover:bg-surface'
              }`}
              title={isEditMode ? 'Exit edit mode' : 'Edit pages'}
              aria-label={isEditMode ? 'Exit edit mode' : 'Edit pages'}
              aria-pressed={isEditMode}
            >
              {isEditMode ? (
                <Check className="w-5 h-5" />
              ) : (
                <Pencil className="w-5 h-5" />
              )}
            </button>
          )}
          {onSettingsClick && !searchTakesOver && (
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-button text-text-muted hover:text-secondary hover:bg-surface transition-all duration-150 ease-out"
              title="Open settings"
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {children}
    </header>
  )
}
