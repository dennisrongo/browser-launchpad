import { useState, useEffect } from 'react'
import { Widget, WidgetType } from '../types'

interface WidgetConfigModalProps {
  isOpen: boolean
  widget: Widget | null
  onSave: (widgetId: string, config: any, title: string) => void
  onCancel: () => void
}

export function WidgetConfigModal({ isOpen, widget, onSave, onCancel }: WidgetConfigModalProps) {
  const [title, setTitle] = useState('')
  const [config, setConfig] = useState<any>({})

  useEffect(() => {
    if (widget) {
      setTitle(widget.title)
      setConfig({ ...widget.config })
    }
  }, [widget])

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
              <input
                type="text"
                value={config.timezone || ''}
                onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                placeholder="e.g., America/New_York (leave empty for local time)"
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-secondary mt-1">
                Leave empty to use your local timezone. Example: America/New_York, Europe/London
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
              <label className="block text-sm font-medium text-text mb-2">Display Options</label>
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
                onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="openai">OpenAI</option>
                <option value="straico">Straico</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Model</label>
              <input
                type="text"
                value={config.model || ''}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder={config.provider === 'openai' ? 'e.g., gpt-4, gpt-3.5-turbo' : 'Model name'}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-secondary mt-1">
                {config.provider === 'openai'
                  ? 'Enter the OpenAI model name (e.g., gpt-4, gpt-3.5-turbo)'
                  : 'The model will be fetched from Straico API'}
              </p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <p className="font-medium mb-1">⚠️ API Key Required</p>
              <p className="text-xs">
                Configure your API keys in Settings before using this widget.
              </p>
            </div>
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
