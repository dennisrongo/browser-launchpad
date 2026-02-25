/**
 * Theme Verification Script for Features #122, #123, #124
 *
 * This script verifies that:
 * - Feature #122: Modern Light theme has correct colors
 * - Feature #123: Dark Elegance theme has correct colors
 * - Feature #124: Theme applies across all components
 */

const fs = require('fs');
const path = require('path');

// Expected theme values from spec
const EXPECTED_THEMES = {
  'modern-light': {
    primary: '#3B82F6',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#1F2937',
    'text-secondary': '#6B7280',
    border: '#E5E7EB'
  },
  'dark-elegance': {
    primary: '#8B5CF6',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    'text-secondary': '#9CA3AF',
    border: '#374151'
  }
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function check(cssContent, regex, description) {
  const match = cssContent.match(regex);
  if (match) {
    log(colors.green, `  ✓ ${description}`);
    return true;
  } else {
    log(colors.red, `  ✗ ${description}`);
    return false;
  }
}

function extractCSSValue(cssContent, property) {
  // Match CSS variable definitions like: --color-primary: #3B82F6;
  const regex = new RegExp(`--color-${property}:\\s*([^;]+);`);
  const match = cssContent.match(regex);
  return match ? match[1].trim() : null;
}

function verifyFeature122() {
  log(colors.blue, '\n=== Feature #122: Modern Light Theme ===');

  const cssPath = path.join(__dirname, 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  let allPass = true;

  // Check :root theme (modern-light)
  log(colors.yellow, '\nVerifying :root (Modern Light) theme colors:');

  const expectedModernLight = EXPECTED_THEMES['modern-light'];
  for (const [key, expectedValue] of Object.entries(expectedModernLight)) {
    const actualValue = extractCSSValue(cssContent, key);
    if (actualValue === expectedValue) {
      log(colors.green, `  ✓ --color-${key}: ${actualValue}`);
    } else {
      log(colors.red, `  ✗ --color-${key}: expected "${expectedValue}", got "${actualValue}"`);
      allPass = false;
    }
  }

  return allPass;
}

function verifyFeature123() {
  log(colors.blue, '\n=== Feature #123: Dark Elegance Theme ===');

  const cssPath = path.join(__dirname, 'src/index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  let allPass = true;

  // Check .dark theme (dark-elegance)
  log(colors.yellow, '\nVerifying .dark (Dark Elegance) theme colors:');

  // Extract the .dark block
  const darkBlockMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/);
  if (!darkBlockMatch) {
    log(colors.red, '  ✗ No .dark theme block found in CSS');
    return false;
  }

  const darkBlock = darkBlockMatch[1];
  const expectedDarkElegance = EXPECTED_THEMES['dark-elegance'];

  for (const [key, expectedValue] of Object.entries(expectedDarkElegance)) {
    const regex = new RegExp(`--color-${key}:\\s*([^;]+);`);
    const match = darkBlock.match(regex);
    const actualValue = match ? match[1].trim() : null;

    if (actualValue === expectedValue) {
      log(colors.green, `  ✓ --color-${key}: ${actualValue}`);
    } else {
      log(colors.red, `  ✗ --color-${key}: expected "${expectedValue}", got "${actualValue}"`);
      allPass = false;
    }
  }

  return allPass;
}

function verifyFeature124() {
  log(colors.blue, '\n=== Feature #124: Theme Application Across Components ===');

  let allPass = true;

  // Check App.tsx for theme switching logic
  log(colors.yellow, '\nVerifying theme switching logic in App.tsx:');

  const appPath = path.join(__dirname, 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Check for handleSettingsChange that applies theme
  if (appContent.includes('handleSettingsChange')) {
    log(colors.green, '  ✓ handleSettingsChange function exists');

    // Check for dark class manipulation
    if (appContent.includes("document.documentElement.classList.add('dark')")) {
      log(colors.green, '  ✓ Adds "dark" class for Dark Elegance theme');
    } else {
      log(colors.red, '  ✗ Missing code to add "dark" class');
      allPass = false;
    }

    if (appContent.includes("document.documentElement.classList.remove('dark')")) {
      log(colors.green, '  ✓ Removes "dark" class for Modern Light theme');
    } else {
      log(colors.red, '  ✗ Missing code to remove "dark" class');
      allPass = false;
    }
  } else {
    log(colors.red, '  ✗ handleSettingsChange function not found');
    allPass = false;
  }

  // Check SettingsModal.tsx for theme selection
  log(colors.yellow, '\nVerifying theme selection UI in SettingsModal.tsx:');

  const modalPath = path.join(__dirname, 'src/components/SettingsModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  if (modalContent.includes('modern-light')) {
    log(colors.green, '  ✓ "modern-light" theme option exists');
  } else {
    log(colors.red, '  ✗ Missing "modern-light" theme option');
    allPass = false;
  }

  if (modalContent.includes('dark-elegance')) {
    log(colors.green, '  ✓ "dark-elegance" theme option exists');
  } else {
    log(colors.red, '  ✗ Missing "dark-elegance" theme option');
    allPass = false;
  }

  if (modalContent.includes('setTheme')) {
    log(colors.green, '  ✓ Theme state management exists');
  } else {
    log(colors.red, '  ✗ Missing theme state management');
    allPass = false;
  }

  // Check that CSS classes are used in components
  log(colors.yellow, '\nVerifying theme CSS classes usage:');

  // Check body background and text
  if (appContent.includes('bg-background')) {
    log(colors.green, '  ✓ App uses bg-background class');
  } else {
    log(colors.red, '  ✗ App missing bg-background class');
    allPass = false;
  }

  if (appContent.includes('text-text')) {
    log(colors.green, '  ✓ App uses text-text class');
  } else {
    log(colors.red, '  ✗ App missing text-text class');
    allPass = false;
  }

  // Check header uses theme classes
  if (appContent.includes('bg-surface') || appContent.includes('border-border')) {
    log(colors.green, '  ✓ Header uses surface/border theme classes');
  } else {
    log(colors.red, '  ✗ Header missing theme classes');
    allPass = false;
  }

  // Check widget cards use theme
  const widgetCardPath = path.join(__dirname, 'src/components/WidgetCard.tsx');
  if (fs.existsSync(widgetCardPath)) {
    const widgetCardContent = fs.readFileSync(widgetCardPath, 'utf-8');
    if (widgetCardContent.includes('bg-background') || widgetCardContent.includes('bg-surface')) {
      log(colors.green, '  ✓ WidgetCard uses theme background classes');
    } else {
      log(colors.red, '  ✗ WidgetCard missing theme background classes');
      allPass = false;
    }
  }

  // Check modals use theme
  if (modalContent.includes('bg-surface')) {
    log(colors.green, '  ✓ SettingsModal uses surface class');
  } else {
    log(colors.red, '  ✗ SettingsModal missing surface class');
    allPass = false;
  }

  return allPass;
}

function main() {
  log(colors.bold, '\n╔════════════════════════════════════════════════════════════╗');
  log(colors.bold, '║   THEME FEATURES VERIFICATION - #122, #123, #124          ║');
  log(colors.bold, '╚════════════════════════════════════════════════════════════╝');

  const feature122Pass = verifyFeature122();
  const feature123Pass = verifyFeature123();
  const feature124Pass = verifyFeature124();

  log(colors.bold, '\n=== VERIFICATION SUMMARY ===\n');

  log(colors.bold, `Feature #122 (Modern Light):    ${feature122Pass ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}`);
  log(colors.bold, `Feature #123 (Dark Elegance):   ${feature123Pass ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}`);
  log(colors.bold, `Feature #124 (Across Components): ${feature124Pass ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}`);

  const allPass = feature122Pass && feature123Pass && feature124Pass;

  log(colors.bold, '\n' + '═'.repeat(60));
  if (allPass) {
    log(colors.green + colors.bold, '\n🎉 ALL THEME FEATURES VERIFIED SUCCESSFULLY!\n');
  } else {
    log(colors.red + colors.bold, '\n⚠️  SOME VERIFICATIONS FAILED - SEE DETAILS ABOVE\n');
  }

  return allPass ? 0 : 1;
}

// Run verification
const exitCode = main();
process.exit(exitCode);
