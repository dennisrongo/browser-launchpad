import { useState, memo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Bookmark as BookmarkIcon, CloudSun, MessageSquare, Package, GripVertical, MoreVertical, Settings, Pencil, Trash2, Info, CheckSquare, Timer, Calendar, MoveRight, Plus, FileText, Twitter, LayoutDashboard } from 'lucide-react'
import type { Widget, Bookmark } from '../types'
import { ClockWidget } from '../widgets/ClockWidget'
import { BookmarkWidget } from '../widgets/BookmarkWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'
import { AIChatWidget } from '../widgets/AIChatWidget'
import { TodoWidget } from '../widgets/TodoWidget'
import { PomodoroWidget } from '../widgets/PomodoroWidget'
import { CalendarWidget } from '../widgets/CalendarWidget'
import { NotesWidget } from '../widgets/NotesWidget'
import { XTimelineWidget } from '../widgets/XTimelineWidget'
import { KanbanWidget } from '../widgets/KanbanWidget'

interface WidgetCardProps {
  widget: Widget
  pageWidgets?: Widget[]
  onEdit?: (widgetId: string) => void
  onEditTitle?: (widgetId: string) => void
  onMove?: (widgetId: string) => void
  onDelete?: (widgetId: string) => void
  onConfigChange?: (widgetId: string, newConfig: any) => void
  onBookmarkTransfer?: (sourceWidgetId: string, bookmark: Bookmark, targetWidgetId: string, targetIndex: number) => void
  editingWidgetId?: string | null
  editingWidgetTitle?: string
  onTitleChange?: (widgetId: string, newTitle: string) => void
  onSaveTitle?: (widgetId: string) => void
  onTitleKeyDown?: (e: React.KeyboardEvent, widgetId: string) => void
  draggedWidgetId?: string | null
  onDragStart?: (widgetId: string) => void
  onDragEnd?: () => void
  onDragPrepare?: (widgetId: string) => void
  isCollapsed?: boolean
}

