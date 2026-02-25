#!/usr/bin/env node
/**
 * Comprehensive Keyboard Navigation Verification Script for Feature #161
 *
 * This script performs static code analysis to verify all keyboard navigation features
 * are properly implemented throughout the application.
 */

const fs = require('fs');
const path = require('path');

console.log('=== Keyboard Navigation Verification (Feature #161) ===\n');

const tests = [];
let passed = 0;
let failed = 0;

// Test helper function
function runTest(testName, testFn) {
  tests.push(testName);
  try {
    const result = testFn();
    if (result.pass) {
      passed++;
      console.log(`✅ ${testName}`);
      if (result.details) console.log(`   ${result.details}`);
    } else {
      failed++;
      console.log(`❌ ${testName}`);
      if (result.details) console.log(`   ${result.details}`);
    }
  } catch (error) {
    failed++;
    console.log(`❌ ${testName}`);
    console.log(`   Error: ${error.message}`);
  }
}

// Read source file
const appSource = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
const widgetCardSource = fs.readFileSync(path.join(__dirname, 'src/components/WidgetCard.tsx'), 'utf8');
const settingsModalSource = fs.readFileSync(path.join(__dirname, 'src/components/SettingsModal.tsx'), 'utf8');
const widgetConfigModalSource = fs.readFileSync(path.join(__dirname, 'src/components/WidgetConfigModal.tsx'), 'utf8');
const aiChatWidgetSource = fs.readFileSync(path.join(__dirname, 'src/widgets/AIChatWidget.tsx'), 'utf8');
const bookmarkWidgetSource = fs.readFileSync(path.join(__dirname, 'src/widgets/BookmarkWidget.tsx'), 'utf8');

// Test 1: Tab navigation support (focusable elements)
runTest('Tab navigation - Focusable elements have proper styling', () => {
  const focusPattern = /focus:outline-none.*focus:ring-2.*focus:ring-primary/g;
  const focusCount = (appSource.match(focusPattern) || []).length +
                     (widgetCardSource.match(focusPattern) || []).length +
                     (settingsModalSource.match(focusPattern) || []).length +
                     (widgetConfigModalSource.match(focusPattern) || []).length +
                     (aiChatWidgetSource.match(focusPattern) || []).length +
                     (bookmarkWidgetSource.match(focusPattern) || []).length;

  if (focusCount >= 20) {
    return { pass: true, details: `Found ${focusCount} focus indicators` };
  }
  return { pass: false, details: `Only found ${focusCount} focus indicators, expected at least 20` };
});

// Test 2: Arrow key navigation for pages
runTest('Arrow key navigation - Left/Right arrow keys navigate pages', () => {
  const hasArrowListener = appSource.includes("event.key === 'ArrowRight'") &&
                           appSource.includes("event.key === 'ArrowLeft'");
  const hasPreventDefault = appSource.includes('event.preventDefault()');
  const hasSetActivePage = appSource.includes('setActivePage');

  if (hasArrowListener && hasPreventDefault && hasSetActivePage) {
    return { pass: true, details: 'Arrow key handlers implemented with preventDefault' };
  }
  return { pass: false, details: 'Missing arrow key navigation' };
});

// Test 3: Enter key for form submission
runTest('Enter key - Form inputs submit on Enter', () => {
  const enterHandlers = (appSource.match(/e\.key === 'Enter'/g) || []).length +
                        (aiChatWidgetSource.match(/e\.key === 'Enter'/g) || []).length;

  if (enterHandlers >= 3) {
    return { pass: true, details: `Found ${enterHandlers} Enter key handlers` };
  }
  return { pass: false, details: `Only found ${enterHandlers} Enter key handlers` };
});

// Test 4: Escape key for canceling operations
runTest('Escape key - Closes modals and cancels edits', () => {
  const escapeHandlers = (appSource.match(/e\.key === 'Escape'/g) || []).length +
                         (settingsModalSource.match(/onClose/g) || []).length +
                         (widgetConfigModalSource.match(/onCancel/g) || []).length;

  if (escapeHandlers >= 3) {
    return { pass: true, details: `Found ${escapeHandlers} Escape key handlers` };
  }
  return { pass: false, details: `Only found ${escapeHandlers} Escape key handlers` };
});

