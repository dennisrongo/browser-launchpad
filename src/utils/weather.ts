import { logger } from './logger'
import type { WeatherDetailKey, WeatherWidgetConfig } from '../types'

export interface WeatherForecastDay {
  date: string
  icon: string
  condition: string
  high: number
  low: number
  precipitationChance?: number
}

export interface WeatherData {
  temperature: number
  condition: string
  icon: string
  location: string
  humidity?: number
  windSpeed?: number
  windUnit: string
  feelsLike?: number
  high?: number
  low?: number
  precipitationChance?: number
  uvIndex?: number
  sunrise?: string
  sunset?: string
  forecast: WeatherForecastDay[]
}

export const WEATHER_DETAIL_OPTIONS: Array<{ key: WeatherDetailKey; label: string }> = [
  { key: 'feelsLike', label: 'Feels like' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'wind', label: 'Wind' },
  { key: 'highLow', label: 'High / low' },
  { key: 'precipitation', label: 'Chance of rain' },
  { key: 'uvIndex', label: 'UV index' },
  { key: 'sunrise', label: 'Sunrise' },
  { key: 'sunset', label: 'Sunset' },
]

const DEFAULT_WEATHER_DETAILS: Record<WeatherDetailKey, boolean> = {
  feelsLike: true,
  humidity: true,
  wind: true,
  highLow: true,
  precipitation: false,
  uvIndex: false,
  sunrise: false,
  sunset: false,
}

export function resolveWeatherDetails(config: Pick<WeatherWidgetConfig, 'show'>): Record<WeatherDetailKey, boolean> {
  return { ...DEFAULT_WEATHER_DETAILS, ...config.show }
}

interface GeocodingResult {
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
}

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
}

const WMO_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'clear sky', icon: '01' },
  1: { condition: 'mainly clear', icon: '01' },
  2: { condition: 'partly cloudy', icon: '02' },
  3: { condition: 'overcast', icon: '04' },
  45: { condition: 'fog', icon: '50' },
  48: { condition: 'freezing fog', icon: '50' },
  51: { condition: 'light drizzle', icon: '09' },
  53: { condition: 'drizzle', icon: '09' },
  55: { condition: 'heavy drizzle', icon: '09' },
  56: { condition: 'freezing drizzle', icon: '09' },
  57: { condition: 'heavy freezing drizzle', icon: '09' },
  61: { condition: 'light rain', icon: '10' },
  63: { condition: 'rain', icon: '10' },
  65: { condition: 'heavy rain', icon: '10' },
  66: { condition: 'freezing rain', icon: '10' },
  67: { condition: 'heavy freezing rain', icon: '10' },
  71: { condition: 'light snow', icon: '13' },
  73: { condition: 'snow', icon: '13' },
  75: { condition: 'heavy snow', icon: '13' },
  77: { condition: 'snow grains', icon: '13' },
  80: { condition: 'light rain showers', icon: '09' },
  81: { condition: 'rain showers', icon: '09' },
  82: { condition: 'violent rain showers', icon: '09' },
  85: { condition: 'light snow showers', icon: '13' },
  86: { condition: 'heavy snow showers', icon: '13' },
  95: { condition: 'thunderstorm', icon: '11' },
  96: { condition: 'thunderstorm with hail', icon: '11' },
  99: { condition: 'thunderstorm with heavy hail', icon: '11' },
}

const geocodeCache = new Map<string, GeocodingResult>()

function matchesQualifier(result: GeocodingResult, qualifier: string): boolean {
  const wanted = qualifier.toLowerCase()
  const stateName = US_STATES[qualifier.toUpperCase()]?.toLowerCase()
  return (
    result.admin1?.toLowerCase() === wanted ||
    result.country?.toLowerCase() === wanted ||
    result.country_code?.toLowerCase() === wanted ||
    (!!stateName && result.admin1?.toLowerCase() === stateName)
  )
}

async function getJson(url: string): Promise<any> {
  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    logger.error('Weather request failed:', error)
    throw new Error("Couldn't reach the weather service. Check your connection.")
  }

  if (!response.ok) {
    throw new Error(`Weather service error (${response.status})`)
  }

  return response.json()
}

async function geocodeCity(city: string): Promise<GeocodingResult> {
  const cacheKey = city.trim().toLowerCase()
  const cached = geocodeCache.get(cacheKey)
  if (cached) return cached

  const [cityName, ...qualifierParts] = city.split(',').map((part) => part.trim())
  const qualifier = qualifierParts.join(' ').trim()

  const params = new URLSearchParams({
    name: cityName,
    count: qualifier ? '20' : '1',
    language: 'en',
    format: 'json',
  })
  const data = await getJson(`${GEOCODING_URL}?${params}`)
  const results: GeocodingResult[] = data.results ?? []

  const match = (qualifier && results.find((result) => matchesQualifier(result, qualifier))) || results[0]
  if (!match) {
    throw new Error(`City "${city}" not found. Please check the city name`)
  }

  geocodeCache.set(cacheKey, match)
  return match
}

const roundOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' ? Math.round(value) : undefined

export async function fetchWeather(
  city: string,
  units: 'celsius' | 'fahrenheit' = 'celsius',
  forecastDays = 0
): Promise<WeatherData> {
  const place = await geocodeCity(city)
  const imperial = units === 'fahrenheit'

  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    forecast_days: String(forecastDays + 1),
    temperature_unit: units,
    wind_speed_unit: imperial ? 'mph' : 'kmh',
    timezone: 'auto',
  })
  const data = await getJson(`${FORECAST_URL}?${params}`)
  const current = data.current
  const daily = data.daily
  if (!current) {
    throw new Error('Weather data is unavailable right now')
  }

  const mapped = WMO_CODES[current.weather_code] ?? { condition: 'unknown', icon: '02' }
  const suffix = current.is_day === 0 ? 'n' : 'd'

  const forecast: WeatherForecastDay[] = []
  for (let i = 1; i <= forecastDays && daily?.time?.[i]; i++) {
    const day = WMO_CODES[daily.weather_code[i]] ?? { condition: 'unknown', icon: '02' }
    forecast.push({
      date: daily.time[i],
      icon: `${day.icon}d`,
      condition: day.condition,
      high: Math.round(daily.temperature_2m_max[i]),
      low: Math.round(daily.temperature_2m_min[i]),
      precipitationChance: roundOrUndefined(daily.precipitation_probability_max?.[i]),
    })
  }

  return {
    temperature: Math.round(current.temperature_2m),
    condition: mapped.condition,
    icon: `${mapped.icon}${suffix}`,
    location: `${place.name}, ${place.country_code ?? place.country ?? ''}`.replace(/, $/, ''),
    humidity: current.relative_humidity_2m,
    windSpeed: roundOrUndefined(current.wind_speed_10m),
    windUnit: imperial ? 'mph' : 'km/h',
    feelsLike: roundOrUndefined(current.apparent_temperature),
    high: roundOrUndefined(daily?.temperature_2m_max?.[0]),
    low: roundOrUndefined(daily?.temperature_2m_min?.[0]),
    precipitationChance: roundOrUndefined(daily?.precipitation_probability_max?.[0]),
    uvIndex: roundOrUndefined(daily?.uv_index_max?.[0]),
    sunrise: daily?.sunrise?.[0],
    sunset: daily?.sunset?.[0],
    forecast,
  }
}

export function formatClockTime(isoLocal: string | undefined): string {
  const match = isoLocal?.match(/T(\d{2}):(\d{2})/)
  if (!match) return '--'
  const hours = Number(match[1])
  const period = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${match[2]} ${period}`
}

export function formatForecastDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short' })
}

export function getWeatherEmoji(condition: string, iconCode?: string): string {
  const normalizedCondition = condition.toLowerCase()

  if (iconCode) {
    const isNight = iconCode.endsWith('n')
    if (iconCode.startsWith('01')) return isNight ? '🌙' : '☀️'
    if (iconCode.startsWith('02')) return isNight ? '☁️' : '⛅'
    if (iconCode.startsWith('03')) return '☁️'
    if (iconCode.startsWith('04')) return '☁️'
    if (iconCode.startsWith('09')) return '🌧️'
    if (iconCode.startsWith('10')) return '🌦️'
    if (iconCode.startsWith('11')) return '⛈️'
    if (iconCode.startsWith('13')) return '❄️'
    if (iconCode.startsWith('50')) return '🌫️'
  }

  if (normalizedCondition.includes('clear') || normalizedCondition.includes('sunny')) return '☀️'
  if (normalizedCondition.includes('cloud')) return '☁️'
  if (normalizedCondition.includes('rain') || normalizedCondition.includes('drizzle')) return '🌧️'
  if (normalizedCondition.includes('thunder')) return '⛈️'
  if (normalizedCondition.includes('snow')) return '❄️'
  if (normalizedCondition.includes('mist') || normalizedCondition.includes('fog')) return '🌫️'

  return '🌤️'
}

export function formatTemperature(temp: number, units: 'celsius' | 'fahrenheit'): string {
  return `${temp}°${units === 'celsius' ? 'C' : 'F'}`
}

export function formatCondition(condition: string): string {
  return condition
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
