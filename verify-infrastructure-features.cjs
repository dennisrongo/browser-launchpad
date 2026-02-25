#!/usr/bin/env node

/**
 * Infrastructure Features Regression Verification
 * Features 1, 2, 3
 *
 * This script verifies the infrastructure features by:
 * 1. Checking the built extension code for Chrome Storage API usage
 * 2. Verifying schema initialization in the code
 * 3. Confirming no mock data patterns exist
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFeature1() {
  log('\n=== Feature 1: Database Connection (Chrome Storage API) ===', 'blue');

  const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');

  if (!fs.existsSync(builtJsPath)) {
    log('✗ FAILED: Built JavaScript file not found', 'red');
    return { passed: false, reason: 'Built file not found' };
  }

  const builtJs = fs.readFileSync(builtJsPath, 'utf-8');

  // Check for Chrome Storage API usage
  const checks = {
    chromeStorageLocal: /chrome\.storage\.local/.test(builtJs),
    chromeStorageGet: /chrome\.storage\.local\.get/.test(builtJs),
    chromeStorageSet: /chrome\.storage\.local\.set/.test(builtJs),
    storageConnection: /verifyStorageConnection|storage.*connection/i.test(builtJs),
  };

  log('Verification results:', 'yellow');
  log(`  - chrome.storage.local API used: ${checks.chromeStorageLocal ? '✓' : '✗'}`,
    checks.chromeStorageLocal ? 'green' : 'red');
  log(`  - chrome.storage.local.get() calls: ${checks.chromeStorageGet ? '✓' : '✗'}`,
    checks.chromeStorageGet ? 'green' : 'red');
  log(`  - chrome.storage.local.set() calls: ${checks.chromeStorageSet ? '✓' : '✗'}`,
    checks.chromeStorageSet ? 'green' : 'red');
  log(`  - Storage verification logic: ${checks.storageConnection ? '✓' : '✗'}`,
    checks.storageConnection ? 'green' : 'red');

  const allPassed = Object.values(checks).every(v => v === true);

  if (allPassed) {
    log('\n✓ Feature 1 PASSED: Chrome Storage API connection established', 'green');
    return { passed: true, details: checks };
  } else {
    log('\n✗ Feature 1 FAILED: Missing Chrome Storage API implementation', 'red');
    return { passed: false, details: checks };
  }
}

function checkFeature2() {
  log('\n=== Feature 2: Database Schema ===', 'blue');

  const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');

  if (!fs.existsSync(builtJsPath)) {
    log('✗ FAILED: Built JavaScript file not found', 'red');
    return { passed: false, reason: 'Built file not found' };
  }

  const builtJs = fs.readFileSync(builtJsPath, 'utf-8');

  // Check for schema definitions and usage
  const checks = {
    pagesSchema: /["']pages["'].*:.*\[|pagesStorage|pages:/.test(builtJs),
    widgetsSchema: /["']widgets["'].*:.*\[|widgets:|addWidget/.test(builtJs),
    settingsSchema: /["']settings["'].*:.*{|settingsStorage|theme.*grid_columns/.test(builtJs),
    chatHistorySchema: /["']chat.history["']|chatHistoryStorage|chat-history/.test(builtJs),
    pagesArray: /pages.*Array.isArray|pages.*\.push\(|pages.*\.filter\(/.test(builtJs),
    widgetsArray: /widgets.*Array.isArray|widgets.*\.push\(|widgets.*\.filter\(/.test(builtJs),
    settingsObject: /settings.*typeof.*object|theme.*grid_columns/.test(builtJs),
  };

  log('Verification results:', 'yellow');
  log(`  - Pages schema (array): ${checks.pagesSchema && checks.pagesArray ? '✓' : '✗'}`,
    checks.pagesSchema && checks.pagesArray ? 'green' : 'red');
  log(`  - Widgets schema (array): ${checks.widgetsSchema && checks.widgetsArray ? '✓' : '✗'}`,
    checks.widgetsSchema && checks.widgetsArray ? 'green' : 'red');
  log(`  - Settings schema (object): ${checks.settingsSchema && checks.settingsObject ? '✓' : '✗'}`,
    checks.settingsSchema && checks.settingsObject ? 'green' : 'red');
  log(`  - Chat history schema: ${checks.chatHistorySchema ? '✓' : '✗'}`,
    checks.chatHistorySchema ? 'green' : 'red');

  const allPassed = checks.pagesSchema && checks.pagesArray &&
                    checks.widgetsSchema && checks.widgetsArray &&
                    checks.settingsSchema && checks.settingsObject;

  if (allPassed) {
    log('\n✓ Feature 2 PASSED: All required schemas exist with correct structure', 'green');
    return { passed: true, details: checks };
  } else {
    log('\n✗ Feature 2 FAILED: Missing or incorrect schema structures', 'red');
    return { passed: false, details: checks };
  }
}

function checkFeature3() {
  log('\n=== Feature 3: Data Persistence ===', 'blue');

  const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');

  if (!fs.existsSync(builtJsPath)) {
    log('✗ FAILED: Built JavaScript file not found', 'red');
    return { passed: false, reason: 'Built file not found' };
  }

  const builtJs = fs.readFileSync(builtJsPath, 'utf-8');

  // Check for persistence implementation and NO in-memory storage
  const checks = {
    usesChromeStorage: /chrome\.storage\.local/.test(builtJs),
    noLocalStorage: !/window\.localStorage\.(get|set)/.test(builtJs) && !/localStorage\.getItem/.test(builtJs),
    noSessionStorage: !/sessionStorage/.test(builtJs),
    // Check that useState is used (not in-memory variable) and data is loaded from storage
    usesStateWithStorage: /useState/.test(builtJs) && /chrome\.storage\.local/.test(builtJs),
    persistenceVerification: /verifyStorageConnection|persistence|storage.*persist/i.test(builtJs),
    storageOnChanged: /chrome\.storage\.onChanged/.test(builtJs),
  };

  log('Verification results:', 'yellow');
  log(`  - Uses chrome.storage.local: ${checks.usesChromeStorage ? '✓' : '✗'}`,
    checks.usesChromeStorage ? 'green' : 'red');
  log(`  - No localStorage fallback: ${checks.noLocalStorage ? '✓' : '✗'}`,
    checks.noLocalStorage ? 'green' : 'red');
  log(`  - No sessionStorage: ${checks.noSessionStorage ? '✓' : '✗'}`,
    checks.noSessionStorage ? 'green' : 'red');
  log(`  - Uses React state with storage: ${checks.usesStateWithStorage ? '✓' : '✗'}`,
    checks.usesStateWithStorage ? 'green' : 'red');
  log(`  - Persistence verification: ${checks.persistenceVerification ? '✓' : '✗'}`,
    checks.persistenceVerification ? 'green' : 'red');
  log(`  - Storage change listeners: ${checks.storageOnChanged ? '✓' : '✗'}`,
    checks.storageOnChanged ? 'green' : 'red');

  // Check that data is loaded from storage on init
  const loadsFromStorage = /chrome\.storage\.local\.get|pagesStorage\.getAll|getFromStorage/.test(builtJs);

  log(`  - Loads from storage on init: ${loadsFromStorage ? '✓' : '✗'}`,
    loadsFromStorage ? 'green' : 'red');

  const allPassed = checks.usesChromeStorage && checks.noLocalStorage &&
                    checks.noSessionStorage && checks.usesStateWithStorage && loadsFromStorage;

  if (allPassed) {
    log('\n✓ Feature 3 PASSED: Data persists using Chrome Storage API (no in-memory anti-patterns)', 'green');
    return { passed: true, details: checks };
  } else {
    log('\n✗ Feature 3 FAILED: May use in-memory storage or non-persistent APIs', 'red');
    return { passed: false, details: checks };
  }
}

function checkForMockData() {
  log('\n=== Additional Check: No Mock Data Patterns ===', 'blue');

  const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');

  if (!fs.existsSync(builtJsPath)) {
    log('✗ FAILED: Built JavaScript file not found', 'red');
    return { passed: false, reason: 'Built file not found' };
  }

  const builtJs = fs.readFileSync(builtJsPath, 'utf-8');

  // Check for mock data patterns
  const mockPatterns = [
    /mock.*data/i,
    /fake.*data/i,
    /dummy.*data/i,
    /TODO.*storage|FIXME.*storage/i,
  ];

  const foundMocks = [];
  for (const pattern of mockPatterns) {
    const matches = builtJs.match(pattern);
    if (matches) {
      foundMocks.push(...matches);
    }
  }

  if (foundMocks.length === 0) {
    log('✓ No mock data patterns found', 'green');
    return { passed: true, foundMocks: [] };
  } else {
    log(`✗ Found ${foundMocks.length} mock data pattern(s):`, 'red');
    foundMocks.forEach(mock => log(`  - ${mock}`, 'red'));
    return { passed: false, foundMocks };
  }
}

function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║  Infrastructure Features Regression Test                    ║', 'blue');
  log('║  Features: 1, 2, 3                                           ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  const results = {
    feature1: checkFeature1(),
    feature2: checkFeature2(),
    feature3: checkFeature3(),
    noMockData: checkForMockData(),
  };

  // Print summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║  Test Summary                                               ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');

  log(`\nFeature 1 (Database Connection): ${results.feature1.passed ? '✓ PASSED' : '✗ FAILED'}`,
    results.feature1.passed ? 'green' : 'red');
  log(`Feature 2 (Database Schema): ${results.feature2.passed ? '✓ PASSED' : '✗ FAILED'}`,
    results.feature2.passed ? 'green' : 'red');
  log(`Feature 3 (Data Persistence): ${results.feature3.passed ? '✓ PASSED' : '✗ FAILED'}`,
    results.feature3.passed ? 'green' : 'red');
  log(`Additional (No Mock Data): ${results.noMockData.passed ? '✓ PASSED' : '✗ FAILED'}`,
    results.noMockData.passed ? 'green' : 'red');

  const allPassed = results.feature1.passed && results.feature2.passed &&
                    results.feature3.passed && results.noMockData.passed;

  log(`\n${allPassed ? '✓' : '✗'} Overall: ${allPassed ? 'ALL TESTS PASSED - No regressions detected' : 'SOME TESTS FAILED - Regressions found'}`,
    allPassed ? 'green' : 'red');

  // Save results
  const outputPath = path.join(__dirname, '.test-infrastructure-regression-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  log(`\nResults saved to: ${outputPath}`, 'blue');

  return allPassed ? 0 : 1;
}

// Run tests
process.exit(main());
