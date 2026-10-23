import { test, expect } from './fixtures'
import { stubWeather } from './stubs'

test.describe('the error guard catches what it should', () => {
  test('fails on a console.error', async ({ newTab }) => {
    test.fail()
    await newTab.evaluate(() => console.error('guard probe'))
  })

  test('fails on an uncaught exception', async ({ newTab }) => {
    test.fail()
    await newTab.evaluate(() => {
      setTimeout(() => {
        throw new Error('guard probe')
      }, 0)
      return new Promise((done) => setTimeout(done, 50))
    })
  })

  test('fails on a request to a host the test did not stub', async ({ newTab }) => {
    test.fail()
    await newTab.evaluate(() => fetch('https://example.invalid/probe').catch(() => null))
  })
})

test.describe('the error guard stays quiet when it should', () => {
  test.describe('with the error allowed', () => {
    test.use({ allowedErrors: [/guard probe/] })

    test('lets an allowed console.error through', async ({ newTab }) => {
      await newTab.evaluate(() => console.error('guard probe'))
    })
  })

  test('lets a stubbed request through', async ({ context, newTab }) => {
    const weather = await stubWeather(context)
    const status = await newTab.evaluate(
      async () => (await fetch('https://geocoding-api.open-meteo.com/v1/search?name=Probe')).status
    )

    expect(status).toBe(200)
    expect(weather.geocodingRequests).toHaveLength(1)
  })
})
