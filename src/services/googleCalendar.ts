import type { CalendarEvent, GoogleCalendar } from '../types'
import { decodeApiKey } from '../utils/security'

interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_at: number
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
]

function getRedirectUri(): string {
  return chrome.identity.getRedirectURL()
}

async function getGoogleClientId(): Promise<string> {
  try {
    const result = await chrome.storage.local.get(['google_calendar_config'])
    const config = result as { google_calendar_config?: { clientId?: string } }
    if (config.google_calendar_config?.clientId) {
      return decodeApiKey(config.google_calendar_config.clientId)
    }
  } catch (error) {
    console.error('Failed to load Google Calendar config:', error)
  }
  return ''
}

export async function isGoogleCalendarConfigured(): Promise<boolean> {
  const clientId = await getGoogleClientId()
  return !!clientId
}

export async function initiateGoogleAuth(): Promise<GoogleTokens> {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    throw new Error('Google Client ID not configured. Please add it in Settings → Integrations → Google Calendar.')
  }

  const redirectUri = getRedirectUri()
  const scope = SCOPES.join(' ')

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true,
      },
      async (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!responseUrl) {
          reject(new Error('No response URL received'))
          return
        }

        const url = new URL(responseUrl)
        const code = url.searchParams.get('code')

        if (!code) {
          const error = url.searchParams.get('error')
          reject(new Error(`Authorization failed: ${error || 'No code received'}`))
          return
        }

        try {
          const tokens = await exchangeCodeForTokens(code)
          resolve(tokens)
        } catch (error) {
          reject(error)
        }
      }
    )
  })
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = await getGoogleClientId()
  const redirectUri = getRedirectUri()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  const data: TokenResponse = await response.json()

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = await getGoogleClientId()
  if (!clientId) {
    throw new Error('Google Client ID not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  const data: TokenResponse = await response.json()

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  }
}

export function isTokenExpired(tokens: GoogleTokens): boolean {
  return Date.now() >= tokens.expires_at - 60000
}

export async function getValidAccessToken(tokens: GoogleTokens): Promise<string> {
  if (!isTokenExpired(tokens)) {
    return tokens.access_token
  }

  if (!tokens.refresh_token) {
    throw new Error('Token expired and no refresh token available')
  }

  const newTokens = await refreshAccessToken(tokens.refresh_token)
  return newTokens.access_token
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
  const storedTokens = await chrome.storage.local.get(['google_calendar_tokens'])
  const tokens = storedTokens.google_calendar_tokens as GoogleTokens | undefined

  if (tokens?.access_token) {
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`,
        { method: 'POST' }
      )
    } catch (error) {
      console.error('Error revoking token:', error)
    }
  }

  await chrome.storage.local.remove(['google_calendar_tokens', 'google_calendars'])
}

export async function storeGoogleTokens(tokens: GoogleTokens): Promise<void> {
  await chrome.storage.local.set({ google_calendar_tokens: tokens })
}

export async function getStoredGoogleTokens(): Promise<GoogleTokens | null> {
  const result = await chrome.storage.local.get(['google_calendar_tokens'])
  return result.google_calendar_tokens as GoogleTokens | null
}

export async function storeGoogleCalendars(calendars: GoogleCalendar[]): Promise<void> {
  await chrome.storage.local.set({ google_calendars: calendars })
}

export async function getStoredGoogleCalendars(): Promise<GoogleCalendar[] | null> {
  const result = await chrome.storage.local.get(['google_calendars'])
  return result.google_calendars as GoogleCalendar[] | null
}
