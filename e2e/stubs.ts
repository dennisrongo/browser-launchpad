import type { BrowserContext, Route } from '@playwright/test'

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })

export type WeatherStubOptions = {
  place?: { name: string; country_code: string; latitude: number; longitude: number }
  current?: Partial<{
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    weather_code: number
    wind_speed_10m: number
    is_day: number
  }>
  failForecastWith?: number
}

export async function stubWeather(context: BrowserContext, options: WeatherStubOptions = {}) {
  const place = options.place ?? { name: 'Testville', country_code: 'US', latitude: 10, longitude: 20 }
  const geocodingRequests: URL[] = []
  const forecastRequests: URL[] = []

  await context.route('https://geocoding-api.open-meteo.com/v1/search*', (route) => {
    geocodingRequests.push(new URL(route.request().url()))
    return json(route, { results: [place] })
  })

  await context.route('https://api.open-meteo.com/v1/forecast*', (route) => {
    forecastRequests.push(new URL(route.request().url()))
    if (options.failForecastWith) return json(route, { error: true }, options.failForecastWith)
    return json(route, {
      current: {
        temperature_2m: 21.4,
        apparent_temperature: 20.2,
        relative_humidity_2m: 55,
        weather_code: 2,
        wind_speed_10m: 12.3,
        is_day: 1,
        ...options.current,
      },
      daily: {
        time: ['2026-01-15', '2026-01-16', '2026-01-17'],
        weather_code: [2, 61, 0],
        temperature_2m_max: [24.1, 19.6, 22.4],
        temperature_2m_min: [14.2, 12.8, 13.1],
        precipitation_probability_max: [10, 70, 0],
        uv_index_max: [5.2, 3.1, 6.4],
        sunrise: ['2026-01-15T06:45', '2026-01-16T06:46', '2026-01-17T06:46'],
        sunset: ['2026-01-15T17:30', '2026-01-16T17:31', '2026-01-17T17:32'],
      },
    })
  })

  return { geocodingRequests, forecastRequests }
}

export async function stubGoogleAuth(context: BrowserContext, token = 'e2e-token') {
  const driveRequests: URL[] = []

  await context.addInitScript((value) => {
    const identity = (globalThis as any).chrome?.identity
    if (!identity) return
    identity.getAuthToken = () => Promise.resolve({ token: value })
    identity.removeCachedAuthToken = () => Promise.resolve()
    identity.clearAllCachedAuthTokens = () => Promise.resolve()
  }, token)

  await context.route('https://www.googleapis.com/drive/v3/**', (route) => {
    driveRequests.push(new URL(route.request().url()))
    return json(route, { files: [] })
  })

  return { driveRequests }
}

export type TaskStub = { id: string; title: string; status?: 'needsAction' | 'completed' }

export async function stubGoogleTasks(
  context: BrowserContext,
  options: { lists?: { id: string; title: string }[]; tasks?: TaskStub[] } = {}
) {
  const lists = options.lists ?? [{ id: 'list-1', title: 'My Tasks' }]
  const tasks = options.tasks ?? []
  const requests: URL[] = []

  await context.route('https://tasks.googleapis.com/tasks/v1/**', (route) => {
    const url = new URL(route.request().url())
    requests.push(url)
    if (url.pathname.endsWith('/users/@me/lists')) return json(route, { items: lists })
    if (url.pathname.endsWith('/tasks')) {
      return json(route, {
        items: tasks.map((task, index) => ({
          id: task.id,
          title: task.title,
          status: task.status ?? 'needsAction',
          updated: '2026-01-15T12:00:00.000Z',
          position: String(index).padStart(20, '0'),
        })),
      })
    }
    return json(route, {})
  })

  return { requests }
}

export type CalendarEventStub = { id: string; summary: string; start: string; end: string }

export async function stubGoogleCalendar(
  context: BrowserContext,
  options: { calendars?: { id: string; summary: string }[]; events?: CalendarEventStub[] } = {}
) {
  const calendars = options.calendars ?? [{ id: 'primary', summary: 'Primary' }]
  const events = options.events ?? []
  const requests: URL[] = []

  await context.route('https://www.googleapis.com/calendar/v3/**', (route) => {
    const url = new URL(route.request().url())
    requests.push(url)
    if (url.pathname.endsWith('/users/me/calendarList')) {
      return json(route, {
        items: calendars.map((calendar) => ({ ...calendar, primary: calendar.id === 'primary', accessRole: 'owner' })),
      })
    }
    if (url.pathname.endsWith('/events')) {
      return json(route, {
        items: events.map((event) => ({
          id: event.id,
          summary: event.summary,
          start: { dateTime: event.start },
          end: { dateTime: event.end },
        })),
      })
    }
    return json(route, {})
  })

  return { requests }
}
