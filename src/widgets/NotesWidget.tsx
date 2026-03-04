import { useState, useEffect, useCallback } from 'react'
import { FileText, Pencil, Save } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notesStorage } from '../services/storage'

interface NotesWidgetConfig {
  content: string
}

interface NotesWidgetProps {
  title: string
  config: NotesWidgetConfig
  onConfigChange?: (newConfig: NotesWidgetConfig) => void
}

const DEFAULT_CONFIG: NotesWidgetConfig = {
  content: '',
}

export function NotesWidget({ title, config, onConfigChange }: NotesWidgetProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(config?.content || DEFAULT_CONFIG.content)
  const [isLoading, setIsLoading] = useState(true)
  const storageKey = `notes-${title}`

  useEffect(() => {
    const loadContent = async () => {
      const result = await notesStorage.get(storageKey)
      if (result.data) {
        setContent(result.data.content || '')
      }
      setIsLoading(false)
    }
    loadContent()
  }, [storageKey])

  const handleSave = useCallback(async () => {
    const newConfig: NotesWidgetConfig = { content }
    await notesStorage.set(storageKey, newConfig)
    onConfigChange?.(newConfig)
    setIsEditing(false)
  }, [content, storageKey, onConfigChange])

  const handleCancel = useCallback(() => {
    setContent(config?.content || DEFAULT_CONFIG.content)
    setIsEditing(false)
  }, [config])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="flex flex-col h-full min-h-[200px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-text-secondary">
            <Pencil className="w-4 h-4" />
            <span className="text-sm font-medium">Editing</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="btn-ghost text-xs px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary text-xs px-2 py-1 flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note in Markdown..."
          className="flex-1 w-full p-3 bg-background border border-border rounded-card text-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-text-muted caret-primary"
          autoFocus
        />
        <p className="text-xs text-text-muted mt-2">
          Supports Markdown: **bold**, *italic*, lists, code blocks, and more
        </p>
      </div>
    )
  }

  return (
    <div className="group flex flex-col h-full min-h-[200px]">
      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200 opacity-0 group-hover:opacity-100"
          title="Edit note"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {content.trim() ? (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-p:text-text prose-headings:my-3 prose-headings:text-text prose-h1:text-text prose-h2:text-text prose-h3:text-text prose-strong:text-text prose-em:text-text prose-code:text-primary prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-surface prose-pre:text-text prose-pre:border prose-pre:border-border prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-text prose-li:marker:text-text-muted prose-ul:marker:text-text-muted prose-ol:marker:text-text-muted prose-blockquote:border-primary prose-blockquote:text-text-secondary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-hr:border-border prose-table:text-text prose-th:text-text prose-th:bg-surface prose-td:text-text prose-td:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <FileText className="w-10 h-10 text-text-muted mb-3" />
            <p className="text-text-secondary text-sm mb-1">No note yet</p>
            <p className="text-text-muted text-xs">Click Edit to start writing</p>
          </div>
        )}
      </div>
    </div>
  )
}
