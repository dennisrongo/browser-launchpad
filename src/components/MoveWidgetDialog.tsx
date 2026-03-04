import { X, FileText } from 'lucide-react'
import { Page } from '../types'

interface MoveWidgetDialogProps {
  isOpen: boolean
  pages: Page[]
  currentPageId: string
  onSelect: (pageId: string) => void
  onCancel: () => void
}

export function MoveWidgetDialog({
  isOpen,
  pages,
  currentPageId,
  onSelect,
  onCancel,
}: MoveWidgetDialogProps) {
  if (!isOpen) return null

  const availablePages = pages.filter((page) => page.id !== currentPageId)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-lg p-4 sm:p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gradient">Move Widget</h2>
          <button
            onClick={onCancel}
            className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-text-secondary mb-6">Select a page to move this widget to</p>

        {availablePages.length === 0 ? (
          <p className="text-text-muted text-center py-4">No other pages available</p>
        ) : (
          <div className="space-y-2 mb-6">
            {availablePages.map((page) => (
              <button
                key={page.id}
                onClick={() => onSelect(page.id)}
                className="w-full flex items-center gap-3 p-3 glass-card rounded-card hover:shadow-glass-hover hover-lift transition-all duration-200 text-left group"
              >
                <div className="text-primary group-hover:scale-110 transition-transform duration-200">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-medium text-text">{page.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
