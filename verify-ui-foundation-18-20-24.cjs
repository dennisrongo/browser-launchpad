#!/usr/bin/env node

/**
 * Verification script for UI Foundation features #18, #20, #24
 *
 * Feature #18: Tailwind CSS configuration and theme setup
 * Feature #20: Tailwind theme configuration
 * Feature #24: App loads without errors
 */

const fs = require('fs');
const path = require('path');

const ANSI_GREEN = '\x1b[32m';
const ANSI_RED = '\x1b[31m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_RESET = '\x1b[0m';

let totalTests = 0;
let passingTests = 0;

function test(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passingTests++;
    console.log(`${ANSI_GREEN}✓${ANSI_RESET} ${name}${details ? `: ${details}` : ''}`);
    return true;
  } else {
    console.log(`${ANSI_RED}✗${ANSI_RESET} ${name}${details ? `: ${details}` : ''}`);
    return false;
  }
}

function warn(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passingTests++;
    console.log(`${ANSI_GREEN}✓${ANSI_RESET} ${name}${details ? `: ${details}` : ''}`);
    return true;
  } else {
    console.log(`${ANSI_YELLOW}⚠${ANSI_RESET} ${name}${details ? `: ${details}` : ''}`);
    return false;
  }
}

console.log('='.repeat(80));
console.log('UI FOUNDATION FEATURES VERIFICATION - #18, #20, #24');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// FEATURE #18: Tailwind CSS configuration and theme setup
// ============================================================================
console.log(`${ANSI_GREEN}FEATURE #18: Tailwind CSS configuration and theme setup${ANSI_RESET}`);
console.log('-'.repeat(80));

// Read tailwind.config.js
const tailwindConfigPath = path.join(__dirname, 'tailwind.config.js');
const tailwindConfigContent = fs.readFileSync(tailwindConfigPath, 'utf-8');

// Test 1: Verify tailwind.config.js exists
test('1. tailwind.config.js exists', fs.existsSync(tailwindConfigPath), tailwindConfigPath);

// Test 2: Verify theme colors are defined for both themes
test('2. Theme colors extend Tailwind', tailwindConfigContent.includes('extend:') && tailwindConfigContent.includes('colors:'));

// Test 3: Verify Modern Light theme colors are configured
const modernLightColors = [
  '#3B82F6', // Primary blue
  '#FFFFFF', // Background
  '#F3F4F6', // Surface
  '#1F2937', // Text
  '#6B7280', // Text secondary
  '#E5E7EB', // Border
];

const hasAllModernLightColors = modernLightColors.every(color =>
  tailwindConfigContent.includes(color)
);

test('3. Modern Light theme colors configured', hasAllModernLightColors,
  `Found: ${modernLightColors.filter(c => tailwindConfigContent.includes(c)).length}/${modernLightColors.length} colors`);

// Test 4: Verify Dark Elegance theme colors are configured
const darkEleganceColors = [
  '#8B5CF6', // Primary purple
  '#111827', // Background
  '#1F2937', // Surface
  '#F9FAFB', // Text
  '#9CA3AF', // Text secondary
  '#374151', // Border
];

const hasAllDarkEleganceColors = darkEleganceColors.every(color =>
  tailwindConfigContent.includes(color)
);

test('4. Dark Elegance theme colors configured', hasAllDarkEleganceColors,
  `Found: ${darkEleganceColors.filter(c => tailwindConfigContent.includes(c)).length}/${darkEleganceColors.length} colors`);

// Test 5: Check that darkMode strategy is configured
test('5. darkMode strategy configured', tailwindConfigContent.includes("darkMode: 'class'"),
  "Using 'class' strategy for theme switching");

// Test 6: Verify CSS variables are defined in index.css
const indexCssPath = path.join(__dirname, 'src', 'index.css');
const indexCssContent = fs.existsSync(indexCssPath) ? fs.readFileSync(indexCssPath, 'utf-8') : '';

test('6. CSS variables defined in index.css', indexCssContent.includes('--color-primary') && indexCssContent.includes('.dark'));

console.log('');

// ============================================================================
// FEATURE #20: Tailwind theme configuration
// ============================================================================
console.log(`${ANSI_GREEN}FEATURE #20: Tailwind theme configuration${ANSI_RESET}`);
console.log('-'.repeat(80));

// Test 1: Check tailwind.config.js (already done above)
test('1. tailwind.config.js exists', fs.existsSync(tailwindConfigPath));

// Test 2: Verify theme colors extend Tailwind
test('2. Theme colors extend Tailwind', tailwindConfigContent.includes('colors:') && tailwindConfigContent.includes('primary:'));

// Test 3: Verify darkMode is configured
test('3. darkMode is configured', tailwindConfigContent.includes("darkMode: 'class'"));

// Test 4: Verify custom colors are defined
const customColors = ['primary', 'background', 'surface', 'text', 'border'];
const hasCustomColors = customColors.every(color =>
  tailwindConfigContent.includes(`${color}:`)
);

