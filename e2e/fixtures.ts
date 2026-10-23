import { test as base, chromium, expect, type BrowserContext, type Page, type Worker } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const extensionPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const BLOCKED_RESOURCE = /Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/

const CLOSE_TIMEOUT_MS = 10_000

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

function killBrowser(userDataDir: string): void {
  try {
    if (process.platform === 'win32') {
      const script = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${userDataDir}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`
      execFileSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' })
    } else {
      execFileSync('pkill', ['-f', userDataDir], { stdio: 'ignore' })
    }
  } catch {
    // pkill exits non-zero when nothing matched; nothing left to kill is fine
  }
}

type Collected = { errors: string[]; unstubbed: string[] }

type Fixtures = {
  allowedErrors: RegExp[]
  collected: Collected
  context: BrowserContext
  extensionId: string
  seedStorage: (items: Record<string, unknown>) => Promise<void>
  openNewTab: (options?: { time?: Date }) => Promise<Page>
  newTab: Page
  failOnErrors: void
}

async function extensionWorker(context: BrowserContext): Promise<Worker> {
  const [existing] = context.serviceWorkers()
  return existing ?? context.waitForEvent('serviceworker')
}

export const test = base.extend<Fixtures>({
  allowedErrors: [[], { option: true }],

  // eslint-disable-next-line no-empty-pattern
  collected: async ({}, use) => {
    await use({ errors: [], unstubbed: [] })
  },

  context: async ({ collected }, use) => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'launchpad-e2e-'))
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      channel: process.env.PW_CHROMIUM_PATH ? undefined : 'chromium',
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })

    context.on('console', (message) => {
      if (message.type() !== 'error' || BLOCKED_RESOURCE.test(message.text())) return
      collected.errors.push(`console.error: ${message.text()}`)
    })
    context.on('weberror', (webError) => {
      collected.errors.push(`uncaught: ${webError.error().message}`)
    })
    await context.route(/^https?:\/\//, (route) => {
      collected.unstubbed.push(`${route.request().method()} ${route.request().url()}`)
      return route.abort('blockedbyclient')
    })

    await use(context)

    const closing = context.close().then(() => true, () => true)
    const closed = await Promise.race([closing, wait(CLOSE_TIMEOUT_MS).then(() => false)])
    if (!closed) {
      killBrowser(userDataDir)
      const settled = await Promise.race([closing.then(() => true), wait(5_000).then(() => false)])
      base.info().annotations.push({
        type: 'teardown-hang',
        description: `context.close() did not return within ${CLOSE_TIMEOUT_MS} ms; browser killed, close() ${settled ? 'then returned' : 'still pending 5 s later'}`,
      })
    }
    rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  },

  extensionId: async ({ context }, use) => {
    const worker = await extensionWorker(context)
    await use(new URL(worker.url()).host)
  },

  seedStorage: async ({ context }, use) => {
    await use(async (items) => {
      const worker = await extensionWorker(context)
      await worker.evaluate((values) => chrome.storage.local.set(values), items)
    })
  },

  openNewTab: async ({ context, extensionId }, use) => {
    await use(async (options = {}) => {
      const page = await context.newPage()
      if (options.time) await page.clock.setFixedTime(options.time)
      await page.goto(`chrome-extension://${extensionId}/newtab.html`)
      return page
    })
  },

  newTab: async ({ openNewTab }, use) => {
    await use(await openNewTab())
  },

  failOnErrors: [
    async ({ context, collected, allowedErrors }, use) => {
      await use()
      const unexpected = collected.errors.filter((error) => !allowedErrors.some((pattern) => pattern.test(error)))
      expect(collected.unstubbed, 'requests to hosts the test did not stub').toEqual([])
      expect(unexpected, 'console errors or uncaught exceptions on the page').toEqual([])
      // depending on context makes this tear down before the browser closes
      void context
    },
    { auto: true },
  ],
})

export { expect }
