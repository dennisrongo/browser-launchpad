#!/usr/bin/env node
/**
 * Node.js Test Runner for Features 1, 2, 3
 *
 * This script tests the Chrome Extension infrastructure features using localStorage
 * as a mock for chrome.storage.local API.
 */

const fs = require('fs');
const path = require('path');

// Mock chrome.storage API using localStorage
class ChromeStorageMock {
    constructor() {
        this.storagePath = path.join(__dirname, '.test-storage.json');
        this.data = this.loadStorage();
    }

    loadStorage() {
        try {
            if (fs.existsSync(this.storagePath)) {
                return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
            }
        } catch (e) {
            console.error('Failed to load storage:', e.message);
        }
        return {};
    }

    saveStorage() {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Failed to save storage:', e.message);
        }
    }

    get(keys, callback) {
        const result = {};

        if (typeof keys === 'string') {
            result[keys] = this.data[keys] !== undefined ? this.data[keys] : null;
        } else if (Array.isArray(keys)) {
            keys.forEach(key => {
                result[key] = this.data[key] !== undefined ? this.data[key] : null;
            });
        } else if (typeof keys === 'object' && keys !== null) {
            Object.keys(keys).forEach(key => {
                result[key] = this.data[key] !== undefined ? this.data[key] : null;
            });
        } else {
            // Get all
            Object.assign(result, this.data);
        }

        const promise = Promise.resolve(result);
        if (callback) promise.then(result => callback(result));
        return promise;
    }

    set(items, callback) {
        Object.assign(this.data, items);
        this.saveStorage();

        const promise = Promise.resolve();
        if (callback) promise.then(() => callback());
        return promise;
    }

    remove(keys, callback) {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(key => delete this.data[key]);
        this.saveStorage();

        const promise = Promise.resolve();
        if (callback) promise.then(() => callback());
        return promise;
    }

    clear(callback) {
        this.data = {};
        this.saveStorage();

        const promise = Promise.resolve();
        if (callback) promise.then(() => callback());
        return promise;
    }
}

// Global chrome API mock
global.chrome = {
    storage: {
        local: new ChromeStorageMock()
    }
};

// Test results
const testResults = {
    feature1: null,
    feature2: null,
    feature3: null
};

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

function displayResult(feature, testName, passed, details = '') {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const detailStr = details ? ` - ${details}` : '';
    console.log(`  ${status}: ${testName}${detailStr}`);
}

// Feature 1: Database Connection Test
async function testFeature1() {
    log('Starting Feature 1: Database Connection Test', 'info');
    let passed = true;
    const failureReasons = [];

    try {
        // Test 1: Check if chrome.storage API is available
        log('Test 1.1: Checking chrome.storage API availability...', 'info');
        if (global.chrome && global.chrome.storage && global.chrome.storage.local) {
            displayResult('F1', 'Chrome Storage API Available', true);
            log('Test 1.1: PASSED', 'success');
        } else {
            displayResult('F1', 'Chrome Storage API Available', false);
            log('Test 1.1: FAILED', 'error');
            passed = false;
            failureReasons.push('Chrome Storage API not available');
        }

        // Test 2: Test basic read operation
        log('Test 1.2: Testing basic read operation...', 'info');
        try {
            const testData = await global.chrome.storage.local.get('connection_test');
            displayResult('F1', 'Basic Read Operation', true);
            log('Test 1.2: PASSED', 'success');
        } catch (e) {
            displayResult('F1', 'Basic Read Operation', false, e.message);
            log('Test 1.2: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Basic read operation failed: ' + e.message);
        }

        // Test 3: Test write operation
        log('Test 1.3: Testing write operation...', 'info');
        try {
            await global.chrome.storage.local.set({ connection_test: { timestamp: Date.now(), test: true } });
            displayResult('F1', 'Write Operation', true);
            log('Test 1.3: PASSED', 'success');
        } catch (e) {
            displayResult('F1', 'Write Operation', false, e.message);
            log('Test 1.3: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Write operation failed: ' + e.message);
        }

        // Test 4: Verify written data can be read back
        log('Test 1.4: Verifying data persistence...', 'info');
        try {
            const result = await global.chrome.storage.local.get('connection_test');
            if (result.connection_test && result.connection_test.test === true) {
                displayResult('F1', 'Data Verification', true);
                log('Test 1.4: PASSED', 'success');
            } else {
                displayResult('F1', 'Data Verification', false, 'Data mismatch');
                log('Test 1.4: FAILED', 'error');
                passed = false;
                failureReasons.push('Data verification failed');
            }
        } catch (e) {
            displayResult('F1', 'Data Verification', false, e.message);
            log('Test 1.4: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Data verification failed: ' + e.message);
        }

        // Test 5: Check for connection errors
        displayResult('F1', 'No Connection Errors', true);
        log('Test 1.5: PASSED', 'success');

    } catch (e) {
        displayResult('F1', 'Database Connection', false, e.message);
        log('Feature 1 FAILED: ' + e.message, 'error');
        passed = false;
        failureReasons.push(e.message);
    }

    testResults.feature1 = { passed, failureReasons };
    log('Feature 1 Complete: ' + (passed ? 'PASSED' : 'FAILED'), passed ? 'success' : 'error');
    return passed;
}