function WidgetCardComponent({
  widget,
  pageWidgets = [],
  onEdit,
  onEditTitle,
  onMove,
  onDelete,
  onConfigChange,
  onBookmarkTransfer,
  editingWidgetId,
  editingWidgetTitle = '',
  onTitleChange,
  onSaveTitle,
  onTitleKeyDown,
  draggedWidgetId,
  onDragStart,
  onDragEnd,
  onDragPrepare,
  isCollapsed = false
}: WidgetCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showAddBookmark, setShowAddBookmark] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isEditing = editingWidgetId === widget.id
  const isDragging = draggedWidgetId === widget.id

  const updateMenuPosition = () => {
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect()
      const menuWidth = 176
      const padding = 8
      
      let left = rect.right - menuWidth
      
      if (left < padding) {
        left = padding
      } else if (left + menuWidth > window.innerWidth - padding) {
        left = window.innerWidth - menuWidth - padding
      }
      
      setMenuPosition({
        top: rect.bottom + 4,
        left,
      })
    }
  }

  const renderWidget = () => {
    switch (widget.type) {
      case 'clock':
        return <ClockWidget title={widget.title} config={widget.config as any} />
      case 'bookmark':
        return (
          <BookmarkWidget
            title={widget.title}
            widgetId={widget.id}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
            onBookmarkTransfer={(sourceWidgetId, bookmark, targetIndex) => onBookmarkTransfer?.(sourceWidgetId, bookmark, widget.id, targetIndex)}
            showAddForm={showAddBookmark}
            onAddFormClose={() => setShowAddBookmark(false)}
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
            pageWidgets={pageWidgets}
          />
        )
      case 'todo':
        return (
          <TodoWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
          />
        )
      case 'pomodoro':
        return (
          <PomodoroWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig: any) => onConfigChange?.(widget.id, newConfig)}
            widgetId={widget.id}
          />
        )
      case 'calendar':
        return (
          <CalendarWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
          />
        )
      case 'notes':
        return (
          <NotesWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
          />
        )
      case 'x-timeline':
        return <XTimelineWidget title={widget.title} config={widget.config as any} />
      case 'kanban':
        return (
          <KanbanWidget
            title={widget.title}
            config={widget.config as any}
            onConfigChange={(newConfig) => onConfigChange?.(widget.id, newConfig)}
          />
        )
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-text-secondary text-sm">Unknown widget type</p>
          </div>
        )
    }
  }

  const getWidgetIcon = () => {
    switch (widget.type) {
      case 'clock':
        return <Clock className="w-4 h-4" />
      case 'bookmark':
        return <BookmarkIcon className="w-4 h-4" />
      case 'weather':
        return <CloudSun className="w-4 h-4" />
      case 'ai-chat':
        return <MessageSquare className="w-4 h-4" />
      case 'todo':
        return <CheckSquare className="w-4 h-4" />
      case 'pomodoro':
        return <Timer className="w-4 h-4" />
      case 'calendar':
        return <Calendar className="w-4 h-4" />
      case 'notes':
        return <FileText className="w-4 h-4" />
      case 'x-timeline':
        return <Twitter className="w-4 h-4" />
      case 'kanban':
        return <LayoutDashboard className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  const hasAIContext = widget.type === 'ai-chat' && pageWidgets.some(w => 
    (w.type === 'bookmark' && (w.config as any).bookmarks?.length > 0) ||
    (w.type === 'todo' && (w.config as any).items?.some((i: any) => !i.archived)) ||
    (w.type === 'weather' && (w.config as any).city) ||
    w.type === 'clock'
  )

  return (
    <div
      ref={cardRef}
      draggable={!isEditing}
      onDragStart={(e) => {
        if (isEditing) return
        e.stopPropagation()
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(widget.id)
      }}
      onDragEnd={(e) => {
        e.stopPropagation()
        onDragEnd?.()
      }}
      className={`
        group relative glass-card rounded-card
        transition-all duration-150 ease-out overflow-hidden
        hover:shadow-glass-hover cursor-grab active:cursor-grabbing
        shadow-glass
        ${isCollapsed ? 'widget-card-collapsed' : ''}
        ${isDragging ? 'widget-dragging' : ''}
      `}
    >
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-border-subtle/60">
        <div className="flex items-center gap-2.5 flex-1">
          {!isEditing && (
            <div
              className="cursor-grab active:cursor-grabbing"
              onMouseDown={() => onDragPrepare?.(widget.id)}
            >
              <GripVertical className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          )}
          <div className="text-secondary pointer-events-none">
            {getWidgetIcon()}
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editingWidgetTitle}
              onChange={(e) => onTitleChange?.(widget.id, e.target.value)}
              onKeyDown={(e) => onTitleKeyDown?.(e, widget.id)}
              onBlur={() => onSaveTitle?.(widget.id)}
              onMouseDown={(e) => e.stopPropagation()}
              className="input-base flex-1 py-1 text-sm font-semibold"
              autoFocus
              maxLength={50}
            />
          ) : (
            <h3
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onEdit?.(widget.id)}
              className="font-semibold text-text hover:text-primary transition-colors duration-200 text-sm cursor-pointer"
              title="Click to edit title"
            >
              {widget.title}
            </h3>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            {hasAIContext && (
              <span className="text-xs px-2 py-0.5 rounded flex items-center gap-1 badge-accent pointer-events-none" title="This chat is context-aware and can reference your widgets">
                <Info className="w-3 h-3" />
                Context
              </span>
            )}
            <div className="relative">
            <button
              ref={menuButtonRef}
              draggable={false}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (!showMenu) updateMenuPosition()
                setShowMenu(!showMenu)
              }}
              className="p-1.5 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200"
              title="Widget options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && createPortal(
              <>
                <div
                  className="fixed inset-0 z-50"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="fixed w-44 bg-surface-elevated rounded-card shadow-lg border border-border-subtle animate-dropdown-in origin-top-right z-50"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <div className="py-1.5">
                    {widget.type === 'bookmark' && (
                      <>
                        <button
                          onClick={() => {
                            setShowAddBookmark(true)
                            setShowMenu(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5 transition-colors duration-100 flex items-center gap-2.5 text-text rounded-lg mx-1"
                        >
                          <Plus className="w-4 h-4 text-text-muted" />
                          Add Bookmark
                        </button>
                        <div className="my-1.5 mx-3 border-t border-border-subtle/60" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        onEdit?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5 transition-colors duration-100 flex items-center gap-2.5 text-text rounded-lg mx-1"
                    >
                      <Settings className="w-4 h-4 text-text-muted" />
                      Configure
                    </button>
                    <button
                      onClick={() => {
                        onMove?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5 transition-colors duration-100 flex items-center gap-2.5 text-text rounded-lg mx-1"
                    >
                      <MoveRight className="w-4 h-4 text-text-muted" />
                      Move
                    </button>
                    <button
                      onClick={() => {
                        onEditTitle?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary/5 transition-colors duration-100 flex items-center gap-2.5 text-text rounded-lg mx-1"
                    >
                      <Pencil className="w-4 h-4 text-text-muted" />
                      Edit Title
                    </button>
                    <div className="my-1.5 mx-3 border-t border-border-subtle/60" />
                    <button
                      onClick={() => {
                        onDelete?.(widget.id)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/10 transition-colors duration-100 flex items-center gap-2.5 text-red-500 rounded-lg mx-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </>,
              document.body
            )}
            </div>
          </div>
        )}
      </div>

      <div 
        className={`widget-content ${isCollapsed ? 'widget-content-collapsed' : ''}`}
      >
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
    prevProps.editingWidgetId === nextProps.editingWidgetId &&
    prevProps.editingWidgetTitle === nextProps.editingWidgetTitle &&
    prevProps.draggedWidgetId === nextProps.draggedWidgetId &&
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.pageWidgets?.length === nextProps.pageWidgets?.length &&
    JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config)
  )
})
