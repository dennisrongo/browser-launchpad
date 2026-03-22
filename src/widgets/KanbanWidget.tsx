import { useState } from 'react'
import { Plus, X, GripVertical, Pencil, Check, Trash2 } from 'lucide-react'
import type { KanbanWidgetConfig, KanbanColumn, KanbanCard } from '../types'

interface KanbanWidgetProps {
  title: string
  config: KanbanWidgetConfig
  onConfigChange: (newConfig: KanbanWidgetConfig) => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function KanbanWidget({ config, onConfigChange }: KanbanWidgetProps) {
  const columns: KanbanColumn[] = (config.columns ?? []).slice().sort((a, b) => a.order - b.order)
  const cards: KanbanCard[] = config.cards ?? []

  const [addingCardCol, setAddingCardCol] = useState<string | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editingCardTitle, setEditingCardTitle] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<{ colId: string; index: number } | null>(null)

  const save = (newConfig: Partial<KanbanWidgetConfig>) => {
    onConfigChange({ ...config, ...newConfig })
  }

  // ── Cards ────────────────────────────────────────────────────────────────
  const addCard = (colId: string) => {
    if (!newCardTitle.trim()) return
    const colCards = cards.filter(c => c.columnId === colId)
    const newCard: KanbanCard = {
      id: generateId(),
      title: newCardTitle.trim(),
      columnId: colId,
      order: colCards.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    save({ cards: [...cards, newCard] })
    setNewCardTitle('')
    setAddingCardCol(null)
  }

  const deleteCard = (cardId: string) => {
    save({ cards: cards.filter(c => c.id !== cardId) })
  }

  const startEditCard = (card: KanbanCard) => {
    setEditingCardId(card.id)
    setEditingCardTitle(card.title)
  }

  const saveEditCard = () => {
    if (!editingCardId) return
    save({
      cards: cards.map(c =>
        c.id === editingCardId
          ? { ...c, title: editingCardTitle.trim() || c.title, updatedAt: new Date().toISOString() }
          : c
      ),
    })
    setEditingCardId(null)
    setEditingCardTitle('')
  }

  // ── Columns ──────────────────────────────────────────────────────────────
  const addColumn = () => {
    if (!newColTitle.trim()) return
    const newCol: KanbanColumn = {
      id: generateId(),
      title: newColTitle.trim(),
      order: columns.length,
    }
    save({ columns: [...columns, newCol] })
    setNewColTitle('')
    setAddingColumn(false)
  }

  const deleteColumn = (colId: string) => {
    save({
      columns: columns.filter(c => c.id !== colId),
      cards: cards.filter(c => c.columnId !== colId),
    })
  }

  // ── Drag & drop (cards only, uses data-internal-dnd to block widget DnD) ─
  const getColCards = (colId: string) =>
    cards.filter(c => c.columnId === colId).sort((a, b) => a.order - b.order)

  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    e.stopPropagation()
    setDraggingCardId(cardId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleCardDragOver = (e: React.DragEvent, colId: string, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverTarget?.colId !== colId || dragOverTarget?.index !== index) {
      setDragOverTarget({ colId, index })
    }
  }

  const handleCardDrop = (e: React.DragEvent, targetColId: string, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!draggingCardId) return

    const updatedCards = cards.map(c => ({ ...c }))
    const dragged = updatedCards.find(c => c.id === draggingCardId)
    if (!dragged) return

    // Remove dragged from its current column
    const srcColCards = updatedCards
      .filter(c => c.columnId === dragged.columnId && c.id !== dragged.id)
      .sort((a, b) => a.order - b.order)
    srcColCards.forEach((c, i) => { c.order = i })

    // Insert into target column
    dragged.columnId = targetColId
    const destColCards = updatedCards
      .filter(c => c.columnId === targetColId && c.id !== draggingCardId)
      .sort((a, b) => a.order - b.order)
    destColCards.splice(targetIndex, 0, dragged)
    destColCards.forEach((c, i) => { c.order = i })

    save({ cards: updatedCards })
    setDraggingCardId(null)
    setDragOverTarget(null)
  }

  const handleDragEnd = () => {
    setDraggingCardId(null)
    setDragOverTarget(null)
  }

