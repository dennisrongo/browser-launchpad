import { useState, useEffect } from 'react'
import { WeatherWidgetConfig } from '../types'
import { fetchWeather, getWeatherIconUrl, getWeatherEmoji, formatTemperature, formatCondition } from '../utils/weather'

interface WeatherWidgetProps {
  title: string
  config: WeatherWidgetConfig
}


export function WeatherWidget({ title, config }: WeatherWidgetProps) {
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
      const data = await fetchWeather(config.city, config.apiKey || '', config.units || 'celsius')
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

  // Fetch weather on mount and when city/units/apiKey change
  useEffect(() => {
    fetchWeatherData()
  }, [config.city, config.units, config.apiKey])

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!config.city || config.city.trim() === '') return

    const interval = setInterval(() => {
      fetchWeatherData()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [config.city, config.units, config.apiKey])

  // Show configuration prompt if no city is set
  if (!config.city || config.city.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-2">🌤️</div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-text-secondary text-sm text-center">Click ⚙️ to configure city</p>
      </div>
    )
  }

  // Show loading state
  if (weather.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-2 animate-pulse">🌤️</div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-text-secondary text-sm">Loading weather data...</p>
      </div>
    )
  }

  // Show error state
  if (weather.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-2">
        <div className="text-4xl mb-2">⚠️</div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-text-secondary text-xs text-center text-red-500">{weather.error}</p>
      </div>
    )
  }

  // Show weather data
  const emoji = weather.icon ? getWeatherEmoji(weather.condition, weather.icon) : '🌤️'

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl mb-2">{emoji}</div>
      <div className="text-3xl font-bold text-primary mb-1">
        {formatTemperature(weather.temp, config.units || 'celsius')}
      </div>
      <h3 className="text-sm font-semibold text-text capitalize mb-1">
        {formatCondition(weather.condition)}
      </h3>
      <p className="text-text-secondary text-xs mb-2">{weather.location}</p>

      {/* Refresh Button */}
      <button
        onClick={() => fetchWeatherData(true)}
        disabled={refreshing}
        className="text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
        title="Refresh weather data"
      >
        <svg
          className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  )
}
