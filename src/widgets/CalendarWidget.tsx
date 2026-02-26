import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, RefreshCw, Link2, Settings } from 'lucide-react'
import { format } from 'date-fns'
import type { CalendarWidgetConfig, CalendarEvent, GoogleCalendar } from '../types'
import {
  getMonthGrid,
  getWeekGrid,
  formatMonthYear,
  formatWeekRange,
  navigateMonth,
  navigateWeek,
  goToToday,
  getDayAbbreviations,
  getWeekNumber,
  getEventColor,
  formatEventTime,
} from '../utils/calendar'
import {
  initiateGoogleAuth,
  getStoredGoogleTokens,
  getStoredGoogleCalendars,
  storeGoogleTokens,
  storeGoogleCalendars,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  disconnectGoogleCalendar,
  getValidAccessToken,
  isGoogleCalendarConfigured,
} from '../services/googleCalendar'

interface CalendarWidgetProps {
  title: string
  config: CalendarWidgetConfig
  onConfigChange?: (newConfig: CalendarWidgetConfig) => void
}

export function CalendarWidget({ title, config, onConfigChange }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [isConfigured, setIsConfigured] = useState<boolean>(false)

  const firstDayOfWeek = config.firstDayOfWeek ?? 0
  const showWeekNumbers = config.showWeekNumbers ?? false
  const viewMode = config.viewMode ?? 'month'

  useEffect(() => {
    isGoogleCalendarConfigured().then(setIsConfigured)
  }, [])

  const loadGoogleData = useCallback(async () => {
    if (!config.googleConnected) {
      setEvents([])
      setCalendars([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const tokens = await getStoredGoogleTokens()
      if (!tokens) {
        setError('Not connected to Google Calendar')
        setLoading(false)
        return
      }

      const accessToken = await getValidAccessToken(tokens)
      
      const storedCalendars = await getStoredGoogleCalendars()
      if (storedCalendars && storedCalendars.length > 0) {
        setCalendars(storedCalendars)
      } else {
        const fetchedCalendars = await fetchGoogleCalendars(accessToken)
        setCalendars(fetchedCalendars)
        await storeGoogleCalendars(fetchedCalendars)
      }

      const calendarIds = config.selectedCalendars?.length
        ? config.selectedCalendars
        : storedCalendars?.filter(c => c.primary).map(c => c.id) || []

      if (calendarIds.length > 0) {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
        
        const fetchedEvents = await fetchGoogleEvents(accessToken, calendarIds, startDate, endDate)
        setEvents(fetchedEvents)
      }
    } catch (err) {
      console.error('Error loading Google Calendar data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [config.googleConnected, config.selectedCalendars, currentDate])

  useEffect(() => {
    loadGoogleData()
  }, [loadGoogleData])

  const handleConnectGoogle = async () => {
    setConnecting(true)
    setError(null)

    try {
      const tokens = await initiateGoogleAuth()
      await storeGoogleTokens(tokens)

      const accessToken = await getValidAccessToken(tokens)
      const fetchedCalendars = await fetchGoogleCalendars(accessToken)
      await storeGoogleCalendars(fetchedCalendars)

      onConfigChange?.({
        ...config,
        googleConnected: true,
        googleTokens: tokens,
        selectedCalendars: fetchedCalendars.filter(c => c.primary).map(c => c.id),
      })

      setCalendars(fetchedCalendars)
    } catch (err) {
      console.error('Error connecting to Google:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to Google Calendar')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectGoogleCalendar()
      onConfigChange?.({
        ...config,
        googleConnected: false,
        googleTokens: undefined,
        selectedCalendars: [],
      })
      setEvents([])
      setCalendars([])
      setError(null)
    } catch (err) {
      console.error('Error disconnecting:', err)
      setError('Failed to disconnect')
    }
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(navigateMonth(currentDate, direction))
    } else {
      setCurrentDate(navigateWeek(currentDate, direction))
    }
  }

  const handleToday = () => {
    setCurrentDate(goToToday())
  }

  const handleRefresh = () => {
    loadGoogleData()
  }

  const monthGrid = viewMode === 'month' ? getMonthGrid(currentDate, firstDayOfWeek, events) : null
  const weekGrid = viewMode === 'week' ? getWeekGrid(currentDate, firstDayOfWeek, events) : null
  const dayAbbreviations = getDayAbbreviations(firstDayOfWeek)

  const formatDateDisplay = () => {
    if (viewMode === 'month') {
      return formatMonthYear(currentDate)
    }
    return formatWeekRange(currentDate, firstDayOfWeek)
  }

  if (!config.googleConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <CalendarIcon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        {!isConfigured ? (
          <>
            <p className="text-text-muted text-xs mb-3 text-center px-4">
              Configure Google Calendar in Settings first
            </p>
            <button
              disabled
              className="btn-secondary text-xs flex items-center gap-1.5 opacity-50 cursor-not-allowed"
            >
              <Settings className="w-3 h-3" />
              Go to Settings → Integrations
            </button>
          </>
        ) : (
          <>
            <p className="text-text-muted text-xs mb-3 text-center px-4">
              Connect to Google Calendar to view your events
            </p>
            <button
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-3 h-3" />
                  Connect Google Calendar
                </>
              )}
            </button>
          </>
        )}
        {error && (
          <p className="text-red-500 text-xs mt-2 text-center px-4">{error}</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <CalendarIcon className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <p className="text-text-muted text-xs">Loading calendar...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-2">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-red-500 text-xs text-center mb-3">{error}</p>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="btn-secondary text-xs flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
          <button
            onClick={handleDisconnect}
            className="text-xs text-text-muted hover:text-red-500"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleNavigate('prev')}
            className="p-1 text-text-muted hover:text-text hover:bg-surface rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNavigate('next')}
            className="p-1 text-text-muted hover:text-text hover:bg-surface rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="text-xs text-primary hover:underline ml-1"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{formatDateDisplay()}</span>
          <button
            onClick={handleRefresh}
            className="p-1 text-text-muted hover:text-text rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {viewMode === 'month' && monthGrid && (
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {showWeekNumbers && (
              <div className="text-[10px] text-text-muted text-center py-0.5">W</div>
            )}
            {dayAbbreviations.map((day) => (
              <div
                key={day}
                className="text-[10px] text-text-muted text-center py-0.5 font-medium"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-rows-6 gap-0.5">
            {monthGrid.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-0.5">
                {showWeekNumbers && (
                  <div className="text-[9px] text-text-muted flex items-center justify-center">
                    {getWeekNumber(week[0].date)}
                  </div>
                )}
                {week.map((day, dayIndex) => {
                  const dayEvents = day.events
                  const maxVisibleEvents = 2

                  return (
                    <div
                      key={dayIndex}
                      className={`
                        relative flex flex-col items-center justify-start p-0.5 rounded text-[11px]
                        ${day.isToday ? 'bg-primary/20 ring-1 ring-primary' : ''}
                        ${!day.isCurrentMonth ? 'text-text-muted opacity-50' : 'text-text'}
                        hover:bg-surface transition-colors cursor-pointer min-h-[28px]
                      `}
                      title={dayEvents.length > 0 ? `${dayEvents.length} event(s)` : ''}
                    >
                      <span className={`font-medium ${day.isToday ? 'text-primary' : ''}`}>
                        {format(day.date, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                          {dayEvents.slice(0, maxVisibleEvents).map((event, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: getEventColor(event.colorId) }}
                            />
                          ))}
                          {dayEvents.length > maxVisibleEvents && (
                            <span className="text-[8px] text-text-muted">
                              +{dayEvents.length - maxVisibleEvents}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'week' && weekGrid && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekGrid.map((day) => (
              <div
                key={day.date.toISOString()}
                className={`
                  flex flex-col items-center p-1 rounded text-center
                  ${day.isToday ? 'bg-primary/20 ring-1 ring-primary' : ''}
                `}
              >
                <span className="text-[10px] text-text-muted">
                  {format(day.date, 'EEE')}
                </span>
                <span className={`text-sm font-medium ${day.isToday ? 'text-primary' : ''}`}>
                  {format(day.date, 'd')}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {weekGrid.map((day) => {
              if (day.events.length === 0) return null

              return (
                <div key={day.date.toISOString()} className="space-y-0.5">
                  {day.events.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-1.5 p-1 rounded text-xs bg-surface/50 hover:bg-surface transition-colors cursor-pointer"
                      style={{ borderLeft: `2px solid ${getEventColor(event.colorId)}` }}
                    >
                      <span className="text-text truncate flex-1">{event.title}</span>
                      <span className="text-text-muted text-[10px] shrink-0">
                        {event.allDay ? 'All day' : format(parseISO(event.start), 'h:mm a')}
                      </span>
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <span className="text-[10px] text-text-muted pl-2">
                      +{day.events.length - 3} more
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function parseISO(dateString: string): Date {
  return new Date(dateString)
}
