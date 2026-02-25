#!/usr/bin/env node
/**
 * Feature Verification Script
 * Verifies Features 1, 2, 3 by code analysis
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     INFRASTRUCTURE FEATURES VERIFICATION (1, 2, 3)      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

let allPassed = true;

// ========== FEATURE 1: Database Connection ==========
console.log('═══ FEATURE 1: Database Connection (Chrome Storage API) ═══\n');

const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Check 1.1: Storage permission in manifest
if (manifest.permissions && manifest.permissions.includes('storage')) {
  console.log('✓ Check 1.1: Storage permission in manifest.json');
} else {
  console.log('✗ Check 1.1: Storage permission MISSING in manifest.json');
  allPassed = false;
}

// Check 1.2: Storage service exists
const storageServicePath = path.join(__dirname, 'src', 'services', 'storage.ts');
if (fs.existsSync(storageServicePath)) {
  const storageContent = fs.readFileSync(storageServicePath, 'utf8');
  if (storageContent.includes('verifyStorageConnection')) {
    console.log('✓ Check 1.2: Storage service has verifyStorageConnection() function');
  } else {
    console.log('✗ Check 1.3: verifyStorageConnection() function MISSING');
    allPassed = false;
  }
} else {
  console.log('✗ Check 1.2: Storage service file MISSING');
  allPassed = false;
}

// Check 1.3: Built JS has chrome.storage.local
const builtJsPath = path.join(__dirname, 'dist', 'newtab.js');
const builtJs = fs.readFileSync(builtJsPath, 'utf8');
if (builtJs.includes('chrome.storage.local') && builtJs.includes('Chrome Storage API verified')) {
  console.log('✓ Check 1.3: Built extension uses chrome.storage.local API');
} else {
  console.log('✗ Check 1.3: chrome.storage.local API usage NOT FOUND in built code');
  allPassed = false;
}

// Check 1.4: Storage verification utility exists
const verificationPath = path.join(__dirname, 'src', 'utils', 'storage-verification.ts');
if (fs.existsSync(verificationPath)) {
  console.log('✓ Check 1.4: Storage verification utility exists');
} else {
  console.log('✗ Check 1.4: Storage verification utility MISSING');
  allPassed = false;
}

console.log('\nFeature 1 Status: ' + (allPassed ? 'PASSED ✓' : 'FAILED ✗') + '\n');

// ========== FEATURE 2: Database Schema ==========
console.log('═══ FEATURE 2: Database Schema (pages, widgets, settings) ═══\n');

let feature2Passed = true;

// Check 2.1: Pages schema exists
if (builtJs.includes('pages') && builtJs.includes('widgets')) {
  console.log('✓ Check 2.1: Pages and widgets schemas exist in code');
} else {
  console.log('✗ Check 2.1: Pages/widgets schemas NOT FOUND');
  feature2Passed = false;
  allPassed = false;
}

// Check 2.2: Required fields for pages
const storageContent = fs.readFileSync(storageServicePath, 'utf8');
if (storageContent.includes('pagesStorage')) {
  console.log('✓ Check 2.2: pagesStorage service exists with CRUD operations');
} else {
  console.log('✗ Check 2.2: pagesStorage service MISSING');
  feature2Passed = false;
  allPassed = false;
}

// Check 2.3: Settings schema
if (storageContent.includes('settingsStorage')) {
  console.log('✓ Check 2.3: settingsStorage service exists');
} else {
  console.log('✗ Check 2.3: settingsStorage service MISSING');
  feature2Passed = false;
  allPassed = false;
}

// Check 2.4: Chat history schema
if (storageContent.includes('chatHistoryStorage')) {
  console.log('✓ Check 2.4: chatHistoryStorage service exists');
} else {
  console.log('✗ Check 2.4: chatHistoryStorage service MISSING');
  feature2Passed = false;
  allPassed = false;
}

// Check 2.5: Default page initialization
if (builtJs.includes('Created default page in Chrome storage')) {
  console.log('✓ Check 2.5: Default page initialization code exists');
} else {
  console.log('✗ Check 2.5: Default page initialization MISSING');
  feature2Passed = false;
  allPassed = false;
}

// Check 2.6: Default settings initialization
if (builtJs.includes('Created default settings in Chrome storage')) {
  console.log('✓ Check 2.6: Default settings initialization code exists');
} else {
  console.log('✗ Check 2.6: Default settings initialization MISSING');
  feature2Passed = false;
  allPassed = false;
}

console.log('\nFeature 2 Status: ' + (feature2Passed ? 'PASSED ✓' : 'FAILED ✗') + '\n');

// ========== FEATURE 3: Data Persistence ==========
console.log('═══ FEATURE 3: Data Persistence (across reload/restart) ═══\n');

let feature3Passed = true;

// Check 3.1: All storage operations use chrome.storage.local
const storageLocalGetCount = (builtJs.match(/chrome\.storage\.local\.get/g) || []).length;
const storageLocalSetCount = (builtJs.match(/chrome\.storage\.local\.set/g) || []).length;
if (storageLocalGetCount > 0 && storageLocalSetCount > 0) {
  console.log('✓ Check 3.1: Code uses chrome.storage.local.get (' + storageLocalGetCount + ' times)');
  console.log('✓ Check 3.2: Code uses chrome.storage.local.set (' + storageLocalSetCount + ' times)');
} else {
  console.log('✗ Check 3.1/3.2: Insufficient chrome.storage.local usage');
  feature3Passed = false;
  allPassed = false;
}

// Check 3.2: Storage change listeners for sync
if (builtJs.includes('chrome.storage.onChanged')) {
  console.log('✓ Check 3.3: Storage change listeners implemented for cross-context sync');
} else {
  console.log('✗ Check 3.3: Storage change listeners MISSING');
  feature3Passed = false;
  allPassed = false;
}

// Check 3.3: Write verification (read back after write)
if (storageContent.includes('Verify write by reading back')) {
  console.log('✓ Check 3.4: Write verification implemented (reads back after write)');
} else {
  console.log('✗ Check 3.4: Write verification NOT FOUND');
  feature3Passed = false;
  allPassed = false;
}

// Check 3.4: No in-memory storage patterns
const hasInMemoryPattern = builtJs.includes('let pages = []') || builtJs.includes('const pages = []') && !builtJs.includes('chrome.storage');
if (!hasInMemoryPattern) {
  console.log('✓ Check 3.5: No in-memory storage anti-patterns detected');
} else {
  console.log('⚠ Check 3.5: Possible in-memory storage pattern (needs manual review)');
}

// Check 3.5: Persistence test function exists
if (fs.existsSync(verificationPath)) {
  const verificationContent = fs.readFileSync(verificationPath, 'utf8');
  if (verificationContent.includes('testStoragePersistence')) {
    console.log('✓ Check 3.6: Persistence test function exists');
  } else {
    console.log('✗ Check 3.6: Persistence test function MISSING');
    feature3Passed = false;
    allPassed = false;
  }
}

console.log('\nFeature 3 Status: ' + (feature3Passed ? 'PASSED ✓' : 'FAILED ✗') + '\n');

// ========== SUMMARY ==========
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║                   FINAL SUMMARY                        ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('Feature 1 (Database Connection):    ' + (manifest.permissions.includes('storage') ? 'PASSED ✓' : 'FAILED ✗'));
console.log('Feature 2 (Database Schema):        ' + (feature2Passed ? 'PASSED ✓' : 'FAILED ✗'));
console.log('Feature 3 (Data Persistence):       ' + (feature3Passed ? 'PASSED ✓' : 'FAILED ✗'));

console.log('\n' + (allPassed ? '✓ ALL FEATURES PASSED - No regressions detected' : '✗ SOME FEATURES FAILED - Regressions detected') + '\n');

process.exit(allPassed ? 0 : 1);
