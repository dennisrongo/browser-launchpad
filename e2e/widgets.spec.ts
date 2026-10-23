import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { makePage, makeWidget, notesStorageKey } from './seed'
import { stubGoogleAuth, stubGoogleCalendar, stubGoogleTasks, stubWeather } from './stubs'

const card = (page: Page, title: string) =>
  page.locator('.glass-card').filter({ has: page.getByText(title, { exact: true }) })

test.describe('notes widget', () => {
  test('renders seeded markdown', async ({ seedStorage, openNewTab }) => {
    await seedStorage({
      pages: [
        makePage([makeWidget('notes', { content: '# Shopping\n\n- **milk**\n- eggs' }, { id: 'notes-1', title: 'My Notes' })]),
      ],
    })
    const page = await openNewTab()
    const notes = card(page, 'My Notes')

    await expect(notes.getByRole('heading', { name: 'Shopping', level: 1 })).toBeVisible()
    await expect(notes.getByRole('listitem')).toHaveText(['milk', 'eggs'])
    await expect(notes.locator('strong')).toHaveText('milk')
  })

  test('shows the empty state for a blank note', async ({ seedStorage, openNewTab }) => {
    await seedStorage({ pages: [makePage([makeWidget('notes', { content: '' }, { id: 'notes-1', title: 'My Notes' })])] })
    const page = await openNewTab()

    await expect(card(page, 'My Notes').getByText('No note yet')).toBeVisible()
  })

  test('edits, saves and keeps the note across a reload', async ({ seedStorage, openNewTab }) => {
    await seedStorage({ pages: [makePage([makeWidget('notes', { content: '' }, { id: 'notes-1', title: 'My Notes' })])] })
    const page = await openNewTab()
    const notes = card(page, 'My Notes')

    await notes.getByTitle('Edit note').click()
    await notes.getByPlaceholder('Write your note in Markdown...').fill('## Remember\n\nwater the plants')
    await notes.getByRole('button', { name: 'Save' }).click()
    await expect(notes.getByRole('heading', { name: 'Remember', level: 2 })).toBeVisible()

    await page.reload()
    await expect(card(page, 'My Notes').getByRole('heading', { name: 'Remember', level: 2 })).toBeVisible()
    await expect(card(page, 'My Notes').getByText('water the plants')).toBeVisible()

    const stored = await page.evaluate(
      async (key) => (await chrome.storage.local.get(key))[key]?.data?.content,
      notesStorageKey('notes-1')
    )
    expect(stored).toBe('## Remember\n\nwater the plants')
  })

  test('cancel discards an edit', async ({ seedStorage, openNewTab }) => {
    await seedStorage({ pages: [makePage([makeWidget('notes', { content: 'original' }, { id: 'notes-1', title: 'My Notes' })])] })
    const page = await openNewTab()
    const notes = card(page, 'My Notes')

    await notes.getByTitle('Edit note').click()
    await notes.getByPlaceholder('Write your note in Markdown...').fill('changed')
    await notes.getByRole('button', { name: 'Cancel' }).click()

    await expect(notes.getByText('original')).toBeVisible()
    await expect(notes.getByText('changed')).toHaveCount(0)
  })
})

test.describe('clock widget', () => {
  const instant = new Date('2026-01-15T14:30:45Z')

  test('text variant shows the 12-hour time and city for a fixed instant', async ({ seedStorage, openNewTab }) => {
    await seedStorage({
      pages: [
        makePage([
          makeWidget(
            'clock',
            { variant: 'text', timezone: 'UTC', format12Hour: true, showSeconds: true },
            { id: 'clock-1', title: 'World Clock' }
          ),
        ]),
      ],
    })
    const page = await openNewTab({ time: instant })
    const clock = card(page, 'World Clock')

    await expect(clock).toContainText('02:30:45 PM')
    await expect(clock).toContainText('UTC')
  })

  test('modern variant shows the date for the instant in UTC', async ({ seedStorage, openNewTab }) => {
    await seedStorage({
      pages: [
        makePage([
          makeWidget(
            'clock',
            { variant: 'modern', timezone: 'UTC', format12Hour: true, showSeconds: true },
            { id: 'clock-1', title: 'World Clock' }
          ),
        ]),
      ],
    })
    const page = await openNewTab({ time: instant })
    const clock = card(page, 'World Clock')

    await expect(clock).toContainText(/0?2:30:45/)
    await expect(clock).toContainText('PM')
    await expect(clock).toContainText('Thursday, January 15')
  })

  test('converts to another timezone in 24-hour format and moves the date', async ({ seedStorage, openNewTab }) => {
    await seedStorage({
      pages: [
        makePage([
          makeWidget(
            'clock',
            { variant: 'modern', timezone: 'Pacific/Auckland', format12Hour: false, showSeconds: false },
            { id: 'clock-1', title: 'World Clock' }
          ),
        ]),
      ],
    })
    const page = await openNewTab({ time: instant })
    const clock = card(page, 'World Clock')

    await expect(clock).toContainText(/0?3:30/)
    await expect(clock).toContainText('Friday, January 16')
    await expect(clock).toContainText('Auckland')
    await expect(clock).not.toContainText('PM')
  })
})

