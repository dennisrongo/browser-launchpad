import { test, expect } from './fixtures'

test('extension loads and the new tab page renders', async ({ newTab }) => {
  await expect(newTab.getByRole('button', { name: 'Open settings' })).toBeVisible()
  await expect(newTab.getByRole('button', { name: 'Edit pages' })).toBeVisible()
})

test('edit mode toggles', async ({ newTab }) => {
  await newTab.getByRole('button', { name: 'Edit pages' }).click()
  await expect(newTab.getByRole('button', { name: 'Exit edit mode' })).toHaveAttribute('aria-pressed', 'true')
  await newTab.getByRole('button', { name: 'Exit edit mode' }).click()
  await expect(newTab.getByRole('button', { name: 'Edit pages' })).toHaveAttribute('aria-pressed', 'false')
})

test('settings opens and closes', async ({ newTab }) => {
  await newTab.getByRole('button', { name: 'Open settings' }).click()
  await expect(newTab.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await newTab.getByRole('button', { name: 'Close settings' }).click()
  await expect(newTab.getByRole('heading', { name: 'Settings' })).toBeHidden()
})

test('theme change applies and persists across reload', async ({ newTab }) => {
  await newTab.getByRole('button', { name: 'Open settings' }).click()
  await newTab.getByRole('button', { name: /Dark Elegance/ }).click()
  await expect(newTab.locator('html')).toHaveClass(/dark/)

  await newTab.reload()
  await expect(newTab.locator('html')).toHaveClass(/dark/)

  const stored = await newTab.evaluate(async () => (await chrome.storage.local.get('settings')).settings?.theme)
  expect(stored).toBe('dark-elegance')
})