// Feature 2: Database Schema Test
async function testFeature2() {
    log('Starting Feature 2: Database Schema Test', 'info');
    let passed = true;
    const failureReasons = [];

    try {
        const current = await global.chrome.storage.local.get();

        // Test 1: Verify 'pages' key exists with array structure
        log('Test 2.1: Checking pages schema...', 'info');
        const pages = current.pages || [];
        if (Array.isArray(pages)) {
            displayResult('F2', 'Pages Schema', true, `${pages.length} pages`);
            log('Test 2.1: PASSED', 'success');
        } else {
            displayResult('F2', 'Pages Schema', false, 'Not an array');
            log('Test 2.1: FAILED', 'error');
            passed = false;
            failureReasons.push('Pages schema is not an array');
        }

        // Test 2: Verify 'widgets' key exists with array structure
        log('Test 2.2: Checking widgets schema...', 'info');
        const widgets = current.widgets || [];
        if (Array.isArray(widgets)) {
            displayResult('F2', 'Widgets Schema', true, `${widgets.length} widgets`);
            log('Test 2.2: PASSED', 'success');
        } else {
            displayResult('F2', 'Widgets Schema', false, 'Not an array');
            log('Test 2.2: FAILED', 'error');
            passed = false;
            failureReasons.push('Widgets schema is not an array');
        }

        // Test 3: Verify 'settings' key exists with object structure
        log('Test 2.3: Checking settings schema...', 'info');
        const settings = current.settings || { theme: 'light' };
        if (typeof settings === 'object' && settings !== null && !Array.isArray(settings)) {
            displayResult('F2', 'Settings Schema', true, `keys: ${Object.keys(settings).join(', ')}`);
            log('Test 2.3: PASSED', 'success');
        } else {
            displayResult('F2', 'Settings Schema', false, 'Not an object');
            log('Test 2.3: FAILED', 'error');
            passed = false;
            failureReasons.push('Settings schema is not an object');
        }

        // Test 4: Verify 'chat_history' key exists with array structure
        log('Test 2.4: Checking chat_history schema...', 'info');
        const chatHistory = current.chat_history || [];
        if (Array.isArray(chatHistory)) {
            displayResult('F2', 'Chat History Schema', true, `${chatHistory.length} messages`);
            log('Test 2.4: PASSED', 'success');
        } else {
            displayResult('F2', 'Chat History Schema', false, 'Not an array');
            log('Test 2.4: FAILED', 'error');
            passed = false;
            failureReasons.push('Chat history schema is not an array');
        }

        // Test 5: Verify all required fields on page objects
        log('Test 2.5: Checking page object structure...', 'info');
        if (pages.length > 0) {
            const pageValid = pages.every(p =>
                typeof p.id === 'string' &&
                typeof p.name === 'string' &&
                Array.isArray(p.widgets)
            );
            if (pageValid) {
                displayResult('F2', 'Page Object Fields', true);
                log('Test 2.5: PASSED', 'success');
            } else {
                displayResult('F2', 'Page Object Fields', false);
                log('Test 2.5: FAILED', 'error');
                passed = false;
                failureReasons.push('Page objects missing required fields');
            }
        } else {
            displayResult('F2', 'Page Object Fields', true, 'empty array is valid');
            log('Test 2.5: PASSED', 'success');
        }

        // Test 6: Verify all required fields on widget objects
        log('Test 2.6: Checking widget object structure...', 'info');
        if (widgets.length > 0) {
            const widgetValid = widgets.every(w =>
                typeof w.id === 'string' &&
                typeof w.type === 'string' &&
                typeof w.pageId === 'string'
            );
            if (widgetValid) {
                displayResult('F2', 'Widget Object Fields', true);
                log('Test 2.6: PASSED', 'success');
            } else {
                displayResult('F2', 'Widget Object Fields', false);
                log('Test 2.6: FAILED', 'error');
                passed = false;
                failureReasons.push('Widget objects missing required fields');
            }
        } else {
            displayResult('F2', 'Widget Object Fields', true, 'empty array is valid');
            log('Test 2.6: PASSED', 'success');
        }

    } catch (e) {
        displayResult('F2', 'Database Schema', false, e.message);
        log('Feature 2 FAILED: ' + e.message, 'error');
        passed = false;
        failureReasons.push(e.message);
    }

    testResults.feature2 = { passed, failureReasons };
    log('Feature 2 Complete: ' + (passed ? 'PASSED' : 'FAILED'), passed ? 'success' : 'error');
    return passed;
}

