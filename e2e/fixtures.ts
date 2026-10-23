import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const extensionPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

type Fixtures = {
  context: BrowserContext
  extensionId: string
  newTab: Page
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const userDataDir = mkdtempSync(join(tmpdir(), 'launchpad-e2e-'))
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      channel: process.env.PW_CHROMIUM_PATH ? undefined : 'chromium',
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    })
    await use(context)
    await context.close()
    rmSync(userDataDir, { recursive: true, force: true })
  },

  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (!worker) worker = await context.waitForEvent('serviceworker')
    await use(new URL(worker.url()).host)
  },

  newTab: async ({ context, extensionId }, use) => {
    const page = await context.newPage()
    await page.goto(`chrome-extension://${extensionId}/newtab.html`)
    await use(page)
  },
})

export { expect } from '@playwright/test'
