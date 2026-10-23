import type { BrowserContext, Page, Route } from '@playwright/test'
import { test, expect } from './fixtures'
import { makePage, makeWidget } from './seed'
import { stubGoogleAuth, stubGoogleCalendar } from './stubs'

const T0 = new Date('2026-01-15T12:00:00.000Z')
const after = (ms: number) => new Date(T0.getTime() + ms)
const SECONDS = 1000
const MINUTES = 60 * SECONDS

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  })

class Gate {
  private release: () => void = () => undefined
  private pending: Promise<void> | null = null

  hold() {
    this.pending = new Promise((resolve) => {
      this.release = resolve
    })
  }

  open() {
    this.release()
    this.pending = null
  }

  async wait() {
    await this.pending
  }
}

async function stubControlledWeather(context: BrowserContext) {
  const state = { temperature: 21, status: 200, requests: 0, gate: new Gate() }

  await context.route('https://geocoding-api.open-meteo.com/v1/search*', (route) =>
    json(route, { results: [{ name: 'Testville', country_code: 'US', latitude: 10, longitude: 20 }] })
  )
  await context.route('https://api.open-meteo.com/v1/forecast*', async (route) => {
    state.requests++
    await state.gate.wait()
    if (state.status !== 200) return json(route, { error: true }, state.status)
    return json(route, {
      current: {
        temperature_2m: state.temperature,
        apparent_temperature: 20,
        relative_humidity_2m: 55,
        weather_code: 2,
        wind_speed_10m: 12,
        is_day: 1,
      },
      daily: {},
    })
  })

  return state
}

type TaskRow = { id: string; title: string; status: 'needsAction' | 'completed' }

async function stubControlledTasks(context: BrowserContext, initial: TaskRow[]) {
  const state = { tasks: initial, listRequests: 0, gate: new Gate() }

  await context.route('https://tasks.googleapis.com/tasks/v1/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/users/@me/lists')) return json(route, { items: [{ id: 'list-1', title: 'My Tasks' }] })
    if (route.request().method() !== 'GET') return json(route, {})
    state.listRequests++
    await state.gate.wait()
    return json(route, {
      items: state.tasks.map((task, index) => ({
        ...task,
        updated: '2026-01-15T12:00:00.000Z',
        position: String(index).padStart(20, '0'),
      })),
    })
  })

  return state
}

async function stubDrive(context: BrowserContext) {
  await context.route(/^https:\/\/www\.googleapis\.com\/(upload\/)?drive\/v3\//, (route) => json(route, { id: 'drive-file', files: [] }))
}

const card = (page: Page, title: string) =>
  page.locator('.glass-card').filter({ has: page.getByText(title, { exact: true }) })

const goToPage = async (page: Page, name: string) => {
  await page.getByRole('button', { name, exact: true }).click()
}

const weatherWidget = (id: string, pageId: string) =>
  makeWidget('weather', { city: 'Testville', units: 'celsius', forecastDays: 0 }, { id, page_id: pageId, title: `Weather ${id}` })

const notesWidget = makeWidget('notes', { content: 'elsewhere' }, { id: 'notes-1', page_id: 'page-2', title: 'Other notes' })

const twoPages = (first: ReturnType<typeof makeWidget>) => [
  makePage([first]),
  makePage([notesWidget], { id: 'page-2', name: 'Other', order: 1 }),
]

test.describe('weather widget cache', () => {
  test('returning to a page serves cached weather without a loading state, then replaces it with fresh data', async ({
    context,
    seedStorage,
    openNewTab,
  }) => {
    const weather = await stubControlledWeather(context)
    await seedStorage({ pages: twoPages(weatherWidget('w1', 'page-1')) })
    const page = await openNewTab({ time: T0 })

    await expect(card(page, 'Weather w1').getByText('21', { exact: true })).toBeVisible()
    await goToPage(page, 'Other')
    await expect(card(page, 'Other notes')).toBeVisible()

    await page.clock.setFixedTime(after(5 * MINUTES))
    weather.temperature = 25
    weather.gate.hold()
    await goToPage(page, 'Home')

    const w1 = card(page, 'Weather w1')
    await expect(w1.getByText('21', { exact: true })).toBeVisible()
    await expect(w1.getByText('Loading weather...')).toBeHidden()
    await expect.poll(() => weather.requests).toBe(2)

    weather.gate.open()
    await expect(w1.getByText('25', { exact: true })).toBeVisible()
    await expect(w1.getByText('21', { exact: true })).toBeHidden()
  })

  test('within the fresh window the cache is served without refetching', async ({ context, seedStorage, openNewTab }) => {
    const weather = await stubControlledWeather(context)
    await seedStorage({ pages: twoPages(weatherWidget('w1', 'page-1')) })
    const page = await openNewTab({ time: T0 })
    await expect(card(page, 'Weather w1').getByText('21', { exact: true })).toBeVisible()

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(30 * SECONDS))
    await goToPage(page, 'Home')

    await expect(card(page, 'Weather w1').getByText('21', { exact: true })).toBeVisible()
    await page.waitForTimeout(300)
    expect(weather.requests).toBe(1)
  })

  test('an entry older than its max age is never served', async ({ context, seedStorage, openNewTab }) => {
    const weather = await stubControlledWeather(context)
    await seedStorage({ pages: twoPages(weatherWidget('w1', 'page-1')) })
    const page = await openNewTab({ time: T0 })
    await expect(card(page, 'Weather w1').getByText('21', { exact: true })).toBeVisible()

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(31 * MINUTES))
    weather.temperature = 25
    weather.gate.hold()
    await goToPage(page, 'Home')

    const w1 = card(page, 'Weather w1')
    await expect(w1.getByText('Loading weather...')).toBeVisible()
    await expect(w1.getByText('21', { exact: true })).toBeHidden()

    weather.gate.open()
    await expect(w1.getByText('25', { exact: true })).toBeVisible()
  })

  test('one widget never serves another widget’s cache', async ({ context, seedStorage, openNewTab }) => {
    const weather = await stubControlledWeather(context)
    await seedStorage({
      pages: [
        makePage([weatherWidget('w1', 'page-1')]),
        makePage([weatherWidget('w2', 'page-2')], { id: 'page-2', name: 'Other', order: 1 }),
      ],
    })
    const page = await openNewTab({ time: T0 })
    await expect(card(page, 'Weather w1').getByText('21', { exact: true })).toBeVisible()
    expect(weather.requests).toBe(1)

    weather.temperature = 30
    weather.gate.hold()
    await goToPage(page, 'Other')

    const w2 = card(page, 'Weather w2')
    await expect(w2.getByText('Loading weather...')).toBeVisible()
    await expect(w2.getByText('21', { exact: true })).toBeHidden()

    weather.gate.open()
    await expect(w2.getByText('30', { exact: true })).toBeVisible()
  })

  test.describe('failed revalidation', () => {
    test.use({ allowedErrors: [/weather|Failed to load resource/i] })

    test('keeps the cached reading but flags the failed update', async ({ context, seedStorage, openNewTab }) => {
      const weather = await stubControlledWeather(context)
      await seedStorage({ pages: twoPages(weatherWidget('w1', 'page-1')) })
      const page = await openNewTab({ time: T0 })
      await expect(card(page, 'Weather w1').getByText('21', { exact: true })).toBeVisible()

      await goToPage(page, 'Other')
      await page.clock.setFixedTime(after(5 * MINUTES))
      weather.status = 503
      await goToPage(page, 'Home')

      const w1 = card(page, 'Weather w1')
      await expect(w1.getByText('Update failed')).toBeVisible()
      await expect(w1.getByText('21', { exact: true })).toBeVisible()
    })
  })
})

