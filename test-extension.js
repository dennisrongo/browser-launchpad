const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const extensionPath = path.join(__dirname, 'dist');

  // Launch Chrome with the extension loaded
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ],
    channel: 'chrome' // Requires Chrome to be installed
  });

  // Open a new tab to trigger the extension (it overrides new tab)
  const page = await context.newPage();
  await page.goto('chrome://newtab');

  // Wait for the extension to load
  await page.waitForTimeout(2000);

  // Feature 1: Test Chrome Storage API connection
  console.log('\n=== FEATURE 1: Testing Chrome Storage API Connection ===');

  const storageTest = await page.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Test connection by attempting to read storage
        chrome.storage.local.get(['test'], (result) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: true, message: 'Storage API accessible', data: result });
          }
        });
      } else {
        resolve({ success: false, error: 'Chrome API not available' });
      }
    });
  });

  console.log('Storage API Test Result:', JSON.stringify(storageTest, null, 2));

  // Feature 2: Test database schema
  console.log('\n=== FEATURE 2: Testing Database Schema ===');

  const schemaTest = await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (allData) => {
        const keys = Object.keys(allData);
        const hasPages = 'pages' in allData;
        const hasWidgets = 'widgets' in allData;
        const hasSettings = 'settings' in allData;
        const hasChatHistory = 'chat_history' in allData;

        resolve({
          allKeys: keys,
          hasPages,
          hasWidgets,
          hasSettings,
          hasChatHistory,
          pagesStructure: hasPages ? Array.isArray(allData.pages) : false,
          widgetsStructure: hasWidgets ? Array.isArray(allData.widgets) : false,
          settingsStructure: hasSettings ? typeof allData.settings === 'object' : false,
          chatHistoryStructure: hasChatHistory ? Array.isArray(allData.chat_history) : false
        });
      });
    });
  });

  console.log('Schema Test Result:', JSON.stringify(schemaTest, null, 2));

  // Feature 3: Test data persistence
  console.log('\n=== FEATURE 3: Testing Data Persistence ===');

  // Create test page
  const createTestData = await page.evaluate(() => {
    return new Promise((resolve) => {
      const testPage = {
        id: 'PERSIST_TEST_12345',
        name: 'PERSIST_TEST_12345',
        widgets: []
      };

      chrome.storage.local.get(['pages'], (result) => {
        const pages = result.pages || [];
        pages.push(testPage);

        chrome.storage.local.set({ pages }, () => {
          resolve({ success: !chrome.runtime.lastError, testPage });
        });
      });
    });
  });

  console.log('Created Test Data:', JSON.stringify(createTestData, null, 2));

  // Verify it was created
  const verifyCreated = await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pages'], (result) => {
        const pages = result.pages || [];
        const testPage = pages.find(p => p.id === 'PERSIST_TEST_12345');
        resolve({ found: !!testPage, page: testPage });
      });
    });
  });

  console.log('Verify Created:', JSON.stringify(verifyCreated, null, 2));

  // Take a screenshot for visual verification
  await page.screenshot({ path: 'test-screenshot.png' });
  console.log('\nScreenshot saved to test-screenshot.png');

  // Check console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });

  // Keep browser open for manual inspection if needed
  console.log('\nPress Ctrl+C to close the browser...');
  await new Promise(() => {}); // Keep running

  await context.close();
})();
