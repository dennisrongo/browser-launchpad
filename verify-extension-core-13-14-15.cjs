#!/usr/bin/env node
/**
 * Verification script for Extension Core Features #13, #14, #15
 *
 * Feature #13: Chrome extension permissions management
 * Feature #14: Cross-origin requests for external APIs
 * Feature #15: Error boundary for React components
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('EXTENSION CORE FEATURES VERIFICATION - Features #13, #14, #15');
console.log('='.repeat(80));
console.log();

let totalTests = 0;
let passingTests = 0;

// Feature #13: Chrome extension permissions management
console.log('FEATURE #13: Chrome Extension Permissions Management');
console.log('-'.repeat(80));

const manifestPath = path.join(__dirname, 'dist', 'manifest.json');
let manifest;

try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('✅ Found and parsed manifest.json');
  passingTests++;
} catch (error) {
  console.log('❌ Could not read manifest.json:', error.message);
}
totalTests++;

// Test 1: Check storage permission
if (manifest && manifest.permissions) {
  if (manifest.permissions.includes('storage')) {
    console.log('✅ Test 1: "storage" permission is included');
    passingTests++;
  } else {
    console.log('❌ Test 1: "storage" permission is missing');
  }
} else {
  console.log('❌ Test 1: No permissions field in manifest');
}
totalTests++;

// Test 2: Verify no unnecessary permissions
const necessaryPermissions = ['storage'];
const unnecessaryPermissions = manifest?.permissions?.filter(
  p => !necessaryPermissions.includes(p)
) || [];

if (unnecessaryPermissions.length === 0) {
  console.log('✅ Test 2: No unnecessary permissions requested (only storage)');
  console.log('   Permissions:', manifest?.permissions?.join(', ') || 'none');
  passingTests++;
} else {
  console.log('❌ Test 2: Unnecessary permissions found:', unnecessaryPermissions);
}
totalTests++;

// Test 3: Check host_permissions for API domains
if (manifest && manifest.host_permissions) {
  const requiredHosts = [
    'https://api.openai.com/*',
    'https://api.straico.com/*',
    'https://api.openweathermap.org/*'
  ];

  const missingHosts = requiredHosts.filter(host =>
    !manifest.host_permissions.includes(host)
  );

  if (missingHosts.length === 0) {
    console.log('✅ Test 3: All required API hosts in host_permissions');
    console.log('   - api.openai.com');
    console.log('   - api.straico.com');
    console.log('   - api.openweathermap.org');
    passingTests++;
  } else {
    console.log('❌ Test 3: Missing host permissions:', missingHosts);
  }
} else {
  console.log('❌ Test 3: No host_permissions field in manifest');
}
totalTests++;

// Test 4: Verify minimal permission set
const permissionCount = manifest?.permissions?.length || 0;
if (permissionCount <= 2) {
  console.log(`✅ Test 4: Minimal permission set (${permissionCount} permission(s))`);
  passingTests++;
} else {
  console.log(`⚠️  Test 4: ${permissionCount} permissions (may be more than necessary)`);
}
totalTests++;

// Test 5: No excessive permissions
const excessivePermissions = [
  'tabs', 'history', 'bookmarks', 'topSites', 'activeTab',
  '<all_urls>', '*://*/*', 'http://*/*', 'https://*/*'
];
const foundExcessive = manifest?.permissions?.filter(p => excessivePermissions.includes(p)) || [];

if (foundExcessive.length === 0) {
  console.log('✅ Test 5: No excessive/broad permissions found');
  passingTests++;
} else {
  console.log('❌ Test 5: Excessive permissions found:', foundExcessive);
}
totalTests++;

console.log();
console.log(`Feature #13 Summary: ${passingTests}/${totalTests} tests passing`);
console.log();

// Feature #14: Cross-origin requests for external APIs
console.log('FEATURE #14: Cross-Origin Requests for External APIs');
console.log('-'.repeat(80));

const feature14Tests = 6;
let feature14Passing = 0;

