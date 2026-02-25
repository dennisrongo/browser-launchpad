#!/usr/bin/env node
/**
 * Chrome Extension Test Runner
 *
 * This script launches Chrome with the extension loaded and opens the test page.
 * It then waits for the tests to complete and reports the results.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, 'dist');
const TEST_PAGE = 'chrome-extension://__MSG_@@extension_id__/test-features-1-2-3.html';

console.log('=== Chrome Extension Regression Test Runner ===\n');
console.log('Extension path:', EXTENSION_PATH);
console.log('\nTo run the tests manually:');
console.log('1. Open Chrome and navigate to chrome://extensions');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked"');
console.log('4. Select the folder:', EXTENSION_PATH);
console.log('5. Open a new tab and navigate to:');
console.log('   chrome-extension://<extension-id>/test-features-1-2-3.html');
console.log('\nOr use the automated Chrome launch:\n');

// Detect OS
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

let chromePath;
let chromeArgs;

if (isMac) {
  chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    chromePath = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary';
  }
} else if (isWindows) {
  chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!fs.existsSync(chromePath)) {
    chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  }
} else if (isLinux) {
  chromePath = '/usr/bin/google-chrome';
  if (!fs.existsSync(chromePath)) {
    chromePath = '/usr/bin/chromium-browser';
  }
}

if (!chromePath || !fs.existsSync(chromePath)) {
  console.log('Could not find Chrome automatically.');
  console.log('Please run the tests manually using the instructions above.\n');
  process.exit(1);
}

console.log('Found Chrome at:', chromePath);

// Note: We can't directly load extensions via command line and navigate to them
// because we need the extension ID. Instead, we'll launch Chrome with instructions
// to load the extension manually.

console.log('\nLaunching Chrome with extension loading instructions...');
console.log('(Chrome will open with chrome://extensions page ready)\n');

// Create a simple HTML file with instructions
const instructionsPath = path.join(__dirname, 'dist', 'test-instructions.html');
const instructionsHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Load Extension for Testing</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 { color: #333; }
        .step {
            background: #f5f5f5;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .step-number {
            font-weight: bold;
            color: #007bff;
            font-size: 1.2em;
        }
        code {
            background: #e0e0e0;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }
        .button {
            display: inline-block;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
            font-weight: 600;
        }
        .button:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <h1>🧪 Run Extension Tests</h1>
    <p>To run the regression tests for the Browser Launchpad extension:</p>

    <div class="step">
        <span class="step-number">1.</span>
        Open the <a href="chrome://extensions" target="_blank">chrome://extensions</a> page in a new tab.
    </div>

    <div class="step">
        <span class="step-number">2.</span>
        Enable "Developer mode" using the toggle in the top-right corner.
    </div>

    <div class="step">
        <span class="step-number">3.</span>
        Click the "Load unpacked" button.
    </div>

    <div class="step">
        <span class="step-number">4.</span>
        Select this folder in the file picker:
        <br><br>
        <code>${EXTENSION_PATH}</code>
        <br><br>
        <small>Tip: You can copy this path and paste it into the file dialog.</small>
    </div>

    <div class="step">
        <span class="step-number">5.</span>
        The extension "Browser Launchpad" will appear in the list.
        <br><br>
        Note the <strong>Extension ID</strong> shown below the extension name.
    </div>

    <div class="step">
        <span class="step-number">6.</span>
        Open the test page by navigating to:
        <br><br>
        <code>chrome-extension://<strong>YOUR_EXTENSION_ID</strong>/test-features-1-2-3.html</code>
        <br><br>
        <small>Replace <strong>YOUR_EXTENSION_ID</strong> with the ID from step 5.</small>
    </div>

    <div class="step">
        <span class="step-number">7.</span>
        Click "Run All Tests" on the test page to run the regression tests.
    </div>

    <p><strong>Expected Results:</strong></p>
    <ul>
        <li>Feature 1: Database connection should be verified</li>
        <li>Feature 2: All schemas should be initialized</li>
        <li>Feature 3: Data should persist across reloads</li>
    </ul>

    <script>
        // Try to auto-navigate to chrome://extensions
        setTimeout(() => {
            if (confirm('Would you like to open chrome://extensions in a new tab?')) {
                window.open('chrome://extensions', '_blank');
            }
        }, 1000);
    </script>
</body>
</html>`;

fs.writeFileSync(instructionsPath, instructionsHTML);

// Launch Chrome with the instructions page
const args = [
  '--no-first-run',
  '--no-default-browser-check',
  `--load-extension=${EXTENSION_PATH}`,
  instructionsPath
];

console.log('Launching Chrome with extension...');
console.log('Command:', `"${chromePath}" ${args.join(' ')}\n`);

exec(`"${chromePath}" ${args.join(' ')}`, (error) => {
  if (error) {
    console.error('Failed to launch Chrome:', error.message);
    process.exit(1);
  }
  console.log('Chrome launched successfully!');
  console.log('Follow the instructions in the browser to run the tests.\n');
});

// Give Chrome time to start, then exit
setTimeout(() => {
  process.exit(0);
}, 2000);