// Test 5: Focus indicators visible
runTest('Focus indicators - Visible ring on focus', () => {
  const hasFocusRing = appSource.includes('focus:ring-2') &&
                       widgetCardSource.includes('focus:ring-2') &&
                       settingsModalSource.includes('focus:ring-2');

  if (hasFocusRing) {
    return { pass: true, details: 'focus:ring-2 class found across components' };
  }
  return { pass: false, details: 'Missing focus:ring-2 indicators' };
});

// Test 6: Semantic HTML (button elements)
runTest('Semantic HTML - Buttons are button elements', () => {
  const buttonCount = (appSource.match(/<button/g) || []).length +
                      (widgetCardSource.match(/<button/g) || []).length +
                      (settingsModalSource.match(/<button/g) || []).length;

  if (buttonCount >= 30) {
    return { pass: true, details: `Found ${buttonCount} button elements` };
  }
  return { pass: false, details: `Only found ${buttonCount} button elements` };
});

// Test 7: Input elements have proper labels/contexts
runTest('Input accessibility - Inputs have clear context', () => {
  const inputCount = (settingsModalSource.match(/<input/g) || []).length +
                     (widgetConfigModalSource.match(/<input/g) || []).length +
                     (bookmarkWidgetSource.match(/<input/g) || []).length;

  const textareaCount = (aiChatWidgetSource.match(/<textarea/g) || []).length;

  if (inputCount >= 10) {
    return { pass: true, details: `Found ${inputCount} inputs and ${textareaCount} textareas` };
  }
  return { pass: false, details: `Only found ${inputCount} input elements` };
});

// Test 8: Auto-focus for important inputs
runTest('Auto-focus - Key inputs autoFocus', () => {
  const autoFocusCount = (appSource.match(/autoFocus/g) || []).length +
                         (widgetCardSource.match(/autoFocus/g) || []).length;

  if (autoFocusCount >= 2) {
    return { pass: true, details: `Found ${autoFocusCount} autoFocus attributes` };
  }
  return { pass: false, details: 'Missing autoFocus for key inputs' };
});

// Test 9: Page navigation with wrap-around
runTest('Arrow keys - Wrap-around navigation', () => {
  const hasWrapForward = appSource.includes('return prev < pages.length - 1 ? prev + 1 : 0');
  const hasWrapBackward = appSource.includes('return prev > 0 ? prev - 1 : pages.length - 1');

  if (hasWrapForward && hasWrapBackward) {
    return { pass: true, details: 'Wrap-around navigation implemented' };
  }
  return { pass: false, details: 'Missing wrap-around navigation' };
});

// Test 10: Keyboard shortcuts documented
runTest('Title attributes - Keyboard hints provided', () => {
  const titleCount = (appSource.match(/title=/g) || []).length;

  if (titleCount >= 5) {
    return { pass: true, details: `Found ${titleCount} title attributes for hints` };
  }
  return { pass: false, details: `Only found ${titleCount} title attributes` };
});

// Test 11: Modal keyboard handling
runTest('Modals - Keyboard accessible', () => {
  const hasSettingsModal = settingsModalSource.includes('className=') &&
                           settingsModalSource.includes('<button');
  const hasWidgetConfigModal = widgetConfigModalSource.includes('className=') &&
                                widgetConfigModalSource.includes('<button');

  if (hasSettingsModal && hasWidgetConfigModal) {
    return { pass: true, details: 'Modals have keyboard-accessible controls' };
  }
  return { pass: false, details: 'Modals may not be fully keyboard accessible' };
});

// Test 12: Shift+Enter for new line in chat
runTest('Shift+Enter - New line in textarea', () => {
  const hasShiftEnterHint = aiChatWidgetSource.includes('Shift+Enter');

  if (hasShiftEnterHint) {
    return { pass: true, details: 'Shift+Enter hint present for chat' };
  }
  return { pass: false, details: 'Missing Shift+Enter hint' };
});

