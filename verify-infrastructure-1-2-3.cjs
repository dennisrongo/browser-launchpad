#!/usr/bin/env node

/**
 * Static verification test for Infrastructure Features 1, 2, 3
 * This test verifies the source code for proper Chrome Storage API usage
 */

const fs = require('fs');
const path = require('path');

const SOURCE_FILES = [
  'src/services/storage.ts',
  'src/App.tsx',
  'dist/newtab.js',
  'dist/manifest.json'
];

let testResults = {
  feature1: { passed: false, details: {} },
  feature2: { passed: false, details: {} },
  feature3: { passed: false, details: {} }
};

console.log('=== REGRESSION TEST FOR FEATURES 1, 2, 3 ===\n');

// Feature 1: Database Connection
console.log('Testing Feature 1: Database Connection (Chrome Storage API)');

const storageTs = fs.readFileSync('src/services/storage.ts', 'utf8');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
const builtJs = fs.readFileSync('dist/newtab.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

testResults.feature1.details.hasChromeStorageLocal = builtJs.includes('chrome.storage.local');
testResults.feature1.details.hasStorageGet = builtJs.includes('chrome.storage.local.get');
testResults.feature1.details.hasStorageSet = builtJs.includes('chrome.storage.local.set');
testResults.feature1.details.hasVerifyConnection = appTsx.includes('verifyStorageConnection()');
testResults.feature1.details.hasManifestPermission = manifest.permissions.includes('storage');

testResults.feature1.passed =
  testResults.feature1.details.hasChromeStorageLocal &&
  testResults.feature1.details.hasStorageGet &&
  testResults.feature1.details.hasStorageSet &&
  testResults.feature1.details.hasVerifyConnection &&
  testResults.feature1.details.hasManifestPermission;

console.log('  chrome.storage.local API: ' + (testResults.feature1.details.hasChromeStorageLocal ? '✓' : '✗'));
console.log('  chrome.storage.local.get: ' + (testResults.feature1.details.hasStorageGet ? '✓' : '✗'));
console.log('  chrome.storage.local.set: ' + (testResults.feature1.details.hasStorageSet ? '✓' : '✗'));
console.log('  storage connection verification: ' + (testResults.feature1.details.hasVerifyConnection ? '✓' : '✗'));
console.log('  manifest storage permission: ' + (testResults.feature1.details.hasManifestPermission ? '✓' : '✗'));
console.log('  Result: ' + (testResults.feature1.passed ? '✅ PASSED' : '❌ FAILED') + '\n');

// Feature 2: Database Schema
console.log('Testing Feature 2: Database Schema');

testResults.feature2.details.hasPagesStorage = storageTs.includes('pagesStorage');
testResults.feature2.details.hasSettingsStorage = storageTs.includes('settingsStorage');
testResults.feature2.details.hasChatHistoryStorage = storageTs.includes('chatHistoryStorage');
testResults.feature2.details.pagesStorageGetAll = storageTs.includes("getAll: (): Promise<StorageResult<any[]>> => getFromStorage<any[]>('pages')");
testResults.feature2.details.settingsStorageGet = storageTs.includes("get: (): Promise<StorageResult<any>> => getFromStorage('settings')");
testResults.feature2.details.pagesIsArray = appTsx.includes('const [pages, setPages] = useState<any[]>([])');
testResults.feature2.details.settingsIsObject = appTsx.includes('const [settings, setSettings] = useState<Settings>(');

testResults.feature2.passed =
  testResults.feature2.details.hasPagesStorage &&
  testResults.feature2.details.hasSettingsStorage &&
  testResults.feature2.details.hasChatHistoryStorage &&
  testResults.feature2.details.pagesStorageGetAll &&
  testResults.feature2.details.settingsStorageGet &&
  testResults.feature2.details.pagesIsArray &&
  testResults.feature2.details.settingsIsObject;

console.log('  pagesStorage exists: ' + (testResults.feature2.details.hasPagesStorage ? '✓' : '✗'));
console.log('  settingsStorage exists: ' + (testResults.feature2.details.hasSettingsStorage ? '✓' : '✗'));
console.log('  chatHistoryStorage exists: ' + (testResults.feature2.details.hasChatHistoryStorage ? '✓' : '✗'));
console.log('  pages structure (array): ' + (testResults.feature2.details.pagesIsArray ? '✓' : '✗'));
console.log('  settings structure (object): ' + (testResults.feature2.details.settingsIsObject ? '✓' : '✗'));
console.log('  Result: ' + (testResults.feature2.passed ? '✅ PASSED' : '❌ FAILED') + '\n');

// Feature 3: Data Persistence
console.log('Testing Feature 3: Data Persistence');

testResults.feature3.details.usesChromeStorage = builtJs.includes('chrome.storage.local');
testResults.feature3.details.noLocalStorage = !builtJs.includes('localStorage.getItem') && !builtJs.includes('localStorage.setItem');
testResults.feature3.details.noSessionStorage = !builtJs.includes('sessionStorage');
testResults.feature3.details.loadsFromStorageOnInit = appTsx.includes('pagesStorage.getAll()') && appTsx.includes('const [pagesResult, settingsResult] = await Promise.all');
testResults.feature3.details.hasStorageChangeListeners = appTsx.includes('chrome.storage.onChanged.addListener');
testResults.feature3.details.savesToStorage = appTsx.includes('pagesStorage.set');

testResults.feature3.passed =
  testResults.feature3.details.usesChromeStorage &&
  testResults.feature3.details.noLocalStorage &&
  testResults.feature3.details.noSessionStorage &&
  testResults.feature3.details.loadsFromStorageOnInit &&
  testResults.feature3.details.hasStorageChangeListeners &&
  testResults.feature3.details.savesToStorage;

console.log('  Uses chrome.storage.local: ' + (testResults.feature3.details.usesChromeStorage ? '✓' : '✗'));
console.log('  No localStorage anti-pattern: ' + (testResults.feature3.details.noLocalStorage ? '✓' : '✗'));
console.log('  No sessionStorage: ' + (testResults.feature3.details.noSessionStorage ? '✓' : '✗'));
console.log('  Loads from storage on init: ' + (testResults.feature3.details.loadsFromStorageOnInit ? '✓' : '✗'));
console.log('  Has storage change listeners: ' + (testResults.feature3.details.hasStorageChangeListeners ? '✓' : '✗'));
console.log('  Saves to storage: ' + (testResults.feature3.details.savesToStorage ? '✓' : '✗'));
console.log('  Result: ' + (testResults.feature3.passed ? '✅ PASSED' : '❌ FAILED') + '\n');

// Summary
console.log('=== TEST SUMMARY ===');
console.log('Feature 1 (Database Connection): ' + (testResults.feature1.passed ? '✅ PASSED' : '❌ FAILED'));
console.log('Feature 2 (Database Schema): ' + (testResults.feature2.passed ? '✅ PASSED' : '❌ FAILED'));
console.log('Feature 3 (Data Persistence): ' + (testResults.feature3.passed ? '✅ PASSED' : '❌ FAILED'));

const allPassed = testResults.feature1.passed && testResults.feature2.passed && testResults.feature3.passed;
console.log('\nOverall: ' + (allPassed ? '✅ ALL TESTS PASSED - NO REGRESSIONS DETECTED' : '❌ SOME TESTS FAILED - REGRESSIONS DETECTED'));

// Save results
fs.writeFileSync(
  '.test-infrastructure-regression-results.json',
  JSON.stringify(testResults, null, 2)
);

process.exit(allPassed ? 0 : 1);