test.describe('weather widget', () => {
  const config = { city: 'Testville', units: 'celsius' as const, forecastDays: 3 as const }

  test('renders the stubbed forecast', async ({ context, seedStorage, openNewTab }) => {
    const weather = await stubWeather(context)
    await seedStorage({ pages: [makePage([makeWidget('weather', config, { id: 'weather-1', title: 'Local Weather' })])] })
    const page = await openNewTab()
    const widget = card(page, 'Local Weather')

    await expect(widget).toContainText('Testville, US')
    await expect(widget).toContainText('21')
    await expect(widget).toContainText(/partly cloudy/i)
    await expect(widget.getByTitle(/light rain/i)).toBeVisible()
    expect(weather.geocodingRequests.map((url) => url.searchParams.get('name'))).toContain('Testville')
  })

  test('asks the service for imperial units when configured', async ({ context, seedStorage, openNewTab }) => {
    const weather = await stubWeather(context)
    await seedStorage({
      pages: [
        makePage([makeWidget('weather', { ...config, units: 'fahrenheit' }, { id: 'weather-1', title: 'Local Weather' })]),
      ],
    })
    const page = await openNewTab()
    await expect(card(page, 'Local Weather')).toContainText('Testville, US')

    const params = weather.forecastRequests[0].searchParams
    expect(params.get('temperature_unit')).toBe('fahrenheit')
    expect(params.get('wind_speed_unit')).toBe('mph')
  })

  test('prompts to configure when no city is set', async ({ seedStorage, openNewTab }) => {
    await seedStorage({
      pages: [makePage([makeWidget('weather', { city: '', units: 'celsius' }, { id: 'weather-1', title: 'Local Weather' })])],
    })
    const page = await openNewTab()

    await expect(page.getByRole('button', { name: 'Configure city' })).toBeVisible()
  })

  test.describe('when the weather service fails', () => {
    test.use({ allowedErrors: [/Failed to load resource: the server responded with a status of 500/] })

    test('shows the error and a retry button', async ({ context, seedStorage, openNewTab }) => {
      await stubWeather(context, { failForecastWith: 500 })
      await seedStorage({ pages: [makePage([makeWidget('weather', config, { id: 'weather-1', title: 'Local Weather' })])] })
      const page = await openNewTab()
      const widget = card(page, 'Local Weather')

      await expect(widget).toContainText('Weather service error (500)')
      await expect(widget.getByRole('button', { name: 'Retry' })).toBeVisible()
    })
  })
})

test.describe('google stubs', () => {
  test('tasks widget lists tasks from the stubbed Tasks API', async ({ context, seedStorage, openNewTab }) => {
    await stubGoogleAuth(context)
    const tasks = await stubGoogleTasks(context, {
      tasks: [
        { id: 't1', title: 'Buy milk' },
        { id: 't2', title: 'Book dentist' },
      ],
    })
    await seedStorage({
      pages: [
        makePage([
          makeWidget(
            'google-tasks',
            { googleConnected: true, selectedTaskListId: 'list-1', showCompleted: false },
            { id: 'tasks-1', title: 'My Tasks' }
          ),
        ]),
      ],
    })
    const page = await openNewTab()
    const widget = card(page, 'My Tasks')

    await expect(widget.getByText('Buy milk')).toBeVisible()
    await expect(widget.getByText('Book dentist')).toBeVisible()
    expect(tasks.requests.length).toBeGreaterThan(0)
  })

  test('calendar widget shows an event from the stubbed Calendar API', async ({ context, seedStorage, openNewTab }) => {
    await stubGoogleAuth(context)
    const calendar = await stubGoogleCalendar(context, {
      events: [{ id: 'e1', summary: 'Team sync', start: '2026-01-15T10:00:00Z', end: '2026-01-15T11:00:00Z' }],
    })
    await seedStorage({
      pages: [
        makePage([
          makeWidget(
            'calendar',
            { viewMode: 'month', firstDayOfWeek: 0, showWeekNumbers: false, googleConnected: true, selectedCalendars: ['primary'] },
            { id: 'calendar-1', title: 'My Calendar' }
          ),
        ]),
      ],
    })
    const page = await openNewTab({ time: new Date('2026-01-15T12:00:00Z') })

    await expect(card(page, 'My Calendar')).toContainText('January 2026')
    await expect.poll(() => calendar.requests.length).toBeGreaterThan(0)
  })
})
