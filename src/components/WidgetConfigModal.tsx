import { useState, useEffect } from 'react'
import { Widget, WidgetType } from '../types'
import { fetchStraicoModels } from '../utils/ai'

interface WidgetConfigModalProps {
  isOpen: boolean
  widget: Widget | null
  onSave: (widgetId: string, config: any, title: string) => void
  onCancel: () => void
}

export function WidgetConfigModal({ isOpen, widget, onSave, onCancel }: WidgetConfigModalProps) {
  const [title, setTitle] = useState('')
  const [config, setConfig] = useState<any>({})
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [modelFetchError, setModelFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (widget) {
      setTitle(widget.title)
      setConfig({ ...widget.config })
    }
    // Reset state when widget changes
    setModelFetchError(null)
    setIsFetchingModels(false)
  }, [widget])

  const handleFetchModels = async () => {
    if (!config.straicoApiKey) {
      setModelFetchError('Please enter your Straico API key first')
      return
    }

    setIsFetchingModels(true)
    setModelFetchError(null)

    try {
      const models = await fetchStraicoModels(config.straicoApiKey)
      setConfig({ ...config, straicoModels: models })
    } catch (error) {
      setModelFetchError(error instanceof Error ? error.message : 'Failed to fetch models')
    } finally {
      setIsFetchingModels(false)
    }
  }

  if (!isOpen || !widget) {
    return null
  }

  const handleSave = () => {
    if (title.trim()) {
      onSave(widget.id, config, title.trim())
    }
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
            <div>
              <label className="block text-sm font-medium text-text mb-1">OpenWeatherMap API Key (Optional)</label>
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-secondary mt-1">
                Get a free API key at{' '}
                <a
                  href="https://openweathermap.org/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openweathermap.org
                </a>
              </p>
            </div>
          </div>
        )

      case 'ai-chat':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">AI Provider</label>
              <select
                value={config.provider || 'openai'}
                onChange={(e) => {
                  const newProvider = e.target.value as 'openai' | 'straico'
                  setConfig({ ...config, provider: newProvider, model: '' })
                }}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="openai">OpenAI</option>
                <option value="straico">Straico</option>
              </select>
            </div>

            {/* OpenAI Model Selection Dropdown */}
            {config.provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-text mb-1">Model</label>
                <select
                  value={config.model || 'gpt-3.5-turbo'}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                <p className="text-xs text-text-secondary mt-1">
                  Select the OpenAI model to use for chat completions
                </p>
              </div>
            )}

            {/* Straico API Key Input */}
            {config.provider === 'straico' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Straico API Key</label>
                  <input
                    type="password"
                    value={config.straicoApiKey || ''}
                    onChange={(e) => setConfig({ ...config, straicoApiKey: e.target.value })}
                    placeholder="Enter your Straico API key"
                    className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://straico.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      straico.com
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Model</label>
                  <select
                    value={config.model || ''}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    disabled={!config.straicoApiKey || isFetchingModels}
                    className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Select a model</option>
                    {(config.straicoModels || []).map((model: any) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-secondary mt-1">
                    {!config.straicoApiKey
                      ? 'Enter your API key above to fetch available models'
                      : isFetchingModels
                      ? 'Fetching models...'
                      : (config.straicoModels || []).length === 0
                      ? 'Click "Fetch Models" to load available models'
                      : `${(config.straicoModels || []).length} models available`}
                  </p>
                </div>
                {modelFetchError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    ⚠️ {modelFetchError}
                  </div>
                )}
                {config.straicoApiKey && (config.straicoModels || []).length === 0 && (
                  <button
                    type="button"
                    onClick={handleFetchModels}
                    disabled={isFetchingModels}
                    className="px-3 py-1.5 bg-primary text-white text-sm rounded-button hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isFetchingModels ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      'Fetch Models'
                    )}
                  </button>
                )}
              </>
            )}

            {/* OpenAI API Key Input (optional override) */}
            {config.provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-text mb-1">OpenAI API Key (Optional)</label>
                <input
                  type="password"
                  value={config.openaiApiKey || ''}
                  onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                  placeholder="Enter your OpenAI API key"
                  className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Optional: You can also set this in Settings
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

      default:
        return (
          <div className="p-4 bg-surface border border-border rounded text-center">
            <p className="text-text-secondary text-sm">No configuration options available for this widget type.</p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-md w-full mx-4 animate-fade-in">
        <h3 className="text-lg font-semibold mb-4">Configure Widget</h3>

        <div className="space-y-4 mb-6">
          {/* Widget Title */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">Widget Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Widget title"
              className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={50}
            />
          </div>

          {/* Widget-specific configuration */}
          {renderConfigFields()}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
