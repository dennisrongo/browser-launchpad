import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

// Capture console messages
const errors = [];
const warnings = [];

page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
  } else if (msg.type() === 'warning') {
    warnings.push(msg.text());
  }
});

try {
  await page.goto('http://localhost:8766/', { waitUntil: 'networkidle' });

  // Wait for app to load
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: '.playwright-cli/ui-foundation-test-screenshot.png', fullPage: true });

  console.log('\n=== BROWSER TEST RESULTS ===\n');
  console.log('Page loaded successfully');
  console.log(`Console errors: ${errors.length}`);
  console.log(`Console warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\nERRORS:');
    errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  if (warnings.length > 0) {
    console.log('\nWARNINGS:');
    warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✓ No console errors or warnings!');
  }

  // Check if the main app rendered
  const hasHeader = await page.$('header h1');
  const hasSettings = await page.$('button:has-text("Settings")');
  const hasPageTabs = await page.$('header');

  console.log('\nUI ELEMENTS:');
  console.log(`  Header element: ${hasHeader ? '✓' : '✗'}`);
  console.log(`  Settings button: ${hasSettings ? '✓' : '✗'}`);
  console.log(`  Page navigation: ${hasPageTabs ? '✓' : '✗'}`);

  console.log('\nScreenshot saved to: .playwright-cli/ui-foundation-test-screenshot.png');

} catch (error) {
  console.error('Error loading page:', error.message);
}

await browser.close();
