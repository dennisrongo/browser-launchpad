import { useState, useEffect } from 'react'
import { settingsStorage } from '../services/storage'
import type { Settings } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange: (settings: Settings) => void
}

const DEFAULT_SETTINGS: Settings = {
  id: 'global-settings',
  theme: 'modern-light',
  grid_columns: 3,
  grid_gap: 24,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function SettingsModal({ isOpen, onClose, onSettingsChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [gridColumns, setGridColumns] = useState(3)
  const [theme, setTheme] = useState<'modern-light' | 'dark-elegance'>('modern-light')

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings()
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