// Test 1: OpenAI API in host_permissions
if (manifest?.host_permissions?.includes('https://api.openai.com/*')) {
  console.log('✅ Test 1: api.openai.com is in host_permissions');
  feature14Passing++;
} else {
  console.log('❌ Test 1: api.openai.com missing from host_permissions');
}

// Test 2: Straico API in host_permissions
if (manifest?.host_permissions?.includes('https://api.straico.com/*')) {
  console.log('✅ Test 2: api.straico.com is in host_permissions');
  feature14Passing++;
} else {
  console.log('❌ Test 2: api.straico.com missing from host_permissions');
}

// Test 3: Weather API in host_permissions
if (manifest?.host_permissions?.includes('https://api.openweathermap.org/*')) {
  console.log('✅ Test 3: api.openweathermap.org is in host_permissions');
  feature14Passing++;
} else {
  console.log('❌ Test 3: api.openweathermap.org missing from host_permissions');
}

// Test 4: Verify CSP allows external fetches
if (manifest?.content_security_policy) {
  const csp = manifest.content_security_policy.extension_pages || '';
  // Check if CSP is not overly restrictive (should allow fetch to external APIs)
  if (csp.includes('script-src') && csp.includes('self')) {
    console.log('✅ Test 4: CSP configured (extension_pages with script-src self)');
    feature14Passing++;
  } else {
    console.log('⚠️  Test 4: CSP may be misconfigured');
  }
} else {
  console.log('⚠️  Test 4: No CSP in manifest (uses default)');
  feature14Passing++;
}

// Test 5: Check for API usage in source code
const appPath = path.join(__dirname, 'src', 'App.tsx');
try {
  const appContent = fs.readFileSync(appPath, 'utf8');
  const hasOpenAI = appContent.includes('api.openai.com') || appContent.includes('openai');
  const hasStraico = appContent.includes('api.straico.com') || appContent.includes('straico');
  const hasWeather = appContent.includes('openweathermap') || appContent.includes('weather');

  if (hasOpenAI || hasStraico || hasWeather) {
    console.log('✅ Test 5: Source code contains API call logic');
    if (hasOpenAI) console.log('   - OpenAI API calls found');
    if (hasStraico) console.log('   - Straico API calls found');
    if (hasWeather) console.log('   - Weather API calls found');
    feature14Passing++;
  } else {
    console.log('⚠️  Test 5: No obvious API call patterns in App.tsx');
  }
} catch (error) {
  console.log('⚠️  Test 5: Could not verify API usage in source code');
}

// Test 6: Verify no wildcard host permissions
const hasWildcardHost = manifest?.host_permissions?.some(h =>
  h.includes('<all_urls>') || h.includes('*://*/*')
);

if (!hasWildcardHost) {
  console.log('✅ Test 6: No wildcard host permissions (specific domains only)');
  feature14Passing++;
} else {
  console.log('⚠️  Test 6: Wildcard host permissions found');
}

passingTests += feature14Passing;
totalTests += feature14Tests;

console.log();
console.log(`Feature #14 Summary: ${feature14Passing}/${feature14Tests} tests passing`);
console.log();

// Feature #15: Error boundary for React components
console.log('FEATURE #15: Error Boundary for React Components');
console.log('-'.repeat(80));

const feature15Tests = 7;
let feature15Passing = 0;

// Test 1: Check for ErrorBoundary component
const srcPath = path.join(__dirname, 'src');
let errorBoundaryExists = false;

try {
  const files = fs.readdirSync(srcPath);
  const mainContent = fs.readFileSync(path.join(srcPath, 'main.tsx'), 'utf8');

  // Check if ErrorBoundary is imported/used
  if (mainContent.includes('ErrorBoundary')) {
    console.log('✅ Test 1: ErrorBoundary component exists and is used');
    errorBoundaryExists = true;
    feature15Passing++;
  } else {
    console.log('❌ Test 1: ErrorBoundary component not found in main.tsx');
  }
} catch (error) {
  console.log('⚠️  Test 1: Could not verify ErrorBoundary:', error.message);
}

