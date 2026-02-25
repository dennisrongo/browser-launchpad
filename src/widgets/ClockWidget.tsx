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

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-5xl font-bold text-primary mb-2 tabular-nums">
        {formatTime(time)}
      </div>
      <div className="text-text-secondary text-sm">
        {formatCityName()}
      </div>
    </div>
  )
}
