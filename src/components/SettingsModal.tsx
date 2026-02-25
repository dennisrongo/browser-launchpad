import { useState, useEffect } from 'react'
import { settingsStorage } from '../services/storage'
import type { Settings } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: (settings: Settings) => void
}

interface AIProviderConfig {
  openai: {
    apiKey: string
    model: string
  }
  straico: {
    apiKey: string
    model: string
  }
}

const DEFAULT_SETTINGS: Settings = {
  id: 'global-settings',
  theme: 'modern-light',
  grid_columns: 3,
  grid_gap: 24,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const DEFAULT_AI_CONFIG: AIProviderConfig = {
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  straico: {
    apiKey: '',
    model: '',
  },
}

export function SettingsModal({ isOpen, onClose, onSettingsChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [gridColumns, setGridColumns] = useState(3)
  const [theme, setTheme] = useState<'modern-light' | 'dark-elegance'>('modern-light')
  const [aiConfig, setAIConfig] = useState<AIProviderConfig>(DEFAULT_AI_CONFIG)
  const [showApiKeys, setShowApiKeys] = useState({ openai: false, straico: false })

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadAIConfig()
    }
  }, [isOpen])

  // Listen for storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.settings) {
        const newSettings = changes.settings.newValue as Settings
        setSettings(newSettings)
        setGridColumns(newSettings.grid_columns)
        setTheme(newSettings.theme)
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const loadSettings = async () => {
    const result = await settingsStorage.get()
    if (result.data) {
      setSettings(result.data)
      setGridColumns(result.data.grid_columns)
      setTheme(result.data.theme)
    } else {
      // Create default settings
      const saveResult = await settingsStorage.set(DEFAULT_SETTINGS)
      if (saveResult.success) {
        console.log('✓ Default settings created in Chrome storage')
        setSettings(DEFAULT_SETTINGS)
      }
    }
  }

  const loadAIConfig = async () => {
    try {
      const result = await chrome.storage.local.get(['ai_config'])
      if (result.ai_config) {
        setAIConfig(result.ai_config as AIProviderConfig)
      }
    } catch (error) {
      console.error('Failed to load AI config:', error)
    }
  }

  const handleSave = async () => {
    const updatedSettings: Settings = {
      ...settings,
      grid_columns: gridColumns,
      theme: theme,
      updated_at: new Date().toISOString(),
    }

    const result = await settingsStorage.set(updatedSettings)
    if (result.success) {
      console.log('✓ Settings saved to Chrome storage')
      setSettings(updatedSettings)
      onSettingsChange(updatedSettings)

      // Save AI config
      try {
        await chrome.storage.local.set({ ai_config: aiConfig })
        console.log('✓ AI config saved to Chrome storage')
      } catch (error) {
        console.error('Failed to save AI config:', error)
      }

      onClose()
    } else {
      console.error('Failed to save settings:', result.error)
    }
  }

  const handleCancel = () => {
    // Reset to current saved values
    setGridColumns(settings.grid_columns)
    setTheme(settings.theme)
    onClose()
  }

  const handleExportData = async () => {
    try {
      // Get all data from Chrome storage
      const allData = await chrome.storage.local.get(null)

      // Create export data object with timestamp
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: allData
      }

      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2)

      // Create blob and download link
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `browser-launchpad-export-${new Date().toISOString().split('T')[0]}.json`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      URL.revokeObjectURL(url)

      console.log('✓ Data exported successfully')
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={handleCancel}
            className="text-text-secondary hover:text-text transition-colors text-2xl"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Theme Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Theme</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('modern-light')}
              className={`p-4 rounded-card border-2 transition-all ${
                theme === 'modern-light'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold mb-1">Modern Light</div>
              <div className="text-sm text-text-secondary">Clean, minimal light theme</div>
              <div className="mt-2 flex gap-1">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <div className="w-4 h-4 rounded-full bg-white border"></div>
                <div className="w-4 h-4 rounded-full bg-gray-100 border"></div>
              </div>
            </button>

            <button
              onClick={() => setTheme('dark-elegance')}
              className={`p-4 rounded-card border-2 transition-all ${
                theme === 'dark-elegance'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold mb-1">Dark Elegance</div>
              <div className="text-sm text-text-secondary">Sleek dark theme</div>
              <div className="mt-2 flex gap-1">
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-700"></div>
                <div className="w-4 h-4 rounded-full bg-gray-800 border border-gray-600"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Grid Layout</h3>
          <div>
            <label htmlFor="columns" className="block text-sm font-medium mb-2">
              Number of Columns: {gridColumns}
            </label>
            <input
              type="range"
              id="columns"
              min="1"
              max="6"
              value={gridColumns}
              onChange={(e) => setGridColumns(parseInt(e.target.value))}
              className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Controls how many widgets appear in each row on large screens.
          </p>
        </div>

        {/* AI Providers Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">AI Providers</h3>
          <p className="text-sm text-text-secondary mb-4">
            Configure your AI providers for chat widgets. API keys are stored locally in your browser.
          </p>

          {/* OpenAI Configuration */}
          <div className="mb-4 p-4 bg-background rounded-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600"></div>
              <h4 className="font-semibold">OpenAI</h4>
            </div>

            <div className="mb-3">
              <label htmlFor="openai-key" className="block text-sm font-medium mb-1">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKeys.openai ? 'text' : 'password'}
                  id="openai-key"
                  value={aiConfig.openai.apiKey}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, openai: { ...prev.openai, apiKey: e.target.value } }))}
                  placeholder="sk-..."
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-button text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeys(prev => ({ ...prev, openai: !prev.openai }))}
                  className="px-3 py-2 bg-surface border border-border rounded-button text-text-secondary hover:text-text text-sm"
                  title={showApiKeys.openai ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKeys.openai ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="openai-model" className="block text-sm font-medium mb-1">
                Model
              </label>
              <select
                id="openai-model"
                value={aiConfig.openai.model}
                onChange={(e) => setAIConfig(prev => ({ ...prev, openai: { ...prev.openai, model: e.target.value } }))}
                className="w-full px-3 py-2 bg-surface border border-border rounded-button text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Economical)</option>
                <option value="gpt-4o">GPT-4o (Balanced)</option>
                <option value="gpt-4o-2024-08-06">GPT-4o (2024-08-06)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>

          {/* Straico Configuration */}
          <div className="p-4 bg-background rounded-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600"></div>
              <h4 className="font-semibold">Straico</h4>
            </div>

            <div className="mb-3">
              <label htmlFor="straico-key" className="block text-sm font-medium mb-1">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKeys.straico ? 'text' : 'password'}
                  id="straico-key"
                  value={aiConfig.straico.apiKey}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, straico: { ...prev.straico, apiKey: e.target.value } }))}
                  placeholder="Enter your Straico API key"
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded-button text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeys(prev => ({ ...prev, straico: !prev.straico }))}
                  className="px-3 py-2 bg-surface border border-border rounded-button text-text-secondary hover:text-text text-sm"
                  title={showApiKeys.straico ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKeys.straico ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="straico-model" className="block text-sm font-medium mb-1">
                Model
              </label>
              <input
                type="text"
                id="straico-model"
                value={aiConfig.straico.model}
                onChange={(e) => setAIConfig(prev => ({ ...prev, straico: { ...prev.straico, model: e.target.value } }))}
                placeholder="Model will be fetched from API"
                className="w-full px-3 py-2 bg-surface border border-border rounded-button text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-opacity-50"
                disabled
                title="Model is fetched automatically from Straico API"
              />
              <p className="text-xs text-text-secondary mt-1">
                Models are fetched automatically from Straico API when you add an AI chat widget.
              </p>
            </div>
          </div>
        </div>

        {/* Import/Export Section */}
        <div className="border-t border-border pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Data Management</h3>
          <div className="flex gap-3">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity flex items-center gap-2"
              title="Export all data to JSON file"
            >
              <span className="text-lg">📤</span>
              <span>Export Data</span>
            </button>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Export all your pages, widgets, and settings to a JSON file for backup.
          </p>
        </div>

        {/* About Section */}
        <div className="border-t border-border pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">About</h3>
          <p className="text-text-secondary mb-1">
            <strong>Browser Launchpad</strong>
          </p>
          <p className="text-text-secondary text-sm mb-4">
            A modern Chrome extension that replaces the new tab page with a customizable, widget-based dashboard.
          </p>
          <p className="text-text-secondary text-sm">
            Version: <strong>1.0.0</strong>
          </p>
          <p className="text-text-secondary text-sm">
            Created by <strong>Dennis Rongo</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
