import { useState, memo } from 'react'
import { Widget } from '../types'
import { ClockWidget } from '../widgets/ClockWidget'
import { BookmarkWidget } from '../widgets/BookmarkWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'
import { AIChatWidget } from '../widgets/AIChatWidget'

interface WidgetCardProps {
  widget: Widget
  onEdit?: (widgetId: string) => void
  onEditTitle?: (widgetId: string) => void
  onDelete?: (widgetId: string) => void
  onConfigChange?: (widgetId: string, newConfig: any) => void
  editingWidgetId?: string | null
  editingWidgetTitle?: string
  onTitleChange?: (widgetId: string, newTitle: string) => void
  onSaveTitle?: (widgetId: string) => void
  onTitleKeyDown?: (e: React.KeyboardEvent, widgetId: string) => void
  // Drag and drop props
  draggedWidgetId?: string | null
  dragOverWidgetId?: string | null
  onDragStart?: (widgetId: string) => void
  onDragOver?: (widgetId: string) => void
  onDragLeave?: () => void
  onDrop?: () => void
  onDragEnd?: () => void
}

function WidgetCardComponent({
  widget,
  onEdit,
  onEditTitle,
  onDelete,
  onConfigChange,
  editingWidgetId,
  editingWidgetTitle = '',
  onTitleChange,
  onSaveTitle,
  onTitleKeyDown,
  draggedWidgetId,
  dragOverWidgetId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: WidgetCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const isEditing = editingWidgetId === widget.id
  const isDragging = draggedWidgetId === widget.id
  const isDragOver = dragOverWidgetId === widget.id && !isDragging

  const renderWidget = () => {
    switch (widget.type) {
      case 'clock':
        return <ClockWidget title={widget.title} config={widget.config as any} />
      case 'bookmark':
        return (
          <BookmarkWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
          />
        )
      case 'weather':
        return <WeatherWidget title={widget.title} config={widget.config as any} />
      case 'ai-chat':
        return (
          <AIChatWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
          />
        )
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
    <div
      draggable={!isEditing}
      onDragStart={() => onDragStart?.(widget.id)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver?.(widget.id)
      }}
      onDragLeave={() => onDragLeave?.()}
      onDrop={(e) => {
        e.preventDefault()
        onDrop?.()
      }}
      onDragEnd={() => onDragEnd?.()}
      style={{ contain: 'layout style paint' }}
      className={`
        group relative border border-border rounded-card bg-surface
        transition-all duration-200 overflow-hidden
        ${isDragging ? 'opacity-50 scale-95 shadow-lg' : 'shadow-card hover:shadow-card-hover'}
        ${isDragOver ? 'border-primary border-2 shadow-md scale-[1.02]' : ''}
      `}
    >
      {/* Drag Handle - visible on hover */}
      {!isEditing && (
        <div className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
          </svg>
        </div>
      )}

      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2 flex-1 pl-6">
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
              <div className="absolute right-0 mt-1 w-40 bg-background border border-border rounded-card shadow-lg z-10">
                <button
                  onClick={() => {
                    onEdit?.(widget.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                >
                  ⚙️ Configure
                </button>
                <button
                  onClick={() => {
                    onEditTitle?.(widget.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                >
                  ✏️ Edit Title
                </button>
                <button
                  onClick={() => {
                    onDelete?.(widget.id)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface text-red-500 transition-colors flex items-center gap-2"
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

// Memoize WidgetCard for efficient rendering with many widgets
// Only re-render when props change, preventing unnecessary updates
export const WidgetCard = memo(WidgetCardComponent, (prevProps, nextProps) => {
  // Custom comparison for props that matter for rendering
  return (
    prevProps.widget.id === nextProps.widget.id &&
    prevProps.widget.type === nextProps.widget.type &&
    prevProps.widget.title === nextProps.widget.title &&
    prevProps.widget.order === nextProps.widget.order &&
    prevProps.editingWidgetId === nextProps.editingWidgetId &&
    prevProps.draggedWidgetId === nextProps.draggedWidgetId &&
    prevProps.dragOverWidgetId === nextProps.dragOverWidgetId &&
    JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config)
  )
})
