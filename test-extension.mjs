import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.join(__dirname, 'dist');

async function testInfrastructure() {
  console.log('=== Chrome Extension Infrastructure Test ===\n');

  // Check if dist exists
  const fs = await import('fs');
  if (!fs.existsSync(extensionPath)) {
    console.error('ERROR: dist/ directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('Extension path:', extensionPath);
  console.log('Launching Chrome with extension...\n');

  // Launch Chrome with the extension
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ],
    channel: 'chrome'
  });

  // Add a delay to let the extension load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get all pages/tabs
  const pages = context.pages();
  console.log('Open pages:', pages.length);

  // Open a new tab which should trigger the extension (newtab override)
  console.log('Opening new tab...');
  const newPage = await context.newPage();

  // The extension overrides chrome://newtab, but we can't navigate to it directly
  // Instead, navigate to about:blank and inject test code
  await newPage.goto('about:blank');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Inject and run the test
  const testResults = await newPage.evaluate(async () => {
    // Feature 1: Test Chrome Storage API Connection
    const feature1Result = await new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        resolve({
          passed: false,
          message: 'Chrome Storage API not available',
          details: { chromeExists: typeof chrome !== 'undefined' }
        });
        return;
      }

      // Test connection by writing and reading
      const testKey = '_infrastructure_test_' + Date.now();
      const testValue = { timestamp: Date.now(), test: true };

      chrome.storage.local.set({ [testKey]: testValue }, () => {
        if (chrome.runtime.lastError) {
          resolve({
            passed: false,
            message: `Storage set failed: ${chrome.runtime.lastError.message}`,
            details: {}
          });
          return;
        }

        chrome.storage.local.get([testKey], (result) => {
          if (chrome.runtime.lastError) {
            resolve({
              passed: false,
              message: `Storage get failed: ${chrome.runtime.lastError.message}`,
              details: {}
            });
            return;
          }

          const data = result[testKey];
          if (!data || data.timestamp !== testValue.timestamp) {
            resolve({
              passed: false,
              message: 'Data mismatch or not found',
              details: { wrote: testValue, read: data }
            });
            return;
          }

          // Cleanup
          chrome.storage.local.remove([testKey]);

          resolve({
            passed: true,
            message: 'Chrome Storage API connection verified',
            details: { testKey, testValue }
          });
        });
      });
    });

    // Feature 2: Test Database Schema
    const feature2Result = await new Promise((resolve) => {
      chrome.storage.local.get(null, (allData) => {
        if (chrome.runtime.lastError) {
          resolve({
            passed: false,
            message: `Failed to read all storage: ${chrome.runtime.lastError.message}`,
            details: {}
          });
          return;
        }

        const keys = Object.keys(allData);
        const hasPages = 'pages' in allData;
        const hasSettings = 'settings' in allData;

        const pagesIsArray = hasPages && Array.isArray(allData.pages);
        const settingsIsObject = hasSettings && typeof allData.settings === 'object' && allData.settings !== null;

        // If empty, that's okay - will be initialized on first use
        const passed = (!hasPages || pagesIsArray) && (!hasSettings || settingsIsObject);

        resolve({
          passed,
          message: passed ? 'Database schema structure correct' : 'Database schema structure issues',
          details: {
            keys,
            hasPages,
            pagesIsArray,
            hasSettings,
            settingsIsObject,
            empty: keys.length === 0
          }
        });
      });
    });

    // Feature 3: Test Data Persistence
    const feature3Result = await new Promise((resolve) => {
      const testPageId = '_persist_test_' + Date.now();
      const testPage = {
        id: testPageId,
        name: '_PERSIST_TEST_',
        order: 9999,
        widgets: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create test page
      chrome.storage.local.get(['pages'], (getResult1) => {
        if (chrome.runtime.lastError) {
          resolve({
            passed: false,
            message: `Failed to get pages: ${chrome.runtime.lastError.message}`,
            details: {}
          });
          return;
        }

        const pages = getResult1.pages || [];
        pages.push(testPage);

        chrome.storage.local.set({ pages }, () => {
          if (chrome.runtime.lastError) {
            resolve({
              passed: false,
              message: `Failed to save pages: ${chrome.runtime.lastError.message}`,
              details: {}
            });
            return;
          }

          // Verify it was saved
          chrome.storage.local.get(['pages'], (getResult2) => {
            if (chrome.runtime.lastError) {
              resolve({
                passed: false,
                message: `Failed to verify: ${chrome.runtime.lastError.message}`,
                details: {}
              });
              return;
            }

            const savedPages = getResult2.pages || [];
            const found = savedPages.find(p => p.id === testPageId);

            if (!found) {
              resolve({
                passed: false,
                message: 'Test page not found after save',
                details: { testPageId, savedPages }
              });
              return;
            }

            // Cleanup
            const cleanedPages = savedPages.filter(p => p.id !== testPageId);
            chrome.storage.local.set({ pages: cleanedPages }, () => {
              resolve({
                passed: true,
                message: 'Data persists across storage operations',
                details: { testPageId, createdAndFound: true }
              });
            });
          });
        });
      });
    });

    return {
      feature1: feature1Result,
      feature2: feature2Result,
      feature3: feature3Result
    };
  });

  console.log('\n=== TEST RESULTS ===\n');

  console.log('Feature 1: Database Connection');
  console.log('  Status:', testResults.feature1.passed ? '✅ PASSED' : '❌ FAILED');
  console.log('  Message:', testResults.feature1.message);
  if (!testResults.feature1.passed) {
    console.log('  Details:', JSON.stringify(testResults.feature1.details, null, 2));
  }
  console.log();

  console.log('Feature 2: Database Schema');
  console.log('  Status:', testResults.feature2.passed ? '✅ PASSED' : '❌ FAILED');
  console.log('  Message:', testResults.feature2.message);
  if (!testResults.feature2.passed) {
    console.log('  Details:', JSON.stringify(testResults.feature2.details, null, 2));
  }
  console.log();

  console.log('Feature 3: Data Persistence');
  console.log('  Status:', testResults.feature3.passed ? '✅ PASSED' : '❌ FAILED');
  console.log('  Message:', testResults.feature3.message);
  if (!testResults.feature3.passed) {
    console.log('  Details:', JSON.stringify(testResults.feature3.details, null, 2));
  }
  console.log();

  const allPassed = testResults.feature1.passed && testResults.feature2.passed && testResults.feature3.passed;

  console.log('=== SUMMARY ===');
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  // Take a screenshot
  await newPage.screenshot({ path: 'test-results-screenshot.png' });
  console.log('\nScreenshot saved to: test-results-screenshot.png');

  // Keep browser open for a moment to see results
  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {}); // Keep running

  await context.close();
}

testInfrastructure().catch(console.error);
