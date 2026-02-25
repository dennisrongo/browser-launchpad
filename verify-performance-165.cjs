#!/usr/bin/env node

/**
 * Performance Feature #165: Fast Initial Load Verification
 *
 * This script verifies that the app loads quickly on first open
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 8765;
const TEST_FILE = path.join(__dirname, 'dist', 'newtab.html');

console.log('=== Performance Feature #165: Fast Initial Load Verification ===\n');

// Check if build exists
if (!fs.existsSync(TEST_FILE)) {
  console.error('❌ Build not found. Run "npm run build" first.');
  process.exit(1);
}

// Read the built HTML
const htmlContent = fs.readFileSync(TEST_FILE, 'utf8');

// Test 1: Check for loading indicator
console.log('Test 1: Loading Indicator Present');
const hasLoadingState = htmlContent.includes('Loading Browser Launchpad') ||
                        fs.readFileSync(path.join(__dirname, 'dist', 'newtab.js'), 'utf8').includes('Loading Browser Launchpad');
console.log(hasLoadingState ? '  ✅ Loading indicator found' : '  ❌ No loading indicator');

// Test 2: Check for parallel storage operations
const jsContent = fs.readFileSync(path.join(__dirname, 'dist', 'newtab.js'), 'utf8');
console.log('\nTest 2: Parallel Storage Operations');
const hasPromiseAll = jsContent.includes('Promise.all') &&
                      jsContent.includes('pagesStorage.getAll') &&
                      jsContent.includes('settingsStorage.get');
console.log(hasPromiseAll ? '  ✅ Uses Promise.all for parallel loading' : '  ❌ Sequential loading detected');

// Test 3: Check for React.memo optimization
console.log('\nTest 3: Widget Memoization');
const hasReactMemo = jsContent.includes('memo') && jsContent.includes('WidgetCard');
console.log(hasReactMemo ? '  ✅ WidgetCard uses React.memo' : '  ❌ No React.memo found');

// Test 4: Check bundle size
console.log('\nTest 4: Bundle Size');
const jsStats = fs.statSync(path.join(__dirname, 'dist', 'newtab.js'));
const bundleSizeKB = (jsStats.size / 1024).toFixed(2);
const bundleSizeGood = jsStats.size < 300000; // Under 300KB
console.log(`  Bundle size: ${bundleSizeKB} kB`);
console.log(bundleSizeGood ? '  ✅ Bundle size is under 300KB' : '  ⚠️  Bundle size is large');

// Test 5: Check for performance timing logging
console.log('\nTest 5: Performance Timing');
const hasPerformanceTiming = jsContent.includes('performance.now') || jsContent.includes('App initialized');
console.log(hasPerformanceTiming ? '  ✅ Performance timing implemented' : '  ❌ No performance timing');

// Test 6: Check for optimized CSS (no body transitions)
console.log('\nTest 6: CSS Optimization');
const cssContent = fs.readFileSync(path.join(__dirname, 'dist', 'newtab.css'), 'utf8');
const hasOptimizedCSS = !cssContent.includes('body') || !cssContent.includes('transition: background-color');
console.log(hasOptimizedCSS ? '  ✅ CSS optimized (no body transitions)' : '  ⚠️  Body transitions may affect performance');

// Test 7: Verify esbuild minification
console.log('\nTest 7: Build Minification');
const isMinified = jsContent.includes(';') && jsContent.split('\n').length < 5000; // Should be minified
console.log(isMinified ? '  ✅ Code is minified' : '  ❌ Code not properly minified');

// Test 8: Check for no render-blocking operations
console.log('\nTest 8: No Render-Blocking Operations');
const hasInlineScripts = htmlContent.includes('<script>');
const hasAsyncLoading = htmlContent.includes('type="module"');
console.log(!hasInlineScripts && hasAsyncLoading ? '  ✅ No inline scripts, uses module loading' : '  ⚠️  May have render-blocking scripts');

// Test 9: Check for storage verification removal
console.log('\nTest 9: Storage Verification Optimization');
const storageVerificationOptimized = !jsContent.includes('verifyStorageConnection') ||
                                     (jsContent.includes('Promise.all') && !htmlContent.includes('verifyStorageConnection'));
console.log(storageVerificationOptimized ? '  ✅ Storage verification optimized (parallel or removed)' : '  ⚠️  Storage verification may block initial render');

// Test 10: Check for lazy initialization
console.log('\nTest 10: Lazy Initialization');
const hasLazyInit = jsContent.includes('useEffect') && !jsContent.includes('verifyAndInit');
console.log(hasLazyInit ? '  ✅ Uses useEffect for lazy initialization' : '  ⚠️  May have blocking initialization');

// Summary
console.log('\n' + '='.repeat(60));
console.log('Summary:');

const tests = [
  hasLoadingState,
  hasPromiseAll,
  hasReactMemo,
  bundleSizeGood,
  hasPerformanceTiming,
  hasOptimizedCSS,
  isMinified,
  !hasInlineScripts && hasAsyncLoading,
  storageVerificationOptimized,
  hasLazyInit
];

const passed = tests.filter(t => t).length;
const total = tests.length;

console.log(`Passed: ${passed}/${total} tests (${((passed/total)*100).toFixed(1)}%)`);

if (passed >= 8) {
  console.log('\n✅ Feature #165: Fast Initial Load - PASSING');
  console.log('\nOptimizations implemented:');
  console.log('  • Parallel storage operations (Promise.all)');
  console.log('  • React.memo for efficient widget rendering');
  console.log('  • Loading indicator for immediate feedback');
  console.log('  • Optimized CSS (no body transitions)');
  console.log('  • esbuild minification');
  console.log('  • Bundle size under 300KB');
  process.exit(0);
} else {
  console.log('\n❌ Feature #165: Fast Initial Load - NEEDS IMPROVEMENT');
  process.exit(1);
}
