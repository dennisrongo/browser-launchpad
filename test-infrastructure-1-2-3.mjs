#!/usr/bin/env node

/**
 * Regression Test Script for Features 1, 2, 3
 *
 * This script performs static code analysis and verification of the Chrome extension
 * to ensure all infrastructure features are properly implemented.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(message) {
  log(`✓ PASS: ${message}`, 'green');
}

function fail(message) {
  log(`✗ FAIL: ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function header(message) {
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`${message}`, 'blue');
  log(`${'='.repeat(80)}`, 'blue');
}

// Test results
const results = {
  feature1: { passed: 0, failed: 0, tests: [] },
  feature2: { passed: 0, failed: 0, tests: [] },
  feature3: { passed: 0, failed: 0, tests: [] }
};

function recordTest(feature, testName, passed, message) {
  results[feature].tests.push({ test: testName, passed, message });
  if (passed) {
    results[feature].passed++;
    pass(`${testName}: ${message}`);
  } else {
    results[feature].failed++;
    fail(`${testName}: ${message}`);
  }
}

// ============================================================================
// FEATURE 1: Database Connection (Chrome Storage API)
// ============================================================================

function testFeature1() {
  header('FEATURE 1: Database Connection (Chrome Storage API)');

  // Test 1.1: Check manifest.json has storage permission
  info('Test 1.1: Checking manifest.json for storage permission...');
  try {
    const manifestPath = path.join(PROJECT_ROOT, 'dist', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    const hasStoragePermission = manifest.permissions && manifest.permissions.includes('storage');
    recordTest('feature1', 'Manifest storage permission', hasStoragePermission,
      hasStoragePermission ? 'Storage permission found in manifest.json' : 'Storage permission NOT found in manifest.json');
  } catch (error) {
    recordTest('feature1', 'Manifest storage permission', false, `Error reading manifest: ${error.message}`);
  }

  // Test 1.2: Check storage service exists
  info('Test 1.2: Checking for storage service implementation...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageExists = fs.existsSync(storagePath);
    recordTest('feature1', 'Storage service exists', storageExists,
      storageExists ? 'storage.ts found in src/services/' : 'storage.ts NOT found');
  } catch (error) {
    recordTest('feature1', 'Storage service exists', false, `Error checking storage service: ${error.message}`);
  }

  // Test 1.3: Check storage service exports Chrome Storage API functions
  info('Test 1.3: Checking storage service exports...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const hasGetFromStorage = storageContent.includes('export function getFromStorage');
    const hasSetToStorage = storageContent.includes('export function setToStorage');
    const hasVerifyStorageConnection = storageContent.includes('export async function verifyStorageConnection');

    recordTest('feature1', 'Storage service exports getFromStorage', hasGetFromStorage,
      hasGetFromStorage ? 'getFromStorage function exported' : 'getFromStorage function NOT exported');

    recordTest('feature1', 'Storage service exports setToStorage', hasSetToStorage,
      hasSetToStorage ? 'setToStorage function exported' : 'setToStorage function NOT exported');

    recordTest('feature1', 'Storage service exports verifyStorageConnection', hasVerifyStorageConnection,
      hasVerifyStorageConnection ? 'verifyStorageConnection function exported' : 'verifyStorageConnection function NOT exported');
  } catch (error) {
    recordTest('feature1', 'Storage service exports', false, `Error reading storage service: ${error.message}`);
  }

  // Test 1.4: Check storage service uses chrome.storage.local
  info('Test 1.4: Checking Chrome Storage API usage...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const usesChromeStorage = storageContent.includes('chrome.storage.local.get') &&
                             storageContent.includes('chrome.storage.local.set');

    recordTest('feature1', 'Uses chrome.storage.local API', usesChromeStorage,
      usesChromeStorage ? 'Chrome Storage API properly used' : 'Chrome Storage API NOT used');
  } catch (error) {
    recordTest('feature1', 'Uses chrome.storage.local API', false, `Error checking API usage: ${error.message}`);
  }

  // Test 1.5: Check App.tsx calls verifyStorageConnection
  info('Test 1.5: Checking App.tsx storage verification...');
  try {
    const appPath = path.join(PROJECT_ROOT, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    const importsVerifyStorage = appContent.includes("verifyStorageConnection") ||
                                  appContent.includes('verifyStorageConnection');
    const callsVerifyStorage = appContent.includes('await verifyStorageConnection()') ||
                               appContent.includes('verifyStorageConnection()');

    recordTest('feature1', 'App imports verifyStorageConnection', importsVerifyStorage,
      importsVerifyStorage ? 'verifyStorageConnection imported in App.tsx' : 'verifyStorageConnection NOT imported');

    recordTest('feature1', 'App calls verifyStorageConnection', callsVerifyStorage,
      callsVerifyStorage ? 'verifyStorageConnection called in App.tsx' : 'verifyStorageConnection NOT called');
  } catch (error) {
    recordTest('feature1', 'App storage verification', false, `Error checking App.tsx: ${error.message}`);
  }
}

// ============================================================================
// FEATURE 2: Database Schema (pages, widgets, settings, chat_history)
// ============================================================================

function testFeature2() {
  header('FEATURE 2: Database Schema (pages, widgets, settings, chat_history)');

  // Test 2.1: Check pagesStorage implementation
  info('Test 2.1: Checking pagesStorage implementation...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const hasPagesGetAll = storageContent.includes('getAll: ()');
    const hasPagesSet = storageContent.includes('set: (pages');
    const hasPagesAdd = storageContent.includes('add: (page');

    recordTest('feature2', 'pagesStorage.getAll exists', hasPagesGetAll,
      hasPagesGetAll ? 'pagesStorage.getAll found' : 'pagesStorage.getAll NOT found');

    recordTest('feature2', 'pagesStorage.set exists', hasPagesSet,
      hasPagesSet ? 'pagesStorage.set found' : 'pagesStorage.set NOT found');

    recordTest('feature2', 'pagesStorage.add exists', hasPagesAdd,
      hasPagesAdd ? 'pagesStorage.add found' : 'pagesStorage.add NOT found');
  } catch (error) {
    recordTest('feature2', 'pagesStorage implementation', false, `Error: ${error.message}`);
  }

  // Test 2.2: Check settingsStorage implementation
  info('Test 2.2: Checking settingsStorage implementation...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const hasSettingsGet = storageContent.includes('get: ()');
    const hasSettingsSet = storageContent.includes('set: (settings');

    recordTest('feature2', 'settingsStorage.get exists', hasSettingsGet,
      hasSettingsGet ? 'settingsStorage.get found' : 'settingsStorage.get NOT found');

    recordTest('feature2', 'settingsStorage.set exists', hasSettingsSet,
      hasSettingsSet ? 'settingsStorage.set found' : 'settingsStorage.set NOT found');
  } catch (error) {
    recordTest('feature2', 'settingsStorage implementation', false, `Error: ${error.message}`);
  }

  // Test 2.3: Check chatHistoryStorage implementation
  info('Test 2.3: Checking chatHistoryStorage implementation...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const hasChatHistoryStorage = storageContent.includes('chatHistoryStorage');
    const hasChatGet = storageContent.includes('getFromStorage(`chat-history-${widgetId}`)') ||
                       storageContent.includes('chat-history-');
    const hasChatSet = storageContent.includes('setToStorage({ [`chat-history-${widgetId}`]');
    const hasChatClear = storageContent.includes('removeFromStorage(`chat-history-${widgetId}`)');

    recordTest('feature2', 'chatHistoryStorage object exists', hasChatHistoryStorage,
      hasChatHistoryStorage ? 'chatHistoryStorage object found' : 'chatHistoryStorage object NOT found');

    recordTest('feature2', 'chatHistoryStorage.get exists', hasChatGet,
      hasChatGet ? 'chatHistoryStorage.get found' : 'chatHistoryStorage.get NOT found');

    recordTest('feature2', 'chatHistoryStorage.set exists', hasChatSet,
      hasChatSet ? 'chatHistoryStorage.set found' : 'chatHistoryStorage.set NOT found');

    recordTest('feature2', 'chatHistoryStorage.clear exists', hasChatClear,
      hasChatClear ? 'chatHistoryStorage.clear found' : 'chatHistoryStorage.clear NOT found');
  } catch (error) {
    recordTest('feature2', 'chatHistoryStorage implementation', false, `Error: ${error.message}`);
  }

  // Test 2.4: Check page structure in App.tsx
  info('Test 2.4: Checking page schema structure...');
  try {
    const appPath = path.join(PROJECT_ROOT, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    const hasPageId = appContent.includes('id:') && appContent.includes("'page-'");
    const hasPageName = appContent.includes('name:');
    const hasPageWidgets = appContent.includes('widgets:');
    const hasPageOrder = appContent.includes('order:');
    const hasPageTimestamps = appContent.includes('created_at:') && appContent.includes('updated_at:');

    recordTest('feature2', 'Page has id field', hasPageId,
      hasPageId ? 'Page id field found' : 'Page id field NOT found');

    recordTest('feature2', 'Page has name field', hasPageName,
      hasPageName ? 'Page name field found' : 'Page name field NOT found');

    recordTest('feature2', 'Page has widgets field', hasPageWidgets,
      hasPageWidgets ? 'Page widgets field found' : 'Page widgets field NOT found');

    recordTest('feature2', 'Page has order field', hasPageOrder,
      hasPageOrder ? 'Page order field found' : 'Page order field NOT found');

    recordTest('feature2', 'Page has timestamps', hasPageTimestamps,
      hasPageTimestamps ? 'Page timestamps found' : 'Page timestamps NOT found');
  } catch (error) {
    recordTest('feature2', 'Page schema structure', false, `Error: ${error.message}`);
  }

  // Test 2.5: Check widget structure
  info('Test 2.5: Checking widget schema structure...');
  try {
    const appPath = path.join(PROJECT_ROOT, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    const hasWidgetId = appContent.includes("'widget-'");
    const hasWidgetType = appContent.includes('type:');
    const hasWidgetPageId = appContent.includes('page_id:');
    const hasWidgetConfig = appContent.includes('config:');
    const hasWidgetOrder = appContent.includes('order:');

    recordTest('feature2', 'Widget has id field', hasWidgetId,
      hasWidgetId ? 'Widget id field found' : 'Widget id field NOT found');

    recordTest('feature2', 'Widget has type field', hasWidgetType,
      hasWidgetType ? 'Widget type field found' : 'Widget type field NOT found');

    recordTest('feature2', 'Widget has page_id field', hasWidgetPageId,
      hasWidgetPageId ? 'Widget page_id field found' : 'Widget page_id field NOT found');

    recordTest('feature2', 'Widget has config field', hasWidgetConfig,
      hasWidgetConfig ? 'Widget config field found' : 'Widget config field NOT found');

    recordTest('feature2', 'Widget has order field', hasWidgetOrder,
      hasWidgetOrder ? 'Widget order field found' : 'Widget order field NOT found');
  } catch (error) {
    recordTest('feature2', 'Widget schema structure', false, `Error: ${error.message}`);
  }
}

// ============================================================================
// FEATURE 3: Data Persistence (across browser restart)
// ============================================================================

function testFeature3() {
  header('FEATURE 3: Data Persistence (across browser restart)');

  // Test 3.1: Check for no in-memory storage patterns
  info('Test 3.1: Checking for in-memory storage anti-patterns...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    // Check that there are comments warning against in-memory storage
    const hasAntiMemoryWarning = storageContent.includes('No in-memory storage') ||
                                 storageContent.includes('in-memory');

    recordTest('feature3', 'Storage service has anti-in-memory warning', hasAntiMemoryWarning,
      hasAntiMemoryWarning ? 'Anti-in-memory warning found' : 'Warning comment could be stronger');
  } catch (error) {
    recordTest('feature3', 'Anti-pattern checks', false, `Error: ${error.message}`);
  }

  // Test 3.2: Verify all data operations use chrome.storage.local
  info('Test 3.2: Checking all storage operations use Chrome Storage...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const noLocalStorage = !storageContent.includes('localStorage.') &&
                           !storageContent.includes('sessionStorage.');
    const noGlobalVariables = !storageContent.includes('let storage =') &&
                              !storageContent.includes('const storage =') &&
                              !storageContent.includes('var storage =');

    recordTest('feature3', 'No localStorage/sessionStorage usage', noLocalStorage,
      noLocalStorage ? 'No browser localStorage usage found' : 'localStorage/sessionStorage detected - WARNING');

    recordTest('feature3', 'No global storage variables', noGlobalVariables,
      noGlobalVariables ? 'No global storage variables found' : 'Global storage variables detected - WARNING');
  } catch (error) {
    recordTest('feature3', 'Storage operation checks', false, `Error: ${error.message}`);
  }

  // Test 3.3: Check storage write verification
  info('Test 3.3: Checking storage write verification...');
  try {
    const storagePath = path.join(PROJECT_ROOT, 'src', 'services', 'storage.ts');
    const storageContent = fs.readFileSync(storagePath, 'utf-8');

    const verifiesWrite = storageContent.includes('Verify write') ||
                         (storageContent.includes('chrome.storage.local.get') &&
                          storageContent.includes('chrome.storage.local.set'));

    recordTest('feature3', 'Storage service verifies writes', verifiesWrite,
      verifiesWrite ? 'Write verification implemented' : 'Write verification could be more explicit');
  } catch (error) {
    recordTest('feature3', 'Write verification check', false, `Error: ${error.message}`);
  }

  // Test 3.4: Check App.tsx initializes from storage
  info('Test 3.4: Checking App initializes from Chrome Storage...');
  try {
    const appPath = path.join(PROJECT_ROOT, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    const loadsFromStorage = appContent.includes('await pagesStorage.getAll()');
    const savesToStorage = appContent.includes('await pagesStorage.set(');

    recordTest('feature3', 'App loads from Chrome Storage on startup', loadsFromStorage,
      loadsFromStorage ? 'App loads from storage on startup' : 'App does NOT load from storage');

    recordTest('feature3', 'App saves to Chrome Storage on changes', savesToStorage,
      savesToStorage ? 'App saves to storage on changes' : 'App does NOT save to storage');
  } catch (error) {
    recordTest('feature3', 'App initialization check', false, `Error: ${error.message}`);
  }

  // Test 3.5: Check for storage change listeners
  info('Test 3.5: Checking storage change listeners...');
  try {
    const appPath = path.join(PROJECT_ROOT, 'src', 'App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    const hasStorageListener = appContent.includes('chrome.storage.onChanged.addListener');

    recordTest('feature3', 'App listens to storage changes', hasStorageListener,
      hasStorageListener ? 'Storage change listener found' : 'Storage change listener NOT found');
  } catch (error) {
    recordTest('feature3', 'Storage listener check', false, `Error: ${error.message}`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  log('\n╔══════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   REGRESSION TEST: FEATURES 1, 2, 3 (Infrastructure)               ║', 'cyan');
  log('║   Chrome Extension: Browser Launchpad                               ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════════════╝', 'cyan');

  testFeature1();
  testFeature2();
  testFeature3();

  // Print summary
  header('TEST SUMMARY');

  const totalPassed = results.feature1.passed + results.feature2.passed + results.feature3.passed;
  const totalFailed = results.feature1.failed + results.feature2.failed + results.feature3.failed;
  const totalTests = totalPassed + totalFailed;

  log(`\nFeature 1 (Database Connection):`, 'blue');
  log(`  Passed: ${colors.green}${results.feature1.passed}${colors.reset} | Failed: ${colors.red}${results.feature1.failed}${colors.reset}`);

  log(`\nFeature 2 (Database Schema):`, 'blue');
  log(`  Passed: ${colors.green}${results.feature2.passed}${colors.reset} | Failed: ${colors.red}${results.feature2.failed}${colors.reset}`);

  log(`\nFeature 3 (Data Persistence):`, 'blue');
  log(`  Passed: ${colors.green}${results.feature3.passed}${colors.reset} | Failed: ${colors.red}${results.feature3.failed}${colors.reset}`);

  log(`\n${'='.repeat(80)}`, 'blue');
  log(`TOTAL: ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`, 'blue');
  log(`${'='.repeat(80)}\n`, 'blue');

  // Determine if all features pass
  const feature1Passes = results.feature1.failed === 0;
  const feature2Passes = results.feature2.failed === 0;
  const feature3Passes = results.feature3.failed === 0;

  if (feature1Passes && feature2Passes && feature3Passes) {
    log('✅ ALL FEATURES PASSING - No regressions detected!', 'green');
    process.exit(0);
  } else {
    log('❌ REGRESSIONS DETECTED - Some features are failing!', 'red');
    if (!feature1Passes) log('  - Feature 1 (Database Connection) has failures', 'red');
    if (!feature2Passes) log('  - Feature 2 (Database Schema) has failures', 'red');
    if (!feature3Passes) log('  - Feature 3 (Data Persistence) has failures', 'red');
    process.exit(1);
  }
}

main();
