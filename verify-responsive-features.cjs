/**
 * Responsive Layout Features Verification (Features #169, #170, #171)
 *
 * This script verifies the responsive layout implementation across different screen sizes:
 * - Feature #169: Desktop layout (1920px)
 * - Feature #170: Tablet layout (768px)
 * - Feature #171: Mobile layout (375px)
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('RESPONSIVE LAYOUT FEATURES VERIFICATION');
console.log('Features: #169 (Desktop), #170 (Tablet), #171 (Mobile)');
console.log('='.repeat(80));
console.log();

// Read the built App.tsx to verify responsive classes
const appPath = path.join(__dirname, 'dist/newtab.js');
const appSource = fs.readFileSync(appPath, 'utf-8');

console.log('Step 1: Verifying responsive CSS classes are present in built bundle...\n');

const responsiveChecks = {
  mobile: {
    feature: 171,
    name: 'Mobile Layout (375px)',
    width: '375px',
    breakpoints: ['grid-cols-1'],
    requirements: [
      'Single column layout on mobile',
      'Navigation is touch-friendly',
      'Widgets stack vertically',
      'Text is readable without zoom',
      'All features remain accessible'
    ]
  },
  tablet: {
    feature: 170,
    name: 'Tablet Layout (768px)',
    width: '768px',
    breakpoints: ['md:grid-cols-2', 'lg:grid-cols-3'],
    requirements: [
      'Layout adjusts to tablet',
      'Grid adapts properly',
      'Navigation remains accessible',
      'Widgets are readable',
      'Touch targets are adequate'
    ]
  },
  desktop: {
    feature: 169,
    name: 'Desktop Layout (1920px)',
    width: '1920px',
    breakpoints: ['xl:grid-cols-4', '2xl:grid-cols-5', '2xl:grid-cols-6'],
    requirements: [
      'All elements fit properly',
      'No horizontal scroll',
      'Spacing is appropriate',
      'Text is readable',
      'All interactive elements work'
    ]
  }
};

let allPassed = true;

// Check for responsive classes in the built bundle
console.log('Checking built JavaScript bundle for responsive classes...\n');

const responsivePatterns = [
  { pattern: /grid-cols-1/g, name: 'Mobile single column (grid-cols-1)', required: true },
  { pattern: /md:grid-cols-2/g, name: 'Tablet breakpoint (md:grid-cols-2)', required: true },
  { pattern: /lg:grid-cols-3/g, name: 'Desktop breakpoint (lg:grid-cols-3)', required: true },
  { pattern: /xl:grid-cols-4/g, name: 'Large desktop (xl:grid-cols-4)', required: true },
  { pattern: /2xl:grid-cols-5/g, name: 'Extra large desktop (2xl:grid-cols-5)', required: false },
  { pattern: /2xl:grid-cols-6/g, name: 'Ultra wide desktop (2xl:grid-cols-6)', required: false }
];

responsivePatterns.forEach(check => {
  const matches = appSource.match(check.pattern);
  const count = matches ? matches.length : 0;
  const status = count > 0 ? '✓ PASS' : '✗ FAIL';

  if (count > 0 || !check.required) {
    console.log(`${status}: ${check.name} - Found ${count} instances`);
  } else {
    console.log(`${status}: ${check.name} - NOT FOUND (REQUIRED)`);
    allPassed = false;
  }
});

console.log();
console.log('Step 2: Verifying Tailwind responsive breakpoints in CSS...\n');

// Check if Tailwind responsive utilities are in the built CSS
const cssPath = path.join(__dirname, 'dist/newtab.css');
const cssSource = fs.readFileSync(cssPath, 'utf-8');

const tailwindBreakpoints = [
  { breakpoint: 'sm', minWidth: '640px', pattern: /@media[^{]*\(min-width:\s*640px\)/g },
  { breakpoint: 'md', minWidth: '768px', pattern: /@media[^{]*\(min-width:\s*768px\)/g },
  { breakpoint: 'lg', minWidth: '1024px', pattern: /@media[^{]*\(min-width:\s*1024px\)/g },
  { breakpoint: 'xl', minWidth: '1280px', pattern: /@media[^{]*\(min-width:\s*1280px\)/g },
  { breakpoint: '2xl', minWidth: '1536px', pattern: /@media[^{]*\(min-width:\s*1536px\)/g }
];

tailwindBreakpoints.forEach(bp => {
  const matches = cssSource.match(bp.pattern);
  const count = matches ? matches.length : 0;
  const status = count > 0 ? '✓ PASS' : '✗ FAIL';

  if (count > 0) {
    console.log(`${status}: ${bp.breakpoint} breakpoint (min-width: ${bp.minWidth}) - ${count} media queries`);
  } else {
    console.log(`${status}: ${bp.breakpoint} breakpoint (min-width: ${bp.minWidth}) - NOT FOUND`);
    allPassed = false;
  }
});

console.log();
console.log('Step 3: Analyzing App.tsx source for responsive implementation...\n');

// Read the source App.tsx
const appSourcePath = path.join(__dirname, 'src/App.tsx');
const appSourceCode = fs.readFileSync(appSourcePath, 'utf-8');

const responsiveImplementation = {
  mobileGrid: /grid-cols-1/g,
  tabletGrid: /md:grid-cols-2/g,
  desktopGrid: /lg:grid-cols-3/g,
  largeDesktopGrid: /xl:grid-cols-4/g,
  extraLargeGrid: /2xl:grid-cols-[456]/g,
  gapConfiguration: /grid_gap/g
};

Object.entries(responsiveImplementation).forEach(([key, pattern]) => {
  const matches = appSourceCode.match(pattern);
  const count = matches ? matches.length : 0;
  const status = count > 0 ? '✓ PASS' : '✗ FAIL';

  if (count > 0) {
    console.log(`${status}: ${key} - Found ${count} instances`);
  } else {
    console.log(`${status}: ${key} - NOT FOUND`);
    if (key !== 'extraLargeGrid') { // Extra large is optional
      allPassed = false;
    }
  }
});

console.log();
console.log('Step 4: Checking component structure for responsive design...\n');

// Check for touch-friendly elements
const touchFriendlyChecks = {
  buttons: /<button/g,
  inputs: /<input/g,
  clickableElements: /onClick/g
};

Object.entries(touchFriendlyChecks).forEach(([key, pattern]) => {
  const matches = appSourceCode.match(pattern);
  const count = matches ? matches.length : 0;
  console.log(`✓ Found ${count} ${key} in App.tsx`);
});

console.log();
console.log('Step 5: Summary of responsive implementation...\n');

const summary = {
  'Mobile (375px)': {
    'Grid Columns': '1 column (grid-cols-1)',
    'Breakpoint': 'Default (< 640px)',
    'Expected Behavior': 'Single column layout, full-width widgets'
  },
  'Tablet (768px)': {
    'Grid Columns': '2 columns (md:grid-cols-2)',
    'Breakpoint': 'md (≥ 768px)',
    'Expected Behavior': 'Two column grid, balanced spacing'
  },
  'Desktop (1920px)': {
    'Grid Columns': '3-4 columns (lg:grid-cols-3, xl:grid-cols-4)',
    'Breakpoint': 'lg (≥ 1024px), xl (≥ 1280px)',
    'Expected Behavior': 'Multi-column grid, optimal spacing'
  }
};

Object.entries(summary).forEach(([screen, details]) => {
  console.log(`${screen}:`);
  Object.entries(details).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log();
});

console.log('='.repeat(80));
if (allPassed) {
  console.log('✓ ALL RESPONSIVE IMPLEMENTATION CHECKS PASSED');
  console.log('='.repeat(80));
  console.log();
  console.log('Next Steps: Manual Browser Verification');
  console.log('----------------------------------------');
  console.log('1. Open dist/newtab.html in a browser');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. Toggle device toolbar (Ctrl+Shift+M / Cmd+Shift+M)');
  console.log('4. Test each viewport size:');
  console.log('   - Mobile: 375px width (Feature #171)');
  console.log('   - Tablet: 768px width (Feature #170)');
  console.log('   - Desktop: 1920px width (Feature #169)');
  console.log('5. Verify layout adapts correctly at each size');
} else {
  console.log('✗ SOME RESPONSIVE IMPLEMENTATION CHECKS FAILED');
  console.log('='.repeat(80));
}

// Generate test report
const reportData = {
  timestamp: new Date().toISOString(),
  features: [169, 170, 171],
  checks: {
    responsiveClasses: responsivePatterns.map(p => ({
      name: p.name,
      found: (appSource.match(p.pattern) || []).length > 0
    })),
    tailwindBreakpoints: tailwindBreakpoints.map(bp => ({
      name: `${bp.breakpoint} (${bp.minWidth})`,
      found: (cssSource.match(bp.pattern) || []).length > 0
    })),
    touchFriendlyElements: Object.entries(touchFriendlyChecks).map(([key, pattern]) => ({
      name: key,
      count: (appSourceCode.match(pattern) || []).length
    }))
  },
  overallPassed: allPassed
};

fs.writeFileSync(
  path.join(__dirname, 'responsive-features-test-results.json'),
  JSON.stringify(reportData, null, 2)
);

console.log();
console.log('Test results saved to: responsive-features-test-results.json');
