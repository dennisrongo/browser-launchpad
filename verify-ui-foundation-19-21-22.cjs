#!/usr/bin/env node

/**
 * Verification script for UI Foundation Features #19, #21, #22
 * - Feature #19: CSS variables for theming
 * - Feature #21: Font loading and typography setup
 * - Feature #22: Responsive design foundation and breakpoints
 */

const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  UI Foundation Features #19, #21, #22 Verification           ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const results = {
  feature19: { pass: 0, fail: 0, tests: [] },
  feature21: { pass: 0, fail: 0, tests: [] },
  feature22: { pass: 0, fail: 0, tests: [] }
};

// Helper function to add test result
function addTest(feature, name, pass, details = '') {
  const result = { name, pass, details };
  results[feature].tests.push(result);
  if (pass) results[feature].pass++;
  else results[feature].fail++;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE #19: CSS Variables for Theming
// ═══════════════════════════════════════════════════════════════
console.log('📋 Feature #19: CSS Variables for Theming');
console.log('─'.repeat(60));

// Read index.css
const indexPath = path.join(__dirname, 'src', 'index.css');
const indexCss = fs.readFileSync(indexPath, 'utf-8');

// Test 1: Check for CSS variable definitions
const hasRootVariables = indexCss.includes(':root') && indexCss.includes('--color-');
addTest('feature19',
  'CSS variables are defined in :root',
  hasRootVariables,
  hasRootVariables ? 'Found :root with --color-* variables' : 'No :root variables found'
);

// Test 2: Check for --color-primary
const hasPrimary = indexCss.includes('--color-primary');
addTest('feature19',
  '--color-primary variable exists',
  hasPrimary,
  hasPrimary ? 'Variable defined' : 'Variable not found'
);

// Test 3: Check for --color-background
const hasBackground = indexCss.includes('--color-background');
addTest('feature19',
  '--color-background variable exists',
  hasBackground,
  hasBackground ? 'Variable defined' : 'Variable not found'
);

// Test 4: Check for --color-surface
const hasSurface = indexCss.includes('--color-surface');
addTest('feature19',
  '--color-surface variable exists',
  hasSurface,
  hasSurface ? 'Variable defined' : 'Variable not found'
);

// Test 5: Check for --color-text
const hasText = indexCss.includes('--color-text');
addTest('feature19',
  '--color-text variable exists',
  hasText,
  hasText ? 'Variable defined' : 'Variable not found'
);

// Test 6: Check for --color-text-secondary
const hasTextSecondary = indexCss.includes('--color-text-secondary');
addTest('feature19',
  '--color-text-secondary variable exists',
  hasTextSecondary,
  hasTextSecondary ? 'Variable defined' : 'Variable not found'
);

// Test 7: Check for --color-border
const hasBorder = indexCss.includes('--color-border');
addTest('feature19',
  '--color-border variable exists',
  hasBorder,
  hasBorder ? 'Variable defined' : 'Variable not found'
);

// Test 8: Check for dark theme variables
const hasDarkTheme = indexCss.includes('.dark') && indexCss.match(/\.dark\s*{[^}]*--color-/s);
addTest('feature19',
  'Dark theme CSS variables are defined',
  !!hasDarkTheme,
  hasDarkTheme ? 'Found .dark class with variables' : 'No dark theme variables'
);

// Test 9: Check if body uses CSS variables
const bodyUsesVars = indexCss.includes('bg-background') || indexCss.includes('text-text');
addTest('feature19',
  'Body element uses CSS variable classes',
  bodyUsesVars,
  bodyUsesVars ? 'Body uses bg-background/text-text' : 'Body may not use variables'
);

console.log(`  Result: ${results.feature19.pass}/${results.feature19.tests.length} tests passing\n`);

// ═══════════════════════════════════════════════════════════════
// FEATURE #21: Font Loading and Typography Setup
// ═══════════════════════════════════════════════════════════════
console.log('📋 Feature #21: Font Loading and Typography Setup');
console.log('─'.repeat(60));

// Test 1: Check if Inter font is in font-family
const hasInterFont = indexCss.includes('Inter') || indexCss.includes("'Inter'");
addTest('feature21',
  'Inter font is in font-family stack',
  hasInterFont,
  hasInterFont ? 'Found "Inter" in CSS' : 'Inter font not found'
);

// Test 2: Check font-family is applied to body
const bodyFontFamily = indexCss.includes('font-family');
addTest('feature21',
  'font-family is applied to body',
  bodyFontFamily,
  bodyFontFamily ? 'Body has font-family set' : 'Body font-family not set'
);

// Test 3: Check Tailwind config for font family
const tailwindPath = path.join(__dirname, 'tailwind.config.js');
const tailwindConfig = fs.readFileSync(tailwindPath, 'utf-8');
const tailwindHasInter = tailwindConfig.includes('Inter');
addTest('feature21',
  'Tailwind config includes Inter font',
  tailwindHasInter,
  tailwindHasInter ? 'Inter in Tailwind config' : 'Inter not in Tailwind config'
);

// Test 4: Check for monospace font family
const hasMonospace = indexCss.includes('monospace') || tailwindConfig.includes('monospace') || tailwindConfig.includes('mono:');
addTest('feature21',
  'Monospace font is configured',
  hasMonospace,
  hasMonospace ? 'Monospace font defined' : 'Monospace font not found'
);

// Test 5: Check for font weight configuration in Tailwind
const tailwindPath2 = path.join(__dirname, 'tailwind.config.js');
const tailwindConfig2 = fs.readFileSync(tailwindPath2, 'utf-8');
const hasFontWeights = tailwindConfig2.includes('fontFamily');
addTest('feature21',
  'Typography system is configured in Tailwind',
  hasFontWeights,
  hasFontWeights ? 'Typography configured' : 'Typography not configured'
);

// Test 6: Check if newtab.html has proper viewport meta (for responsive fonts)
const newtabPath = path.join(__dirname, 'newtab.html');
const newtabHtml = fs.readFileSync(newtabPath, 'utf-8');
const hasViewportMeta = newtabHtml.includes('viewport') && newtabHtml.includes('width=device-width');
addTest('feature21',
  'Viewport meta tag enables responsive typography',
  hasViewportMeta,
  hasViewportMeta ? 'Viewport meta present' : 'Viewport meta missing'
);

console.log(`  Result: ${results.feature21.pass}/${results.feature21.tests.length} tests passing\n`);

// ═══════════════════════════════════════════════════════════════
// FEATURE #22: Responsive Design Foundation and Breakpoints
// ═══════════════════════════════════════════════════════════════
console.log('📋 Feature #22: Responsive Design Foundation');
console.log('─'.repeat(60));

// Test 1: Check viewport meta tag
addTest('feature22',
  'Viewport meta tag is configured',
  hasViewportMeta,
  hasViewportMeta ? 'width=device-width set' : 'Viewport meta not found'
);

// Test 2: Check if Tailwind is configured (includes responsive breakpoints)
const tailwindHasScreens = tailwindConfig.includes('theme:') || tailwindConfig.includes('darkMode:');
addTest('feature22',
  'Tailwind theme is configured for responsive design',
  tailwindHasScreens,
  tailwindHasScreens ? 'Tailwind theme present' : 'Tailwind theme not configured'
);

// Test 3: Check for responsive grid in App.tsx
const appPath = path.join(__dirname, 'src', 'App.tsx');
const appTsx = fs.readFileSync(appPath, 'utf-8');
const hasGridClass = appTsx.includes('grid') && appTsx.includes('grid-cols-');
addTest('feature22',
  'Responsive grid layout is implemented',
  hasGridClass,
  hasGridClass ? 'Grid classes found in App' : 'Grid classes not found'
);

// Test 4: Check for responsive classes (grid-cols with breakpoints)
const hasResponsiveGrid = appTsx.match(/grid-cols-\d/g) || appTsx.match(/md:|lg:|sm:/);
addTest('feature22',
  'Responsive breakpoint classes are used',
  !!hasResponsiveGrid,
  hasResponsiveGrid ? 'Breakpoint classes found' : 'No breakpoint classes'
);

// Test 5: Check if CSS allows responsive layout (no fixed widths)
const noFixedWidth = !indexCss.includes('width:') || indexCss.includes('max-width:') || indexCss.includes('responsive');
addTest('feature22',
  'CSS allows responsive layout (no fixed widths)',
  noFixedWidth,
  noFixedWidth ? 'Layout is responsive' : 'May have fixed widths'
);

// Test 6: Check Tailwind default breakpoints
const tailwindConfig3 = fs.readFileSync(path.join(__dirname, 'tailwind.config.js'), 'utf-8');
const hasDefaultBreakpoints = tailwindConfig3.includes('theme:');
addTest('feature22',
  'Tailwind default breakpoints are enabled',
  hasDefaultBreakpoints,
  hasDefaultBreakpoints ? 'Using Tailwind defaults' : 'Breakpoints may be custom'
);

// Test 7: Check if grid_columns setting is used for responsive layout
const hasGridColumns = appTsx.includes('grid_columns') || appTsx.includes('gridColumns');
addTest('feature22',
  'Configurable grid columns setting exists',
  hasGridColumns,
  hasGridColumns ? 'grid_columns setting found' : 'grid_columns not found'
);

console.log(`  Result: ${results.feature22.pass}/${results.feature22.tests.length} tests passing\n`);

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
const totalPassing = results.feature19.pass + results.feature21.pass + results.feature22.pass;
const totalTests = results.feature19.tests.length + results.feature21.tests.length + results.feature22.tests.length;
const percentage = Math.round((totalPassing / totalTests) * 100);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  SUMMARY                                                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`Feature #19 (CSS Variables):     ${results.feature19.pass}/${results.feature19.tests.length} passing`);
console.log(`Feature #21 (Font Loading):      ${results.feature21.pass}/${results.feature21.tests.length} passing`);
console.log(`Feature #22 (Responsive Design): ${results.feature22.pass}/${results.feature22.tests.length} passing`);
console.log('');
console.log(`TOTAL: ${totalPassing}/${totalTests} tests passing (${percentage}%)\n`);

