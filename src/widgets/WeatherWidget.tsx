import { logger } from '../utils/logger'
import { useState, useEffect, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Settings,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react'
import { WeatherDetailKey, WeatherWidgetConfig } from '../types'
import {
  fetchWeather,
  formatClockTime,
  formatCondition,
  formatForecastDay,
  getWeatherEmoji,
  resolveWeatherDetails,
  WEATHER_DETAIL_OPTIONS,
  type WeatherData,
} from '../utils/weather'

interface WeatherWidgetProps {
  title: string
  config: WeatherWidgetConfig
  onConfigure?: () => void
}

const DETAIL_ICONS: Record<WeatherDetailKey, ReactNode> = {
  feelsLike: <Thermometer className="w-3 h-3" />,
  humidity: <Droplets className="w-3 h-3" />,
  wind: <Wind className="w-3 h-3" />,
  highLow: <ArrowUpDown className="w-3 h-3" />,
  precipitation: <CloudRain className="w-3 h-3" />,
  uvIndex: <Sun className="w-3 h-3" />,
  sunrise: <Sunrise className="w-3 h-3" />,
  sunset: <Sunset className="w-3 h-3" />,
}

function getDetailValue(key: WeatherDetailKey, data: WeatherData, unitSymbol: string): string | null {
  const degrees = (value: number | undefined) => (value === undefined ? null : `${value}°${unitSymbol}`)

  switch (key) {
    case 'feelsLike':
      return degrees(data.feelsLike)
    case 'humidity':
      return data.humidity === undefined ? null : `${data.humidity}%`
    case 'wind':
      return data.windSpeed === undefined ? null : `${data.windSpeed} ${data.windUnit}`
    case 'highLow':
      return data.high === undefined || data.low === undefined ? null : `${data.high}° / ${data.low}°`
    case 'precipitation':
      return data.precipitationChance === undefined ? null : `${data.precipitationChance}%`
    case 'uvIndex':
      return data.uvIndex === undefined ? null : String(data.uvIndex)
    case 'sunrise':
      return data.sunrise ? formatClockTime(data.sunrise) : null
    case 'sunset':
      return data.sunset ? formatClockTime(data.sunset) : null
  }
}

export function WeatherWidget({ title, config, onConfigure }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const units = config.units || 'celsius'
  const forecastDays = config.forecastDays ?? 0

  const fetchWeatherData = async (showRefreshSpinner = false) => {
    if (!config.city || config.city.trim() === '') {
      setError(null)
      setLoading(false)
      return
    }

    if (showRefreshSpinner) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const result = await fetchWeather(config.city, units, forecastDays)
      setData(result)
      setUpdatedAt(new Date())
      setError(null)
    } catch (err) {
      logger.error('Failed to fetch weather:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWeatherData()
  }, [config.city, units, forecastDays])

  useEffect(() => {
    if (!config.city || config.city.trim() === '') return

    const interval = setInterval(() => {
      fetchWeatherData(true)
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [config.city, units, forecastDays])

  if (!config.city || config.city.trim() === '') {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onConfigure}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onConfigure?.()
          }
        }}
        aria-label="Configure city"
        className="flex flex-col items-center justify-center h-full rounded-lg cursor-pointer hover-row focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="status-badge status-badge-muted mb-3">
          <CloudSun className="w-5 h-5 text-secondary" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-text-secondary text-xs mb-3">Pick a city to see its weather</p>
        <span className="btn-primary text-xs !px-3.5 !py-1.5 flex items-center gap-1.5">
          <Settings className="w-3 h-3" />
          Configure city
        </span>
      </div>
    )
  }

  if (loading || (!data && !error)) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="status-badge status-badge-muted mb-3">
          <CloudSun className="w-5 h-5 text-secondary animate-pulse" strokeWidth={1.75} />
        </div>
        <p className="text-text-secondary text-xs">Loading weather...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-2">
        <div className="status-badge status-badge-danger mb-3">
          <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-xs text-center text-text-secondary mb-3 max-w-[240px]">{error}</p>
        <button
          type="button"
          onClick={() => fetchWeatherData()}
          className="btn-secondary text-xs flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const unitSymbol = units === 'celsius' ? 'C' : 'F'
  const details = resolveWeatherDetails(config)
  const visibleDetails = WEATHER_DETAIL_OPTIONS
    .filter(({ key }) => details[key])
    .map(({ key, label }) => ({ key, label, value: getDetailValue(key, data, unitSymbol) }))
    .filter((item): item is { key: WeatherDetailKey; label: string; value: string } => item.value !== null)

  return (
    <div className="flex flex-col items-center h-full">
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-5xl leading-none">{getWeatherEmoji(data.condition, data.icon)}</span>
        <div className="flex items-start leading-none">
          <span className="text-5xl font-light tracking-tight text-text">{data.temperature}</span>
          <span className="text-lg font-medium text-text-secondary mt-1.5 ml-0.5">°{unitSymbol}</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-text capitalize">{formatCondition(data.condition)}</h3>
      <p className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
        <MapPin className="w-3 h-3" />
        {data.location}
      </p>

      {visibleDetails.length > 0 && (
        <div className="weather-panel weather-stat-grid mt-4 w-full">
          {visibleDetails.map(({ key, label, value }) => (
            <div key={key} className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
                {DETAIL_ICONS[key]}
                <span className="truncate">{label}</span>
              </div>
              <div className="mt-0.5 text-sm font-semibold text-text truncate">{value}</div>
            </div>
          ))}
        </div>
      )}

      {data.forecast.length > 0 && (
        <div className="weather-panel flex w-full mt-3">
          {data.forecast.map((day) => (
            <div
              key={day.date}
              className="weather-forecast-day flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5"
              title={`${formatForecastDay(day.date)}: ${formatCondition(day.condition)}`}
            >
              <div className="text-[10px] uppercase tracking-wider text-text-muted">{formatForecastDay(day.date)}</div>
              <div className="flex items-center justify-center h-6 text-xl leading-none">
                {getWeatherEmoji(day.condition, day.icon)}
              </div>
              <div className="text-sm font-semibold text-text leading-none">{day.high}°</div>
              <div className="text-xs text-text-muted leading-none">{day.low}°</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 flex items-center gap-1 text-[10px] text-text-muted">
        {error ? (
          <span className="text-red-500" title={error}>Update failed</span>
        ) : updatedAt ? (
          <span>Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
        ) : null}
        <button
          onClick={() => fetchWeatherData(true)}
          disabled={refreshing}
          className="p-1 hover:text-secondary hover:bg-surface rounded-button transition-all duration-150 disabled:opacity-50 active:scale-95"
          title="Refresh weather data"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
