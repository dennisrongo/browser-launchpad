import { useState, useEffect, useRef } from 'react'
import { settingsStorage } from '../services/storage'
import { encodeApiKey, decodeApiKey, logApiKeyInfo } from '../utils/security'
import type { ThemeName } from '../utils/theme'
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
  const [gridGap, setGridGap] = useState(24)
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
      setGridGap(result.data.grid_gap)
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
        const storedConfig = result.ai_config as AIProviderConfig
        // Decode API keys from storage
        const decodedConfig: AIProviderConfig = {
          openai: {
            apiKey: decodeApiKey(storedConfig.openai.apiKey),
            model: storedConfig.openai.model
          },
          straico: {
            apiKey: decodeApiKey(storedConfig.straico.apiKey),
            model: storedConfig.straico.model
          }
        }
        setAIConfig(decodedConfig)
        logApiKeyInfo(decodedConfig.openai.apiKey, 'OpenAI API key loaded')
        logApiKeyInfo(decodedConfig.straico.apiKey, 'Straico API key loaded')
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
      grid_gap: gridGap,
      theme: theme,
      updated_at: new Date().toISOString(),
    }

    const result = await settingsStorage.set(updatedSettings)
    if (result.success) {
      console.log('✓ Settings saved to Chrome storage')
      setSettings(updatedSettings)
      onSettingsChange(updatedSettings)
      setValidationError(null)

      // Save AI config (with encoded API keys)
      try {
        const encodedConfig: AIProviderConfig = {
          openai: {
            apiKey: encodeApiKey(aiConfig.openai.apiKey),
            model: aiConfig.openai.model
          },
          straico: {
            apiKey: encodeApiKey(aiConfig.straico.apiKey),
            model: aiConfig.straico.model
          }
        }
        await chrome.storage.local.set({ ai_config: encodedConfig })
        logApiKeyInfo(aiConfig.openai.apiKey, 'OpenAI API key saved')
        logApiKeyInfo(aiConfig.straico.apiKey, 'Straico API key saved')
        console.log('✓ AI config saved to Chrome storage (encoded)')
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
    setGridGap(settings.grid_gap)
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
      setGridGap(defaultSettings.grid_gap)
      setTheme(defaultSettings.theme)
      setAIConfig(DEFAULT_AI_CONFIG)
      onSettingsChange(defaultSettings)

      // Also clear AI config (encode empty strings for consistency)
      try {
        const emptyConfig: AIProviderConfig = {
          openai: { apiKey: '', model: DEFAULT_AI_CONFIG.openai.model },
          straico: { apiKey: '', model: DEFAULT_AI_CONFIG.straico.model }
        }
        await chrome.storage.local.set({ ai_config: emptyConfig })
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

  const handleGridGapChange = (value: number) => {
    if (value < 0 || value > 64) {
      setValidationError('Grid gap must be between 0 and 64 pixels')
    } else {
      setValidationError(null)
    }
    setGridGap(value)
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
      const fileName = `browser-launchpad-export-${new Date().toISOString().split('T')[0]}.json`
      setImportStatus({
        type: 'success',
        message: `✅ Data exported successfully as ${fileName}`
      })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000)
    } catch (error) {
      console.error('Failed to export data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to export data'
      setImportStatus({ type: 'error', message: `❌ Export failed: ${errorMessage}` })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000)
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

    // Security check: Scan for malicious code patterns
    const dataString = JSON.stringify(data)
    const maliciousPatterns = [
      /<script[^>]*>/i,           // Script tags
      /javascript:/i,             // JavaScript protocol
      /on\w+\s*=/i,               // Event handlers (onclick=, etc.)
      /<iframe/i,                 // Iframes
      /<embed/i,                  // Embed tags
      /<object/i,                 // Object tags
      /eval\s*\(/i,               // eval() function
      /document\.write/i,         // document.write
      /fromCharCode/i,            // fromCharCode (obfuscation)
      /\\u003c/i,                 // Unicode for <
      /&#60;/,                    // HTML entity for <
    ]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(dataString)) {
        return { valid: false, error: 'Security alert: File contains potentially malicious code patterns' }
      }
    }

    // Check for excessively large values (potential DoS)
    const checkValueSize = (obj: any, path: string = ''): boolean => {
      if (typeof obj === 'string' && obj.length > 100000) { // 100KB per string
        console.warn(`Excessively large string value at ${path}: ${obj.length} chars`)
        return false
      }
      if (Array.isArray(obj) && obj.length > 10000) { // More than 10000 items
        console.warn(`Excessively large array at ${path}: ${obj.length} items`)
        return false
      }
      if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj)
        if (keys.length > 1000) { // More than 1000 keys
          console.warn(`Excessively large object at ${path}: ${keys.length} keys`)
          return false
        }
        for (const key of keys) {
          if (!checkValueSize(obj[key], `${path}.${key}`)) {
            return false
          }
        }
      }
      return true
    }

    if (!checkValueSize(data, 'root')) {
      return { valid: false, error: 'Invalid file: data contains excessively large values that may cause performance issues' }
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
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="glass-modal rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-slide-up scrollbar-thin">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gradient">Settings</h2>
          <button
            onClick={handleCancel}
            className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-200"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Theme Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Theme</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={async () => {
                setTheme('modern-light')
                const updatedSettings = { ...settings, theme: 'modern-light' as const, updated_at: new Date().toISOString() }
                await settingsStorage.set(updatedSettings)
                setSettings(updatedSettings)
                onSettingsChange(updatedSettings)
              }}
              className={`p-4 rounded-card border-2 transition-all duration-200 text-left ${
                theme === 'modern-light'
                  ? 'border-primary bg-primary/5 shadow-glow-primary'
                  : 'border-border hover:border-primary/40 hover:bg-surface/50'
              }`}
            >
              <div className="font-semibold mb-1">Modern Light</div>
              <div className="text-sm text-text-secondary">Clean, minimal light theme</div>
              <div className="mt-3 flex gap-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-500 shadow-sm"></div>
                <div className="w-5 h-5 rounded-full bg-white border border-gray-200 shadow-sm"></div>
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-gray-200 shadow-sm"></div>
              </div>
            </button>

            <button
              onClick={async () => {
                setTheme('dark-elegance')
                const updatedSettings = { ...settings, theme: 'dark-elegance' as const, updated_at: new Date().toISOString() }
                await settingsStorage.set(updatedSettings)
                setSettings(updatedSettings)
                onSettingsChange(updatedSettings)
              }}
              className={`p-4 rounded-card border-2 transition-all duration-200 text-left ${
                theme === 'dark-elegance'
                  ? 'border-primary bg-primary/5 shadow-glow-primary'
                  : 'border-border hover:border-primary/40 hover:bg-surface/50'
              }`}
            >
              <div className="font-semibold mb-1">Dark Elegance</div>
              <div className="text-sm text-text-secondary">Sleek dark theme</div>
              <div className="mt-3 flex gap-1.5">
                <div className="w-5 h-5 rounded-full bg-teal-500 shadow-sm"></div>
                <div className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 shadow-sm"></div>
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-600 shadow-sm"></div>
              </div>
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Grid Layout</h3>
          <div className="mb-4">
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
          <div>
            <label htmlFor="spacing" className="block text-sm font-medium mb-2">
              Widget Spacing: {gridGap}px
            </label>
            <input
              type="range"
              id="spacing"
              min="0"
              max="64"
              step="4"
              value={gridGap}
              onChange={(e) => handleGridGapChange(parseInt(e.target.value))}
              className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>0px</span>
              <span>16px</span>
              <span>32px</span>
              <span>48px</span>
              <span>64px</span>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Controls how many widgets appear in each row and spacing between them.
          </p>
        </div>

        {/* AI Providers Configuration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">AI Providers</h3>
          <p className="text-sm text-text-secondary mb-4">
            Configure your AI providers for chat widgets. API keys are stored locally in your browser.
          </p>

          {/* OpenAI Configuration */}
          <div className="mb-4 p-4 glass-card rounded-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600"></div>
              <h4 className="font-semibold">OpenAI</h4>
            </div>

            <div className="mb-3">
              <label htmlFor="openai-key" className="block text-sm font-medium mb-1.5">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKeys.openai ? 'text' : 'password'}
                  id="openai-key"
                  value={aiConfig.openai.apiKey}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, openai: { ...prev.openai, apiKey: e.target.value } }))}
                  placeholder="sk-..."
                  className="input-base flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeys(prev => ({ ...prev, openai: !prev.openai }))}
                  className="btn-secondary px-3"
                  title={showApiKeys.openai ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKeys.openai ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="openai-model" className="block text-sm font-medium mb-1.5">
                Model
              </label>
              <select
                id="openai-model"
                value={aiConfig.openai.model}
                onChange={(e) => setAIConfig(prev => ({ ...prev, openai: { ...prev.openai, model: e.target.value } }))}
                className="input-base"
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
          <div className="p-4 glass-card rounded-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600"></div>
              <h4 className="font-semibold">Straico</h4>
            </div>

            <div className="mb-3">
              <label htmlFor="straico-key" className="block text-sm font-medium mb-1.5">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showApiKeys.straico ? 'text' : 'password'}
                  id="straico-key"
                  value={aiConfig.straico.apiKey}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, straico: { ...prev.straico, apiKey: e.target.value } }))}
                  placeholder="Enter your Straico API key"
                  className="input-base flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeys(prev => ({ ...prev, straico: !prev.straico }))}
                  className="btn-secondary px-3"
                  title={showApiKeys.straico ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKeys.straico ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="straico-model" className="block text-sm font-medium mb-1.5">
                Model
              </label>
              <input
                type="text"
                id="straico-model"
                value={aiConfig.straico.model}
                onChange={(e) => setAIConfig(prev => ({ ...prev, straico: { ...prev.straico, model: e.target.value } }))}
                placeholder="Model will be fetched from API"
                className="input-base bg-opacity-50 cursor-not-allowed"
                disabled
                title="Model is fetched automatically from Straico API"
              />
              <p className="text-xs text-text-muted mt-1.5">
                Models are fetched automatically from Straico API when you add an AI chat widget.
              </p>
            </div>
          </div>
        </div>

        {/* Import/Export Section */}
        <div className="border-t border-border-subtle pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-3">Data Management</h3>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={handleExportData}
              className="btn-primary flex items-center gap-2"
              title="Export all data to JSON file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Export Data</span>
            </button>
            <button
              onClick={handleImportClick}
              className="btn-secondary flex items-center gap-2"
              title="Import data from JSON file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Import Data</span>
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="btn-secondary flex items-center gap-2"
              title="Reset all settings to defaults"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
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
            <div className={`p-3 rounded-button text-sm mb-3 flex items-center justify-between gap-2 ${
              importStatus.type === 'success'
                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                : 'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
              <span className="flex-1">{importStatus.message}</span>
              <button
                onClick={() => setImportStatus({ type: null, message: '' })}
                className="opacity-70 hover:opacity-100 transition-opacity"
                title="Dismiss notification"
              >
                ×
              </button>
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
        <div className="border-t border-border-subtle pt-6 mt-6">
          <h3 className="text-lg font-semibold mb-2">About</h3>
          <div className="glass-card rounded-card p-4">
            <p className="text-text font-semibold mb-1">
              Browser Launchpad
            </p>
            <p className="text-text-secondary text-sm mb-3">
              A modern Chrome extension that replaces the new tab page with a customizable, widget-based dashboard.
            </p>
            <div className="flex gap-4 text-sm text-text-muted">
              <span>Version: <strong className="text-text-secondary">1.0.0</strong></span>
              <span>Created by <strong className="text-text-secondary">Dennis Rongo</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
          <button
            onClick={handleCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="glass-modal rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Reset to Defaults?</h3>
            </div>
            <p className="text-text-secondary mb-4">
              This will reset all settings to their default values:
            </p>
            <ul className="text-sm text-text-secondary mb-6 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
                Theme will be set to <strong>Modern Light</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
                Grid columns will be set to <strong>3</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
                Grid gap will be set to <strong>24px</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
                All API keys will be <strong>cleared</strong>
              </li>
            </ul>
            <p className="text-sm text-text-muted mb-6">
              Your pages and widgets will not be affected.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleResetToDefaults}
                className="px-4 py-2 bg-red-500 text-white font-medium rounded-button hover:bg-red-600 transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="glass-modal rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Import Data</h3>
            </div>
            <p className="text-text-secondary mb-4">
              Choose how you want to import the data:
            </p>

            {/* Import Mode Selection */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setImportMode('replace')}
                className={`w-full p-4 rounded-card border-2 text-left transition-all duration-200 ${
                  importMode === 'replace'
                    ? 'border-primary bg-primary/5 shadow-glow-primary'
                    : 'border-border hover:border-primary/40 hover:bg-surface/50'
                }`}
              >
                <div className="font-semibold mb-1">Replace All Data</div>
                <div className="text-sm text-text-secondary">
                  Clear all existing data and use only the imported data. This will replace your current pages, widgets, and settings.
                </div>
              </button>

              <button
                onClick={() => setImportMode('merge')}
                className={`w-full p-4 rounded-card border-2 text-left transition-all duration-200 ${
                  importMode === 'merge'
                    ? 'border-primary bg-primary/5 shadow-glow-primary'
                    : 'border-border hover:border-primary/40 hover:bg-surface/50'
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
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="btn-primary"
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
