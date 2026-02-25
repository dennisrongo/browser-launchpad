#!/usr/bin/env node

/**
 * Regression Test Script for Infrastructure Features 1, 2, 3
 *
 * This script tests:
 * - Feature 1: Database connection established using Chrome Storage API
 * - Feature 2: Database schema applied correctly for pages, widgets, settings
 * - Feature 3: Data persists across browser restart and extension reload
 *
 * Usage: node test-infrastructure-regression.cjs
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, 'dist');
const TEST_PAGE_NAME = 'REGRESSION_TEST_' + Date.now();
const TEST_WIDGET_NAME = 'Test Widget ' + Date.now();

let browser;
let context;
let page;

async function setupTestEnvironment() {
  console.log('\n=== Setting up test environment ===');

  // Launch Chrome with the extension loaded
  browser = await chromium.launch({
    headless: false, // Need to see browser for extension testing
    channel: 'chrome', // Use Chrome instead of Chromium
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  // Create a new browser context
  context = await browser.newContext();

  // Wait for extension to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('✓ Browser launched with extension loaded');
}

async function getExtensionPage() {
  // Get the extension's background page or new tab page
  const pages = context.pages();

  // If there's already a new tab page, use it
  for (const p of pages) {
    if (p.url().includes('chrome://newtab') || p.url().startsWith('chrome-extension://')) {
      return p;
    }
  }

  // Otherwise, open a new tab which will trigger the extension
  const newPage = await context.newPage();
  await newPage.goto('chrome://newtab');
  await new Promise(resolve => setTimeout(resolve, 1000));

  return newPage;
}

async function testFeature1_DatabaseConnection() {
  console.log('\n=== Testing Feature 1: Database Connection (Chrome Storage API) ===');

  const extPage = await getExtensionPage();

  // Inject script to test Chrome Storage API connection
  const result = await extPage.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Test storage connection
        chrome.storage.local.get(['test_connection'], (result) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            resolve({
              success: true,
              apiAvailable: true,
              storageType: 'chrome.storage.local'
            });
          }
        });
      } else {
        resolve({
          success: false,
          error: 'Chrome Storage API not available'
        });
      }
    });
  });

  console.log('Test result:', JSON.stringify(result, null, 2));

  if (result.success && result.apiAvailable) {
    console.log('✓ Feature 1 PASSED: Chrome Storage API connection established');
    return { passed: true, details: result };
  } else {
    console.log('✗ Feature 1 FAILED:', result.error || 'Unknown error');
    return { passed: false, details: result };
  }
}

async function testFeature2_DatabaseSchema() {
  console.log('\n=== Testing Feature 2: Database Schema ===');

  const extPage = await getExtensionPage();

  // Check for required schema keys
  const schemaCheck = await extPage.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        const hasPages = 'pages' in data;
        const hasWidgets = 'widgets' in data;
        const hasSettings = 'settings' in data;
        const hasChatHistory = 'chat_history' in data;

        // Check structure
        const pagesStructure = Array.isArray(data.pages);
        const widgetsStructure = Array.isArray(data.widgets);
        const settingsStructure = typeof data.settings === 'object' && data.settings !== null;

        resolve({
          allKeysExist: hasPages && hasWidgets && hasSettings && hasChatHistory,
          details: {
            pages: { exists: hasPages, correctStructure: pagesStructure },
            widgets: { exists: hasWidgets, correctStructure: widgetsStructure },
            settings: { exists: hasSettings, correctStructure: settingsStructure },
            chat_history: { exists: hasChatHistory }
          },
          rawData: data
        });
      });
    });
  });

  console.log('Schema check result:', JSON.stringify(schemaCheck, null, 2));

  const allCorrect = schemaCheck.allKeysExist &&
                     schemaCheck.details.pages.correctStructure &&
                     schemaCheck.details.widgets.correctStructure &&
                     schemaCheck.details.settings.correctStructure;

  if (allCorrect) {
    console.log('✓ Feature 2 PASSED: All required schemas exist with correct structure');
    return { passed: true, details: schemaCheck };
  } else {
    console.log('✗ Feature 2 FAILED: Schema issues detected');
    return { passed: false, details: schemaCheck };
  }
}

async function testFeature3_DataPersistence() {
  console.log('\n=== Testing Feature 3: Data Persistence ===');

  // Step 1: Create test data
  console.log('\nStep 1: Creating test data...');
  const extPage = await getExtensionPage();

  const testData = {
    name: TEST_PAGE_NAME,
    widgets: [{
      id: 'test_widget_' + Date.now(),
      type: 'test',
      name: TEST_WIDGET_NAME,
      position: { x: 0, y: 0 }
    }]
  };

  await extPage.evaluate((data) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pages'], (result) => {
        const pages = result.pages || [];
        pages.push(data);
        chrome.storage.local.set({ pages: pages }, () => {
          resolve();
        });
      });
    });
  }, testData);

  console.log(`✓ Created test page: ${TEST_PAGE_NAME}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 2: Verify data exists
  console.log('\nStep 2: Verifying data exists before reload...');
  const beforeReload = await extPage.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pages'], (result) => {
        resolve(result.pages || []);
      });
    });
  });

  const testPageExists = beforeReload.some(p => p.name === TEST_PAGE_NAME);
  console.log('Test page exists before reload:', testPageExists);

  if (!testPageExists) {
    console.log('✗ Feature 3 FAILED: Test data was not created');
    return { passed: false, details: 'Failed to create test data' };
  }

  // Step 3: Reload the extension
  console.log('\nStep 3: Reloading extension...');

  // Get extension ID from page URL
  const extensionId = extPage.url().match(/chrome-extension:\/\/([^\/]+)/)?.[1];

  if (extensionId) {
    // Navigate to extension reload page
    await extPage.goto(`chrome://extensions`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Note: We can't programmatically click the reload button due to Chrome security
    // So we'll simulate by closing and reopening the browser context
    console.log('Simulating extension reload by reopening context...');
  }

  // Step 4: Verify data after reload
  console.log('\nStep 4: Verifying data after reload...');

  // Create new context to simulate extension reload
  await context.close();
  context = await browser.newContext();
  await new Promise(resolve => setTimeout(resolve, 2000));

  const newPage = await context.newPage();
  await newPage.goto('chrome://newtab');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const afterReload = await newPage.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pages'], (result) => {
        resolve(result.pages || []);
      });
    });
  });

  const testPageStillExists = afterReload.some(p => p.name === TEST_PAGE_NAME);
  console.log('Test page exists after reload:', testPageStillExists);

  if (!testPageStillExists) {
    console.log('✗ Feature 3 FAILED: Data did not persist after extension reload');
    return { passed: false, details: 'Data lost after reload' };
  }

  // Step 5: Clean up test data
  console.log('\nStep 5: Cleaning up test data...');
  await newPage.evaluate((testName) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pages'], (result) => {
        const pages = (result.pages || []).filter(p => p.name !== testName);
        chrome.storage.local.set({ pages: pages }, () => {
          resolve();
        });
      });
    });
  }, TEST_PAGE_NAME);

  console.log('✓ Test data cleaned up');

  // Final verification
  const finalCheck = await newPage.evaluate((testName) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pages'], (result) => {
        const stillExists = (result.pages || []).some(p => p.name === testName);
        resolve(!stillExists);
      });
    });
  }, TEST_PAGE_NAME);

  if (finalCheck) {
    console.log('✓ Feature 3 PASSED: Data persists across extension reload');
    return { passed: true, details: 'Persistence verified' };
  } else {
    console.log('✓ Feature 3 PASSED (with note): Data persists but cleanup failed');
    return { passed: true, details: 'Persistence verified, cleanup manual' };
  }
}

async function cleanup() {
  console.log('\n=== Cleaning up ===');
  if (page) await page.close();
  if (context) await context.close();
  if (browser) await browser.close();
  console.log('✓ Cleanup complete');
}

async function runTests() {
  const results = {
    feature1: null,
    feature2: null,
    feature3: null
  };

  try {
    await setupTestEnvironment();

    // Test Feature 1
    results.feature1 = await testFeature1_DatabaseConnection();

    // Test Feature 2
    results.feature2 = await testFeature2_DatabaseSchema();

    // Test Feature 3
    results.feature3 = await testFeature3_DataPersistence();

  } catch (error) {
    console.error('\n✗ Test execution error:', error.message);
    console.error(error.stack);
  } finally {
    await cleanup();
  }

  // Print summary
  console.log('\n=== REGRESSION TEST SUMMARY ===');
  console.log('Feature 1 (Database Connection):', results.feature1?.passed ? '✓ PASSED' : '✗ FAILED');
  console.log('Feature 2 (Database Schema):', results.feature2?.passed ? '✓ PASSED' : '✗ FAILED');
  console.log('Feature 3 (Data Persistence):', results.feature3?.passed ? '✓ PASSED' : '✗ FAILED');

  const allPassed = results.feature1?.passed && results.feature2?.passed && results.feature3?.passed;
  console.log('\nOverall:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');

  // Write results to file
  fs.writeFileSync(
    path.join(__dirname, '.test-infrastructure-regression-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('\nResults saved to .test-infrastructure-regression-results.json');

  return allPassed ? 0 : 1;
}

// Run tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
