import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Settings, ExternalLink } from 'lucide-react'
import { Widget, ChatMessage, AIChatWidgetConfig } from '../types'

interface WidgetConfigModalProps {
  isOpen: boolean
  widget: Widget | null
  onSave: (widgetId: string, config: any, title: string) => void
  onCancel: () => void
  onOpenSettings?: () => void
}

interface GlobalAIConfig {
  activeProvider: 'openai' | 'straico'
  openai: { apiKey: string; model: string }
  straico: { apiKey: string; model: string }
}

export function WidgetConfigModal({ isOpen, widget, onSave, onCancel, onOpenSettings }: WidgetConfigModalProps) {
  const [title, setTitle] = useState('')
  const [config, setConfig] = useState<any>({})
  const [globalAIConfig, setGlobalAIConfig] = useState<GlobalAIConfig | null>(null)
  const previousMessagesRef = useRef<ChatMessage[]>([])

  useEffect(() => {
    if (widget) {
      setTitle(widget.title)
      const configCopy = { ...widget.config }

      if (widget.type === 'ai-chat') {
        const aiConfig = widget.config as AIChatWidgetConfig
        if (aiConfig.messages) {
          previousMessagesRef.current = aiConfig.messages
        }
      }

      setConfig(configCopy)
      loadGlobalAIConfig()
    }
  }, [widget])

  const loadGlobalAIConfig = async () => {
    try {
      const result = await chrome.storage.local.get(['ai_config'])
      if (result.ai_config && typeof result.ai_config === 'object' && 'activeProvider' in result.ai_config) {
        setGlobalAIConfig(result.ai_config as GlobalAIConfig)
      } else {
        setGlobalAIConfig(null)
      }
    } catch (error) {
      console.error('Failed to load global AI config:', error)
    }
  }

  if (!isOpen || !widget) {
    return null
  }

  const handleSave = () => {
    if (title.trim()) {
      onSave(widget.id, { ...config }, title.trim())
    }
  }

  const handleOpenSettings = () => {
    onCancel()
    onOpenSettings?.()
  }

  const getProviderDisplayName = (provider: string) => {
    return provider === 'openai' ? 'OpenAI' : 'Straico'
  }

  const getModelDisplayName = (provider: string, model: string) => {
    if (!model) return 'Not selected'
    if (provider === 'openai') {
      const modelNames: Record<string, string> = {
        'gpt-4o-mini': 'GPT-4o Mini',
        'gpt-4o': 'GPT-4o',
        'gpt-4o-2024-08-06': 'GPT-4o (2024-08-06)',
        'gpt-4-turbo': 'GPT-4 Turbo',
        'gpt-4': 'GPT-4',
        'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      }
      return modelNames[model] || model
    }
    return model
  }

  const renderConfigFields = () => {
    switch (widget.type) {
      case 'clock':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Timezone</label>
              <select
                value={config.timezone || 'local'}
                onChange={(e) => setConfig({ ...config, timezone: e.target.value === 'local' ? '' : e.target.value })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="local">Local Time</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">New York (EST/EDT)</option>
                <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                <option value="America/Chicago">Chicago (CST/CDT)</option>
                <option value="America/Denver">Denver (MST/MDT)</option>
                <option value="America/Phoenix">Phoenix (MST)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
                <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                <option value="Europe/Moscow">Moscow (MSK)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
                <option value="Asia/Kolkata">Kolkata (IST)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
                <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
              </select>
              <p className="text-xs text-text-secondary mt-1">
                Select a timezone to display. Leave as "Local Time" to use your browser's timezone.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Time Format</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.format12Hour !== false}
                  onChange={(e) => setConfig({ ...config, format12Hour: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">Use 12-hour format (AM/PM)</span>
              </label>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showSeconds || false}
                  onChange={(e) => setConfig({ ...config, showSeconds: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">Show seconds</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Font Style</label>
              <select
                value={config.fontStyle || 'modern'}
                onChange={(e) => setConfig({ ...config, fontStyle: e.target.value })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="modern">Modern (Sans-serif, Bold)</option>
                <option value="classic">Classic (Serif)</option>
                <option value="digital">Digital (Monospace)</option>
                <option value="elegant">Elegant (Light)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Font Size</label>
              <select
                value={config.fontSize || 'large'}
                onChange={(e) => setConfig({ ...config, fontSize: e.target.value })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large (Default)</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>
          </div>
        )

      case 'weather':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">City Name</label>
              <input
                type="text"
                value={config.city || ''}
                onChange={(e) => setConfig({ ...config, city: e.target.value })}
                placeholder="e.g., London, New York, Tokyo"
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-secondary mt-1">
                Enter the city name for weather data
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Temperature Units</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="units"
                    checked={config.units !== 'fahrenheit'}
                    onChange={() => setConfig({ ...config, units: 'celsius' })}
                    className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">Celsius (°C)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="units"
                    checked={config.units === 'fahrenheit'}
                    onChange={() => setConfig({ ...config, units: 'fahrenheit' })}
                    className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">Fahrenheit (°F)</span>
                </label>
              </div>
            </div>
            <p className="text-xs text-text-secondary">
              Configure your OpenWeatherMap API key in <strong>Settings → Weather</strong>.
            </p>
          </div>
        )

      case 'ai-chat':
        const activeProvider = globalAIConfig?.activeProvider || 'openai'
        const providerConfig = globalAIConfig?.[activeProvider]
        const hasApiKey = !!(providerConfig?.apiKey)
        const model = providerConfig?.model || ''

        return (
          <div className="space-y-4">
            <div className="p-4 bg-surface border border-border rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-text mb-1">AI Configuration</h4>
                  <p className="text-sm text-text-secondary">
                    This widget uses your globally configured AI provider from Settings.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Active Provider:</span>
                  <span className="font-medium text-text">
                    {getProviderDisplayName(activeProvider)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Model:</span>
                  <span className="font-medium text-text">
                    {getModelDisplayName(activeProvider, model)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">API Key:</span>
                  <span className={`font-medium ${hasApiKey ? 'text-green-600' : 'text-red-500'}`}>
                    {hasApiKey ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </div>

              {!hasApiKey && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Please configure your API key in Settings to use this widget.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleOpenSettings}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Open Settings
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            {(config.messages?.length > 0) && (
              <div className="p-3 bg-surface border border-border rounded-lg">
                <p className="text-xs text-text-secondary">
                  <strong>{config.messages.length}</strong> message(s) in chat history
                </p>
              </div>
            )}
          </div>
        )

      case 'bookmark':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-surface border border-border rounded text-center">
              <p className="text-text-secondary text-sm">
                Bookmark widget configuration is managed directly in the widget.
                Click on the widget to add, edit, or delete bookmarks.
              </p>
            </div>
          </div>
        )

      case 'todo':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-surface border border-border rounded text-center">
              <p className="text-text-secondary text-sm">
                To-Do List widget configuration is managed directly in the widget.
                Use the controls within the widget to add tasks, manage tags, and filter items.
              </p>
            </div>
          </div>
        )

      case 'pomodoro':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Focus Duration (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={config.focusDuration || 25}
                onChange={(e) => setConfig({ ...config, focusDuration: parseInt(e.target.value) || 25 })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Short Break (minutes)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.shortBreakDuration || 5}
                onChange={(e) => setConfig({ ...config, shortBreakDuration: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Long Break (minutes)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={config.longBreakDuration || 15}
                onChange={(e) => setConfig({ ...config, longBreakDuration: parseInt(e.target.value) || 15 })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Sessions Until Long Break</label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.sessionsUntilLongBreak || 4}
                onChange={(e) => setConfig({ ...config, sessionsUntilLongBreak: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoStartBreaks || false}
                  onChange={(e) => setConfig({ ...config, autoStartBreaks: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">Auto-start breaks</span>
              </label>
            </div>
            <p className="text-xs text-text-secondary">
              Note: Changing durations will apply on the next session.
            </p>
          </div>
        )

      case 'calendar':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">View Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="viewMode"
                    checked={config.viewMode !== 'week'}
                    onChange={() => setConfig({ ...config, viewMode: 'month' })}
                    className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">Month</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="viewMode"
                    checked={config.viewMode === 'week'}
                    onChange={() => setConfig({ ...config, viewMode: 'week' })}
                    className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm">Week</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">First Day of Week</label>
              <select
                value={config.firstDayOfWeek ?? 0}
                onChange={(e) => setConfig({ ...config, firstDayOfWeek: parseInt(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6 })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showWeekNumbers || false}
                  onChange={(e) => setConfig({ ...config, showWeekNumbers: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm">Show week numbers</span>
              </label>
            </div>
            <div className="pt-2 border-t border-border">
              <label className="block text-sm font-medium text-text mb-2">Google Calendar</label>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${config.googleConnected ? 'text-green-600' : 'text-text-secondary'}`}>
                  Status: {config.googleConnected ? 'Connected' : 'Not connected'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Connect to Google Calendar directly from the widget. Click on the widget to set up the integration.
              </p>
            </div>
          </div>
        )

      case 'notes':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-surface border border-border rounded text-center">
              <p className="text-text-secondary text-sm">
                Notes widget is managed directly in the widget.
                Use the Edit button within the widget to write and format your note in Markdown.
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="p-4 bg-surface border border-border rounded text-center">
            <p className="text-text-secondary text-sm">No configuration options available for this widget type.</p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="glass-modal rounded-lg p-4 sm:p-6 w-full max-w-md animate-modal-in max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-lg font-semibold mb-4">Configure Widget</h3>

          <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Widget Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Widget title"
              className="input-base"
              maxLength={50}
            />
          </div>

          {renderConfigFields()}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
