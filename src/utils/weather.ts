// Weather API utility using OpenWeatherMap API

export interface WeatherData {
  temperature: number
  condition: string
  icon: string
  location: string
  humidity?: number
  windSpeed?: number
  feelsLike?: number
}

export interface WeatherApiResponse {
  main: {
    temp: number
    feels_like: number
    humidity: number
  }
  weather: Array<{
    id: number
    main: string
    description: string
    icon: string
  }>
  wind: {
    speed: number
  }
  name: string
  sys: {
    country: string
  }
}

// Default API key - users should provide their own
const DEFAULT_API_KEY = 'demo' // This will fail, prompting users to add their own key

export async function fetchWeather(
  city: string,
  apiKey: string,
  units: 'celsius' | 'fahrenheit' = 'celsius'
): Promise<WeatherData> {
  if (!apiKey || apiKey === 'demo') {
    throw new Error('Please add your OpenWeatherMap API key in widget settings')
  }

  const unitParam = units === 'celsius' ? 'metric' : 'imperial'
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${unitParam}`

  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your OpenWeatherMap API key')
    } else if (response.status === 404) {
      throw new Error(`City "${city}" not found. Please check the city name`)
    } else {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`)
    }
  }

  const data: WeatherApiResponse = await response.json()

  return {
    temperature: Math.round(data.main.temp),
    condition: data.weather[0].description,
    icon: data.weather[0].icon,
    location: `${data.name}, ${data.sys.country}`,
    humidity: data.main.humidity,
    windSpeed: data.wind.speed,
    feelsLike: Math.round(data.main.feels_like)
  }
}

export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}

// Get a local emoji fallback for common weather conditions
export function getWeatherEmoji(condition: string, iconCode?: string): string {
  const normalizedCondition = condition.toLowerCase()

  // Map OpenWeatherMap icon codes to emojis
  if (iconCode) {
    if (iconCode.startsWith('01')) return '☀️' // Clear sky
    if (iconCode.startsWith('02')) return '⛅' // Few clouds
    if (iconCode.startsWith('03')) return '☁️' // Scattered clouds
    if (iconCode.startsWith('04')) return '☁️' // Broken clouds
    if (iconCode.startsWith('09')) return '🌧️' // Shower rain
    if (iconCode.startsWith('10')) return '🌦️' // Rain
    if (iconCode.startsWith('11')) return '⛈️' // Thunderstorm
    if (iconCode.startsWith('13')) return '❄️' // Snow
    if (iconCode.startsWith('50')) return '🌫️' // Mist
  }

  // Fallback to condition text matching
  if (normalizedCondition.includes('clear') || normalizedCondition.includes('sunny')) return '☀️'
  if (normalizedCondition.includes('cloud')) return '☁️'
  if (normalizedCondition.includes('rain') || normalizedCondition.includes('drizzle')) return '🌧️'
  if (normalizedCondition.includes('thunder')) return '⛈️'
  if (normalizedCondition.includes('snow')) return '❄️'
  if (normalizedCondition.includes('mist') || normalizedCondition.includes('fog')) return '🌫️'

  return '🌤️' // Default fallback
}

// Format temperature with degree symbol
export function formatTemperature(temp: number, units: 'celsius' | 'fahrenheit'): string {
  return `${temp}°${units === 'celsius' ? 'C' : 'F'}`
}

// Capitalize first letter of weather condition
export function formatCondition(condition: string): string {
  return condition
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
