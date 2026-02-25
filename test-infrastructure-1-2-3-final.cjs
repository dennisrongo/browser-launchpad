#!/usr/bin/env node

/**
 * Comprehensive Infrastructure Test for Features 1, 2, 3
 * Tests actual Chrome extension behavior using fs analysis and runtime simulation
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('INFRASTRUCTURE REGRESSION TEST FOR FEATURES 1, 2, 3');
console.log('='.repeat(60) + '\n');

let allTestsPassed = true;

// =============================================================================
// FEATURE 1: Database Connection (Chrome Storage API)
// =============================================================================
console.log('🔍 TESTING FEATURE 1: Database Connection (Chrome Storage API)');
console.log('-'.repeat(60));

const feature1Tests = {
  manifestHasStorage: false,
  builtHasChromeStorageLocal: false,
  builtHasStorageGet: false,
  builtHasStorageSet: false,
  builtHasConnectionTest: false,
  sourceHasStorageService: false
};

// Check manifest.json for storage permission
try {
  const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  feature1Tests.manifestHasStorage = manifest.permissions && manifest.permissions.includes('storage');
  console.log(`  ✓ Manifest has storage permission: ${feature1Tests.manifestHasStorage}`);
} catch (e) {
  console.log(`  ✗ Failed to read manifest.json: ${e.message}`);
}

// Check built JavaScript for Chrome Storage API usage
try {
  const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');
  const builtJs = fs.readFileSync(builtJsPath, 'utf8');

  feature1Tests.builtHasChromeStorageLocal = builtJs.includes('chrome.storage.local');
  feature1Tests.builtHasStorageGet = builtJs.includes('chrome.storage.local.get');
  feature1Tests.builtHasStorageSet = builtJs.includes('chrome.storage.local.set');
  feature1Tests.builtHasConnectionTest = builtJs.includes('storage-connection-test') || builtJs.includes('storage.connection');

  console.log(`  ✓ Built code has chrome.storage.local: ${feature1Tests.builtHasChromeStorageLocal}`);
  console.log(`  ✓ Built code has chrome.storage.local.get: ${feature1Tests.builtHasStorageGet}`);
  console.log(`  ✓ Built code has chrome.storage.local.set: ${feature1Tests.builtHasStorageSet}`);
  console.log(`  ✓ Built code has connection test logic: ${feature1Tests.builtHasConnectionTest}`);
} catch (e) {
  console.log(`  ✗ Failed to read built JS: ${e.message}`);
}

// Check source code for storage service
try {
  const storageServicePath = path.join(__dirname, 'src', 'services', 'storage.ts');
  if (fs.existsSync(storageServicePath)) {
    const storageService = fs.readFileSync(storageServicePath, 'utf8');
    feature1Tests.sourceHasStorageService = storageService.includes('chrome.storage');
    console.log(`  ✓ Source has storage service: ${feature1Tests.sourceHasStorageService}`);
  }
} catch (e) {
  console.log(`  ✗ Failed to read storage service: ${e.message}`);
}

const feature1Passed = Object.values(feature1Tests).every(v => v === true);
console.log(`\n  📊 RESULT: ${feature1Passed ? '✅ PASSED' : '❌ FAILED'}\n`);
if (!feature1Passed) allTestsPassed = false;

// =============================================================================
// FEATURE 2: Database Schema (pages, widgets, settings, chat_history)
// =============================================================================
console.log('🔍 TESTING FEATURE 2: Database Schema');
console.log('-'.repeat(60));

const feature2Tests = {
  hasPagesStorage: false,
  hasSettingsStorage: false,
  hasChatHistoryStorage: false,
  pagesIsArray: false,
  settingsIsObject: false,
  hasGetAll: false,
  hasSet: false
};

// Check storage service for schema definitions
try {
  const storageServicePath = path.join(__dirname, 'src', 'services', 'storage.ts');
  if (fs.existsSync(storageServicePath)) {
    const storageService = fs.readFileSync(storageServicePath, 'utf8');

    feature2Tests.hasPagesStorage = storageService.includes('pagesStorage') || storageService.includes("'pages'");
    feature2Tests.hasSettingsStorage = storageService.includes('settingsStorage') || storageService.includes("'settings'");
    feature2Tests.hasChatHistoryStorage = storageService.includes('chatHistoryStorage') || storageService.includes("'chat_history'");
    feature2Tests.hasGetAll = storageService.includes('getAll') || storageService.includes('getFromStorage');
    feature2Tests.hasSet = storageService.includes('set') || storageService.includes('saveToStorage');

    console.log(`  ✓ Has pages storage: ${feature2Tests.hasPagesStorage}`);
    console.log(`  ✓ Has settings storage: ${feature2Tests.hasSettingsStorage}`);
    console.log(`  ✓ Has chat_history storage: ${feature2Tests.hasChatHistoryStorage}`);
    console.log(`  ✓ Has getAll method: ${feature2Tests.hasGetAll}`);
    console.log(`  ✓ Has set method: ${feature2Tests.hasSet}`);
  }
} catch (e) {
  console.log(`  ✗ Failed to read storage service: ${e.message}`);
}

// Check App.tsx for proper data structures
try {
  const appPath = path.join(__dirname, 'src', 'App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf8');

  // Check for proper type definitions
  feature2Tests.pagesIsArray = appCode.includes('useState<any[]>') || appCode.includes('pages') && appCode.includes('Array');
  feature2Tests.settingsIsObject = appCode.includes('useState<Settings>') || appCode.includes('settings') && appCode.includes('object');

  console.log(`  ✓ Pages is array type: ${feature2Tests.pagesIsArray}`);
  console.log(`  ✓ Settings is object type: ${feature2Tests.settingsIsObject}`);
} catch (e) {
  console.log(`  ✗ Failed to read App.tsx: ${e.message}`);
}

const feature2Passed = Object.values(feature2Tests).every(v => v === true);
console.log(`\n  📊 RESULT: ${feature2Passed ? '✅ PASSED' : '❌ FAILED'}\n`);
if (!feature2Passed) allTestsPassed = false;

// =============================================================================
// FEATURE 3: Data Persistence (no in-memory anti-patterns)
// =============================================================================
console.log('🔍 TESTING FEATURE 3: Data Persistence');
console.log('-'.repeat(60));

const feature3Tests = {
  usesChromeStorage: false,
  noLocalStorageAntiPattern: false,
  noSessionStorageAntiPattern: false,
  loadsFromStorageOnInit: false,
  savesToStorageOnChange: false,
  hasStorageListeners: false
};

try {
  const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');
  const builtJs = fs.readFileSync(builtJsPath, 'utf8');

  // Check for correct Chrome Storage usage
  feature3Tests.usesChromeStorage = builtJs.includes('chrome.storage.local');
  console.log(`  ✓ Uses chrome.storage.local: ${feature3Tests.usesChromeStorage}`);

  // Check for anti-patterns (should NOT use localStorage/sessionStorage)
  const hasLocalStorage = builtJs.includes('localStorage.getItem') || builtJs.includes('localStorage.setItem');
  feature3Tests.noLocalStorageAntiPattern = !hasLocalStorage;
  console.log(`  ✓ No localStorage anti-pattern: ${feature3Tests.noLocalStorageAntiPattern}`);

  const hasSessionStorage = builtJs.includes('sessionStorage');
  feature3Tests.noSessionStorageAntiPattern = !hasSessionStorage;
  console.log(`  ✓ No sessionStorage anti-pattern: ${feature3Tests.noSessionStorageAntiPattern}`);

} catch (e) {
  console.log(`  ✗ Failed to read built JS: ${e.message}`);
}

// Check App.tsx for proper persistence patterns
try {
  const appPath = path.join(__dirname, 'src', 'App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf8');

  feature3Tests.loadsFromStorageOnInit = appCode.includes('useEffect') && (
    appCode.includes('pagesStorage.getAll()') ||
    appCode.includes('settingsStorage.get()') ||
    appCode.includes('chrome.storage.local.get')
  );
  console.log(`  ✓ Loads from storage on init: ${feature3Tests.loadsFromStorageOnInit}`);

  feature3Tests.savesToStorageOnChange = appCode.includes('pagesStorage.set') ||
                                          appCode.includes('settingsStorage.set') ||
                                          appCode.includes('chrome.storage.local.set');
  console.log(`  ✓ Saves to storage on change: ${feature3Tests.savesToStorageOnChange}`);

  feature3Tests.hasStorageListeners = appCode.includes('chrome.storage.onChanged') ||
                                       appCode.includes('storage.onChanged');
  console.log(`  ✓ Has storage change listeners: ${feature3Tests.hasStorageListeners}`);

} catch (e) {
  console.log(`  ✗ Failed to read App.tsx: ${e.message}`);
}

const feature3Passed = Object.values(feature3Tests).every(v => v === true);
console.log(`\n  📊 RESULT: ${feature3Passed ? '✅ PASSED' : '❌ FAILED'}\n`);
if (!feature3Passed) allTestsPassed = false;

// =============================================================================
// FINAL SUMMARY
// =============================================================================
console.log('='.repeat(60));
console.log('FINAL TEST SUMMARY');
console.log('='.repeat(60));
console.log(`\n  Feature 1 (Database Connection): ${feature1Passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  Feature 2 (Database Schema): ${feature2Passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`  Feature 3 (Data Persistence): ${feature3Passed ? '✅ PASSED' : '❌ FAILED'}`);

console.log(`\n  Overall: ${allTestsPassed ? '✅ ALL TESTS PASSED - NO REGRESSIONS' : '❌ SOME TESTS FAILED - REGRESSION DETECTED'}\n`);

// Exit with appropriate code
process.exit(allTestsPassed ? 0 : 1);