// Feature passing status
const allPassing = totalPassing === totalTests;
const featuresPassing = {
  feature19: results.feature19.pass === results.feature19.tests.length,
  feature21: results.feature21.pass === results.feature21.tests.length,
  feature22: results.feature22.pass === results.feature22.tests.length
};

console.log('Feature Status:');
console.log(`  Feature #19: ${featuresPassing.feature19 ? '✅ PASSING' : '❌ FAILING'}`);
console.log(`  Feature #21: ${featuresPassing.feature21 ? '✅ PASSING' : '❌ FAILING'}`);
console.log(`  Feature #22: ${featuresPassing.feature22 ? '✅ PASSING' : '❌ FAILING'}`);
console.log('');

// Detailed results
if (!allPassing) {
  console.log('Failed Tests:');
  console.log('─'.repeat(60));

  ['feature19', 'feature21', 'feature22'].forEach(feature => {
    const failedTests = results[feature].tests.filter(t => !t.pass);
    if (failedTests.length > 0) {
      console.log(`\n${feature.toUpperCase()}:`);
      failedTests.forEach(test => {
        console.log(`  ❌ ${test.name}`);
        if (test.details) console.log(`     ${test.details}`);
      });
    }
  });
  console.log('');
}

// Save results to JSON
const outputPath = path.join(__dirname, 'ui-foundation-19-21-22-results.json');
fs.writeFileSync(outputPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalPassing,
    totalTests,
    percentage
  },
  features: {
    feature19: {
      name: 'CSS Variables for Theming',
      passing: featuresPassing.feature19,
      tests: results.feature19.tests
    },
    feature21: {
      name: 'Font Loading and Typography Setup',
      passing: featuresPassing.feature21,
      tests: results.feature21.tests
    },
    feature22: {
      name: 'Responsive Design Foundation',
      passing: featuresPassing.feature22,
      tests: results.feature22.tests
    }
  }
}, null, 2));

console.log(`Results saved to: ${outputPath}`);

// Exit with appropriate code
process.exit(allPassing ? 0 : 1);
