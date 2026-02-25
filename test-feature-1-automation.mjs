import { chromium } from 'playwright';

async function runFeature1Test() {
    console.log('=== Starting Feature 1 Regression Test ===\n');

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-extensions-except=/Users/dennisrongo/Documents/GitHub/browser-launchpad/dist',
            '--load-extension=/Users/dennisrongo/Documents/GitHub/browser-launchpad/dist'
        ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log('Opening test page...');
        await page.goto('http://localhost:8765/test-feature-1-storage.html');
        await page.waitForLoadState('networkidle');
        console.log('✓ Test page loaded\n');

        console.log('Running Feature 1 test...');
        await page.click('button');
        await page.waitForTimeout(3000); // Wait for tests to complete

        console.log('Checking results...');
        const results = await page.evaluate(() => {
            const container = document.getElementById('feature1-results');
            const results = [];
            container.querySelectorAll('.test-result').forEach(div => {
                results.push({
                    text: div.textContent,
                    passed: div.classList.contains('pass')
                });
            });
            return results;
        });

        console.log('\n=== Test Results ===');
        let allPassed = true;
        results.forEach(r => {
            console.log(r.passed ? '✓' : '✗', r.text);
            if (!r.passed) allPassed = false;
        });

        // Get console logs
        const consoleLog = await page.evaluate(() => {
            return document.getElementById('console-log').textContent;
        });
        console.log('\n=== Console Log ===');
        console.log(consoleLog);

        // Take screenshot
        await page.screenshot({ path: '.playwright-cli/feature-1-test-screenshot.png' });
        console.log('\n✓ Screenshot saved to .playwright-cli/feature-1-test-screenshot.png');

        await browser.close();

        if (allPassed) {
            console.log('\n=== Feature 1: PASSED ===');
            return { passed: true };
        } else {
            console.log('\n=== Feature 1: FAILED ===');
            return { passed: false };
        }

    } catch (error) {
        console.error('Error running test:', error);
        await browser.close();
        return { passed: false, error: error.message };
    }
}

const result = await runFeature1Test();
console.log(JSON.stringify(result, null, 2));
process.exit(result.passed ? 0 : 1);
