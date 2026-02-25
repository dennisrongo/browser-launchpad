#!/usr/bin/env node

/**
 * Verification Script for Feature #23: Base Layout Components
 *
 * This script verifies that:
 * 1. Header component exists and has proper structure
 * 2. MainContainer component exists and has proper structure
 * 3. Header displays settings button
 * 4. MainContainer renders widget grid area
 * 5. Components use semantic HTML
 * 6. Proper heading hierarchy exists
 * 7. Responsive layout structure is present
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('Feature #23: Base Layout Components (header, main container)');
console.log('='.repeat(70));
console.log();

const RESULTS = {
  headerComponent: { name: 'Header component exists', tests: [] },
  mainContainerComponent: { name: 'MainContainer component exists', tests: [] },
  headerSettingsButton: { name: 'Header displays settings button', tests: [] },
  mainContainerGridArea: { name: 'MainContainer renders widget grid area', tests: [] },
  semanticHTML: { name: 'Components use semantic HTML', tests: [] },
  headingHierarchy: { name: 'Proper heading hierarchy', tests: [] },
  responsiveLayout: { name: 'Responsive layout structure', tests: [] },
};

function test(testName, condition, details = '') {
  const result = condition ? 'PASS' : 'FAIL';
  console.log(`  ${result}: ${testName}${details ? ` - ${details}` : ''}`);
  return condition;
}

// Test 1: Header component exists
console.log('TEST 1: Header component exists');
console.log('-'.repeat(70));

try {
  const headerPath = path.join(__dirname, 'src/components/Header.tsx');
  const headerExists = fs.existsSync(headerPath);
  RESULTS.headerComponent.tests.push(test('Header.tsx file exists', headerExists));

  if (headerExists) {
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    RESULTS.headerComponent.tests.push(test(
      'Header component is exported',
      headerContent.includes('export function Header')
    ));

    RESULTS.headerComponent.tests.push(test(
      'Header accepts props interface',
      headerContent.includes('interface HeaderProps')
    ));

    RESULTS.headerComponent.tests.push(test(
      'Header uses semantic <header> element',
      headerContent.includes('<header')
    ));

    RESULTS.headerComponent.tests.push(test(
      'Header accepts title prop',
      headerContent.includes('title?:')
    ));

    RESULTS.headerComponent.tests.push(test(
      'Header accepts storageVerified prop',
      headerContent.includes('storageVerified?:')
    ));

    RESULTS.headerComponent.tests.push(test(
      'Header accepts onSettingsClick prop',
      headerContent.includes('onSettingsClick?:')
    ));

    RESULTS.headerComponent.tests.push(test(
      'Header accepts children prop',
      headerContent.includes('children?:')
    ));
  }
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.headerComponent.tests.push(false);
}

console.log();

// Test 2: MainContainer component exists
console.log('TEST 2: MainContainer component exists');
console.log('-'.repeat(70));

try {
  const mainContainerPath = path.join(__dirname, 'src/components/MainContainer.tsx');
  const mainContainerExists = fs.existsSync(mainContainerPath);
  RESULTS.mainContainerComponent.tests.push(test('MainContainer.tsx file exists', mainContainerExists));

  if (mainContainerExists) {
    const mainContainerContent = fs.readFileSync(mainContainerPath, 'utf-8');

    RESULTS.mainContainerComponent.tests.push(test(
      'MainContainer component is exported',
      mainContainerContent.includes('export function MainContainer')
    ));

    RESULTS.mainContainerComponent.tests.push(test(
      'MainContainer accepts props interface',
      mainContainerContent.includes('interface MainContainerProps')
    ));

    RESULTS.mainContainerComponent.tests.push(test(
      'MainContainer uses semantic <main> element',
      mainContainerContent.includes('<main')
    ));

    RESULTS.mainContainerComponent.tests.push(test(
      'MainContainer accepts children prop',
      mainContainerContent.includes('children:')
    ));

    RESULTS.mainContainerComponent.tests.push(test(
      'MainContainer accepts className prop',
      mainContainerContent.includes('className?:')
    ));

    RESULTS.mainContainerComponent.tests.push(test(
      'MainContainer has default padding',
      mainContainerContent.includes('p-6')
    ));
  }
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.mainContainerComponent.tests.push(false);
}

console.log();

// Test 3: Header displays settings button
console.log('TEST 3: Header displays settings button');
console.log('-'.repeat(70));

try {
  const headerPath = path.join(__dirname, 'src/components/Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');

  RESULTS.headerSettingsButton.tests.push(test(
    'Settings button is rendered',
    headerContent.includes('<button')
  ));

  RESULTS.headerSettingsButton.tests.push(test(
    'Settings button has click handler',
    headerContent.includes('onClick={onSettingsClick}')
  ));

  RESULTS.headerSettingsButton.tests.push(test(
    'Settings button has accessible label',
    headerContent.includes('aria-label') || headerContent.includes('title=')
  ));

  RESULTS.headerSettingsButton.tests.push(test(
    'Settings button has gear icon',
    headerContent.includes('⚙️')
  ));

  RESULTS.headerSettingsButton.tests.push(test(
    'Settings button has text label',
    headerContent.includes('Settings')
  ));
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.headerSettingsButton.tests.push(false);
}

console.log();

// Test 4: MainContainer renders widget grid area
console.log('TEST 4: MainContainer renders widget grid area');
console.log('-'.repeat(70));

try {
  const appPath = path.join(__dirname, 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  RESULTS.mainContainerGridArea.tests.push(test(
    'App imports MainContainer component',
    appContent.includes("import { MainContainer }")
  ));

  RESULTS.mainContainerGridArea.tests.push(test(
    'App uses MainContainer component',
    appContent.includes('<MainContainer')
  ));

  RESULTS.mainContainerGridArea.tests.push(test(
    'MainContainer wraps widget grid',
    appContent.includes('grid') && appContent.includes('grid-cols')
  ));

  RESULTS.mainContainerGridArea.tests.push(test(
    'Widget grid is inside MainContainer',
    appContent.match(/<MainContainer[\s\S]*?<main/g) !== null
  ));

  RESULTS.mainContainerGridArea.tests.push(test(
    'MainContainer properly closed',
    appContent.includes('</MainContainer>')
  ));
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.mainContainerGridArea.tests.push(false);
}

console.log();

// Test 5: Components use semantic HTML
console.log('TEST 5: Components use semantic HTML');
console.log('-'.repeat(70));

try {
  const headerPath = path.join(__dirname, 'src/components/Header.tsx');
  const mainContainerPath = path.join(__dirname, 'src/components/MainContainer.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');
  const mainContainerContent = fs.readFileSync(mainContainerPath, 'utf-8');

  RESULTS.semanticHTML.tests.push(test(
    'Header uses <header> element',
    headerContent.includes('<header')
  ));

  RESULTS.semanticHTML.tests.push(test(
    'MainContainer uses <main> element',
    mainContainerContent.includes('<main')
  ));

  RESULTS.semanticHTML.tests.push(test(
    'Header contains <h1> for app title',
    headerContent.includes('<h1')
  ));

  RESULTS.semanticHTML.tests.push(test(
    'Settings button uses semantic <button>',
    headerContent.includes('<button')
  ));

  RESULTS.semanticHTML.tests.push(test(
    'No <div> used for main structural elements',
    !headerContent.match(/<div[^>]*className="header/) &&
    !mainContainerContent.match(/<div[^>]*className="main/)
  ));
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.semanticHTML.tests.push(false);
}

console.log();

// Test 6: Proper heading hierarchy
console.log('TEST 6: Proper heading hierarchy');
console.log('-'.repeat(70));

try {
  const headerPath = path.join(__dirname, 'src/components/Header.tsx');
  const appPath = path.join(__dirname, 'src/App.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  RESULTS.headingHierarchy.tests.push(test(
    'Header has <h1> as main heading',
    headerContent.includes('<h1')
  ));

  RESULTS.headingHierarchy.tests.push(test(
    'No other <h1> in component hierarchy',
    (appContent.match(/<h1/g) || []).length === 1
  ));

  RESULTS.headingHierarchy.tests.push(test(
    '<h2> used for section headings',
    appContent.includes('<h2')
  ));

  RESULTS.headingHierarchy.tests.push(test(
    '<h3> used for modal headings',
    appContent.includes('<h3')
  ));

  RESULTS.headingHierarchy.tests.push(test(
    'Proper heading hierarchy (h1 -> h2 -> h3)',
    headerContent.includes('<h1') && appContent.includes('<h2') && appContent.includes('<h3')
  ));
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.headingHierarchy.tests.push(false);
}

console.log();

// Test 7: Responsive layout structure
console.log('TEST 7: Responsive layout structure');
console.log('-'.repeat(70));

try {
  const appPath = path.join(__dirname, 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  RESULTS.responsiveLayout.tests.push(test(
    'Grid uses responsive classes (md: breakpoint)',
    appContent.includes('md:')
  ));

  RESULTS.responsiveLayout.tests.push(test(
    'Grid uses responsive classes (lg: breakpoint)',
    appContent.includes('lg:')
  ));

  RESULTS.responsiveLayout.tests.push(test(
    'Grid uses responsive classes (xl: breakpoint)',
    appContent.includes('xl:')
  ));

  RESULTS.responsiveLayout.tests.push(test(
    'Layout adapts to different screen sizes',
    appContent.includes('grid-cols-1') && appContent.includes('md:grid-cols-2')
  ));

  RESULTS.responsiveLayout.tests.push(test(
    'Min-height screen for full viewport',
    appContent.includes('min-h-screen')
  ));
} catch (error) {
  console.log(`  ERROR: ${error.message}`);
  RESULTS.responsiveLayout.tests.push(false);
}

console.log();

// Summary
console.log('='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));

const categories = Object.keys(RESULTS);
let totalTests = 0;
let passedTests = 0;

categories.forEach(category => {
  const tests = RESULTS[category].tests;
  const passed = tests.filter(t => t === true).length;
  const total = tests.length;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  totalTests += total;
  passedTests += passed;

  console.log(`${RESULTS[category].name}:`);
  console.log(`  ${passed}/${total} tests passing (${percentage}%)`);
});

console.log();
console.log(`TOTAL: ${passedTests}/${totalTests} tests passing (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log();

// Exit with appropriate code
process.exit(passedTests === totalTests ? 0 : 1);
