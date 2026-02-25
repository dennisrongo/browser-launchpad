export type WidgetType = 'bookmark' | 'weather' | 'ai-chat' | 'clock'

export interface WidgetTypeOption {
  type: WidgetType
  name: string
  description: string
  icon: string
}

interface WidgetTypeSelectorProps {
  isOpen: boolean
  onSelect: (type: WidgetType) => void
  onCancel: () => void
}

const WIDGET_TYPES: WidgetTypeOption[] = [
  {
    type: 'bookmark',
    name: 'Bookmark Widget',
    description: 'Save and organize your favorite links',
    icon: '🔖',
  },
  {
    type: 'weather',
    name: 'Weather Widget',
    description: 'Get current weather for any city',
    icon: '🌤️',
  },
  {
    type: 'ai-chat',
    name: 'AI Chat Widget',
    description: 'Chat with AI using OpenAI or Straico',
    icon: '🤖',
  },
  {
    type: 'clock',
    name: 'Clock Widget',
    description: 'Display current time for any timezone',
    icon: '🕐',
  },
]

export function WidgetTypeSelector({ isOpen, onSelect, onCancel }: WidgetTypeSelectorProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-2xl mx-4 w-full animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">Add Widget</h2>
        <p className="text-text-secondary mb-6">Choose a widget type to add to your page</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {WIDGET_TYPES.map((widget) => (
            <button
              key={widget.type}
              onClick={() => onSelect(widget.type)}
              className="flex items-start gap-4 p-4 bg-background border border-border rounded-card hover:bg-surface hover:border-primary transition-all duration-200 text-left group"
            >
              <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
                {widget.icon}
              </div>
              <div>
                <h3 className="font-semibold text-text mb-1">{widget.name}</h3>
                <p className="text-sm text-text-secondary">{widget.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
