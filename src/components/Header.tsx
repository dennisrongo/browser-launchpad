import { ReactNode } from 'react'
import { Pencil, Settings, Check } from 'lucide-react'

interface HeaderProps {
  storageVerified?: boolean
  isEditMode?: boolean
  onSettingsClick?: () => void
  onEditToggle?: () => void
  children?: ReactNode
}

export function Header({
  storageVerified = false,
  isEditMode = false,
  onSettingsClick,
  onEditToggle,
  children,
}: HeaderProps) {
  return (
    <header className="glass-card border-b border-border-subtle px-6 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {storageVerified && (
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Storage Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onEditToggle && (
            <button
              onClick={onEditToggle}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isEditMode
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted hover:text-primary hover:bg-surface'
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
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-surface transition-all duration-200"
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
