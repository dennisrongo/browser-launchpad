import { useState, useEffect, useRef } from 'react'
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
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<any>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [includeApiKeysInExport, setIncludeApiKeysInExport] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Apply theme immediately to document (for feature #125)
  const applyThemeToDocument = (themeName: 'modern-light' | 'dark-elegance') => {
    if (themeName === 'dark-elegance') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Apply theme immediately when theme state changes (for feature #125)
  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

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
        // Apply theme immediately when settings change from another context (for feature #126)
        applyThemeToDocument(newSettings.theme)
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
      // Apply loaded theme immediately to document (for feature #125, #126)
      applyThemeToDocument(result.data.theme)
    } else {
      // Create default settings
      const saveResult = await settingsStorage.set(DEFAULT_SETTINGS)
      if (saveResult.success) {
        console.log('✓ Default settings created in Chrome storage')
        setSettings(DEFAULT_SETTINGS)
        applyThemeToDocument(DEFAULT_SETTINGS.theme)
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
    // Validate settings before saving
    if (gridColumns < 1 || gridColumns > 6) {
      setValidationError('Grid columns must be between 1 and 6')
      return
    }

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
      setValidationError(null)

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
    loadAIConfig()
    setValidationError(null)
    onClose()
  }

  const handleResetToDefaults = async () => {
    // Reset to default settings
    const defaultSettings: Settings = {
      ...DEFAULT_SETTINGS,
      id: settings.id, // Keep the same ID
      created_at: settings.created_at, // Keep original creation date
      updated_at: new Date().toISOString(),
    }

    const result = await settingsStorage.set(defaultSettings)
    if (result.success) {
      console.log('✓ Settings reset to defaults')
      setSettings(defaultSettings)
      setGridColumns(defaultSettings.grid_columns)
      setTheme(defaultSettings.theme)
      setAIConfig(DEFAULT_AI_CONFIG)
      onSettingsChange(defaultSettings)

      // Also clear AI config
      try {
        await chrome.storage.local.set({ ai_config: DEFAULT_AI_CONFIG })
        console.log('✓ AI config reset to defaults')
      } catch (error) {
        console.error('Failed to reset AI config:', error)
      }

      setShowResetConfirm(false)
      setValidationError(null)
    } else {
      console.error('Failed to reset settings:', result.error)
    }
  }

  const handleGridColumnsChange = (value: number) => {
    if (value < 1 || value > 6) {
      setValidationError('Grid columns must be between 1 and 6')
    } else {
      setValidationError(null)
    }
    setGridColumns(value)
  }

  const handleExportData = async () => {
    try {
      // Get all data from Chrome storage
      const allData = await chrome.storage.local.get(null)

      // Optionally exclude API keys from export
      let exportData = { ...allData }

      if (!includeApiKeysInExport && exportData.ai_config) {
        // Create a copy with API keys removed
        const aiConfig = exportData.ai_config as AIProviderConfig
        exportData = {
          ...exportData,
          ai_config: {
            ...aiConfig,
            openai: {
              ...aiConfig.openai,
              apiKey: ''
            },
            straico: {
              ...aiConfig.straico,
              apiKey: ''
            }
          }
        }
        console.log('⚠️ API keys excluded from export')
      }

      // Create export data object with timestamp
      const finalExportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: exportData
      }

      // Convert to JSON
      const jsonString = JSON.stringify(finalExportData, null, 2)

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
      setImportStatus({ type: 'success', message: 'Data exported successfully!' })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 3000)
    } catch (error) {
      console.error('Failed to export data:', error)
      setImportStatus({ type: 'error', message: 'Failed to export data' })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const validateImportData = (importData: any): { valid: boolean; error?: string } => {
    if (!importData || typeof importData !== 'object') {
      return { valid: false, error: 'Invalid file: not a valid JSON object' }
    }
    if (!importData.version) {
      return { valid: false, error: 'Invalid file: missing version information' }
    }
    if (importData.version !== '1.0.0') {
      return { valid: false, error: 'Incompatible version: ' + importData.version + '. This extension supports version 1.0.0' }
    }
    if (!importData.data || typeof importData.data !== 'object') {
      return { valid: false, error: 'Invalid file: missing or invalid data section' }
    }
    const data = importData.data
    const hasValidStructure = Array.isArray(data.pages) || (typeof data.settings === 'object' && data.settings !== null) || typeof data.ai_config === 'object'
    if (!hasValidStructure) {
      return { valid: false, error: 'Invalid file: data does not contain valid pages, settings, or configuration' }
    }
    return { valid: true }
  }

  const handleConfirmImport = async () => {
    if (!pendingImportData) return
    try {
      if (importMode === 'replace') {
        // Clear all data and import
        await chrome.storage.local.clear()
        await chrome.storage.local.set(pendingImportData)
        console.log('✓ Data imported successfully (replace mode)')
      } else {
        // Merge mode: get existing data and merge
        const existingData = await chrome.storage.local.get(null)

        // Merge pages
        const existingPages = (existingData.pages as any[]) || []
        const importPages = (pendingImportData.pages as any[]) || []

        // Create a map of existing pages by ID to avoid duplicates
        const existingPageMap = new Map(existingPages.map((p: any) => [p.id, p]))
        const mergedPages = [...existingPages]

        // Add import pages that don't exist (by checking ID)
        for (const importPage of importPages) {
          if (!existingPageMap.has(importPage.id)) {
            mergedPages.push(importPage)
          }
        }

        // Merge settings (import takes precedence)
        const mergedData = {
          ...existingData,
          ...pendingImportData,
          pages: mergedPages,
        }

        await chrome.storage.local.clear()
        await chrome.storage.local.set(mergedData)
        console.log('✓ Data imported successfully (merge mode)')
      }

      setImportStatus({ type: 'success', message: `Data imported successfully! (${importMode} mode) Reloading...` })
      setShowImportConfirm(false)

      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Failed to import data:', error)
      let errorMessage = 'Failed to import data'
      if (error instanceof Error) {
        // Provide more helpful error messages
        if (error.message.includes('QuotaExceededError')) {
          errorMessage = 'Storage quota exceeded. The data is too large to import. Try exporting some data first or use merge mode.'
        } else if (error.message.includes('DataCloneError')) {
          errorMessage = 'Invalid data format in import file. Some data could not be stored.'
        } else {
          errorMessage = `Import failed: ${error.message}`
        }
      }
      setImportStatus({ type: 'error', message: errorMessage })
      setShowImportConfirm(false)
      setTimeout(() => setImportStatus({ type: null, message: '' }), 7000) // Show error for longer
    }
    setPendingImportData(null)
    setImportMode('replace')
  }

  const handleCancelImport = () => {
    setShowImportConfirm(false)
    setPendingImportData(null)
    setImportMode('replace')
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Check file size (limit to 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`)
      }

      // Check file type
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        throw new Error('Invalid file type. Please select a JSON file (.json).')
      }

      const text = await file.text()
      let importData
      try {
        importData = JSON.parse(text)
      } catch (parseError) {
        throw new Error('Invalid JSON syntax. Please check the file format.')
      }
      const validation = validateImportData(importData)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid import file format')
      }
      setPendingImportData(importData)
      setShowImportConfirm(true)
      setImportStatus({ type: null, message: '' })
    } catch (error) {
      console.error('Failed to validate import data:', error)
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to validate import file'
      })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
              onChange={(e) => handleGridColumnsChange(parseInt(e.target.value))}
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
          <div className="flex gap-3 mb-3">
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity flex items-center gap-2"
              title="Export all data to JSON file"
            >
              <span className="text-lg">📤</span>
              <span>Export Data</span>
            </button>
            <button
              onClick={handleImportClick}
              className="px-4 py-2 bg-surface text-text rounded-button hover:bg-background border border-border transition-colors flex items-center gap-2"
              title="Import data from JSON file"
            >
              <span className="text-lg">📥</span>
              <span>Import Data</span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-surface text-text rounded-button hover:bg-background border border-border transition-colors flex items-center gap-2"
              title="Reset all settings to defaults"
            >
              <span className="text-lg">🔄</span>
              <span>Reset to Defaults</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* API Key Export Option */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeApiKeysInExport}
                onChange={(e) => setIncludeApiKeysInExport(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm text-text-secondary">
                Include API keys in export (⚠️ Security risk: uncheck to exclude API keys)
              </span>
            </label>
          </div>

          {importStatus.type && (
            <div className={`p-3 rounded-button text-sm mb-3 ${
              importStatus.type === 'success'
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
              {importStatus.message}
            </div>
          )}
          {validationError && (
            <div className="p-3 rounded-button text-sm mb-3 bg-red-500/10 text-red-600 border border-red-500/20">
              ⚠️ {validationError}
            </div>
          )}
          <p className="text-sm text-text-secondary">
            Export all your pages, widgets, and settings to a JSON file for backup. Import to restore from a backup.
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

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-xl font-bold">Reset to Defaults?</h3>
            </div>
            <p className="text-text-secondary mb-4">
              This will reset all settings to their default values:
            </p>
            <ul className="list-disc list-inside text-sm text-text-secondary mb-6 space-y-1">
              <li>Theme will be set to <strong>Modern Light</strong></li>
              <li>Grid columns will be set to <strong>3</strong></li>
              <li>Grid gap will be set to <strong>24px</strong></li>
              <li>All API keys will be <strong>cleared</strong></li>
            </ul>
            <p className="text-sm text-text-secondary mb-6">
              Your pages and widgets will <strong>not</strong> be affected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2 bg-red-600 text-white rounded-button hover:bg-red-700 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-surface border border-border rounded-card shadow-lg p-6 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">📥</span>
              <h3 className="text-xl font-bold">Import Data</h3>
            </div>
            <p className="text-text-secondary mb-4">
              Choose how you want to import the data:
            </p>

            {/* Import Mode Selection */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setImportMode('replace')}
                className={`w-full p-4 rounded-card border-2 text-left transition-all ${
                  importMode === 'replace'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold mb-1">Replace All Data</div>
                <div className="text-sm text-text-secondary">
                  Clear all existing data and use only the imported data. This will replace your current pages, widgets, and settings.
                </div>
              </button>

              <button
                onClick={() => setImportMode('merge')}
                className={`w-full p-4 rounded-card border-2 text-left transition-all ${
                  importMode === 'merge'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold mb-1">Merge with Existing Data</div>
                <div className="text-sm text-text-secondary">
                  Combine imported pages with your existing pages. Duplicate pages (by ID) will be skipped. Settings from import will be applied.
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelImport}
                className="px-4 py-2 bg-background text-text rounded-button hover:bg-surface border border-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-primary text-white rounded-button hover:opacity-90 transition-opacity"
              >
                Import ({importMode === 'replace' ? 'Replace' : 'Merge'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
