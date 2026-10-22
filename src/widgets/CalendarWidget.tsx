import { logger } from '../utils/logger'
import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Link2 } from 'lucide-react'
import { format } from 'date-fns'
import type { CalendarWidgetConfig, CalendarEvent, GoogleCalendar } from '../types'
import {
  getMonthGrid,
  getWeekGrid,
  getEventsForDay,
  formatMonthYear,
  formatWeekRange,
  navigateMonth,
  navigateWeek,
  goToToday,
  getDayAbbreviations,
  getWeekNumber,
  getEventColor,
} from '../utils/calendar'
import {
  initiateGoogleCalendarAuth,
  getCalendarAccessToken,
  fetchGoogleCalendars,
  fetchGoogleEvents,
  disconnectGoogleCalendar,
  reconnectGoogleCalendar,
} from '../services/googleCalendar'
import { describeAuthError, onGoogleAuthRestored } from '../services/googleAuth'
import { ServiceErrorState } from '../components/ServiceErrorState'
import { DayEventsModal } from '../components/DayEventsModal'

interface CalendarWidgetProps {
  title: string
  config: CalendarWidgetConfig
  onConfigChange?: (newConfig: CalendarWidgetConfig) => void
}

export function CalendarWidget({ title, config, onConfigChange }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [, setCalendars] = useState<GoogleCalendar[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const fetchIdRef = useRef(0)
  const lastFetchedCenterRef = useRef<Date | null>(null)

  const firstDayOfWeek = config.firstDayOfWeek ?? 0
  const showWeekNumbers = config.showWeekNumbers ?? false
  const viewMode = config.viewMode ?? 'month'

  const loadGoogleData = useCallback(async (force = false) => {
    if (!config.googleConnected) {
      setEvents([])
      setCalendars([])
      setInitialLoading(false)
      return
    }

    const thisFetchId = ++fetchIdRef.current

    // Skip the network call if the current month is already within the
    // previously fetched window. The fetch range spans month-1 to month+2,
    // so navigating to an adjacent month is already in state.
    if (!initialLoading && !force) {
      const lastFetched = lastFetchedCenterRef.current
      if (lastFetched) {
        const monthDiff =
          (currentDate.getFullYear() - lastFetched.getFullYear()) * 12 +
          (currentDate.getMonth() - lastFetched.getMonth())
        if (Math.abs(monthDiff) <= 1) {
          setError(null)
          return
        }
      }
    }

    // Only the very first load gates the grid behind the spinner. Subsequent
    // fetches (navigation, refresh) happen in the background so the calendar
    // stays mounted and feels instant.
    setError(null)

    try {
      const accessToken = await getCalendarAccessToken()

      const fetchedCalendars = await fetchGoogleCalendars(accessToken)

      if (thisFetchId !== fetchIdRef.current) return
      setCalendars(fetchedCalendars)

      const calendarIds = config.selectedCalendars?.length
        ? config.selectedCalendars
        : fetchedCalendars.filter(c => c.primary).map(c => c.id)

      if (calendarIds.length > 0) {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)

        const fetchedEvents = await fetchGoogleEvents(accessToken, calendarIds, startDate, endDate)

        if (thisFetchId !== fetchIdRef.current) return
        setEvents(fetchedEvents)
        lastFetchedCenterRef.current = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      }
    } catch (err) {
      if (thisFetchId !== fetchIdRef.current) return
      logger.error('Error loading Google Calendar data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      if (thisFetchId === fetchIdRef.current) {
        setInitialLoading(false)
      }
    }
  }, [config.googleConnected, config.selectedCalendars, currentDate, initialLoading])

  useEffect(() => {
    loadGoogleData()
  }, [loadGoogleData])

  useEffect(() => {
    if (!config.googleConnected) return
    return onGoogleAuthRestored(() => loadGoogleData(true))
  }, [config.googleConnected, loadGoogleData])

  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await reconnectGoogleCalendar()
    } catch (err) {
      logger.error('Error reconnecting Google Calendar:', err)
      setError(err instanceof Error ? err.message : 'Failed to reconnect Google Calendar')
    } finally {
      setReconnecting(false)
    }
  }

  const handleConnectGoogle = async () => {
    setConnecting(true)
    setError(null)

    try {
      const accessToken = await initiateGoogleCalendarAuth()
      const fetchedCalendars = await fetchGoogleCalendars(accessToken)

      onConfigChange?.({
        ...config,
        googleConnected: true,
        selectedCalendars: fetchedCalendars.filter(c => c.primary).map(c => c.id),
      })

      setCalendars(fetchedCalendars)
    } catch (err) {
      logger.error('Error connecting to Google:', err)
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
        selectedCalendars: [],
      })
      setEvents([])
      setCalendars([])
      setError(null)
      setInitialLoading(true)
      lastFetchedCenterRef.current = null
    } catch (err) {
      logger.error('Error disconnecting:', err)
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
    loadGoogleData(true)
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
        <div className="status-badge status-badge-muted mb-3">
          <CalendarIcon className="w-5 h-5 text-secondary" strokeWidth={1.75} />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="text-neutral text-xs mb-3 text-center px-4">
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
        {error && (
          <p className="status-inline rounded-input px-3 py-1.5 text-[11px] mt-3 text-center max-w-[260px]">{describeAuthError(error, 'Google Calendar').title}</p>
        )}
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="status-badge status-badge-muted mb-3">
          <CalendarIcon className="w-5 h-5 text-secondary animate-pulse" strokeWidth={1.75} />
        </div>
        <p className="text-text-muted text-xs">Loading calendar...</p>
      </div>
    )
  }

  if (error) {
    const issue = describeAuthError(error, 'Google Calendar')
    return (
      <ServiceErrorState
        issue={issue}
        busy={reconnecting}
        onPrimary={issue.needsReconnect ? handleReconnect : handleRefresh}
        onDisconnect={handleDisconnect}
      />
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
            className="text-xs font-medium text-primary hover:underline ml-1.5"
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
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => setSelectedDate(day.date)}
                      className={`
                        day-cell flex flex-col items-center justify-center rounded-lg text-[11px] w-full
                        ${!day.isCurrentMonth ? 'text-text-muted opacity-50' : 'text-text'}
                        cursor-pointer min-h-[32px] focus-visible:outline-none
                      `}
                      title={dayEvents.length > 0 ? `${dayEvents.length} event(s)` : 'View events'}
                    >
                      <span
                        className={`day-number flex items-center justify-center w-6 h-6 rounded-full font-medium leading-none ${
                          day.isToday ? 'today-cell text-primary' : ''
                        }`}
                      >
                        {format(day.date, 'd')}
                      </span>
                      <span className="flex items-center justify-center gap-0.5 h-1.5 mt-px leading-none">
                        {dayEvents.slice(0, maxVisibleEvents).map((event, i) => (
                          <span
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
                      </span>
                    </button>
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
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={`
                  flex flex-col items-center p-1 rounded text-center w-full cursor-pointer
                  ${day.isToday ? 'today-cell' : ''}
                  hover-row transition-colors
                `}
                title="View events"
              >
                <span className="text-[10px] text-text-muted">
                  {format(day.date, 'EEE')}
                </span>
                <span className={`text-sm font-medium ${day.isToday ? 'text-primary' : ''}`}>
                  {format(day.date, 'd')}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
            {weekGrid.map((day) => {
              if (day.events.length === 0) return null

              return (
                <div key={day.date.toISOString()} className="space-y-0.5">
                  {day.events.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-1.5 p-1 rounded text-xs bg-surface/50 hover:bg-surface transition-colors"
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

      {selectedDate && (
        <DayEventsModal
          date={selectedDate}
          events={getEventsForDay(events, selectedDate)}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}

function parseISO(dateString: string): Date {
  return new Date(dateString)
}