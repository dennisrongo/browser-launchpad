import { useState, useEffect } from 'react'
import { CloudSun, AlertTriangle, RefreshCw, Settings } from 'lucide-react'
import { WeatherWidgetConfig } from '../types'
import { fetchWeather, getWeatherIconUrl, getWeatherEmoji, formatTemperature, formatCondition } from '../utils/weather'
import { decodeApiKey } from '../utils/security'

interface WeatherWidgetProps {
  title: string
  config: WeatherWidgetConfig
}

export function WeatherWidget({ title, config }: WeatherWidgetProps) {
  const [globalApiKey, setGlobalApiKey] = useState<string>('')
  const [weather, setWeather] = useState<{
    temp: number
    condition: string
    icon: string
    location: string
    loading: boolean
    error: string | null
  }>({
    temp: 0,
    condition: '',
    icon: '',
    location: '',
    loading: false,
    error: null,
  })
  const [refreshing, setRefreshing] = useState(false)

  interface WeatherStorageConfig {
    apiKey?: string
  }

  useEffect(() => {
    const loadGlobalApiKey = async () => {
      try {
        const result = await chrome.storage.local.get(['weather_config'])
        const weatherConfig = result.weather_config as WeatherStorageConfig | undefined
        if (weatherConfig?.apiKey) {
          const decodedKey = decodeApiKey(weatherConfig.apiKey)
          setGlobalApiKey(decodedKey)
        }
      } catch (error) {
        console.error('Failed to load global weather API key:', error)
      }
    }
    loadGlobalApiKey()

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.weather_config) {
        const newConfig = changes.weather_config.newValue as WeatherStorageConfig | undefined
        if (newConfig?.apiKey) {
          setGlobalApiKey(decodeApiKey(newConfig.apiKey))
        } else {
          setGlobalApiKey('')
        }
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const getEffectiveApiKey = () => {
    return globalApiKey || ''
  }

  const fetchWeatherData = async (showRefreshSpinner = false) => {
    if (!config.city || config.city.trim() === '') {
      setWeather((prev) => ({
        ...prev,
        error: null,
        loading: false,
      }))
      return
    }

    if (showRefreshSpinner) {
      setRefreshing(true)
    } else {
      setWeather((prev) => ({ ...prev, loading: true, error: null }))
    }

    try {
      const effectiveApiKey = getEffectiveApiKey()
      const data = await fetchWeather(config.city, effectiveApiKey, config.units || 'celsius')
      setWeather({
        temp: data.temperature,
        condition: data.condition,
        icon: data.icon,
        location: data.location,
        loading: false,
        error: null,
      })
    } catch (error) {
      setWeather((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather data',
      }))
    } finally {
      if (showRefreshSpinner) {
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    fetchWeatherData()
  }, [config.city, config.units, globalApiKey])

  useEffect(() => {
    if (!config.city || config.city.trim() === '') return

    const interval = setInterval(() => {
      fetchWeatherData()
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [config.city, config.units, globalApiKey])

  if (!config.city || config.city.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
           <CloudSun className="w-6 h-6 text-secondary" />
         </div>
         <h3 className="text-sm font-semibold mb-1">{title}</h3>
         <p className="text-neutral text-xs flex items-center gap-1">
           <Settings className="w-3 h-3" />
           Configure city
         </p>
      </div>
    )
  }

  if (weather.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
           <CloudSun className="w-6 h-6 text-secondary animate-pulse" />
         </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-neutral text-xs">Loading...</p>
      </div>
    )
  }

  if (weather.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-2">
         <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
           <AlertTriangle className="w-6 h-6 text-red-500" />
         </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-text-muted text-xs text-center text-red-500">{weather.error}</p>
      </div>
    )
  }

  const emoji = weather.icon ? getWeatherEmoji(weather.condition, weather.icon) : '🌤️'

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-3xl font-bold text-gradient-accent mb-1">
        {formatTemperature(weather.temp, config.units || 'celsius')}
      </div>
      <h3 className="text-sm font-semibold text-text capitalize mb-1">
        {formatCondition(weather.condition)}
      </h3>
      <p className="text-neutral text-xs mb-3">{weather.location}</p>

      <button
        onClick={() => fetchWeatherData(true)}
        disabled={refreshing}
        className="p-2 text-neutral hover:text-secondary hover:bg-surface rounded-button transition-all duration-200 disabled:opacity-50"
        title="Refresh weather data"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
