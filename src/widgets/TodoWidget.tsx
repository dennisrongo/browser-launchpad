import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'
import { Plus, Check, Calendar, Archive, ArchiveRestore, Trash2, GripVertical, X, Tag, ChevronDown } from 'lucide-react'
import { todoListStorage } from '../services/storage'
import type { TodoWidgetConfig, TodoItem, TodoTag } from '../types'

interface TodoWidgetProps {
  title: string
  config: TodoWidgetConfig
  onConfigChange?: (newConfig: TodoWidgetConfig) => void
}

const DEFAULT_CONFIG: TodoWidgetConfig = {
  items: [],
  tags: [],
  sortBy: 'manual',
  filter: 'all',
}

const PRIORITY_COLORS = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#0ea5e9',
]

interface SortableItemProps {
  item: TodoItem
  tags: TodoTag[]
  onToggle: (id: string) => void
  onEdit: (id: string, text: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onUpdatePriority: (id: string, priority: TodoItem['priority']) => void
  onUpdateDueDate: (id: string, dueDate: string | undefined) => void
  onUpdateTags: (id: string, tagIds: string[]) => void
}

function SortableItem({
  item,
  tags,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  onUpdatePriority,
  onUpdateDueDate,
  onUpdateTags,
}: SortableItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const itemTags = tags.filter(t => item.tagIds.includes(t.id))

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit(item.id, editText.trim())
    }
    setIsEditing(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !item.completed

  const updateDropdownPosition = (buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.right,
      })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 p-2 rounded-lg transition-all duration-200 ${
        item.completed ? 'opacity-60' : ''
      } ${item.archived ? 'opacity-50' : ''} hover:bg-surface/50`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none"
      >
        <GripVertical className="w-4 h-4 text-text-muted" />
      </button>

      <button
        onClick={() => onToggle(item.id)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          item.completed
            ? 'bg-primary border-primary text-white'
            : 'border-border hover:border-primary'
        }`}
      >
        {item.completed && <Check className="w-3 h-3" />}
      </button>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') {
                setEditText(item.text)
                setIsEditing(false)
              }
            }}
            className="w-full bg-transparent border-b border-primary outline-none text-sm"
            autoFocus
          />
        ) : (
          <p
            className={`text-sm cursor-pointer ${
              item.completed ? 'line-through text-text-muted' : 'text-text'
            }`}
            onDoubleClick={() => setIsEditing(true)}
          >
            {item.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {itemTags.map(tag => (
            <span
              key={tag.id}
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}

          {item.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-rose-500' : 'text-text-muted'}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(item.dueDate)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          ref={tagButtonRef}
          onClick={() => {
            updateDropdownPosition(tagButtonRef)
            setShowTagPicker(!showTagPicker)
          }}
          className="p-1 hover:bg-surface rounded transition-colors"
          title="Add tags"
        >
          <Tag className="w-3.5 h-3.5 text-text-muted" />
        </button>

        <button
          ref={dateButtonRef}
          onClick={() => {
            updateDropdownPosition(dateButtonRef)
            setShowDatePicker(!showDatePicker)
          }}
          className="p-1 hover:bg-surface rounded transition-colors"
          title="Set due date"
        >
          <Calendar className="w-3.5 h-3.5 text-text-muted" />
        </button>

        <button
          ref={priorityButtonRef}
          onClick={() => {
            updateDropdownPosition(priorityButtonRef)
            setShowPriorityPicker(!showPriorityPicker)
          }}
          className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[item.priority]} hover:ring-2 hover:ring-offset-1 hover:ring-primary/50`}
          title={`Priority: ${item.priority}`}
        />

        <button
          onClick={() => onArchive(item.id)}
          className="p-1 hover:bg-surface rounded transition-colors"
          title={item.archived ? 'Unarchive' : 'Archive'}
        >
          {item.archived ? (
            <ArchiveRestore className="w-3.5 h-3.5 text-text-muted" />
          ) : (
            <Archive className="w-3.5 h-3.5 text-text-muted" />
          )}
        </button>

        <button
          onClick={() => onDelete(item.id)}
          className="p-1 hover:bg-rose-500/10 rounded transition-colors text-rose-500"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showTagPicker && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowTagPicker(false)} />
          <div
            className="fixed w-40 glass-card rounded-lg shadow-lg z-50 p-2 animate-scale-in origin-top-right max-h-48 overflow-y-auto"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left - 160 }}
          >
            <div className="text-xs text-text-muted mb-1 px-1">Tags</div>
            {tags.length === 0 ? (
              <div className="text-xs text-text-muted px-1 py-2">No tags created</div>
            ) : (
              tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    const newTagIds = item.tagIds.includes(tag.id)
                      ? item.tagIds.filter(id => id !== tag.id)
                      : [...item.tagIds, tag.id]
                    onUpdateTags(item.id, newTagIds)
                  }}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 hover:bg-surface ${
                    item.tagIds.includes(tag.id) ? 'bg-surface/50' : ''
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="truncate">{tag.name}</span>
                  {item.tagIds.includes(tag.id) && <Check className="w-3 h-3 ml-auto flex-shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}

      {showDatePicker && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
          <div
            className="fixed glass-card rounded-lg shadow-lg z-50 p-2 animate-scale-in origin-top-right"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left - 140 }}
          >
            <input
              type="date"
              value={item.dueDate || ''}
              onChange={(e) => {
                onUpdateDueDate(item.id, e.target.value || undefined)
                setShowDatePicker(false)
              }}
              className="text-xs input-base rounded px-2 py-1"
              onClick={(e) => e.stopPropagation()}
            />
            {item.dueDate && (
              <button
                onClick={() => {
                  onUpdateDueDate(item.id, undefined)
                  setShowDatePicker(false)
                }}
                className="w-full text-xs text-rose-500 hover:bg-rose-500/10 rounded px-2 py-1 mt-1"
              >
                Clear date
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {showPriorityPicker && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPriorityPicker(false)} />
          <div
            className="fixed w-28 glass-card rounded-lg shadow-lg z-50 p-1 animate-scale-in origin-top-right"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left - 112 }}
          >
            {(['high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdatePriority(item.id, p)
                  setShowPriorityPicker(false)
                }}
                className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 hover:bg-surface capitalize ${
                  item.priority === p ? 'bg-surface/50' : ''
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[p]}`} />
                {p}
                {item.priority === p && <Check className="w-3 h-3 ml-auto text-primary" />}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

export function TodoWidget({ title, config, onConfigChange }: TodoWidgetProps) {
  const [localConfig, setLocalConfig] = useState<TodoWidgetConfig>(config || DEFAULT_CONFIG)
  const [newItemText, setNewItemText] = useState('')
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const loadConfig = async () => {
      const result = await todoListStorage.get(`todo-widget-${title}`)
      if (result.data) {
        setLocalConfig(result.data)
      }
      setIsLoading(false)
    }
    loadConfig()
  }, [title])

  const saveConfig = useCallback(async (newConfig: TodoWidgetConfig) => {
    setLocalConfig(newConfig)
    await todoListStorage.set(`todo-widget-${title}`, newConfig)
    onConfigChange?.(newConfig)
  }, [title, onConfigChange])

  const handleAddItem = () => {
    if (!newItemText.trim()) return

    const newItem: TodoItem = {
      id: `todo-${Date.now()}`,
      text: newItemText.trim(),
      completed: false,
      priority: 'medium',
      tagIds: [],
      archived: false,
      order: localConfig.items.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveConfig({
      ...localConfig,
      items: [...localConfig.items, newItem],
    })
    setNewItemText('')
  }

  const handleToggleItem = (id: string) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.map(item =>
        item.id === id
          ? { ...item, completed: !item.completed, updatedAt: new Date().toISOString() }
          : item
      ),
    })
  }

  const handleEditItem = (id: string, text: string) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.map(item =>
        item.id === id
          ? { ...item, text, updatedAt: new Date().toISOString() }
          : item
      ),
    })
  }

  const handleArchiveItem = (id: string) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.map(item =>
        item.id === id
          ? { ...item, archived: !item.archived, updatedAt: new Date().toISOString() }
          : item
      ),
    })
  }

  const handleDeleteItem = (id: string) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.filter(item => item.id !== id),
    })
  }

  const handleUpdatePriority = (id: string, priority: TodoItem['priority']) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.map(item =>
        item.id === id
          ? { ...item, priority, updatedAt: new Date().toISOString() }
          : item
      ),
    })
  }

  const handleUpdateDueDate = (id: string, dueDate: string | undefined) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.map(item =>
        item.id === id
          ? { ...item, dueDate, updatedAt: new Date().toISOString() }
          : item
      ),
    })
  }

  const handleUpdateTags = (id: string, tagIds: string[]) => {
    saveConfig({
      ...localConfig,
      items: localConfig.items.map(item =>
        item.id === id
          ? { ...item, tagIds, updatedAt: new Date().toISOString() }
          : item
      ),
    })
  }

  const handleAddTag = () => {
    if (!newTagName.trim()) return

    const newTag: TodoTag = {
      id: `tag-${Date.now()}`,
      name: newTagName.trim(),
      color: TAG_COLORS[localConfig.tags.length % TAG_COLORS.length],
    }

    saveConfig({
      ...localConfig,
      tags: [...localConfig.tags, newTag],
    })
    setNewTagName('')
  }

  const handleDeleteTag = (tagId: string) => {
    saveConfig({
      ...localConfig,
      tags: localConfig.tags.filter(t => t.id !== tagId),
      items: localConfig.items.map(item => ({
        ...item,
        tagIds: item.tagIds.filter(id => id !== tagId),
      })),
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localConfig.items.findIndex(item => item.id === active.id)
      const newIndex = localConfig.items.findIndex(item => item.id === over.id)

      const newItems = arrayMove(localConfig.items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index,
      }))

      saveConfig({ ...localConfig, items: newItems })
    }
  }

  const getFilteredAndSortedItems = () => {
    let items = [...localConfig.items]

    switch (localConfig.filter) {
      case 'active':
        items = items.filter(item => !item.completed && !item.archived)
        break
      case 'completed':
        items = items.filter(item => item.completed && !item.archived)
        break
      case 'archived':
        items = items.filter(item => item.archived)
        break
      default:
        items = items.filter(item => !item.archived)
    }

    switch (localConfig.sortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        break
      case 'dueDate':
        items.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        })
        break
      default:
        items.sort((a, b) => a.order - b.order)
    }

    return items
  }

  const filterCounts = {
    all: localConfig.items.filter(i => !i.archived).length,
    active: localConfig.items.filter(i => !i.completed && !i.archived).length,
    completed: localConfig.items.filter(i => i.completed && !i.archived).length,
    archived: localConfig.items.filter(i => i.archived).length,
  }

  const filteredItems = getFilteredAndSortedItems()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Add a task..."
          className="flex-1 input-base text-sm rounded-lg px-3 py-1.5"
        />
        <button
          onClick={handleAddItem}
          disabled={!newItemText.trim()}
          className="p-1.5 bg-primary text-[var(--color-on-primary)] rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowTagManager(!showTagManager)}
          className={`p-1.5 rounded-lg transition-colors ${showTagManager ? 'bg-primary text-[var(--color-on-primary)]' : 'bg-surface hover:bg-surface/80'}`}
          title="Manage tags"
        >
          <Tag className="w-4 h-4" />
        </button>
      </div>

      {showTagManager && (
        <div className="mb-3 p-2 bg-surface/50 rounded-lg animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="New tag name..."
              className="flex-1 input-base text-xs rounded px-2 py-1"
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="p-1 bg-primary text-[var(--color-on-primary)] rounded hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {localConfig.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {localConfig.tags.map(tag => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.name}
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 mb-2 text-xs">
        {(['all', 'active', 'completed', 'archived'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => saveConfig({ ...localConfig, filter })}
            className={`px-2 py-1 rounded transition-colors capitalize ${
              localConfig.filter === filter
                ? 'bg-primary text-[var(--color-on-primary)]'
                : 'bg-surface/50 text-text-muted hover:text-text'
            }`}
          >
            {filter}
            <span className="ml-1 opacity-60">{filterCounts[filter]}</span>
          </button>
        ))}

        <div className="relative ml-auto">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1 px-2 py-1 bg-surface/50 rounded hover:bg-surface transition-colors text-text-muted"
          >
            Sort
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-32 glass-card rounded-lg shadow-lg z-50 p-1 animate-scale-in">
                {(['manual', 'priority', 'dueDate'] as const).map(sort => (
                  <button
                    key={sort}
                    onClick={() => {
                      saveConfig({ ...localConfig, sortBy: sort })
                      setShowSortDropdown(false)
                    }}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-surface ${
                      localConfig.sortBy === sort ? 'bg-surface/50 text-primary' : ''
                    }`}
                  >
                    {sort === 'dueDate' ? 'Due Date' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-text-muted">
            <p className="text-sm">No tasks</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredItems.map(item => (
                <SortableItem
                  key={item.id}
                  item={item}
                  tags={localConfig.tags}
                  onToggle={handleToggleItem}
                  onEdit={handleEditItem}
                  onArchive={handleArchiveItem}
                  onDelete={handleDeleteItem}
                  onUpdatePriority={handleUpdatePriority}
                  onUpdateDueDate={handleUpdateDueDate}
                  onUpdateTags={handleUpdateTags}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