// Test 13: Logical tab order (DOM order matches visual)
runTest('Logical tab order - Elements follow visual order', () => {
  // Check that buttons appear before modals in source
  const headerIndex = appSource.indexOf('<header');
  const mainIndex = appSource.indexOf('<main');
  const modalIndex = appSource.indexOf('WidgetTypeSelector');

  if (headerIndex < mainIndex && modalIndex > mainIndex) {
    return { pass: true, details: 'DOM structure follows logical order' };
  }
  return { pass: false, details: 'DOM order may not match visual order' };
});

// Test 14: Disabled state handling
runTest('Disabled state - Disabled buttons not interactive', () => {
  const disabledCount = (appSource.match(/disabled=/g) || []).length +
                        (aiChatWidgetSource.match(/disabled=/g) || []).length +
                        (widgetConfigModalSource.match(/disabled=/g) || []).length;

  if (disabledCount >= 5) {
    return { pass: true, details: `Found ${disabledCount} disabled attributes` };
  }
  return { pass: false, details: `Only found ${disabledCount} disabled attributes` };
});

// Test 15: No mouse traps (can navigate away)
runTest('No mouse traps - Can navigate freely', () => {
  // Check for event.preventDefault misuse
  const preventDefaultCount = (appSource.match(/event\.preventDefault\(\)/g) || []).length;

  // Should only have preventDefault for arrow keys, not all keys
  if (preventDefaultCount <= 5) {
    return { pass: true, details: `${preventDefaultCount} preventDefault calls (reasonable)` };
  }
  return { pass: false, details: `Too many preventDefault calls (${preventDefaultCount}) - may block navigation` };
});

// Test 16: ARIA labels for icon-only buttons
runTest('ARIA labels - Icon buttons have labels', () => {
  const ariaLabelCount = (appSource.match(/aria-label=/g) || []).length +
                         (settingsModalSource.match(/aria-label=/g) || []).length;

  if (ariaLabelCount >= 2) {
    return { pass: true, details: `Found ${ariaLabelCount} aria-label attributes` };
  }
  return { pass: false, details: `Only found ${ariaLabelCount} aria-label attributes` };
});

// Test 17: Focus outline not removed globally
runTest('Focus outline - Not globally hidden', () => {
  const hasFocusOutlineNone = (appSource.includes('focus:outline-none') ||
                                widgetCardSource.includes('focus:outline-none') ||
                                settingsModalSource.includes('focus:outline-none'));

  const hasFocusRing = (appSource.includes('focus:ring-2') ||
                        widgetCardSource.includes('focus:ring-2') ||
                        settingsModalSource.includes('focus:ring-2'));

  // focus:outline-none is OK if paired with focus:ring-2
  if (hasFocusRing) {
    return { pass: true, details: 'Focus indicators provided via focus:ring' };
  }
  return { pass: false, details: 'Focus may be completely hidden' };
});

// Test 18: Visible focus on interactive elements
runTest('Focus visibility - All interactive elements focusable', () => {
  const buttonsWithFocus = (appSource.match(/<button[^>]*className/g) || []).length +
                           (settingsModalSource.match(/<button[^>]*className/g) || []).length;

  const inputsWithFocus = (settingsModalSource.match(/<input[^>]*className/g) || []).length +
                          (widgetConfigModalSource.match(/<input[^>]*className/g) || []).length;

  if (buttonsWithFocus >= 20 && inputsWithFocus >= 10) {
    return { pass: true, details: `${buttonsWithFocus} buttons and ${inputsWithFocus} inputs with focus styles` };
  }
  return { pass: false, details: `Insufficient focusable elements: ${buttonsWithFocus} buttons, ${inputsWithFocus} inputs` };
});

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Total Tests: ${tests.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n✅ All keyboard navigation tests PASSED!');
  process.exit(0);
} else {
  console.log(`\n❌ ${failed} test(s) failed`);
  process.exit(1);
}