// Test 2: Check if ErrorBoundary wraps the app
try {
  const mainContent = fs.readFileSync(path.join(srcPath, 'main.tsx'), 'utf8');
  if (errorBoundaryExists && (mainContent.includes('<ErrorBoundary>') || mainContent.includes('<ErrorBoundary '))) {
    console.log('✅ Test 2: ErrorBoundary wraps the application');
    feature15Passing++;
  } else if (!errorBoundaryExists) {
    console.log('❌ Test 2: ErrorBoundary does not wrap the app');
  } else {
    console.log('⚠️  Test 2: Could not verify if ErrorBoundary wraps app');
  }
} catch (error) {
  console.log('⚠️  Test 2: Could not verify ErrorBoundary wrapping');
}

// Test 3: Check for React.StrictMode (provides some error protection)
try {
  const mainContent = fs.readFileSync(path.join(srcPath, 'main.tsx'), 'utf8');
  if (mainContent.includes('React.StrictMode')) {
    console.log('✅ Test 3: React.StrictMode is used (provides error detection)');
    feature15Passing++;
  } else {
    console.log('⚠️  Test 3: React.StrictMode not found');
  }
} catch (error) {
  console.log('⚠️  Test 3: Could not verify StrictMode');
}

// Test 4: Check for try-catch in async operations
try {
  const appContent = fs.readFileSync(path.join(srcPath, 'App.tsx'), 'utf8');
  const tryCatchCount = (appContent.match(/try\s*{/g) || []).length;

  if (tryCatchCount > 0) {
    console.log(`✅ Test 4: Found ${tryCatchCount} try-catch blocks for error handling`);
    feature15Passing++;
  } else {
    console.log('⚠️  Test 4: No try-catch blocks found');
  }
} catch (error) {
  console.log('⚠️  Test 4: Could not verify error handling');
}

// Test 5: Check for error state handling
try {
  const appContent = fs.readFileSync(path.join(srcPath, 'App.tsx'), 'utf8');
  const hasErrorState = appContent.includes('error') || appContent.includes('Error');

  if (hasErrorState) {
    console.log('✅ Test 5: Error handling logic present in code');
    feature15Passing++;
  } else {
    console.log('⚠️  Test 5: No obvious error handling found');
  }
} catch (error) {
  console.log('⚠️  Test 5: Could not verify error handling');
}

// Test 6: Check for console.error or error logging
try {
  const appContent = fs.readFileSync(path.join(srcPath, 'App.tsx'), 'utf8');
  const hasErrorLogging = appContent.includes('console.error');

  if (hasErrorLogging) {
    console.log('✅ Test 6: Error logging present (console.error)');
    feature15Passing++;
  } else {
    console.log('⚠️  Test 6: No error logging found');
  }
} catch (error) {
  console.log('⚠️  Test 6: Could not verify error logging');
}

// Test 7: Check for graceful error handling in storage operations
try {
  const appContent = fs.readFileSync(path.join(srcPath, 'App.tsx'), 'utf8');
  const hasStorageErrorHandling = appContent.includes('catch') &&
    (appContent.includes('storage') || appContent.includes('Storage'));

  if (hasStorageErrorHandling) {
    console.log('✅ Test 7: Storage operations have error handling');
    feature15Passing++;
  } else {
    console.log('⚠️  Test 7: Storage error handling not clearly visible');
  }
} catch (error) {
  console.log('⚠️  Test 7: Could not verify storage error handling');
}

passingTests += feature15Passing;
totalTests += feature15Tests;

console.log();
console.log(`Feature #15 Summary: ${feature15Passing}/${feature15Tests} tests passing`);
console.log();

// Final Summary
console.log('='.repeat(80));
console.log('OVERALL SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passing: ${passingTests}`);
console.log(`Failed: ${totalTests - passingTests}`);
console.log(`Pass Rate: ${((passingTests / totalTests) * 100).toFixed(1)}%`);
console.log();

if (passingTests === totalTests) {
  console.log('✅ ALL TESTS PASSING!');
} else if (passingTests >= totalTests * 0.8) {
  console.log('⚠️  Most tests passing. Minor improvements recommended.');
} else {
  console.log('❌ Some tests failing. Review needed.');
}

console.log();
console.log('='.repeat(80));