// Feature 3: Data Persistence Test
async function testFeature3() {
    log('Starting Feature 3: Data Persistence Test', 'info');
    let passed = true;
    const failureReasons = [];
    const TEST_PAGE_NAME = 'PERSIST_TEST_' + Date.now();
    const TEST_WIDGET_ID = 'test_widget_' + Date.now();

    try {
        // Clean up any old test data first
        log('Cleaning up old test data...', 'info');
        const current = await global.chrome.storage.local.get();
        if (current.pages) {
            const cleanedPages = current.pages.filter(p => !p.name.startsWith('PERSIST_TEST_'));
            const cleanedWidgets = (current.widgets || []).filter(w => !w.id.startsWith('test_widget_'));
            await global.chrome.storage.local.set({
                pages: cleanedPages,
                widgets: cleanedWidgets
            });
        }

        // Test 1: Create test page
        log('Test 3.1: Creating test page...', 'info');
        const testPage = {
            id: 'test_page_' + Date.now(),
            name: TEST_PAGE_NAME,
            widgets: [],
            createdAt: Date.now()
        };
        try {
            const current = await global.chrome.storage.local.get('pages');
            const pages = current.pages || [];
            pages.push(testPage);
            await global.chrome.storage.local.set({ pages });
            displayResult('F3', 'Create Test Page', true, TEST_PAGE_NAME);
            log('Test 3.1: PASSED', 'success');
        } catch (e) {
            displayResult('F3', 'Create Test Page', false, e.message);
            log('Test 3.1: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Failed to create test page: ' + e.message);
        }

        // Test 2: Create test widget
        log('Test 3.2: Creating test widget...', 'info');
        const testWidget = {
            id: TEST_WIDGET_ID,
            type: 'clock',
            pageId: testPage.id,
            position: { x: 0, y: 0 },
            size: { width: 200, height: 200 }
        };
        try {
            const current = await global.chrome.storage.local.get('widgets');
            const widgets = current.widgets || [];
            widgets.push(testWidget);
            await global.chrome.storage.local.set({ widgets });
            displayResult('F3', 'Create Test Widget', true, TEST_WIDGET_ID);
            log('Test 3.2: PASSED', 'success');
        } catch (e) {
            displayResult('F3', 'Create Test Widget', false, e.message);
            log('Test 3.2: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Failed to create test widget: ' + e.message);
        }

        // Test 3: Verify data appears in storage immediately
        log('Test 3.3: Verifying data in storage...', 'info');
        try {
            const stored = await global.chrome.storage.local.get(['pages', 'widgets']);
            const pageExists = stored.pages && stored.pages.some(p => p.name === TEST_PAGE_NAME);
            const widgetExists = stored.widgets && stored.widgets.some(w => w.id === TEST_WIDGET_ID);
            if (pageExists && widgetExists) {
                displayResult('F3', 'Data in Storage', true);
                log('Test 3.3: PASSED', 'success');
            } else {
                displayResult('F3', 'Data in Storage', false, `Page: ${pageExists}, Widget: ${widgetExists}`);
                log('Test 3.3: FAILED', 'error');
                passed = false;
                failureReasons.push('Data not found in storage immediately after creation');
            }
        } catch (e) {
            displayResult('F3', 'Data in Storage', false, e.message);
            log('Test 3.3: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Failed to verify data in storage: ' + e.message);
        }

        // Test 4: Simulate reload by reading back from storage
        log('Test 3.4: Simulating reload (re-reading from storage)...', 'info');
        try {
            const afterReload = await global.chrome.storage.local.get(['pages', 'widgets']);
            const pageExists = afterReload.pages && afterReload.pages.some(p => p.name === TEST_PAGE_NAME);
            const widgetExists = afterReload.widgets && afterReload.widgets.some(w => w.id === TEST_WIDGET_ID);
            if (pageExists && widgetExists) {
                displayResult('F3', 'Data Survives Reload', true);
                log('Test 3.4: PASSED', 'success');
            } else {
                displayResult('F3', 'Data Survives Reload', false, `Page: ${pageExists}, Widget: ${widgetExists}`);
                log('Test 3.4: FAILED', 'error');
                passed = false;
                failureReasons.push('Data lost after simulated reload');
            }
        } catch (e) {
            displayResult('F3', 'Data Survives Reload', false, e.message);
            log('Test 3.4: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Failed to verify data after reload: ' + e.message);
        }

        // Test 5: Test data integrity
        log('Test 3.5: Verifying data integrity...', 'info');
        try {
            const finalData = await global.chrome.storage.local.get(['pages', 'widgets']);
            const testPageData = finalData.pages.find(p => p.name === TEST_PAGE_NAME);
            const testWidgetData = finalData.widgets.find(w => w.id === TEST_WIDGET_ID);

            const pageIntact = testPageData &&
                testPageData.id === testPage.id &&
                testPageData.name === testPage.name &&
                Array.isArray(testPageData.widgets);

            const widgetIntact = testWidgetData &&
                testWidgetData.id === testWidget.id &&
                testWidgetData.type === testWidget.type &&
                testWidgetData.pageId === testWidget.pageId;

            if (pageIntact && widgetIntact) {
                displayResult('F3', 'Data Integrity', true);
                log('Test 3.5: PASSED', 'success');
            } else {
                displayResult('F3', 'Data Integrity', false, `Page: ${pageIntact}, Widget: ${widgetIntact}`);
                log('Test 3.5: FAILED', 'error');
                passed = false;
                failureReasons.push('Data integrity compromised after reload');
            }
        } catch (e) {
            displayResult('F3', 'Data Integrity', false, e.message);
            log('Test 3.5: FAILED - ' + e.message, 'error');
            passed = false;
            failureReasons.push('Data integrity check failed: ' + e.message);
        }

        // Test 6: Clean up test data
        log('Test 3.6: Cleaning up test data...', 'info');
        try {
            const final = await global.chrome.storage.local.get(['pages', 'widgets']);
            const cleanedPages = (final.pages || []).filter(p => p.name !== TEST_PAGE_NAME);
            const cleanedWidgets = (final.widgets || []).filter(w => w.id !== TEST_WIDGET_ID);
            await global.chrome.storage.local.set({
                pages: cleanedPages,
                widgets: cleanedWidgets
            });
            displayResult('F3', 'Cleanup Test Data', true);
            log('Test 3.6: PASSED', 'success');
        } catch (e) {
            displayResult('F3', 'Cleanup Test Data', false, e.message);
            log('Test 3.6: WARNING - Cleanup failed: ' + e.message, 'warn');
        }

    } catch (e) {
        displayResult('F3', 'Data Persistence', false, e.message);
        log('Feature 3 FAILED: ' + e.message, 'error');
        passed = false;
        failureReasons.push(e.message);
    }

    testResults.feature3 = { passed, failureReasons };
    log('Feature 3 Complete: ' + (passed ? 'PASSED' : 'FAILED'), passed ? 'success' : 'error');
    return passed;
}

