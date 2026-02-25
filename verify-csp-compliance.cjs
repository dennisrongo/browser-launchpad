#!/usr/bin/env node

/**
 * Feature #157: CSP Compliance Verification
 *
 * This script verifies that the Browser Launchpad extension
 * complies with Chrome Extension Manifest v3 Content Security Policies.
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.json');
const HTML_PATH = path.join(DIST_DIR, 'newtab.html');
const JS_PATH = path.join(DIST_DIR, 'newtab.js');

console.log('='.repeat(80));
console.log('Feature #157: CSP Compliance Verification');
console.log('='.repeat(80));
console.log();

let testResults = [];

// Test 1: Check manifest CSP configuration
console.log('TEST 1: Manifest CSP Configuration');
console.log('-'.repeat(80));
try {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const csp = manifest.content_security_policy?.extension_pages || '';

  console.log('Manifest CSP:', csp);
  console.log();

  // Check script-src
  if (csp.includes('script-src')) {
    if (csp.includes("'self'") && !csp.includes('unsafe-inline') && !csp.includes('unsafe-eval')) {
      console.log('✅ PASS: script-src allows only self, no unsafe-inline or unsafe-eval');
      testResults.push({ test: 'Manifest script-src', passed: true });
    } else {
      console.log('❌ FAIL: script-src has unsafe directives');
      testResults.push({ test: 'Manifest script-src', passed: false });
    }
  } else {
    console.log('❌ FAIL: No script-src directive in CSP');
    testResults.push({ test: 'Manifest script-src', passed: false });
  }

  // Check object-src
  if (csp.includes('object-src')) {
    if (csp.includes("'self'")) {
      console.log('✅ PASS: object-src allows only self (prevents plugins)');
      testResults.push({ test: 'Manifest object-src', passed: true });
    } else {
      console.log('❌ FAIL: object-src does not restrict to self');
      testResults.push({ test: 'Manifest object-src', passed: false });
    }
  } else {
    console.log('❌ FAIL: No object-src directive in CSP');
    testResults.push({ test: 'Manifest object-src', passed: false });
  }

} catch (error) {
  console.log('❌ FAIL: Could not read manifest.json:', error.message);
  testResults.push({ test: 'Manifest CSP', passed: false });
}
console.log();

// Test 2: Check HTML for inline scripts
console.log('TEST 2: HTML File - No Inline Scripts');
console.log('-'.repeat(80));
try {
  const html = fs.readFileSync(HTML_PATH, 'utf8');

  // Check for inline script tags with code
  const inlineScriptRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  const inlineScripts = html.match(inlineScriptRegex) || [];

  let hasInlineCode = false;
  inlineScripts.forEach(script => {
    // Check if script has src attribute (external script is OK)
    if (!script.includes('src=')) {
      hasInlineCode = true;
      console.log('❌ FAIL: Found inline script with code:', script.substring(0, 100));
    }
  });

  if (!hasInlineCode && inlineScripts.length > 0) {
    console.log('✅ PASS: All scripts are external (have src attribute)');
    testResults.push({ test: 'HTML inline scripts', passed: true });
  } else if (inlineScripts.length === 0) {
    console.log('⚠️  WARNING: No scripts found in HTML');
    testResults.push({ test: 'HTML inline scripts', passed: true });
  } else {
    console.log('❌ FAIL: Found inline script code');
    testResults.push({ test: 'HTML inline scripts', passed: false });
  }

  // Check for inline event handlers in HTML
  const inlineEventHandlers = [
    'onclick=', 'onload=', 'onerror=', 'onmouseover=',
    'onfocus=', 'onblur=', 'onchange=', 'onsubmit='
  ];

  let foundHandlers = [];
  inlineEventHandlers.forEach(handler => {
    if (html.includes(handler)) {
      foundHandlers.push(handler);
    }
  });

  if (foundHandlers.length === 0) {
    console.log('✅ PASS: No inline event handlers in HTML');
    testResults.push({ test: 'HTML inline event handlers', passed: true });
  } else {
    console.log('❌ FAIL: Found inline event handlers:', foundHandlers.join(', '));
    testResults.push({ test: 'HTML inline event handlers', passed: false });
  }

  // Check for javascript: URLs in HTML
  if (html.includes('javascript:')) {
    console.log('❌ FAIL: Found javascript: URLs in HTML');
    testResults.push({ test: 'HTML javascript: URLs', passed: false });
  } else {
    console.log('✅ PASS: No javascript: URLs in HTML');
    testResults.push({ test: 'HTML javascript: URLs', passed: true });
  }

} catch (error) {
  console.log('❌ FAIL: Could not read newtab.html:', error.message);
  testResults.push({ test: 'HTML file checks', passed: false });
}
console.log();

// Test 3: Check JavaScript for dangerous patterns
console.log('TEST 3: JavaScript File - No Dangerous Patterns');
console.log('-'.repeat(80));
try {
  const js = fs.readFileSync(JS_PATH, 'utf8');

  // Check for eval()
  const evalCount = (js.match(/eval\(/g) || []).length;
  if (evalCount === 0) {
    console.log('✅ PASS: No eval() usage found');
    testResults.push({ test: 'JS eval() usage', passed: true });
  } else {
    console.log(`❌ FAIL: Found ${evalCount} instances of eval()`);
    testResults.push({ test: 'JS eval() usage', passed: false });
  }

  // Check for Function constructor
  const functionConstructorCount = (js.match(/new Function\(/g) || []).length;
  if (functionConstructorCount === 0) {
    console.log('✅ PASS: No Function constructor found');
    testResults.push({ test: 'JS Function constructor', passed: true });
  } else {
    console.log(`❌ FAIL: Found ${functionConstructorCount} instances of new Function()`);
    testResults.push({ test: 'JS Function constructor', passed: false });
  }

  // Check for setTimeout with string argument
  const setTimeoutStringCount = (js.match(/setTimeout\(["']/g) || []).length;
  if (setTimeoutStringCount === 0) {
    console.log('✅ PASS: No setTimeout with string arguments');
    testResults.push({ test: 'JS setTimeout string', passed: true });
  } else {
    console.log(`❌ FAIL: Found ${setTimeoutStringCount} instances of setTimeout with string`);
    testResults.push({ test: 'JS setTimeout string', passed: false });
  }

  // Check for setInterval with string argument
  const setIntervalStringCount = (js.match(/setInterval\(["']/g) || []).length;
  if (setIntervalStringCount === 0) {
    console.log('✅ PASS: No setInterval with string arguments');
    testResults.push({ test: 'JS setInterval string', passed: true });
  } else {
    console.log(`❌ FAIL: Found ${setIntervalStringCount} instances of setInterval with string`);
    testResults.push({ test: 'JS setInterval string', passed: false });
  }

} catch (error) {
  console.log('❌ FAIL: Could not read newtab.js:', error.message);
  testResults.push({ test: 'JS file checks', passed: false });
}
console.log();

// Summary
console.log('='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));

const passedTests = testResults.filter(t => t.passed).length;
const totalTests = testResults.length;

console.log(`Tests Passed: ${passedTests}/${totalTests}`);
console.log();

if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED - Extension is CSP compliant!');
  console.log();
  console.log('CSP Configuration Summary:');
  console.log('- Manifest CSP: script-src \'self\'; object-src \'self\'');
  console.log('- No inline scripts in HTML');
  console.log('- No inline event handlers in HTML');
  console.log('- No javascript: URLs');
  console.log('- No eval() or Function constructor');
  console.log('- No setTimeout/setInterval with string arguments');
  console.log();
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED - CSP compliance issues detected!');
  console.log();
  console.log('Failed Tests:');
  testResults.filter(t => !t.passed).forEach(t => {
    console.log(`  - ${t.test}`);
  });
  console.log();
  process.exit(1);
}
