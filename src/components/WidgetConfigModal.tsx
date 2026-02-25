import { useState, useEffect, useRef } from 'react'
import { Widget, WidgetType, ChatMessage, AIChatWidgetConfig } from '../types'
import { fetchStraicoModels, validateOpenAIKey, validateStraicoKey, validateApiKeyFormat } from '../utils/ai'
import { encodeApiKey, decodeApiKey, logApiKeyInfo } from '../utils/security'

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
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false)
  const [pendingProviderChange, setPendingProviderChange] = useState<'openai' | 'straico' | null>(null)
  const [pendingModelChange, setPendingModelChange] = useState<string | null>(null)
  const previousMessagesRef = useRef<ChatMessage[]>([])
  const [apiKeyValidation, setApiKeyValidation] = useState<{ openai?: string; straico?: string }>({})
  const [isValidatingKey, setIsValidatingKey] = useState(false)

  useEffect(() => {
    if (widget) {
      setTitle(widget.title)
      const configCopy = { ...widget.config }

      // Decode API keys from widget config if present
      if (widget.type === 'ai-chat') {
        const aiConfig = widget.config as AIChatWidgetConfig
        if (aiConfig.openaiApiKey) {
          (configCopy as AIChatWidgetConfig).openaiApiKey = decodeApiKey(aiConfig.openaiApiKey)
        }
        if (aiConfig.straicoApiKey) {
          (configCopy as AIChatWidgetConfig).straicoApiKey = decodeApiKey(aiConfig.straicoApiKey)
        }
        if (aiConfig.messages) {
          previousMessagesRef.current = aiConfig.messages
        }
      }

      setConfig(configCopy)
    }
    // Reset state when widget changes
    setModelFetchError(null)
    setIsFetchingModels(false)
    setShowClearChatConfirm(false)
    setPendingProviderChange(null)
    setPendingModelChange(null)
    setApiKeyValidation({})
    setIsValidatingKey(false)
  }, [widget])

  // Validate API key on blur
  const handleApiKeyBlur = async (provider: 'openai' | 'straico', apiKey: string) => {
    if (!apiKey || apiKey.trim().length === 0) {
      setApiKeyValidation(prev => ({ ...prev, [provider]: '' }))
      return
    }

    // First do client-side format validation
    const formatCheck = validateApiKeyFormat(provider, apiKey)
    if (!formatCheck.valid) {
      setApiKeyValidation(prev => ({ ...prev, [provider]: formatCheck.error || 'Invalid format' }))
      return
    }

    // Then do server-side validation
    setIsValidatingKey(true)
    try {
      const result = provider === 'openai'
        ? await validateOpenAIKey(apiKey)
        : await validateStraicoKey(apiKey)

      if (result.valid) {
        setApiKeyValidation(prev => ({ ...prev, [provider]: '' }))
      } else {
        setApiKeyValidation(prev => ({ ...prev, [provider]: result.error || 'Invalid API key' }))
      }
    } catch (error) {
      setApiKeyValidation(prev => ({ ...prev, [provider]: 'Validation failed' }))
    } finally {
      setIsValidatingKey(false)
    }
  }

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
      const configToSave = { ...config }

      // Encode API keys before saving
      if (widget.type === 'ai-chat') {
        if ((configToSave as any).openaiApiKey) {
          (configToSave as any).openaiApiKey = encodeApiKey((configToSave as any).openaiApiKey)
        }
        if ((configToSave as any).straicoApiKey) {
          (configToSave as any).straicoApiKey = encodeApiKey((configToSave as any).straicoApiKey)
        }
      }

      onSave(widget.id, configToSave, title.trim())
    }
  }

  // Handle confirmation to clear chat
  const handleConfirmClearChat = () => {
    const newConfig = { ...config, messages: [] }

    if (pendingProviderChange) {
      newConfig.provider = pendingProviderChange
      newConfig.model = '' // Reset model when provider changes
    }

    if (pendingModelChange) {
      newConfig.model = pendingModelChange
    }

    setConfig(newConfig)
    setShowClearChatConfirm(false)
    setPendingProviderChange(null)
    setPendingModelChange(null)
  }

  // Handle cancel - restore previous selection
  const handleCancelClearChat = () => {
    setShowClearChatConfirm(false)
    setPendingProviderChange(null)
    setPendingModelChange(null)
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
        // Check if there are existing messages
        const hasExistingMessages = config.messages && config.messages.length > 0

        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">AI Provider</label>
              <select
                value={config.provider || 'openai'}
                onChange={(e) => {
                  const newProvider = e.target.value as 'openai' | 'straico'
                  // Check if there are existing messages and provider is actually changing
                  if (hasExistingMessages && newProvider !== config.provider) {
                    setPendingProviderChange(newProvider)
                    setShowClearChatConfirm(true)
                  } else {
                    setConfig({ ...config, provider: newProvider, model: '' })
                  }
                }}
                className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="openai">OpenAI</option>
                <option value="straico">Straico</option>
              </select>
              {hasExistingMessages && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ⚠️ Changing provider will clear chat history
                </p>
              )}
            </div>

            {/* OpenAI Model Selection Dropdown */}
            {config.provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-text mb-1">Model</label>
                <select
                  value={config.model || 'gpt-3.5-turbo'}
                  onChange={(e) => {
                    const newModel = e.target.value
                    // Check if there are existing messages and model is actually changing
                    if (hasExistingMessages && newModel !== config.model) {
                      setPendingModelChange(newModel)
                      setShowClearChatConfirm(true)
                    } else {
                      setConfig({ ...config, model: newModel })
                    }
                  }}
                  className="w-full px-3 py-2 bg-background text-text border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                <p className="text-xs text-text-secondary mt-1">
                  Select the OpenAI model to use for chat completions
                </p>
                {hasExistingMessages && config.model && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    ⚠️ Changing model will clear chat history
                  </p>
                )}
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
                    onChange={(e) => {
                      setConfig({ ...config, straicoApiKey: e.target.value })
                      // Clear validation when typing
                      if (apiKeyValidation.straico) {
                        setApiKeyValidation(prev => ({ ...prev, straico: '' }))
                      }
                    }}
                    onBlur={() => handleApiKeyBlur('straico', config.straicoApiKey || '')}
                    placeholder="Enter your Straico API key"
                    className={`w-full px-3 py-2 bg-background text-text border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                      apiKeyValidation.straico ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {apiKeyValidation.straico && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{apiKeyValidation.straico}</span>
                    </p>
                  )}
                  {!apiKeyValidation.straico && (
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
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Model</label>
                  <select
                    value={config.model || ''}
                    onChange={(e) => {
                      const newModel = e.target.value
                      // Check if there are existing messages and model is actually changing
                      if (hasExistingMessages && newModel !== config.model) {
                        setPendingModelChange(newModel)
                        setShowClearChatConfirm(true)
                      } else {
                        setConfig({ ...config, model: newModel })
                      }
                    }}
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
                  {hasExistingMessages && config.model && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      ⚠️ Changing model will clear chat history
                    </p>
                  )}
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
                <label className="block text-sm font-medium text-text mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={config.openaiApiKey || ''}
                  onChange={(e) => {
                    setConfig({ ...config, openaiApiKey: e.target.value })
                    // Clear validation when typing
                    if (apiKeyValidation.openai) {
                      setApiKeyValidation(prev => ({ ...prev, openai: '' }))
                    }
                  }}
                  onBlur={() => handleApiKeyBlur('openai', config.openaiApiKey || '')}
                  placeholder="Enter your OpenAI API key"
                  className={`w-full px-3 py-2 bg-background text-text border rounded focus:outline-none focus:ring-2 focus:ring-primary ${
                    apiKeyValidation.openai ? 'border-red-500' : 'border-border'
                  }`}
                />
                  {apiKeyValidation.openai && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{apiKeyValidation.openai}</span>
                    </p>
                  )}
                  {!apiKeyValidation.openai && (
                    <p className="text-xs text-text-secondary mt-1">
                      Get your API key from{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        platform.openai.com
                      </a>
                    </p>
                  )}
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
    <>
      {/* Main Config Modal */}
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

      {/* Confirmation Dialog for Clearing Chat */}
      {showClearChatConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-sm w-full mx-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">💬</div>
              <h3 className="text-lg font-semibold mb-2">Clear Chat History?</h3>
              <p className="text-sm text-text-secondary">
                {pendingProviderChange
                  ? `Switching from ${config.provider === 'openai' ? 'OpenAI' : 'Straico'} to ${pendingProviderChange === 'openai' ? 'OpenAI' : 'Straico'} will clear your chat history.`
                  : 'Changing the model will clear your chat history.'}
              </p>
              <p className="text-xs text-text-secondary mt-2">
                {config.messages?.length || 0} message(s) will be deleted.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={handleCancelClearChat}
                className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearChat}
                className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90"
              >
                Clear & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