  return (
    <div
      className="p-3 overflow-x-auto"
      data-internal-dnd="true"
      onDragOver={e => e.stopPropagation()}
      onDrop={e => e.stopPropagation()}
    >
      <div className="flex gap-3 min-w-0" style={{ minWidth: columns.length > 2 ? `${columns.length * 180}px` : undefined }}>
        {columns.map(col => {
          const colCards = getColCards(col.id)
          return (
            <div key={col.id} className="flex-1 min-w-[160px] flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide truncate">
                  {col.title}
                  <span className="ml-1.5 text-text-muted font-normal normal-case tracking-normal">
                    {colCards.length}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => { setAddingCardCol(col.id); setNewCardTitle('') }}
                    className="p-0.5 text-text-muted hover:text-primary transition-colors"
                    title="Add card"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => deleteColumn(col.id)}
                    className="p-0.5 text-text-muted hover:text-red-500 transition-colors"
                    title="Delete column"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards drop zone */}
              <div
                className="flex flex-col gap-1.5 min-h-[60px] rounded-lg p-1"
                onDragOver={e => handleCardDragOver(e, col.id, colCards.length)}
                onDrop={e => handleCardDrop(e, col.id, colCards.length)}
              >
                {colCards.map((card, idx) => (
                  <div key={card.id}>
                    {/* Drop indicator above card */}
                    {dragOverTarget?.colId === col.id && dragOverTarget?.index === idx && (
                      <div className="h-1 rounded bg-primary/40 mb-1" />
                    )}
                    {editingCardId === card.id ? (
                      <div
                        className="glass-card rounded-lg px-2 py-1.5"
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          className="input-base text-xs w-full py-0.5 mb-1"
                          value={editingCardTitle}
                          onChange={e => setEditingCardTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEditCard()
                            if (e.key === 'Escape') setEditingCardId(null)
                          }}
                        />
                        <div className="flex gap-1 justify-end">
                          <button onClick={saveEditCard} className="p-0.5 text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingCardId(null)} className="p-0.5 text-text-muted hover:text-text"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <div
                        draggable
                        onDragStart={e => handleCardDragStart(e, card.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => handleCardDragOver(e, col.id, idx)}
                        onDrop={e => handleCardDrop(e, col.id, idx)}
                        className={`glass-card rounded-lg px-2 py-1.5 flex items-start gap-1.5 group cursor-grab active:cursor-grabbing transition-opacity ${draggingCardId === card.id ? 'opacity-40' : ''}`}
                      >
                        <GripVertical className="w-3 h-3 text-text-muted mt-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                        <span className="text-xs text-text flex-1 leading-snug break-words min-w-0">{card.title}</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => startEditCard(card)}
                            className="p-0.5 text-text-muted hover:text-primary"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => deleteCard(card.id)}
                            className="p-0.5 text-text-muted hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Drop indicator at end of column */}
                {dragOverTarget?.colId === col.id && dragOverTarget?.index === colCards.length && (
                  <div className="h-1 rounded bg-primary/40" />
                )}
              </div>

              {/* Add card form */}
              {addingCardCol === col.id ? (
                <div className="glass-card rounded-lg px-2 py-1.5" onMouseDown={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    className="input-base text-xs w-full py-0.5 mb-1"
                    placeholder="Card title…"
                    value={newCardTitle}
                    onChange={e => setNewCardTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addCard(col.id)
                      if (e.key === 'Escape') setAddingCardCol(null)
                    }}
                  />
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => addCard(col.id)} className="text-xs btn-primary px-2 py-0.5">Add</button>
                    <button onClick={() => setAddingCardCol(null)} className="text-xs btn-secondary px-2 py-0.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => { setAddingCardCol(col.id); setNewCardTitle('') }}
                  className="text-xs text-text-muted hover:text-text flex items-center gap-1 px-1 py-0.5 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add card
                </button>
              )}
            </div>
          )
        })}

        {/* Add column */}
        <div className="flex-shrink-0 w-40">
          {addingColumn ? (
            <div className="glass-card rounded-lg px-2 py-2" onMouseDown={e => e.stopPropagation()}>
              <input
                autoFocus
                className="input-base text-xs w-full py-0.5 mb-1"
                placeholder="Column name…"
                value={newColTitle}
                onChange={e => setNewColTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addColumn()
                  if (e.key === 'Escape') setAddingColumn(false)
                }}
              />
              <div className="flex gap-1 justify-end">
                <button onClick={addColumn} className="text-xs btn-primary px-2 py-0.5">Add</button>
                <button onClick={() => setAddingColumn(false)} className="text-xs btn-secondary px-2 py-0.5">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => { setAddingColumn(true); setNewColTitle('') }}
              className="w-full text-xs text-text-muted hover:text-text flex items-center gap-1 px-2 py-1.5 rounded-lg border border-dashed border-border-subtle hover:border-primary/40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add column
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
