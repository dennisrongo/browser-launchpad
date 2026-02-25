import { useState, useEffect } from 'react'
import { ClockWidgetConfig } from '../types'

interface ClockWidgetProps {
  title: string
  config: ClockWidgetConfig
  onTitleChange?: (newTitle: string) => void
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (date: Date): string => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: config.timezone || 'UTC',
        hour12: config.format12Hour !== false, // Default to true
        hour: '2-digit',
        minute: '2-digit',
        second: config.showSeconds ? '2-digit' : undefined,
      }
      return date.toLocaleTimeString('en-US', options)
    } catch (error) {
      console.error('Error formatting time:', error)
      return date.toLocaleTimeString()
    }
  }

  const formatCityName = (): string => {
    if (!config.timezone) return 'Local Time'
    // Extract city name from timezone (e.g., "America/New_York" -> "New York")
    const parts = config.timezone.split('/')
    return parts[parts.length - 1].replace(/_/g, ' ')
  }

  // Get font style classes
  const getFontStyleClasses = (): string => {
    const style = config.fontStyle || 'modern'
    switch (style) {
      case 'classic':
        return 'font-serif'
      case 'digital':
        return "font-mono tracking-wider"
      case 'elegant':
        return 'font-light'
      case 'modern':
      default:
        return 'font-sans'
    }
  }

  // Get font size classes
  const getFontSizeClasses = (): string => {
    const size = config.fontSize || 'large'
    switch (size) {
      case 'small':
        return 'text-3xl'
      case 'medium':
        return 'text-4xl'
      case 'xlarge':
        return 'text-6xl'
      case 'large':
      default:
        return 'text-5xl'
    }
  }

  const getFontWeight = (): string => {
    const style = config.fontStyle || 'modern'
    switch (style) {
      case 'elegant':
        return 'font-light'
      case 'digital':
        return 'font-medium'
      case 'modern':
      default:
        return 'font-bold'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className={`${getFontSizeClasses()} ${getFontStyleClasses()} ${getFontWeight()} text-primary mb-2 tabular-nums`}>
        {formatTime(time)}
      </div>
      <div className="text-text-secondary text-sm">
        {formatCityName()}
      </div>
    </div>
  )
}
