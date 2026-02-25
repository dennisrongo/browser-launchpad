import { ReactNode } from 'react'

interface HeaderProps {
  title?: string
  storageVerified?: boolean
  onSettingsClick?: () => void
  children?: ReactNode
}

export function Header({
  title = 'Browser Launchpad',
  storageVerified = false,
  onSettingsClick,
  children,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
          {storageVerified && (
            <span className="text-xs text-green-500">✓ Chrome Storage Connected</span>
          )}
        </div>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity flex items-center gap-2"
            title="Open settings"
            aria-label="Open settings"
          >
            <span className="text-lg" aria-hidden="true">⚙️</span>
            <span>Settings</span>
          </button>
        )}
      </div>
      {children}
    </header>
  )
}
