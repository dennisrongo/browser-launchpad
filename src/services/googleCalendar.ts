import { logger } from '../utils/logger'
import type { CalendarEvent, GoogleCalendar } from '../types'
import { GoogleAuthError, authorizeGoogle, getGoogleAccessToken, reconnectGoogle, throwForBadResponse } from './googleAuth'

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
]

export function initiateGoogleCalendarAuth(): Promise<string> {
  return authorizeGoogle(CALENDAR_SCOPES)
}

export function reconnectGoogleCalendar(): Promise<string> {
  return reconnectGoogle(CALENDAR_SCOPES)
}

export function getCalendarAccessToken(): Promise<string> {
  return getGoogleAccessToken(CALENDAR_SCOPES)
}

export async function fetchGoogleCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    return throwForBadResponse(response, accessToken, 'Failed to fetch calendars')
  }

  const data = await response.json()

  return data.items.map((item: any) => ({
    id: item.id,
    summary: item.summary,
    primary: item.primary,
    backgroundColor: item.backgroundColor,
  }))
}

export async function fetchGoogleEvents(
  accessToken: string,
  calendarIds: string[],
  start: Date,
  end: Date
): Promise<CalendarEvent[]> {
  if (calendarIds.length === 0) {
    return []
  }

  const timeMin = start.toISOString()
  const timeMax = end.toISOString()

  const events: CalendarEvent[] = []

  for (const calendarId of calendarIds) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
          new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250',
          }),
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (response.status === 401) {
        return throwForBadResponse(response, accessToken, 'Failed to fetch events')
      }

      if (!response.ok) {
        logger.error(`Failed to fetch events for calendar ${calendarId}:`, response.status)
        continue
      }

      const data = await response.json()

      for (const item of data.items || []) {
        const isAllDay = !!item.start.date
        events.push({
          id: item.id,
          title: item.summary || 'Untitled Event',
          start: item.start.dateTime || item.start.date,
          end: item.end.dateTime || item.end.date,
          allDay: isAllDay,
          colorId: item.colorId,
          calendarId,
        })
      }
    } catch (error) {
      if (error instanceof GoogleAuthError) throw error
      logger.error(`Error fetching events for calendar ${calendarId}:`, error)
    }
  }

  return events
}

export async function disconnectGoogleCalendar(): Promise<void> {
  try {
    const token = await getCalendarAccessToken().catch(() => null)

    if (token) {
      try {
        await chrome.identity.removeCachedAuthToken({ token })
      } catch (error) {
        logger.error('Error removing cached Google Calendar token:', error)
      }
    }

    try {
      await chrome.identity.clearAllCachedAuthTokens()
    } catch (error) {
      logger.error('Error clearing cached Google auth tokens:', error)
    }
  } catch (error) {
    logger.error('Error disconnecting Google Calendar:', error)
  }
}