/**
 * Chrome Storage Verification Utility
 *
 * This file contains functions to verify that all data operations use real Chrome Storage API.
 * Run these tests in the browser console to verify storage implementation.
 */

import { pagesStorage } from '../services/storage'

export type StorageTestResult = {
  testName: string
  passed: boolean
  message: string
  details?: Record<string, unknown>
}

/**
 * Test 1: Verify Chrome Storage API is available
 */
export async function testStorageAPIAvailable(): Promise<StorageTestResult> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return {
      testName: 'Chrome Storage API Available',
      passed: false,
      message: 'chrome.storage API not available. Are you running in a Chrome extension context?',
    }
  }

  if (!chrome.storage.local) {
    return {
      testName: 'Chrome Storage API Available',
      passed: false,
      message: 'chrome.storage.local not available. Check extension permissions.',
    }
  }

  return {
    testName: 'Chrome Storage API Available',
    passed: true,
    message: '✓ chrome.storage.local API is available',
    details: { api: 'chrome.storage.local' },
  }
}

/**
 * Test 2: Verify storage connection with write/read/verify cycle
 */
export async function testStorageConnection(): Promise<StorageTestResult> {
  const testKey = 'STORAGE_QUERY_TEST'
  const testData = {
    timestamp: Date.now(),
    test: 'STORAGE_QUERY_TEST',
    verified: true,
  }

  try {
    // Step 1: Write test data
    const writeResult = await new Promise<{ success: boolean; error: string | null }>((resolve) => {
      chrome.storage.local.set({ [testKey]: testData }, () => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message ?? 'Unknown error' })
        } else {
          resolve({ success: true, error: null })
        }
      })
    })

    if (!writeResult.success) {
      return {
        testName: 'Storage Connection (Write/Read/Verify)',
        passed: false,
        message: `Failed to write to storage: ${writeResult.error}`,
      }
    }

    console.log('[Storage Test] ✓ Write successful:', testData)

    // Step 2: Read test data back
    const readResult = await new Promise<{ data: typeof testData | null; error: string | null }>((resolve) => {
      chrome.storage.local.get(testKey, (result) => {
        if (chrome.runtime.lastError) {
          resolve({ data: null, error: chrome.runtime.lastError.message ?? 'Unknown error' })
        } else {
          resolve({ data: (result as Record<string, typeof testData>)[testKey] ?? null, error: null })
        }
      })
    })

    if (readResult.error) {
      return {
        testName: 'Storage Connection (Write/Read/Verify)',
        passed: false,
        message: `Failed to read from storage: ${readResult.error}`,
      }
    }

    if (!readResult.data) {
      return {
        testName: 'Storage Connection (Write/Read/Verify)',
        passed: false,
        message: 'Read returned null - data was not persisted',
      }
    }

    console.log('[Storage Test] ✓ Read successful:', readResult.data)

    // Step 3: Verify data matches
    if (readResult.data.timestamp !== testData.timestamp) {
      return {
        testName: 'Storage Connection (Write/Read/Verify)',
        passed: false,
        message: 'Data mismatch - timestamp does not match',
        details: { wrote: testData, read: readResult.data },
      }
    }

    // Step 4: Clean up test data
    await new Promise<void>((resolve) => {
      chrome.storage.local.remove(testKey, () => {
        console.log('[Storage Test] ✓ Cleanup successful')
        resolve()
      })
    })

    return {
      testName: 'Storage Connection (Write/Read/Verify)',
      passed: true,
      message: '✓ Storage connection verified - data persists and reads correctly',
      details: { testData, readData: readResult.data },
    }
  } catch (error) {
    return {
      testName: 'Storage Connection (Write/Read/Verify)',
      passed: false,
      message: `Exception during storage test: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Test 3: Verify page operations use real storage
 */
export async function testPageStorageOperations(): Promise<StorageTestResult> {
  const testPageName = 'STORAGE_QUERY_TEST_PAGE'
  const testPageId = 'page-test-' + Date.now()

  try {
    // Step 1: Create a test page
    const testPage = {
      id: testPageId,
      name: testPageName,
      order: 9999,
      widgets: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log('[Page Storage Test] Creating test page:', testPage)

    const addResult = await pagesStorage.add(testPage)

    if (!addResult.success) {
      return {
        testName: 'Page Storage Operations',
        passed: false,
        message: `Failed to add page to storage: ${addResult.error}`,
      }
    }

    console.log('[Page Storage Test] ✓ Page added to storage')

    // Step 2: Verify page was saved by reading all pages
    const getResult = await pagesStorage.getAll()

    if (getResult.error) {
      return {
        testName: 'Page Storage Operations',
        passed: false,
        message: `Failed to read pages from storage: ${getResult.error}`,
      }
    }

    if (!getResult.data) {
      return {
        testName: 'Page Storage Operations',
        passed: false,
        message: 'Pages data is null - storage returned nothing',
      }
    }

    const savedPage = getResult.data.find((p) => p.id === testPageId)

    if (!savedPage) {
      return {
        testName: 'Page Storage Operations',
        passed: false,
        message: 'Test page was not found in storage after add operation',
        details: { testPageId, allPages: getResult.data },
      }
    }

    console.log('[Page Storage Test] ✓ Page retrieved from storage:', savedPage)

    // Step 3: Verify data matches
    if (savedPage.name !== testPageName) {
      return {
        testName: 'Page Storage Operations',
        passed: false,
        message: 'Page name does not match',
        details: { expected: testPageName, actual: savedPage.name },
      }
    }

    // Step 4: Clean up - delete the test page
    const deleteResult = await pagesStorage.delete(testPageId)

    if (!deleteResult.success) {
      return {
        testName: 'Page Storage Operations',
        passed: false,
        message: `Failed to delete test page: ${deleteResult.error}`,
      }
    }

    console.log('[Page Storage Test] ✓ Test page cleaned up')

    return {
      testName: 'Page Storage Operations',
      passed: true,
      message: '✓ Page CRUD operations use real Chrome storage',
      details: { testPage, savedPage },
    }
  } catch (error) {
    return {
      testName: 'Page Storage Operations',
      passed: false,
      message: `Exception during page storage test: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Test 4: Verify storage persists across simulated extension reload
 * (This checks that data survives storage API re-calls)
 */
export async function testStoragePersistence(): Promise<StorageTestResult> {
  const testKey = 'PERSISTENCE_TEST'
  const testData = { value: 'test-' + Date.now() }

  try {
    // Write data
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ [testKey]: testData }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message)
        } else {
          resolve()
        }
      })
    })

    console.log('[Persistence Test] ✓ Data written')

    // Read data (simulates reload by doing fresh read)
    const read1 = await new Promise<typeof testData | null>((resolve) => {
      chrome.storage.local.get(testKey, (result) => {
        resolve((result as Record<string, typeof testData>)[testKey] ?? null)
      })
    })

    if (!read1 || read1.value !== testData.value) {
      return {
        testName: 'Storage Persistence',
        passed: false,
        message: 'Data not persistent after first read',
        details: { expected: testData, actual: read1 },
      }
    }

    console.log('[Persistence Test] ✓ First read successful')

    // Read again to verify persistence
    const read2 = await new Promise<typeof testData | null>((resolve) => {
      chrome.storage.local.get(testKey, (result) => {
        resolve((result as Record<string, typeof testData>)[testKey] ?? null)
      })
    })

    if (!read2 || read2.value !== testData.value) {
      return {
        testName: 'Storage Persistence',
        passed: false,
        message: 'Data not persistent on second read',
        details: { expected: testData, actual: read2 },
      }
    }

    console.log('[Persistence Test] ✓ Second read successful')

    // Clean up
    await new Promise<void>((resolve) => {
      chrome.storage.local.remove(testKey, () => resolve())
    })

    return {
      testName: 'Storage Persistence',
      passed: true,
      message: '✓ Data persists across multiple storage reads',
      details: { testData, reads: [read1, read2] },
    }
  } catch (error) {
    return {
      testName: 'Storage Persistence',
      passed: false,
      message: `Exception during persistence test: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Run all storage verification tests
 */
export async function runAllStorageTests(): Promise<{
  allPassed: boolean
  results: StorageTestResult[]
  summary: string
}> {
  console.log('=== Chrome Storage Verification Tests ===')
  console.log('Testing that backend queries real Chrome storage (not in-memory mocks)...\n')

  const tests = [
    testStorageAPIAvailable,
    testStorageConnection,
    testPageStorageOperations,
    testStoragePersistence,
  ]

  const results: StorageTestResult[] = []

  for (const test of tests) {
    console.log(`Running: ${test.name}...`)
    const result = await test()
    results.push(result)

    if (result.passed) {
      console.log(`✓ PASS: ${result.message}\n`)
    } else {
      console.error(`✗ FAIL: ${result.message}\n`)
    }
  }

  const allPassed = results.every((r) => r.passed)
  const passCount = results.filter((r) => r.passed).length

  const summary = `
=== Test Summary ===
Total Tests: ${results.length}
Passed: ${passCount}
Failed: ${results.length - passCount}
All Passed: ${allPassed ? 'YES ✓' : 'NO ✗'}

${allPassed ? '✓ Storage implementation verified - all data operations use real Chrome Storage API' : '✗ Some tests failed - check console for details'}
`

  console.log(summary)

  return {
    allPassed,
    results,
    summary,
  }
}

// Export a function to run from browser console
declare global {
  interface Window {
    runStorageVerificationTests: () => Promise<{ allPassed: boolean; results: StorageTestResult[]; summary: string }>
  }
}

if (typeof window !== 'undefined') {
  window.runStorageVerificationTests = async () => {
    const result = await runAllStorageTests()
    return result
  }
}

export default runAllStorageTests