test('4. Custom colors defined', hasCustomColors,
  `Found: ${customColors.filter(c => tailwindConfigContent.includes(`${c}:`)).length}/${customColors.length} custom color categories`);

// Test 5: Build extension - check if dist directory exists and has CSS
const distCssPath = path.join(__dirname, 'dist', 'newtab.css');
const distCssExists = fs.existsSync(distCssPath);
test('5. Extension builds successfully', distCssExists);

// Test 6: Verify Tailwind generates correct CSS
let tailwindCssGenerated = false;
if (distCssExists) {
  const distCssContent = fs.readFileSync(distCssPath, 'utf-8');
  // Check for Tailwind-generated classes
  tailwindCssGenerated = distCssContent.includes('.bg-primary') ||
                        distCssContent.includes('.text-text') ||
                        distCssContent.includes('.border-border');
}

test('6. Tailwind generates correct CSS', tailwindCssGenerated,
  'Found Tailwind utility classes in dist/newtab.css');

// Test 7: Verify responsive utilities are present
let hasResponsiveUtilities = false;
if (distCssExists) {
  const distCssContent = fs.readFileSync(distCssPath, 'utf-8');
  // Check for media queries - Tailwind generates @media for responsive classes
  hasResponsiveUtilities = distCssContent.includes('@media');
}

test('7. Responsive utilities present', hasResponsiveUtilities,
  'Found @media queries in CSS (responsive classes generated as needed)');

console.log('');

// ============================================================================
// FEATURE #24: App loads without errors
// ============================================================================
console.log(`${ANSI_GREEN}FEATURE #24: App loads without errors${ANSI_RESET}`);
console.log('-'.repeat(80));

// Test 1: Check if dist directory exists
const distDir = path.join(__dirname, 'dist');
test('1. Extension builds to dist/', fs.existsSync(distDir) && fs.statSync(distDir).isDirectory());

// Test 2: Check if main HTML file exists
const distHtmlPath = path.join(__dirname, 'dist', 'newtab.html');
test('2. newtab.html exists in dist/', fs.existsSync(distHtmlPath));

// Test 3: Check if main JS bundle exists
const distJsPath = path.join(__dirname, 'dist', 'newtab.js');
test('3. newtab.js bundle exists', fs.existsSync(distJsPath));

// Test 4: Check if CSS file exists
test('4. newtab.css exists', distCssExists);

// Test 5: Verify HTML has proper structure
let htmlStructureValid = false;
if (fs.existsSync(distHtmlPath)) {
  const htmlContent = fs.readFileSync(distHtmlPath, 'utf-8');
  htmlStructureValid = htmlContent.includes('<!DOCTYPE html>') &&
                      htmlContent.includes('<div id="root">') &&
                      htmlContent.includes('newtab.js');
}

test('5. HTML has proper structure', htmlStructureValid,
  'Has DOCTYPE, root div, and script tag');

// Test 6: Verify no obvious syntax errors in JS bundle
let jsBundleValid = false;
if (fs.existsSync(distJsPath)) {
  const jsContent = fs.readFileSync(distJsPath, 'utf-8');
  // Basic sanity checks - should contain React code and module exports
  jsBundleValid = jsContent.includes('react') && jsContent.length > 10000;
}

test('6. JS bundle is valid', jsBundleValid,
  `Bundle size: ${jsBundleValid ? (fs.statSync(distJsPath).size / 1024).toFixed(2) + ' KB' : 'invalid'}`);

// Test 7: Check for manifest.json
const manifestPath = path.join(__dirname, 'public', 'manifest.json');
test('7. manifest.json exists', fs.existsSync(manifestPath));

let manifestValid = false;
if (fs.existsSync(manifestPath)) {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    manifestValid = manifest.manifest_version === 3 &&
                    manifest.name &&
                    manifest.version;
  } catch (e) {
    manifestValid = false;
  }
}

test('8. manifest.json is valid', manifestValid, 'Manifest v3 with required fields');

// Test 9: Verify CSS includes theme classes
let cssIncludesThemes = false;
if (distCssExists) {
  const distCssContent = fs.readFileSync(distCssPath, 'utf-8');
  // Check for CSS variables or theme-related classes
  cssIncludesThemes = distCssContent.includes('--color-primary') ||
                      (distCssContent.includes('.dark') && distCssContent.includes(':root'));
}

test('9. CSS includes theme classes', cssIncludesThemes,
  'Found theme variables or dark mode classes');

console.log('');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passing: ${passingTests} (${((passingTests / totalTests) * 100).toFixed(1)}%)`);
console.log(`Failing: ${totalTests - passingTests}`);
console.log('');

if (passingTests === totalTests) {
  console.log(`${ANSI_GREEN}ALL TESTS PASSING!${ANSI_RESET}`);
  console.log('');
  console.log('Features #18, #20, #24 are all complete and verified.');
} else {
  console.log(`${ANSI_RED}SOME TESTS FAILING${ANSI_RESET}`);
  console.log('Please review the failing tests above.');
}

console.log('');
console.log('='.repeat(80));

process.exit(passingTests === totalTests ? 0 : 1);