test.describe('google tasks widget cache', () => {
  const tasksWidget = makeWidget(
    'google-tasks',
    { googleConnected: true, selectedTaskListId: 'list-1', showCompleted: true },
    { id: 'tasks-1', title: 'My tasks' }
  )

  test('serves cached tasks while revalidating, writes edits through, and expires', async ({
    context,
    seedStorage,
    openNewTab,
  }) => {
    await stubGoogleAuth(context)
    await stubDrive(context)
    const tasks = await stubControlledTasks(context, [{ id: 't1', title: 'Buy milk', status: 'needsAction' }])
    await seedStorage({ pages: twoPages(tasksWidget) })
    const page = await openNewTab({ time: T0 })
    const widget = card(page, 'My tasks')

    await expect(widget.getByText('Buy milk')).toBeVisible()
    await widget.getByRole('button', { name: 'Mark as done' }).click()
    await expect(widget.getByRole('button', { name: 'Mark as not done' })).toBeVisible()

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(5 * SECONDS))
    await goToPage(page, 'Home')
    await expect(card(page, 'My tasks').getByRole('button', { name: 'Mark as not done' })).toBeVisible()
    await page.waitForTimeout(300)
    expect(tasks.listRequests).toBe(1)

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(2 * MINUTES))
    tasks.tasks = [{ id: 't1', title: 'Buy oat milk', status: 'needsAction' }]
    tasks.gate.hold()
    await goToPage(page, 'Home')

    const again = card(page, 'My tasks')
    await expect(again.getByText('Buy milk')).toBeVisible()
    await expect(again.getByText('Updated 2 min ago')).toBeVisible()
    await expect.poll(() => tasks.listRequests).toBe(2)

    tasks.gate.open()
    await expect(again.getByText('Buy oat milk')).toBeVisible()
    await expect(again.getByText('Buy milk', { exact: true })).toBeHidden()

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(10 * MINUTES))
    tasks.tasks = [{ id: 't1', title: 'Buy almond milk', status: 'needsAction' }]
    tasks.gate.hold()
    await goToPage(page, 'Home')

    await expect(card(page, 'My tasks').getByText('Buy oat milk')).toBeHidden()
    tasks.gate.open()
    await expect(card(page, 'My tasks').getByText('Buy almond milk')).toBeVisible()
  })
})

test.describe('calendar widget cache', () => {
  const calendarWidget = makeWidget(
    'calendar',
    { viewMode: 'month', firstDayOfWeek: 0, showWeekNumbers: false, googleConnected: true, selectedCalendars: ['primary'] },
    { id: 'cal-1', title: 'My calendar' }
  )

  test('returning to the page shows the calendar immediately and revalidates only once stale', async ({
    context,
    seedStorage,
    openNewTab,
  }) => {
    await stubGoogleAuth(context)
    await stubDrive(context)
    const { requests } = await stubGoogleCalendar(context)
    await seedStorage({ pages: twoPages(calendarWidget) })
    const page = await openNewTab({ time: T0 })
    await expect(card(page, 'My calendar').getByRole('button', { name: 'Today' })).toBeVisible()
    const initialRequests = requests.length

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(5 * SECONDS))
    await goToPage(page, 'Home')
    await expect(card(page, 'My calendar').getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByText('Loading calendar...')).toBeHidden()
    await page.waitForTimeout(300)
    expect(requests.length).toBe(initialRequests)

    await goToPage(page, 'Other')
    await page.clock.setFixedTime(after(2 * MINUTES))
    await goToPage(page, 'Home')
    await expect(card(page, 'My calendar').getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByText('Loading calendar...')).toBeHidden()
    await expect.poll(() => requests.length).toBeGreaterThan(initialRequests)
  })
})