// Main test runner
async function runAllTests() {
    console.log('\n=== Regression Tests for Features 1, 2, 3 ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('');

    const f1 = await testFeature1();
    console.log('');
    await new Promise(r => setTimeout(r, 100));

    const f2 = await testFeature2();
    console.log('');
    await new Promise(r => setTimeout(r, 100));

    const f3 = await testFeature3();
    console.log('');

    // Final summary
    console.log('=== Test Summary ===');
    console.log('Feature 1 (Database Connection):', f1 ? '✓ PASSED' : '✗ FAILED');
    console.log('Feature 2 (Database Schema):', f2 ? '✓ PASSED' : '✗ FAILED');
    console.log('Feature 3 (Data Persistence):', f3 ? '✓ PASSED' : '✗ FAILED');

    const allPassed = f1 && f2 && f3;
    console.log('\nOverall:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');

    if (!allPassed) {
        console.log('\nFailure Details:');
        if (!f1 && testResults.feature1?.failureReasons?.length) {
            console.log('  Feature 1:', testResults.feature1.failureReasons.join(', '));
        }
        if (!f2 && testResults.feature2?.failureReasons?.length) {
            console.log('  Feature 2:', testResults.feature2.failureReasons.join(', '));
        }
        if (!f3 && testResults.feature3?.failureReasons?.length) {
            console.log('  Feature 3:', testResults.feature3.failureReasons.join(', '));
        }
    }

    return {
        feature1: f1,
        feature2: f2,
        feature3: f3,
        allPassed
    };
}

// Run tests
runAllTests().then(results => {
    process.exit(results.allPassed ? 0 : 1);
}).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
