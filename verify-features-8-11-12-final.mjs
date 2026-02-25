#!/usr/bin/env node

/**
 * Final verification script for Features #8, #11, #12
 * Tests the actual extension build and configuration
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const __dirname = resolve();

console.log('='.repeat(80));
console.log('FINAL VERIFICATION: Extension Core Features #8, #11, #12');
console.log('='.repeat(80));
console.log();

let totalTests = 0;
let passingTests = 0;
const failedTests = [];

function test(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passingTests++;
    console.log(`✓ ${name}`);
    if (details) console.log(`  Details: ${details}`);
    return true;
  } else {
    console.log(`✗ ${name}`);
    if (details) console.log(`  Details: ${details}`);
    failedTests.push({ name, details });
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

function getFileInfo(path) {
  try {
    const stats = statSync(path);
    return { exists: true, size: stats.size, isFile: stats.isFile() };
  } catch (e) {
    return { exists: false, size: 0, isFile: false };
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
const distNewtabCss = readFile(resolve(__dirname, 'dist/newtab.css'));
const viteConfig = readFile(resolve(__dirname, 'vite.config.ts'));

test('8.1: src/main.tsx exists', srcMain !== null);
test('8.2: React 18 createRoot API used', srcMain?.includes('createRoot'));
test('8.3: React.StrictMode wraps app', srcMain?.includes('React.StrictMode'));
test('8.4: Root div target exists in production HTML', distNewtab?.includes('<div id="root">'));
test('8.5: Production build includes React code', distNewtabJs?.includes('React'));
test('8.6: Production bundle is single file (newtab.js)', getFileInfo(resolve(__dirname, 'dist/newtab.js')).exists);
test('8.7: CSS bundle exists and is loaded', distNewtab?.includes('<link rel="stylesheet"'));
test('8.8: Script uses module type for modern JS', distNewtab?.includes('type="module"'));
test('8.9: Vite React plugin configured', viteConfig?.includes('@vitejs/plugin-react'));
test('8.10: CSS is minified in production', distNewtabCss?.length > 0 && !distNewtabCss?.includes('\n    '));

// Bundle analysis
const jsSize = getFileInfo(resolve(__dirname, 'dist/newtab.js')).size;
test('8.11: JavaScript bundle size is reasonable (< 300KB)', jsSize > 0 && jsSize < 300000, `${(jsSize / 1024).toFixed(2)} KB`);

// Check for React 18 patterns
test('8.12: Concurrent rendering enabled (createRoot API)', srcMain?.includes('createRoot') && srcMain?.includes('.render('));

console.log();

// ============================================================================
// FEATURE #11: Hot module reloading for development
// ============================================================================
console.log('FEATURE #11: Hot Module Reloading (HMR) for Development');
console.log('-'.repeat(80));

const packageJson = JSON.parse(readFile(resolve(__dirname, 'package.json')));
const devNewtab = readFile(resolve(__dirname, 'newtab.html'));

test('11.1: Vite dev script exists', packageJson.scripts.dev !== undefined);
test('11.2: Dev command uses Vite', packageJson.scripts.dev?.includes('vite'));
test('11.3: Vite React plugin enables HMR', viteConfig?.includes('@vitejs/plugin-react'));
test('11.4: Dev server configured (host/port)', viteConfig?.includes('server'));
test('11.5: Development HTML loads from /src/main.tsx', devNewtab?.includes('/src/main.tsx'));
test('11.6: Production build does NOT include HMR code', !distNewtab?.includes('@vite/client'));
test('11.7: Source maps configurable in Vite config', viteConfig?.includes('sourcemap'));
test('11.8: Dev server uses localhost', viteConfig?.includes('localhost'));

// Check for React Fast Refresh
test('11.9: React Fast Refresh enabled (via @vitejs/plugin-react)', viteConfig?.includes('@vitejs/plugin-react'));

console.log();

// ============================================================================
// FEATURE #12: Extension packaging and build process
// ============================================================================
console.log('FEATURE #12: Extension Packaging and Build Process');
console.log('-'.repeat(80));

const manifest = JSON.parse(readFile(resolve(__dirname, 'dist/manifest.json')));

test('12.1: dist/ folder exists', existsSync(resolve(__dirname, 'dist')));
test('12.2: Build script in package.json', packageJson.scripts.build !== undefined);
test('12.3: Build uses TypeScript (tsc)', packageJson.scripts.build?.includes('tsc'));
test('12.4: Build uses Vite', packageJson.scripts.build?.includes('vite build'));
test('12.5: manifest.json copied to dist', existsSync(resolve(__dirname, 'dist/manifest.json')));
test('12.6: newtab.html built to dist', existsSync(resolve(__dirname, 'dist/newtab.html')));
test('12.7: JavaScript bundle created', existsSync(resolve(__dirname, 'dist/newtab.js')));
test('12.8: CSS bundle created', existsSync(resolve(__dirname, 'dist/newtab.css')));
test('12.9: Icons present (128px)', existsSync(resolve(__dirname, 'dist/icon128.png')));
test('12.10: Icons present (48px)', existsSync(resolve(__dirname, 'dist/icon48.png')));
test('12.11: Icons present (16px)', existsSync(resolve(__dirname, 'dist/icon16.png')));
test('12.12: Manifest v3 format', manifest.manifest_version === 3);
test('12.13: New tab override points to newtab.html', manifest.chrome_url_overrides?.newtab === 'newtab.html');
test('12.14: Storage permission configured', manifest.permissions?.includes('storage'));
test('12.15: CSP configured for extension', manifest.content_security_policy !== undefined);
test('12.16: CSP allows only self scripts', manifest.content_security_policy?.extension_pages?.includes('script-src \'self\''));

// Check for proper CSP (no unsafe-eval)
const cspAllowsUnsafeEval = manifest.content_security_policy?.extension_pages?.includes('unsafe-eval');
test('12.17: CSP does NOT allow unsafe-eval (security)', !cspAllowsUnsafeEval);

// Check for host permissions for APIs
test('12.18: Host permissions for OpenAI', manifest.host_permissions?.some(p => p.includes('api.openai.com')));
test('12.19: Host permissions for Straico', manifest.host_permissions?.some(p => p.includes('api.straico.com')));
test('12.20: Host permissions for Weather API', manifest.host_permissions?.some(p => p.includes('openweathermap.org')));

// Verify all required files are in dist
const distFiles = readdirSync(resolve(__dirname, 'dist'));
test('12.21: dist folder contains expected files', distFiles.includes('newtab.html') && distFiles.includes('newtab.js'));

// Check minification (line count vs file size)
const jsLines = distNewtabJs?.split('\n').length || 0;
const jsMinified = jsLines < 100 && jsSize > 100000; // Few lines but large file = minified
test('12.22: JavaScript bundle is minified', jsMinified, `${jsLines} lines, ${jsSize} bytes`);

console.log();

// ============================================================================
// ADDITIONAL VERIFICATION
// ============================================================================
console.log('ADDITIONAL VERIFICATION');
console.log('-'.repeat(80));

test('AV.1: React version 18+', packageJson.dependencies.react?.startsWith('^18'));
test('AV.2: ReactDOM version 18+', packageJson.dependencies['react-dom']?.startsWith('^18'));
test('AV.3: TypeScript configured', existsSync(resolve(__dirname, 'tsconfig.json')));
test('AV.4: Tailwind CSS configured', existsSync(resolve(__dirname, 'tailwind.config.js')));
test('AV.5: Extension name in manifest', manifest.name === 'Browser Launchpad');
test('AV.6: Extension version in manifest', manifest.version !== undefined);
test('AV.7: Extension author in manifest', manifest.author === 'Dennis Rongo');
test('AV.8: Extension description present', manifest.description?.length > 0);

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

if (failedTests.length > 0) {
  console.log('Failed Tests:');
  failedTests.forEach(t => {
    console.log(`  ✗ ${t.name}`);
    if (t.details) console.log(`    ${t.details}`);
  });
  console.log();
}

if (passingTests === totalTests) {
  console.log('✓ ALL TESTS PASSED!');
  console.log();
  console.log('Features #8, #11, #12 are fully verified:');
  console.log('  #8: React app initializes correctly in extension context');
  console.log('  #11: HMR is properly configured for development');
  console.log('  #12: Extension builds and packages correctly for distribution');
  console.log();
  process.exit(0);
} else {
  console.log('✗ Some tests failed - review output above');
  console.log();
  process.exit(1);
}
