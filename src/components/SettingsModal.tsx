import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  Cloud,
  Database,
  Download,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Palette,
  Puzzle,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react'

import type { Settings } from '../types'
import type { ThemeName } from '../utils/theme'
import type {
  GoogleDriveConfig,
  GoogleDriveManifestConfig,
  GoogleDriveSyncState,
} from '../services/googleDriveSync'
import type { StraicoModel } from '../utils/ai'

import {
  disconnectGoogleDrive,
  getGoogleDriveManifestConfig,
  getGoogleDriveSyncState,
  getStoredGoogleDriveConfig,
  initiateGoogleDriveAuth,
  isGoogleDriveAuthorized,
  resetGoogleDriveSyncState,
  restoreLocalDataFromGoogleDrive,
  setGoogleDriveConfig,
  syncLocalDataToGoogleDrive,
} from '../services/googleDriveSync'
import { settingsStorage } from '../services/storage'
import { fetchStraicoModels } from '../utils/ai'
import { decodeApiKey, encodeApiKey, logApiKeyInfo } from '../utils/security'

type ThemeOption = {
  id: ThemeName
  name: string
  description: string
  primary: string
  secondary: string
  accent: string
  neutral: string
  surface: string
  isDark?: boolean
}

const themeOptions: ThemeOption[] = [
  {
    id: 'modern-light',
    name: 'Modern Light',
    description: 'Clean indigo with violet accents',
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    neutral: '#64748B',
    surface: '#F8FAFC',
  },
  {
    id: 'dark-elegance',
    name: 'Dark Elegance',
    description: 'Teal with cyan highlights',
    primary: '#14B8A6',
    secondary: '#06B6D4',
    accent: '#F59E0B',
    neutral: '#64748B',
    surface: '#0F172A',
    isDark: true,
  },
  {
    id: 'vintage-rose',
    name: 'Vintage Rose',
    description: 'Dusty rose with gold warmth',
    primary: '#8a4a52',
    secondary: '#9d7a82',
    accent: '#c9a857',
    neutral: '#8a7a78',
    surface: '#f8f3f3',
  },
  {
    id: 'sage-sanctuary',
    name: 'Sage Sanctuary',
    description: 'Earthy sage with terracotta',
    primary: '#646831',
    secondary: '#4a7850',
    accent: '#c47a4a',
    neutral: '#7a7a6a',
    surface: '#f6f7ee',
  },
  {
    id: 'midnight-charcoal',
    name: 'Midnight Charcoal',
    description: 'Silver with copper accents',
    primary: '#c4b8b8',
    secondary: '#c8a8a0',
    accent: '#b87858',
    neutral: '#6a6060',
    surface: '#0d0b0b',
    isDark: true,
  },
  {
    id: 'lavender-dreams',
    name: 'Lavender Dreams',
    description: 'Soft lavender with gold',
    primary: '#b89cc4',
    secondary: '#a88ab8',
    accent: '#d4b86a',
    neutral: '#8a7890',
    surface: '#0e0b10',
    isDark: true,
  },
  {
    id: 'caramel-comfort',
    name: 'Caramel Comfort',
    description: 'Warm caramel with honey',
    primary: '#935939',
    secondary: '#7a6858',
    accent: '#d4a040',
    neutral: '#7a6a5a',
    surface: '#f8f1ed',
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    description: 'Ice blue with purple glow',
    primary: '#008cff',
    secondary: '#00a0a0',
    accent: '#725ea1',
    neutral: '#6a8080',
    surface: '#0f1515',
    isDark: true,
  },
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    description: 'Bold crimson with steel blue',
    primary: '#d92638',
    secondary: '#3b86c4',
    accent: '#f2870d',
    neutral: '#7766cc',
    surface: '#110d26',
    isDark: true,
  },
  {
    id: 'plum-blossom',
    name: 'Plum Blossom',
    description: 'Rich plum with warm peach',
    primary: '#ef43b0',
    secondary: '#d260a4',
    accent: '#ff7700',
    neutral: '#9f2d71',
    surface: '#180510',
    isDark: true,
  },
  {
    id: 'sage-meadow',
    name: 'Sage Meadow',
    description: 'Sage green with teal accents on charcoal',
    primary: '#70936c',
    secondary: '#619e66',
    accent: '#46b972',
    neutral: '#757a8a',
    surface: '#17181c',
    isDark: true,
  },
]

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: (settings: Settings) => void
}

interface AIProviderConfig {
  activeProvider: 'openai' | 'straico'
  openai: {
    apiKey: string
    model: string
  }
  straico: {
    apiKey: string
    model: string
    availableModels: StraicoModel[]
  }
}

interface WeatherConfig {
  apiKey: string
}

interface GoogleCalendarConfig {
  clientId: string
}

interface StatusMessage {
  type: 'success' | 'error' | null
  message: string
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
  activeProvider: 'openai',
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
  },
  straico: {
    apiKey: '',
    model: '',
    availableModels: [],
  },
}

const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  apiKey: '',
}

const DEFAULT_GOOGLE_CALENDAR_CONFIG: GoogleCalendarConfig = {
  clientId: '',
}

const DEFAULT_GOOGLE_DRIVE_CONFIG: GoogleDriveConfig = {
  autoSyncEnabled: false,
}

const DEFAULT_GOOGLE_DRIVE_MANIFEST_CONFIG: GoogleDriveManifestConfig = {
  clientId: '',
  isConfigured: false,
  scopes: [],
}

const DEFAULT_GOOGLE_DRIVE_SYNC_STATE: GoogleDriveSyncState = {
  lastSyncedAt: null,
  lastRestoredAt: null,
  lastError: null,
  syncFileId: null,
}

type SettingsTab = 'appearance' | 'integrations' | 'data' | 'about'

const tabs: { id: SettingsTab; label: string; icon: JSX.Element }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Puzzle className="w-4 h-4" /> },
  { id: 'data', label: 'Data', icon: <Database className="w-4 h-4" /> },
  { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
]

