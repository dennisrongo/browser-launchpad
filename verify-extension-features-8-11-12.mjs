#!/usr/bin/env node

/**
 * Verification Script for Features #8, #11, #12
 *
 * Feature #8: React app initialization in extension context
 * Feature #11: Hot module reloading for development
 * Feature #12: Extension packaging and build process
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';

const __dirname = resolve();

console.log('='.repeat(80));
console.log('VERIFYING EXTENSION CORE FEATURES #8, #11, #12');
console.log('='.repeat(80));
console.log();

let totalTests = 0;
let passingTests = 0;

function test(name, condition) {
  totalTests++;
  if (condition) {
    passingTests++;
    console.log(`✓ ${name}`);
    return true;
  } else {
    console.log(`✗ ${name}`);
    return false;
  }
}

function readFile(path) {
  try {
    return readFileSync(path, 'utf-8');
  } catch (e) {
    return null;
  }
}

// ============================================================================
// FEATURE #8: React app initialization in extension context
// ============================================================================
console.log('FEATURE #8: React App Initialization in Extension Context');
console.log('-'.repeat(80));

const srcMain = readFile(resolve(__dirname, 'src/main.tsx'));
const distNewtab = readFile(resolve(__dirname, 'dist/newtab.html'));
const distNewtabJs = readFile(resolve(__dirname, 'dist/newtab.js'));
const viteConfig = readFile(resolve(__dirname, 'vite.config.ts'));

test('8.1: src/main.tsx exists - React root mounting', srcMain !== null);
test('8.2: React 18 createRoot API used', srcMain?.includes('createRoot'));
test('8.3: React.StrictMode wraps app', srcMain?.includes('React.StrictMode'));
test('8.4: Root div target exists in HTML', distNewtab?.includes('<div id="root">'));
test('8.5: Production build includes React code', distNewtabJs?.includes('React'));
test('8.6: Bundle contains ReactDOM', distNewtabJs?.includes('ReactDOM'));
test('8.7: Vite config for React plugin', viteConfig?.includes('@vitejs/plugin-react'));

// Check for React 18+ specific patterns
test('8.8: React 18 concurrent rendering enabled', srcMain?.includes('createRoot'));

// Check for extension context mounting
test('8.9: CSS loaded for extension', distNewtab?.includes('<link rel="stylesheet"'));
test('8.10: Script module loading correctly', distNewtab?.includes('<script type="module"'));

console.log();

// ============================================================================
// FEATURE #11: Hot module reloading for development
// ============================================================================
console.log('FEATURE #11: Hot Module Reloading (HMR) for Development');
console.log('-'.repeat(80));

const packageJson = JSON.parse(readFile(resolve(__dirname, 'package.json')));
const srcApp = readFile(resolve(__dirname, 'src/App.tsx'));

test('11.1: Vite dev script exists', packageJson.scripts.dev !== undefined);
test('11.2: Vite dev command configured', packageJson.scripts.dev?.includes('vite'));
test('11.3: Vite React plugin enables HMR', viteConfig?.includes('@vitejs/plugin-react'));
test('11.4: Dev server configured (host/port)', viteConfig?.includes('server'));
test('11.5: Development mode script loading', readFile(resolve(__dirname, 'newtab.html'))?.includes('/src/main.tsx'));
test('11.6: HMR not in production build', !distNewtab?.includes('@vite/client'));
test('11.7: Source maps for development (check vite config)', viteConfig?.includes('sourcemap'));
test('11.8: Fast refresh enabled via React plugin', viteConfig?.includes('@vitejs/plugin-react'));

console.log();

// ============================================================================
// FEATURE #12: Extension packaging and build process
// ============================================================================
console.log('FEATURE #12: Extension Packaging and Build Process');
console.log('-'.repeat(80));

const manifest = JSON.parse(readFile(resolve(__dirname, 'dist/manifest.json')));

test('12.1: dist/ folder exists', existsSync(resolve(__dirname, 'dist')));
test('12.2: Build script in package.json', packageJson.scripts.build !== undefined);
test('12.3: Build uses TypeScript', packageJson.scripts.build?.includes('tsc'));
test('12.4: Build uses Vite', packageJson.scripts.build?.includes('vite build'));
test('12.5: manifest.json copied to dist', existsSync(resolve(__dirname, 'dist/manifest.json')));
test('12.6: newtab.html built to dist', existsSync(resolve(__dirname, 'dist/newtab.html')));
test('12.7: JavaScript bundle created', existsSync(resolve(__dirname, 'dist/newtab.js')));
test('12.8: CSS bundle created', existsSync(resolve(__dirname, 'dist/newtab.css')));
test('12.9: Extension icons in dist', existsSync(resolve(__dirname, 'dist/icon128.png')));
test('12.10: Manifest v3 format', manifest.manifest_version === 3);
test('12.11: New tab override configured', manifest.chrome_url_overrides?.newtab === 'newtab.html');
test('12.12: Storage permission configured', manifest.permissions?.includes('storage'));
test('12.13: CSP configured for extension', manifest.content_security_policy !== undefined);
test('12.14: Icons properly configured in manifest', manifest.icons?.['128'] !== undefined);
test('12.15: Bundle size reasonable (< 300KB)', statSync(resolve(__dirname, 'dist/newtab.js')).size < 300000);

// Check build output
test('12.16: Production build is minified', distNewtabJs?.includes('function') && !distNewtabJs?.includes('\n    '));
test('12.17: No inline eval in CSP (security)', manifest.content_security_policy?.extension_pages?.includes('script-src \'self\''));

console.log();

// ============================================================================
// ADDITIONAL CROSS-FEATURE VERIFICATION
// ============================================================================
console.log('CROSS-FEATURE VERIFICATION');
console.log('-'.repeat(80));

test('XF.1: React 18+ version in dependencies', packageJson.dependencies.react?.startsWith('^18'));
test('XF.2: ReactDOM 18+ version', packageJson.dependencies['react-dom']?.startsWith('^18'));
test('XF.3: TypeScript configured', existsSync(resolve(__dirname, 'tsconfig.json')));
test('XF.4: Tailwind CSS configured for styling', existsSync(resolve(__dirname, 'tailwind.config.js')));
test('XF.5: Production CSP does not allow unsafe-eval for scripts',
  !manifest.content_security_policy?.extension_pages?.includes('unsafe-eval'));

console.log();

// ============================================================================
// SUMMARY
// ============================================================================
console.log('='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passing: ${passingTests}`);
console.log(`Failing: ${totalTests - passingTests}`);
console.log(`Pass Rate: ${((passingTests / totalTests) * 100).toFixed(1)}%`);
console.log();

if (passingTests === totalTests) {
  console.log('✓ ALL TESTS PASSED - Features #8, #11, #12 verified!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed - review output above');
  process.exit(1);
}
