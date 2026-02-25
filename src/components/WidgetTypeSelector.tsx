import { IconBookmark, IconWeather, IconAIChat, IconClock, IconX } from './Icons'

export type WidgetType = 'bookmark' | 'weather' | 'ai-chat' | 'clock'

export interface WidgetTypeOption {
  type: WidgetType
  name: string
  description: string
  icon: React.ReactNode
}

interface WidgetTypeSelectorProps {
  isOpen: boolean
  onSelect: (type: WidgetType) => void
  onCancel: () => void
}

const WIDGET_TYPES: WidgetTypeOption[] = [
  {
    type: 'bookmark',
    name: 'Bookmarks',
    description: 'Save and organize your favorite links',
    icon: <IconBookmark className="w-7 h-7" />,
  },
  {
    type: 'weather',
    name: 'Weather',
    description: 'Get current weather for any city',
    icon: <IconWeather className="w-7 h-7" />,
  },
  {
    type: 'ai-chat',
    name: 'AI Chat',
    description: 'Chat with AI using OpenAI or Straico',
    icon: <IconAIChat className="w-7 h-7" />,
  },
  {
    type: 'clock',
    name: 'Clock',
    description: 'Display current time for any timezone',
    icon: <IconClock className="w-7 h-7" />,
  },
]

export function WidgetTypeSelector({ isOpen, onSelect, onCancel }: WidgetTypeSelectorProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-modal rounded-lg p-6 max-w-2xl mx-4 w-full animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gradient">Add Widget</h2>
          <button
            onClick={onCancel}
            className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-text-secondary mb-6">Choose a widget type to add to your page</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {WIDGET_TYPES.map((widget) => (
            <button
              key={widget.type}
              onClick={() => onSelect(widget.type)}
              className="flex items-start gap-4 p-4 glass-card rounded-card hover:shadow-glass-hover hover-lift transition-all duration-200 text-left group"
            >
              <div className="text-primary group-hover:scale-110 transition-transform duration-200">
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
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