export function SettingsModal({ isOpen, onClose, onSettingsChange }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [gridColumns, setGridColumns] = useState(3)
  const [gridGap, setGridGap] = useState(24)
  const [theme, setTheme] = useState<ThemeName>('modern-light')
  const [aiConfig, setAIConfig] = useState<AIProviderConfig>(DEFAULT_AI_CONFIG)
  const [weatherConfig, setWeatherConfig] = useState<WeatherConfig>(DEFAULT_WEATHER_CONFIG)
  const [googleCalendarConfig, setGoogleCalendarConfig] = useState<GoogleCalendarConfig>(DEFAULT_GOOGLE_CALENDAR_CONFIG)
  const [googleDriveSyncConfig, setGoogleDriveSyncConfig] = useState<GoogleDriveConfig>(DEFAULT_GOOGLE_DRIVE_CONFIG)
  const [googleDriveManifestConfig, setGoogleDriveManifestConfig] = useState<GoogleDriveManifestConfig>(DEFAULT_GOOGLE_DRIVE_MANIFEST_CONFIG)
  const [googleDriveSyncStatus, setGoogleDriveSyncStatus] = useState<GoogleDriveSyncState>(DEFAULT_GOOGLE_DRIVE_SYNC_STATE)
  const [showApiKeys, setShowApiKeys] = useState({ openai: false, straico: false, weather: false, googleCalendar: false })
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [modelFetchError, setModelFetchError] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<StatusMessage>({ type: null, message: '' })
  const [googleDriveStatusMessage, setGoogleDriveStatusMessage] = useState<StatusMessage>({ type: null, message: '' })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [showDriveRestoreConfirm, setShowDriveRestoreConfirm] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<any>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('replace')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [includeApiKeysInExport, setIncludeApiKeysInExport] = useState(false)
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false)
  const [isConnectingGoogleDrive, setIsConnectingGoogleDrive] = useState(false)
  const [isSyncingGoogleDrive, setIsSyncingGoogleDrive] = useState(false)
  const [isRestoringGoogleDrive, setIsRestoringGoogleDrive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const extensionId = chrome.runtime.id

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadAIConfig()
      loadWeatherConfig()
      loadGoogleCalendarConfig()
      loadGoogleDriveState()
    }
  }, [isOpen])

  useEffect(() => {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'local') {
        return
      }

      if (changes.settings) {
        const newSettings = changes.settings.newValue as Settings
        setSettings(newSettings)
        setGridColumns(newSettings.grid_columns)
        setGridGap(newSettings.grid_gap)
        setTheme(newSettings.theme)
      }

      if (
        changes.google_drive_config ||
        changes.google_drive_tokens ||
        changes.google_drive_sync_state
      ) {
        void loadGoogleDriveState()
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
        const decodedConfig: AIProviderConfig = {
          activeProvider: storedConfig.activeProvider || 'openai',
          openai: { apiKey: decodeApiKey(storedConfig.openai.apiKey), model: storedConfig.openai.model },
          straico: { 
            apiKey: decodeApiKey(storedConfig.straico.apiKey), 
            model: storedConfig.straico.model,
            availableModels: storedConfig.straico.availableModels || []
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

  const loadWeatherConfig = async () => {
    try {
      const result = await chrome.storage.local.get(['weather_config'])
      if (result.weather_config) {
        const storedConfig = result.weather_config as WeatherConfig
        const decodedConfig: WeatherConfig = { apiKey: decodeApiKey(storedConfig.apiKey) }
        setWeatherConfig(decodedConfig)
        logApiKeyInfo(decodedConfig.apiKey, 'Weather API key loaded')
      }
    } catch (error) {
      console.error('Failed to load weather config:', error)
    }
  }

  const loadGoogleCalendarConfig = async () => {
    try {
      const result = await chrome.storage.local.get(['google_calendar_config'])
      if (result.google_calendar_config) {
        const storedConfig = result.google_calendar_config as GoogleCalendarConfig
        setGoogleCalendarConfig({ clientId: decodeApiKey(storedConfig.clientId) })
      }
    } catch (error) {
      console.error('Failed to load Google Calendar config:', error)
    }
  }

  const loadGoogleDriveState = async () => {
    try {
      const [storedConfig, manifestConfig, syncState, authorized] = await Promise.all([
        getStoredGoogleDriveConfig(),
        Promise.resolve(getGoogleDriveManifestConfig()),
        getGoogleDriveSyncState(),
        isGoogleDriveAuthorized(),
      ])

      setGoogleDriveSyncConfig(storedConfig)
      setGoogleDriveManifestConfig(manifestConfig)
      setGoogleDriveSyncStatus(syncState)
      setIsGoogleDriveConnected(authorized)
    } catch (error) {
      console.error('Failed to load Google Drive state:', error)
    }
  }

  const handleSave = async () => {
    if (gridColumns < 1 || gridColumns > 6) {
      setValidationError('Grid columns must be between 1 and 6')
      return
    }

    const updatedSettings: Settings = {
      ...settings,
      grid_columns: gridColumns,
      grid_gap: gridGap,
      theme,
      updated_at: new Date().toISOString(),
    }
    const result = await settingsStorage.set(updatedSettings)
    if (result.success) {
      console.log('✓ Settings saved to Chrome storage')
      setSettings(updatedSettings)
      onSettingsChange(updatedSettings)
      setValidationError(null)
      try {
        const encodedConfig: AIProviderConfig = {
          activeProvider: aiConfig.activeProvider,
          openai: { apiKey: encodeApiKey(aiConfig.openai.apiKey), model: aiConfig.openai.model },
          straico: { 
            apiKey: encodeApiKey(aiConfig.straico.apiKey), 
            model: aiConfig.straico.model,
            availableModels: aiConfig.straico.availableModels
          }
        }
        await chrome.storage.local.set({ ai_config: encodedConfig })
        console.log('✓ AI config saved to Chrome storage (encoded)')
      } catch (error) { console.error('Failed to save AI config:', error) }
      try {
        const encodedWeatherConfig: WeatherConfig = { apiKey: encodeApiKey(weatherConfig.apiKey) }
        await chrome.storage.local.set({ weather_config: encodedWeatherConfig })
        console.log('✓ Weather config saved to Chrome storage (encoded)')
      } catch (error) { console.error('Failed to save weather config:', error) }
      try {
        const encodedGoogleCalendarConfig: GoogleCalendarConfig = { clientId: encodeApiKey(googleCalendarConfig.clientId) }
        await chrome.storage.local.set({ google_calendar_config: encodedGoogleCalendarConfig })
        console.log('✓ Google Calendar config saved to Chrome storage (encoded)')
      } catch (error) { console.error('Failed to save Google Calendar config:', error) }
      try {
        await setGoogleDriveConfig(googleDriveSyncConfig)
        console.log('✓ Google Drive config saved to Chrome storage')
      } catch (error) { console.error('Failed to save Google Drive config:', error) }
      onClose()
    } else {
      console.error('Failed to save settings:', result.error)
    }
  }

  const handleCancel = () => {
    setGridColumns(settings.grid_columns)
    setGridGap(settings.grid_gap)
    setTheme(settings.theme)
    void loadAIConfig()
    void loadWeatherConfig()
    void loadGoogleCalendarConfig()
    void loadGoogleDriveState()
    setShowDriveRestoreConfirm(false)
    setGoogleDriveStatusMessage({ type: null, message: '' })
    setValidationError(null)
    onClose()
  }

  const handleResetToDefaults = async () => {
    const defaultSettings: Settings = { ...DEFAULT_SETTINGS, id: settings.id, created_at: settings.created_at, updated_at: new Date().toISOString() }
    const result = await settingsStorage.set(defaultSettings)
    if (result.success) {
      console.log('✓ Settings reset to defaults')
      setSettings(defaultSettings)
      setGridColumns(defaultSettings.grid_columns)
      setGridGap(defaultSettings.grid_gap)
      setTheme(defaultSettings.theme)
      setAIConfig(DEFAULT_AI_CONFIG)
      setWeatherConfig(DEFAULT_WEATHER_CONFIG)
      setGoogleCalendarConfig(DEFAULT_GOOGLE_CALENDAR_CONFIG)
      setGoogleDriveSyncConfig(DEFAULT_GOOGLE_DRIVE_CONFIG)
      setGoogleDriveSyncStatus(DEFAULT_GOOGLE_DRIVE_SYNC_STATE)
      setIsGoogleDriveConnected(false)
      setGoogleDriveStatusMessage({ type: null, message: '' })
      onSettingsChange(defaultSettings)
      try {
        const emptyConfig: AIProviderConfig = { 
          activeProvider: 'openai',
          openai: { apiKey: '', model: DEFAULT_AI_CONFIG.openai.model }, 
          straico: { apiKey: '', model: DEFAULT_AI_CONFIG.straico.model, availableModels: [] } 
        }
        await chrome.storage.local.set({ ai_config: emptyConfig })
        console.log('✓ AI config reset to defaults')
      } catch (error) { console.error('Failed to reset AI config:', error) }
      try {
        await chrome.storage.local.set({ weather_config: DEFAULT_WEATHER_CONFIG })
        console.log('✓ Weather config reset to defaults')
      } catch (error) { console.error('Failed to reset weather config:', error) }
      try {
        await chrome.storage.local.set({ google_calendar_config: DEFAULT_GOOGLE_CALENDAR_CONFIG })
        console.log('✓ Google Calendar config reset to defaults')
      } catch (error) { console.error('Failed to reset Google Calendar config:', error) }
      try {
        await disconnectGoogleDrive()
        await setGoogleDriveConfig(DEFAULT_GOOGLE_DRIVE_CONFIG)
        await resetGoogleDriveSyncState()
        console.log('✓ Google Drive config reset to defaults')
      } catch (error) { console.error('Failed to reset Google Drive config:', error) }
      setShowResetConfirm(false)
      setValidationError(null)
    } else {
      console.error('Failed to reset settings:', result.error)
    }
  }

  const handleGridColumnsChange = (value: number) => {
    if (value < 1 || value > 6) setValidationError('Grid columns must be between 1 and 6')
    else setValidationError(null)
    setGridColumns(value)
  }

  const handleGridGapChange = (value: number) => {
    if (value < 0 || value > 64) setValidationError('Grid gap must be between 0 and 64 pixels')
    else setValidationError(null)
    setGridGap(value)
  }

  const handleFetchStraicoModels = async () => {
    if (!aiConfig.straico.apiKey) {
      setModelFetchError('Please enter your Straico API key first')
      return
    }

    setIsFetchingModels(true)
    setModelFetchError(null)

    try {
      const models = await fetchStraicoModels(aiConfig.straico.apiKey)
      setAIConfig(prev => ({
        ...prev,
        straico: { ...prev.straico, availableModels: models }
      }))
    } catch (error) {
      setModelFetchError(error instanceof Error ? error.message : 'Failed to fetch models')
    } finally {
      setIsFetchingModels(false)
    }
  }

  const formatSyncDate = (value: string | null) => {
    if (!value) {
      return 'Never'
    }

    return new Date(value).toLocaleString()
  }

  const handleConnectGoogleDrive = async () => {
    setIsConnectingGoogleDrive(true)
    setGoogleDriveStatusMessage({ type: null, message: '' })

    try {
      await initiateGoogleDriveAuth()
      await loadGoogleDriveState()
      setGoogleDriveStatusMessage({
        type: 'success',
        message: 'Google Drive connected. You can sync from the Data tab now.',
      })
    } catch (error) {
      setGoogleDriveStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to connect Google Drive.',
      })
    } finally {
      setIsConnectingGoogleDrive(false)
    }
  }

  const handleDisconnectGoogleDrive = async () => {
    setGoogleDriveStatusMessage({ type: null, message: '' })

    try {
      await disconnectGoogleDrive()
      await loadGoogleDriveState()
      setGoogleDriveStatusMessage({
        type: 'success',
        message: 'Google Drive disconnected.',
      })
    } catch (error) {
      setGoogleDriveStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to disconnect Google Drive.',
      })
    }
  }

  const handleSyncGoogleDrive = async () => {
    setIsSyncingGoogleDrive(true)
    setGoogleDriveStatusMessage({ type: null, message: '' })

    try {
      await syncLocalDataToGoogleDrive()
      await loadGoogleDriveState()
      setGoogleDriveStatusMessage({
        type: 'success',
        message: 'Bookmark widgets and settings synced to Google Drive.',
      })
    } catch (error) {
      setGoogleDriveStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to sync to Google Drive.',
      })
    } finally {
      setIsSyncingGoogleDrive(false)
    }
  }

  const handleRestoreGoogleDrive = async () => {
    setIsRestoringGoogleDrive(true)
    setGoogleDriveStatusMessage({ type: null, message: '' })

    try {
      await restoreLocalDataFromGoogleDrive()
      await loadGoogleDriveState()
      setGoogleDriveStatusMessage({
        type: 'success',
        message: 'Bookmark widgets and settings were restored from Google Drive.',
      })
      setShowDriveRestoreConfirm(false)
    } catch (error) {
      setGoogleDriveStatusMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to restore from Google Drive.',
      })
    } finally {
      setIsRestoringGoogleDrive(false)
    }
  }

  const handleExportData = async () => {
    try {
      const allData = await chrome.storage.local.get(null)
      let exportData = { ...allData }
      if (!includeApiKeysInExport) {
        if (exportData.ai_config) {
          const aiConfig = exportData.ai_config as AIProviderConfig
          exportData = { ...exportData, ai_config: { ...aiConfig, openai: { ...aiConfig.openai, apiKey: '' }, straico: { ...aiConfig.straico, apiKey: '' } } }
        }
        if (exportData.weather_config) {
          exportData = { ...exportData, weather_config: { ...exportData.weather_config, apiKey: '' } }
        }
        if (exportData.google_calendar_config) {
          exportData = { ...exportData, google_calendar_config: { ...exportData.google_calendar_config, clientId: '' } }
        }
        delete exportData.google_calendar_tokens
        delete exportData.google_calendars
        delete exportData.google_drive_tokens
        delete exportData.google_drive_sync_state
        console.log('⚠️ API keys and OAuth tokens excluded from export')
      } else {
        delete exportData.google_drive_tokens
      }
      const finalExportData = { version: '1.0.0', exportDate: new Date().toISOString(), data: exportData }
      const jsonString = JSON.stringify(finalExportData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `browser-launchpad-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('✓ Data exported successfully')
      const fileName = `browser-launchpad-export-${new Date().toISOString().split('T')[0]}.json`
      setImportStatus({ type: 'success', message: `✅ Data exported successfully as ${fileName}` })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000)
    } catch (error) {
      console.error('Failed to export data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to export data'
      setImportStatus({ type: 'error', message: `❌ Export failed: ${errorMessage}` })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000)
    }
  }

  const handleImportClick = () => { fileInputRef.current?.click() }

  const VALID_WIDGET_TYPES = ['bookmark', 'weather', 'ai-chat', 'clock', 'todo', 'pomodoro', 'calendar', 'notes'] as const

  const validateImportData = (importData: any): { valid: boolean; error?: string } => {
    if (!importData || typeof importData !== 'object') return { valid: false, error: 'Invalid file: not a valid JSON object' }
    if (!importData.version) return { valid: false, error: 'Invalid file: missing version information' }
    const versionParts = importData.version.split('.')
    if (versionParts.length !== 3 || !versionParts.every((p: string) => /^\d+$/.test(p))) {
      return { valid: false, error: 'Invalid version format. Expected semver (e.g., 1.0.0)' }
    }
    const [major] = versionParts.map(Number)
    if (major !== 1) return { valid: false, error: 'Incompatible version: ' + importData.version + '. This extension supports version 1.x.x' }
    if (!importData.data || typeof importData.data !== 'object') return { valid: false, error: 'Invalid file: missing or invalid data section' }
    const data = importData.data
    const hasValidStructure = Array.isArray(data.pages) || (typeof data.settings === 'object' && data.settings !== null) || typeof data.ai_config === 'object'
    if (!hasValidStructure) return { valid: false, error: 'Invalid file: data does not contain valid pages, settings, or configuration' }
    if (Array.isArray(data.pages)) {
      for (let i = 0; i < data.pages.length; i++) {
        const page = data.pages[i]
        if (!page || typeof page !== 'object') return { valid: false, error: `Invalid page at index ${i}: not a valid object` }
        if (typeof page.id !== 'string' || !page.id) return { valid: false, error: `Invalid page at index ${i}: missing or invalid id` }
        if (typeof page.name !== 'string') return { valid: false, error: `Invalid page "${page.id}": missing or invalid name` }
        if (!Array.isArray(page.widgets)) return { valid: false, error: `Invalid page "${page.id}": widgets must be an array` }
        for (let j = 0; j < page.widgets.length; j++) {
          const widget = page.widgets[j]
          if (!widget || typeof widget !== 'object') return { valid: false, error: `Invalid widget at index ${j} in page "${page.id}": not a valid object` }
          if (typeof widget.id !== 'string' || !widget.id) return { valid: false, error: `Invalid widget at index ${j} in page "${page.id}": missing or invalid id` }
          if (!VALID_WIDGET_TYPES.includes(widget.type)) return { valid: false, error: `Invalid widget "${widget.id}": unknown type "${widget.type}". Valid types: ${VALID_WIDGET_TYPES.join(', ')}` }
          if (typeof widget.title !== 'string') return { valid: false, error: `Invalid widget "${widget.id}": missing or invalid title` }
        }
      }
    }
    const dataString = JSON.stringify(data)
    const maliciousPatterns = [/<script[^>]*>/i, /javascript:/i, /on\w+\s*=/i, /<iframe/i, /<embed/i, /<object/i, /eval\s*\(/i, /document\.write/i, /fromCharCode/i, /\\u003c/i, /&#60;/]
    for (const pattern of maliciousPatterns) {
      if (pattern.test(dataString)) return { valid: false, error: 'Security alert: File contains potentially malicious code patterns' }
    }
    const checkValueSize = (obj: any, path: string = ''): boolean => {
      if (typeof obj === 'string' && obj.length > 100000) return false
      if (Array.isArray(obj) && obj.length > 10000) return false
      if (typeof obj === 'object' && obj !== null) {
        const keys = Object.keys(obj)
        if (keys.length > 1000) return false
        for (const key of keys) { if (!checkValueSize(obj[key], `${path}.${key}`)) return false }
      }
      return true
    }
    if (!checkValueSize(data, 'root')) return { valid: false, error: 'Invalid file: data contains excessively large values that may cause performance issues' }
    return { valid: true }
  }

  const handleConfirmImport = async () => {
    if (!pendingImportData || !pendingImportData.data) {
      console.warn('[Import] No pending import data')
      return
    }
    
    const importData = pendingImportData.data
    const BACKUP_KEY = '__import_backup__'
    let backupData: Record<string, unknown> | null = null
    
    setShowImportConfirm(false)
    
    try {
      console.log('[Import] Starting...')
      
      const existingData = await chrome.storage.local.get(null)
      const hasExistingData = existingData && Object.keys(existingData).length > 0
      console.log('[Import] Has existing data:', hasExistingData)
      
      if (hasExistingData) {
        backupData = { ...existingData }
        await chrome.storage.local.set({ [BACKUP_KEY]: backupData })
        console.log('[Import] Backup created')
      }
      
      if (importMode === 'replace') {
        console.log('[Import] Replace mode - clearing and setting data')
        await chrome.storage.local.clear()
        await chrome.storage.local.set(importData)
        console.log('[Import] Data set successfully')
      } else {
        console.log('[Import] Merge mode')
        const currentData = await chrome.storage.local.get(null)
        delete currentData[BACKUP_KEY]
        
        const existingPages = (currentData.pages as any[]) || []
        const importPages = (importData.pages as any[]) || []
        
        const mergedPages = [...existingPages]
        const existingPageIds = new Set(existingPages.map(p => p.id))
        
        for (const importPage of importPages) {
          if (existingPageIds.has(importPage.id)) {
            const idx = mergedPages.findIndex(p => p.id === importPage.id)
            if (idx >= 0) {
              const existingWidgets = mergedPages[idx].widgets || []
              const importWidgets = importPage.widgets || []
              const existingWidgetIds = new Set(existingWidgets.map((w: any) => w.id))
              const mergedWidgets = [...existingWidgets]
              for (const widget of importWidgets) {
                if (!existingWidgetIds.has(widget.id)) {
                  mergedWidgets.push(widget)
                }
              }
              mergedPages[idx] = {
                ...mergedPages[idx],
                ...importPage,
                widgets: mergedWidgets,
                updated_at: new Date().toISOString()
              }
            }
          } else {
            mergedPages.push(importPage)
          }
        }
        
        const mergedData = { ...currentData, ...importData, pages: mergedPages }
        await chrome.storage.local.clear()
        await chrome.storage.local.set(mergedData)
        console.log('[Import] Merge complete')
      }
      
      if (backupData) {
        try {
          await chrome.storage.local.remove(BACKUP_KEY)
          console.log('[Import] Backup cleared')
        } catch (e) {
          console.warn('[Import] Backup cleanup failed (non-critical):', e)
        }
      }
      
      setImportStatus({ 
        type: 'success', 
        message: `Data imported successfully! (${importMode} mode) Reloading...` 
      })
      setPendingImportData(null)
      setImportMode('replace')
      
      console.log('[Import] Success - reloading in 1.5s')
      setTimeout(() => window.location.reload(), 1500)
      
    } catch (error) {
      console.error('[Import] Error:', error)
      
      let errorMessage = 'Failed to import data'
      if (error instanceof Error) {
        if (error.message.includes('QuotaExceededError')) {
          errorMessage = 'Storage quota exceeded. The data is too large to import.'
        } else if (error.message.includes('DataCloneError')) {
          errorMessage = 'Invalid data format in import file.'
        } else {
          errorMessage = `Import failed: ${error.message}`
        }
      }
      
      if (backupData) {
        try {
          console.log('[Import] Restoring backup...')
          await chrome.storage.local.clear()
          await chrome.storage.local.set(backupData)
          await chrome.storage.local.remove(BACKUP_KEY)
          errorMessage += ' Your data has been restored.'
        } catch (e) {
          console.error('[Import] Restore failed:', e)
          errorMessage += ' Could not restore backup.'
        }
      }
      
      setImportStatus({ type: 'error', message: errorMessage })
      setPendingImportData(null)
      setImportMode('replace')
    }
  }

  const handleCancelImport = () => { setShowImportConfirm(false); setPendingImportData(null); setImportMode('replace') }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const MAX_FILE_SIZE = 10 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`)
      const text = await file.text()
      let importData
      try { 
        importData = JSON.parse(text) 
      } catch (parseError) { 
        const fileName = file.name || 'unknown'
        const fileType = file.type || 'unknown'
        throw new Error(`Invalid JSON syntax in "${fileName}" (type: ${fileType}). Please select a valid JSON file.`)
      }
      const validation = validateImportData(importData)
      if (!validation.valid) throw new Error(validation.error || 'Invalid import file format')
      setPendingImportData(importData)
      setShowImportConfirm(true)
      setImportStatus({ type: null, message: '' })
    } catch (error) {
      console.error('Failed to validate import data:', error)
      setImportStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to validate import file' })
      setTimeout(() => setImportStatus({ type: null, message: '' }), 5000)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) handleCancel() }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleBackdropClick = (e: React.MouseEvent) => { if (e.target === e.currentTarget) handleCancel() }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={handleBackdropClick}>
      <div className="glass-modal rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-in scrollbar-thin">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gradient">Settings</h2>
          <button onClick={handleCancel} className="p-2 text-text-muted hover:text-text hover:bg-surface rounded-button transition-all duration-150" aria-label="Close settings">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 p-1 bg-surface/50 rounded-lg overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-button transition-all duration-150 whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary text-[var(--color-on-primary)] shadow-sm' : 'text-text-secondary hover:text-text hover:bg-surface'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Validation Error (shown on all tabs) */}
        {validationError && (
          <div className="p-3 rounded-button text-sm mb-4 bg-red-500/10 text-red-600 border border-red-500/20">
            ⚠️ {validationError}
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Grid Layout</h3>
              <div className="mb-4">
                <label htmlFor="columns" className="block text-sm font-medium mb-2">Number of Columns: {gridColumns}</label>
                <input type="range" id="columns" min="1" max="6" value={gridColumns} onChange={(e) => handleGridColumnsChange(parseInt(e.target.value))} className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-xs text-text-secondary mt-1"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>
              </div>
              <div>
                <label htmlFor="spacing" className="block text-sm font-medium mb-2">Widget Spacing: {gridGap}px</label>
                <input type="range" id="spacing" min="0" max="64" step="4" value={gridGap} onChange={(e) => handleGridGapChange(parseInt(e.target.value))} className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-xs text-text-secondary mt-1"><span>0px</span><span>16px</span><span>32px</span><span>48px</span><span>64px</span></div>
              </div>
              <p className="text-sm text-text-secondary mt-2">Controls how many widgets appear in each row and spacing between them.</p>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Theme</h3>
              <div className="flex flex-col gap-3">
                {themeOptions.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={async () => {
                      setTheme(themeOption.id)
                      const updatedSettings = { ...settings, theme: themeOption.id, updated_at: new Date().toISOString() }
                      await settingsStorage.set(updatedSettings)
                      setSettings(updatedSettings)
                      onSettingsChange(updatedSettings)
                    }}
                    className={`p-3 sm:p-4 rounded-card border-2 transition-all duration-200 text-left ${
                      theme === themeOption.id ? 'border-primary bg-primary/5 shadow-glow-primary' : 'border-border hover:border-primary/40 hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold mb-1">{themeOption.name}</div>
                        <div className="text-sm text-text-secondary truncate">{themeOption.description}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {[themeOption.primary, themeOption.secondary, themeOption.accent, themeOption.neutral, themeOption.surface].map((color, idx) => (
                          <div
                            key={idx}
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm ring-1 ring-black/10"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">AI Providers</h3>
              <p className="text-sm text-text-secondary mb-4">
                Select the AI provider for chat widgets. Only one provider can be active at a time.
                API keys are stored locally in your browser.
              </p>

              {/* Active Provider Dropdown */}
              <div className="mb-4">
                <label htmlFor="active-provider" className="block text-sm font-medium mb-1.5">Active Provider</label>
                <select
                  id="active-provider"
                  value={aiConfig.activeProvider}
                  onChange={(e) => setAIConfig(prev => ({ ...prev, activeProvider: e.target.value as 'openai' | 'straico' }))}
                  className="input-base"
                >
                  <option value="openai">OpenAI</option>
                  <option value="straico">Straico</option>
                </select>
              </div>

              {/* OpenAI Configuration */}
              {aiConfig.activeProvider === 'openai' && (
                <div className="p-4 glass-card rounded-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600"></div>
                    <h4 className="font-semibold">OpenAI</h4>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="openai-key" className="block text-sm font-medium mb-1.5">API Key</label>
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
                        {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">
                      Get your key at{' '}
                      <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        platform.openai.com
                      </a>
                    </p>
                  </div>
                  <div>
                    <label htmlFor="openai-model" className="block text-sm font-medium mb-1.5">Model</label>
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
              )}

              {/* Straico Configuration */}
              {aiConfig.activeProvider === 'straico' && (
                <div className="p-4 glass-card rounded-card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600"></div>
                    <h4 className="font-semibold">Straico</h4>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="straico-key" className="block text-sm font-medium mb-1.5">API Key</label>
                    <div className="flex gap-2">
                      <input 
                        type={showApiKeys.straico ? 'text' : 'password'} 
                        id="straico-key" 
                        value={aiConfig.straico.apiKey} 
                        onChange={(e) => {
                          setAIConfig(prev => ({ ...prev, straico: { ...prev.straico, apiKey: e.target.value } }))
                          setModelFetchError(null)
                        }} 
                        placeholder="Enter your Straico API key" 
                        className="input-base flex-1" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowApiKeys(prev => ({ ...prev, straico: !prev.straico }))} 
                        className="btn-secondary px-3" 
                        title={showApiKeys.straico ? 'Hide API key' : 'Show API key'}
                      >
                        {showApiKeys.straico ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-text-muted mt-1.5">
                      Get your key at{' '}
                      <a href="https://straico.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        straico.com
                      </a>
                    </p>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="straico-model" className="block text-sm font-medium mb-1.5">Model</label>
                    <select 
                      id="straico-model" 
                      value={aiConfig.straico.model} 
                      onChange={(e) => setAIConfig(prev => ({ ...prev, straico: { ...prev.straico, model: e.target.value } }))} 
                      disabled={aiConfig.straico.availableModels.length === 0}
                      className="input-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a model</option>
                      {aiConfig.straico.availableModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-text-muted mt-1.5">
                      {!aiConfig.straico.apiKey
                        ? 'Enter your API key above to fetch available models'
                        : aiConfig.straico.availableModels.length === 0
                        ? 'Click "Fetch Models" to load available models'
                        : `${aiConfig.straico.availableModels.length} models available`}
                    </p>
                  </div>
                  {modelFetchError && (
                    <div className="mb-3 p-2 rounded-button text-sm bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {modelFetchError}
                    </div>
                  )}
                  {aiConfig.straico.apiKey && (
                    <button
                      type="button"
                      onClick={handleFetchStraicoModels}
                      disabled={isFetchingModels}
                      className="btn-secondary flex items-center gap-2"
                    >
                      {isFetchingModels ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Fetch Models'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Weather</h3>
              <p className="text-sm text-text-secondary mb-4">Configure your OpenWeatherMap API key for weather widgets.</p>
              <div className="p-4 glass-card rounded-card">
                <div className="flex items-center gap-2 mb-3">
                  <Cloud className="w-6 h-6 text-primary" />
                  <h4 className="font-semibold">OpenWeatherMap</h4>
                </div>
                <div className="mb-3">
                  <label htmlFor="weather-key" className="block text-sm font-medium mb-1.5">API Key</label>
                  <div className="flex gap-2">
                    <input type={showApiKeys.weather ? 'text' : 'password'} id="weather-key" value={weatherConfig.apiKey} onChange={(e) => setWeatherConfig(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="Enter your OpenWeatherMap API key" className="input-base flex-1" />
                    <button type="button" onClick={() => setShowApiKeys(prev => ({ ...prev, weather: !prev.weather }))} className="btn-secondary px-3" title={showApiKeys.weather ? 'Hide API key' : 'Show API key'}>
                      {showApiKeys.weather ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-text-muted mt-1.5">Get a free API key at <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">openweathermap.org</a></p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Google Calendar</h3>
              <p className="text-sm text-text-secondary mb-4">Configure Google Calendar integration for calendar widgets.</p>
              <div className="p-4 glass-card rounded-card">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-6 h-6 text-primary" />
                  <h4 className="font-semibold">OAuth 2.0 Client ID</h4>
                </div>
                <div className="mb-3">
                  <label htmlFor="google-client-id" className="block text-sm font-medium mb-1.5">Client ID</label>
                  <div className="flex gap-2">
                    <input
                      type={showApiKeys.googleCalendar ? 'text' : 'password'}
                      id="google-client-id"
                      value={googleCalendarConfig.clientId}
                      onChange={(e) => setGoogleCalendarConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      placeholder="your-app.apps.googleusercontent.com"
                      className="input-base flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeys(prev => ({ ...prev, googleCalendar: !prev.googleCalendar }))}
                      className="btn-secondary px-3"
                      title={showApiKeys.googleCalendar ? 'Hide Client ID' : 'Show Client ID'}
                    >
                      {showApiKeys.googleCalendar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-text-muted mt-1.5">
                    Create credentials at{' '}
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Google Cloud Console
                    </a>
                  </p>
                </div>
                <div className="p-3 bg-surface/50 rounded-lg text-xs text-text-secondary">
                  <strong className="text-text">Setup Instructions:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to Google Cloud Console</li>
                    <li>Create a new project or select existing</li>
                    <li>Enable Google Calendar API</li>
                    <li>Create OAuth 2.0 Client ID (Chrome Extension type)</li>
                    <li>Add your extension ID to authorized IDs</li>
                    <li>Paste the Client ID above</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Google Drive Sync</h3>
              <p className="text-sm text-text-secondary mb-4">
                Authenticate with Google Drive from Settings so Browser Launchpad can back up your bookmark widgets and global settings.
              </p>
              <div className="p-4 glass-card rounded-card">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary" />
                    <div>
                      <h4 className="font-semibold">Manifest OAuth Configuration</h4>
                      <p className="text-xs text-text-muted">
                        {googleDriveManifestConfig.isConfigured
                          ? 'Manifest client ID detected'
                          : 'Manifest client ID still needs to be configured'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    googleDriveManifestConfig.isConfigured
                      ? 'border-green-500/30 bg-green-500/10 text-green-600'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                  }`}>
                    {googleDriveManifestConfig.isConfigured ? 'Configured' : 'Manifest update required'}
                  </span>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1.5">Client ID from manifest</label>
                  <div className="input-base text-xs font-mono break-all">
                    {googleDriveManifestConfig.clientId || 'Not configured yet'}
                  </div>
                  <p className="text-xs text-text-muted mt-1.5">
                    Chrome&apos;s <strong className="text-text">getAuthToken</strong> flow reads the Google OAuth client ID from <strong className="text-text">manifest.json</strong>, not from a Settings field.
                  </p>
                </div>

                {!googleDriveManifestConfig.isConfigured && (
                  <div className="mb-4 p-3 rounded-button text-sm bg-amber-500/10 text-amber-700 border border-amber-500/20">
                    Google Drive sign-in is unavailable until you replace the placeholder client ID in <strong className="text-text">public/manifest.json</strong>, run <strong className="text-text">npm run build</strong>, and reload the extension in <strong className="text-text">chrome://extensions</strong>.
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1.5">Extension ID</label>
                  <div className="input-base text-xs font-mono break-all">{extensionId}</div>
                  <p className="text-xs text-text-muted mt-1.5">
                    Use this exact value as the <strong className="text-text">Item ID</strong> when you create the Chrome Extension OAuth client in Google Cloud.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={handleConnectGoogleDrive}
                    disabled={isConnectingGoogleDrive || !googleDriveManifestConfig.isConfigured}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConnectingGoogleDrive ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Google Drive'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleDrive}
                    disabled={!isGoogleDriveConnected || isConnectingGoogleDrive}
                    className="btn-secondary"
                  >
                    Disconnect
                  </button>
                </div>

                {googleDriveStatusMessage.type && (
                  <div className={`mb-4 p-3 rounded-button text-sm border ${
                    googleDriveStatusMessage.type === 'success'
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }`}>
                    {googleDriveStatusMessage.message}
                  </div>
                )}

                <div className="p-3 bg-surface/50 rounded-lg text-xs text-text-secondary">
                  <strong className="text-text">Current setup steps:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Create or choose a project in Google Cloud Console.</li>
                    <li>Enable the <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Drive API</a>.</li>
                    <li>If Google Auth Platform is not set up yet, open <a href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Auth Platform</a> and complete Branding, Audience, and Data Access first.</li>
                    <li>Open <a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Auth Platform → Clients</a>.</li>
                    <li>Create a new OAuth client with <strong className="text-text">Application type → Chrome Extension</strong>.</li>
                    <li>Paste the extension ID shown above into <strong className="text-text">Item ID</strong>.</li>
                    <li>Copy the generated Client ID into <strong className="text-text">public/manifest.json</strong> under <strong className="text-text">oauth2.client_id</strong>.</li>
                    <li>Run <strong className="text-text">npm run build</strong> so <strong className="text-text">dist/manifest.json</strong> is regenerated.</li>
                    <li>Reload the unpacked extension in <strong className="text-text">chrome://extensions</strong>.</li>
                    <li>Return here and click <strong className="text-text">Connect Google Drive</strong>.</li>
                  </ol>
                  <p className="mt-3">
                    If you are using an unpacked extension and the ID ever changes, update the same Item ID in Google Cloud before reconnecting. Chrome recommends keeping the extension ID stable when you rely on OAuth.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <>
            <div className="glass-card rounded-card p-4 mb-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Google Drive Sync</h3>
                  <p className="text-sm text-text-secondary">
                    Syncs your global settings and bookmark widgets to Google Drive&apos;s private app data folder. Other widget data stays local.
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  isGoogleDriveConnected
                    ? 'border-green-500/30 bg-green-500/10 text-green-600'
                    : 'border-border bg-surface/60 text-text-muted'
                }`}>
                  {isGoogleDriveConnected ? 'Connected' : 'Connect in Integrations'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <div className="p-3 rounded-button bg-surface/50">
                  <p className="text-xs text-text-muted mb-1">Last synced</p>
                  <p className="text-sm font-medium">{formatSyncDate(googleDriveSyncStatus.lastSyncedAt)}</p>
                </div>
                <div className="p-3 rounded-button bg-surface/50">
                  <p className="text-xs text-text-muted mb-1">Last restored</p>
                  <p className="text-sm font-medium">{formatSyncDate(googleDriveSyncStatus.lastRestoredAt)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  onClick={handleSyncGoogleDrive}
                  disabled={!isGoogleDriveConnected || isSyncingGoogleDrive || isRestoringGoogleDrive}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncingGoogleDrive ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Sync to Google Drive</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDriveRestoreConfirm(true)}
                  disabled={!isGoogleDriveConnected || isSyncingGoogleDrive || isRestoringGoogleDrive}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoringGoogleDrive ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Restore from Drive</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={googleDriveSyncConfig.autoSyncEnabled}
                    onChange={(e) =>
                      setGoogleDriveSyncConfig((prev) => ({
                        ...prev,
                        autoSyncEnabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm text-text-secondary">Auto-sync after bookmark or settings changes</span>
                </label>
                <p className="text-xs text-text-muted mt-1.5">
                  Auto-sync runs while the dashboard is open and only uploads your saved settings plus bookmark widget data.
                </p>
              </div>

              {googleDriveSyncStatus.lastError && !googleDriveStatusMessage.type && (
                <div className="mb-3 p-3 rounded-button text-sm bg-red-500/10 text-red-600 border border-red-500/20">
                  {googleDriveSyncStatus.lastError}
                </div>
              )}

              {googleDriveStatusMessage.type && (
                <div className={`p-3 rounded-button text-sm border ${
                  googleDriveStatusMessage.type === 'success'
                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
                }`}>
                  {googleDriveStatusMessage.message}
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-3">Data Management</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={handleExportData} className="btn-primary flex items-center gap-2" title="Export all data to JSON file">
                <Download className="w-4 h-4" /><span>Export Data</span>
              </button>
              <button onClick={handleImportClick} className="btn-secondary flex items-center gap-2" title="Import data from JSON file">
                <Upload className="w-4 h-4" /><span>Import Data</span>
              </button>
              <button onClick={() => setShowResetConfirm(true)} className="btn-secondary flex items-center gap-2" title="Reset all settings to defaults">
                <RefreshCw className="w-4 h-4" /><span>Reset to Defaults</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </div>
            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={includeApiKeysInExport} onChange={(e) => setIncludeApiKeysInExport(e.target.checked)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0" />
                <span className="text-sm text-text-secondary">Include API keys in export (⚠️ Security risk: uncheck to exclude API keys)</span>
              </label>
            </div>
            {importStatus.type && (
              <div className={`p-3 rounded-button text-sm mb-3 flex items-center justify-between gap-2 ${importStatus.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                <span className="flex-1">{importStatus.message}</span>
                <button onClick={() => setImportStatus({ type: null, message: '' })} className="opacity-70 hover:opacity-100 transition-opacity" title="Dismiss notification">×</button>
              </div>
            )}
            <p className="text-sm text-text-secondary">Export all your pages, widgets, and settings to a JSON file for backup. Import to restore from a backup.</p>
          </>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <>
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <div className="glass-card rounded-card p-4">
              <p className="text-text-secondary text-sm mb-3">A customizable, widget-based dashboard for your browser.</p>
              <div className="text-sm text-text-muted">
                <span>Version: <strong className="text-text-secondary">1.0.0</strong></span>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
          <button onClick={handleCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary">Save Settings</button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="glass-modal rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold">Reset to Defaults?</h3>
            </div>
            <p className="text-text-secondary mb-4">This will reset all settings to their default values:</p>
            <ul className="text-sm text-text-secondary mb-6 space-y-2">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>Theme will be set to <strong>Modern Light</strong></li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>Grid columns will be set to <strong>3</strong></li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>Grid gap will be set to <strong>24px</strong></li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>All API keys will be <strong>cleared</strong></li>
            </ul>
            <p className="text-sm text-text-muted mb-6">Your pages and widgets will not be affected.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleResetToDefaults} className="px-4 py-2 bg-red-500 text-white font-medium rounded-button hover:bg-red-600 transition-colors">Reset to Defaults</button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Restore Confirmation Modal */}
      {showDriveRestoreConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="glass-modal rounded-lg p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Restore from Google Drive?</h3>
            </div>
            <p className="text-text-secondary mb-4">
              This replaces the local bookmark widgets on your pages with the Google Drive version and reapplies the saved global settings.
            </p>
            <p className="text-sm text-text-muted mb-6">
              Other widget data such as notes, todo items, calendar tokens, and API keys will stay local.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDriveRestoreConfirm(false)}
                className="btn-secondary"
                disabled={isRestoringGoogleDrive}
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreGoogleDrive}
                className="btn-primary flex items-center gap-2"
                disabled={isRestoringGoogleDrive}
              >
                {isRestoringGoogleDrive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Restore Now'
                )}
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
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Import Data</h3>
            </div>
            <p className="text-text-secondary mb-4">Choose how you want to import the data:</p>
            <div className="space-y-3 mb-6">
              <button onClick={() => setImportMode('replace')} className={`w-full p-4 rounded-card border-2 text-left transition-all duration-200 ${importMode === 'replace' ? 'border-primary bg-primary/5 shadow-glow-primary' : 'border-border hover:border-primary/40 hover:bg-surface/50'}`}>
                <div className="font-semibold mb-1">Replace All Data</div>
                <div className="text-sm text-text-secondary">Clear all existing data and use only the imported data.</div>
              </button>
              <button onClick={() => setImportMode('merge')} className={`w-full p-4 rounded-card border-2 text-left transition-all duration-200 ${importMode === 'merge' ? 'border-primary bg-primary/5 shadow-glow-primary' : 'border-border hover:border-primary/40 hover:bg-surface/50'}`}>
                <div className="font-semibold mb-1">Merge with Existing Data</div>
                <div className="text-sm text-text-secondary">Combine imported pages with your existing pages.</div>
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancelImport} className="btn-secondary">Cancel</button>
              <button onClick={handleConfirmImport} className="btn-primary">Import ({importMode === 'replace' ? 'Replace' : 'Merge'})</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
