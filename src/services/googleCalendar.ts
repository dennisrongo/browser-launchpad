import type { CalendarEvent, GoogleCalendar } from '../types'

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
]

async function getAuthToken(interactive: boolean): Promise<string> {
  const result = await chrome.identity.getAuthToken({
    interactive,
    scopes: CALENDAR_SCOPES,
  })

  if (!result.token) {
    throw new Error(
      interactive
        ? 'Google Calendar sign-in did not return an access token.'
        : 'Google Calendar is not connected.'
    )
  }

  return result.token
}

export async function initiateGoogleCalendarAuth(): Promise<string> {
  return getAuthToken(true)
}

export async function getCalendarAccessToken(): Promise<string> {
  return getAuthToken(false)
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
    if (response.status === 401) {
      throw new Error('Unauthorized - please reconnect Google Calendar')
    }
    const error = await response.text()
    throw new Error(`Failed to fetch calendars: ${error}`)
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

      if (!response.ok) {
        console.error(`Failed to fetch events for calendar ${calendarId}:`, response.status)
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
      console.error(`Error fetching events for calendar ${calendarId}:`, error)
    }
  }

  return events
}

export async function disconnectGoogleCalendar(): Promise<void> {
  try {
    const token = await getAuthToken(false).catch(() => null)

    if (token) {
      try {
        await chrome.identity.removeCachedAuthToken({ token })
      } catch (error) {
        console.error('Error removing cached Google Calendar token:', error)
      }
    }

    try {
      await chrome.identity.clearAllCachedAuthTokens()
    } catch (error) {
      console.error('Error clearing cached Google auth tokens:', error)
    }
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error)
  }
}
