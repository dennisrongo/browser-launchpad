import { useState } from 'react'
import { Widget } from '../types'
import { ClockWidget } from '../widgets/ClockWidget'
import { BookmarkWidget } from '../widgets/BookmarkWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'
import { AIChatWidget } from '../widgets/AIChatWidget'

interface WidgetCardProps {
  widget: Widget
  onEdit?: (widgetId: string) => void
  onDelete?: (widgetId: string) => void
  editingWidgetId?: string | null
  editingWidgetTitle?: string
  onTitleChange?: (widgetId: string, newTitle: string) => void
  onSaveTitle?: (widgetId: string) => void
  onTitleKeyDown?: (e: React.KeyboardEvent, widgetId: string) => void
}

export function WidgetCard({
  widget,
  onEdit,
  onDelete,
  editingWidgetId,
  editingWidgetTitle = '',
  onTitleChange,
  onSaveTitle,
  onTitleKeyDown
}: WidgetCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const isEditing = editingWidgetId === widget.id

  const renderWidget = () => {
    switch (widget.type) {
      case 'clock':
        return <ClockWidget title={widget.title} config={widget.config as any} />
      case 'bookmark':
        return <BookmarkWidget title={widget.title} config={widget.config as any} />
      case 'weather':
        return <WeatherWidget title={widget.title} config={widget.config as any} />
      case 'ai-chat':
        return <AIChatWidget title={widget.title} config={widget.config as any} />
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-4xl mb-2">❓</div>
            <p className="text-text-secondary">Unknown widget type</p>
          </div>
        )
    }
  }

  const getWidgetIcon = () => {
    switch (widget.type) {
      case 'clock':
        return '🕐'
      case 'bookmark':
        return '🔖'
      case 'weather':
        return '🌤️'
      case 'ai-chat':
        return '🤖'
      default:
        return '📦'
    }
  }

  return (
    <div className="group relative border border-border rounded-card bg-surface shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">{getWidgetIcon()}</span>
          {isEditing ? (
            <input
              type="text"
              value={editingWidgetTitle}
              onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
              onKeyDown={(e) => onTitleKeyDown?.(e, widget.id)}
              onBlur={() => onSaveTitle?.(widget.id)}
              className="flex-1 px-2 py-1 bg-white text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              autoFocus
              maxLength={50}
            />
          ) : (
            <h3
              className="font-semibold text-text cursor-pointer hover:text-primary transition-colors"
              onClick={() => onEdit?.(widget.id)}
              title="Click to edit title"
            >
              {widget.title}
            </h3>
          )}
        </div>
        {!isEditing && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-text-secondary hover:text-text hover:bg-surface rounded transition-colors"
              title="Widget options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-32 bg-background border border-border rounded-card shadow-lg z-10">
                <button
                  onClick={() => {
                    onEdit?.(widget.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface transition-colors"
                >
                  ✏️ Edit Title
                </button>
                <button
                  onClick={() => {
                    onDelete?.(widget.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface text-red-500 transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Widget Content */}
      <div className="p-4 min-h-[160px]">
        {renderWidget()}
      </div>
    </div>
  )
}
