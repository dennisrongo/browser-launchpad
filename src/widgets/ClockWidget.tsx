import { logger } from '../utils/logger'
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
        timeZone: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        hour12: config.format12Hour !== false, // Default to true
        hour: '2-digit',
        minute: '2-digit',
        second: config.showSeconds ? '2-digit' : undefined,
      }
      return date.toLocaleTimeString('en-US', options)
    } catch (error) {
      logger.error('Error formatting time:', error)
      return date.toLocaleTimeString()
    }
  }

  // Format the time string + AM/PM badge for the modern variant
  const formatModernTime = (date: Date): { time: string; ampm: string | null } => {
    try {
      const tz = config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      const hour12 = config.format12Hour !== false
      const showSeconds = config.showSeconds === true
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: hour12 ? 'numeric' : '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        hour12,
      }).formatToParts(date)

      const keepTypes = showSeconds
        ? ['hour', 'minute', 'second']
        : ['hour', 'minute']
      const time = parts
        .filter((p) => keepTypes.includes(p.type))
        .map((p) => p.value)
        .join(':')
      const dayPeriod = parts.find((p) => p.type === 'dayPeriod')
      return { time, ampm: hour12 && dayPeriod ? dayPeriod.value : null }
    } catch (error) {
      logger.error('Error formatting time:', error)
      return { time: date.toLocaleTimeString(), ampm: null }
    }
  }

  const formatDate = (date: Date): string => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(date)
    } catch (error) {
      logger.error('Error formatting date:', error)
      return date.toDateString()
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

  // Render the original text-based digital clock
  const renderTextClock = () => (
    <>
      <div className={`${getFontSizeClasses()} ${getFontStyleClasses()} ${getFontWeight()} text-gradient mb-2 tabular-nums`}>
        {formatTime(time)}
      </div>
      <div className="text-neutral text-sm">
        {formatCityName()}
      </div>
    </>
  )

  // Render the modern hero clock with AM/PM badge and date line
  const renderModernClock = () => {
    const { time: timeStr, ampm } = formatModernTime(time)
    return (
      <>
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <div className="text-5xl font-light text-gradient tabular-nums tracking-tight sm:text-6xl">
            {timeStr}
          </div>
          {ampm && (
            <span className="text-base font-medium text-neutral">{ampm}</span>
          )}
        </div>
        <div className="text-sm text-text-secondary mb-1">
          {formatDate(time)}
        </div>
        <div className="text-neutral text-sm">
          {formatCityName()}
        </div>
      </>
    )
  }

  // Get hours/minutes/seconds in the configured timezone
  const getTimeParts = (date: Date) => {
    try {
      const tz = config.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(date)
      const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
      return {
        hours: get('hour'),
        minutes: get('minute'),
        seconds: get('second'),
      }
    } catch (error) {
      logger.error('Error formatting time parts:', error)
      return {
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
      }
    }
  }

  // Render an analog clock face
  const renderAnalogFace = () => {
    const parts = getTimeParts(time)
    const showSeconds = config.showSeconds === true

    // Angles: 360deg per revolution. Each hand rotates clockwise from 12 o'clock (top).
    const secondAngle = parts.seconds * 6 // 360 / 60
    const minuteAngle = parts.minutes * 6 + parts.seconds * 0.1
    const hourAngle = (parts.hours % 12) * 30 + parts.minutes * 0.5 // 360 / 12

    // Hour markers (12 ticks), with every 3rd emphasized
    const markers = Array.from({ length: 12 }, (_, i) => {
      const angle = (i + 1) * 30 // position of hour i+1
      const isCardinal = (i + 1) % 3 === 0
      return { angle, isCardinal }
    })

    return (
      <div className="flex flex-col items-center justify-center w-full">
        <svg viewBox="0 0 200 200" className="w-32 h-32 sm:w-40 sm:h-40">
          {/* Face */}
          <circle cx="100" cy="100" r="92" className="fill-surface stroke-border" strokeWidth="2" />
          {/* Hour markers */}
          {markers.map(({ angle, isCardinal }) => {
            const rad = ((angle - 90) * Math.PI) / 180
            const outer = 92
            const inner = isCardinal ? 80 : 84
            const x1 = 100 + outer * Math.cos(rad)
            const y1 = 100 + outer * Math.sin(rad)
            const x2 = 100 + inner * Math.cos(rad)
            const y2 = 100 + inner * Math.sin(rad)
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={isCardinal ? 'stroke-text' : 'stroke-text-muted'}
                strokeWidth={isCardinal ? 3 : 1.5}
                strokeLinecap="round"
              />
            )
          })}
          {/* Hour hand */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="58"
            className="stroke-text"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${hourAngle} 100 100)`}
          />
          {/* Minute hand */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="34"
            className="stroke-text"
            strokeWidth="3"
            strokeLinecap="round"
            transform={`rotate(${minuteAngle} 100 100)`}
          />
          {/* Second hand */}
          {showSeconds && (
            <line
              x1="100"
              y1="110"
              x2="100"
              y2="26"
              className="stroke-accent"
              strokeWidth="1.5"
              strokeLinecap="round"
              transform={`rotate(${secondAngle} 100 100)`}
            />
          )}
          {/* Center cap */}
          <circle cx="100" cy="100" r="4" className="fill-text" />
          {showSeconds && <circle cx="100" cy="100" r="2" className="fill-accent" />}
        </svg>
        <div className="text-neutral text-sm mt-2">
          {formatCityName()}
        </div>
      </div>
    )
  }

  const variant = config.variant || 'text'

  return (
    <div className="flex flex-col items-center justify-center h-full">
      {variant === 'modern' && renderModernClock()}
      {variant === 'face' && renderAnalogFace()}
      {variant === 'text' && renderTextClock()}
    </div>
  )
}