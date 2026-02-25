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
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">Unknown widget type</p>
          </div>
        )
    }
  }

  const getWidgetIcon = () => {
    switch (widget.type) {
      case 'clock':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'bookmark':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )
      case 'weather':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        )
      case 'ai-chat':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )
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
        group relative glass-card rounded-card
        transition-all duration-200 ease-out overflow-hidden
        hover:shadow-glass-hover hover-lift
        ${isDragging ? 'opacity-50 scale-[0.98] shadow-lg' : 'shadow-glass'}
        ${isDragOver ? 'ring-2 ring-primary/50 scale-[1.01] shadow-glow-primary' : ''}
      `}
    >
      {!isEditing && (
        <div className="absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="p-1 rounded bg-surface/50 backdrop-blur-sm">
            <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5 flex-1 pl-7">
          <div className="text-primary">
            {getWidgetIcon()}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editingWidgetTitle}
              onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
              onKeyDown={(e) => onTitleKeyDown?.(e, widget.id)}
              onBlur={() => onSaveTitle?.(widget.id)}
              className="input-base flex-1 py-1 text-sm font-semibold"
              autoFocus
              maxLength={50}
            />
          ) : (
            <h3
              className="font-semibold text-text cursor-pointer hover:text-primary transition-colors duration-200 text-sm"
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
              className="p-1.5 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200"
              title="Widget options"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-44 glass-card rounded-card shadow-modal z-20 animate-scale-in origin-top-right">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onEdit?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface/50 transition-colors flex items-center gap-2.5 text-text"
                    >
                      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configure
                    </button>
                    <button
                      onClick={() => {
                        onEditTitle?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-surface/50 transition-colors flex items-center gap-2.5 text-text"
                    >
                      <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Title
                    </button>
                    <div className="my-1 border-t border-border-subtle" />
                    <button
                      onClick={() => {
                        onDelete?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2.5 text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 min-h-[160px]">
        {renderWidget()}
      </div>
    </div>
  )
}

export const WidgetCard = memo(WidgetCardComponent, (prevProps, nextProps) => {
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
