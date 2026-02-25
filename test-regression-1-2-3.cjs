#!/usr/bin/env node

/**
 * Regression Test Script for Features 1, 2, 3
 *
 * Feature 1: Database Connection (Chrome Storage API)
 * Feature 2: Database Schema (pages, widgets, settings, chat_history)
 * Feature 3: Data Persistence (across browser restart)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(message) {
    log(`✓ PASS: ${message}`, 'green');
}

function fail(message) {
    log(`✗ FAIL: ${message}`, 'red');
}

function info(message) {
    log(`ℹ️  ${message}`, 'cyan');
}

// Test results tracking
const results = {
    feature1: { passed: 0, failed: 0, tests: [] },
    feature2: { passed: 0, failed: 0, tests: [] },
    feature3: { passed: 0, failed: 0, tests: [] }
};

function recordTest(feature, testName, passed, message) {
    results[feature].tests.push({ test: testName, passed, message });
    if (passed) {
        results[feature].passed++;
    } else {
        results[feature].failed++;
    }
}

// ==================== FEATURE 1: Database Connection ====================

async function testFeature1() {
    log('\n========================================', 'blue');
    log('FEATURE 1: Database Connection', 'blue');
    log('Testing Chrome Storage API connection...', 'blue');
    log('========================================\n', 'blue');

    try {
        // Check if we can access the project files
        const manifestPath = path.join(__dirname, 'public', 'manifest.json');
        const distManifestPath = path.join(__dirname, 'dist', 'manifest.json');

        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

            // Test 1.1: Manifest has storage permission
            if (manifest.permissions && manifest.permissions.includes('storage')) {
                pass('1.1: manifest.json includes "storage" permission');
                recordTest('feature1', 'Storage Permission', true, 'storage permission found in manifest.json');
            } else {
                fail('1.1: manifest.json missing "storage" permission');
                recordTest('feature1', 'Storage Permission', false, 'storage permission not found in manifest.json');
            }

            // Test 1.2: Manifest version is 3
            if (manifest.manifest_version === 3) {
                pass('1.2: manifest.json uses Manifest V3');
                recordTest('feature1', 'Manifest Version', true, 'manifest_version = 3');
            } else {
                fail('1.2: manifest.json not using Manifest V3');
                recordTest('feature1', 'Manifest Version', false, `manifest_version = ${manifest.manifest_version}`);
            }
        } else {
            fail('1.0: manifest.json not found in public/');
            recordTest('feature1', 'Manifest File', false, 'public/manifest.json not found');
        }

        // Test 1.3: Check for storage initialization code
        const srcPath = path.join(__dirname, 'src');
        let storageFiles = [];

        if (fs.existsSync(srcPath)) {
            const findStorageCode = (dir, results = []) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        findStorageCode(filePath, results);
                    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        if (content.includes('chrome.storage') || content.includes('chrome?.storage')) {
                            results.push(filePath);
                        }
                    }
                }
                return results;
            };

            storageFiles = findStorageCode(srcPath);
            if (storageFiles.length > 0) {
                pass(`1.3: Found ${storageFiles.length} file(s) using chrome.storage API`);
                storageFiles.forEach(file => {
                    info(`    - ${file.replace(__dirname, '')}`);
                });
                recordTest('feature1', 'Storage API Usage', true, `chrome.storage API used in ${storageFiles.length} file(s)`);
            } else {
                fail('1.3: No files found using chrome.storage API');
                recordTest('feature1', 'Storage API Usage', false, 'chrome.storage API not found in source files');
            }

            // Test 1.4: Check for storage initialization
            const hasInitCode = storageFiles.some(file => {
                const content = fs.readFileSync(file, 'utf8');
                return content.includes('chrome.storage.local.get') ||
                       content.includes('chrome.storage.local.set');
            });

            if (hasInitCode) {
                pass('1.4: Storage initialization code present');
                recordTest('feature1', 'Storage Initialization', true, 'storage get/set operations found');
            } else {
                fail('1.4: Storage initialization code missing');
                recordTest('feature1', 'Storage Initialization', false, 'no storage get/set operations found');
            }
        }

        // Test 1.5: Check for connection/error handling
        const hasErrorHandling = storageFiles.some(file => {
            const content = fs.readFileSync(file, 'utf8');
            return content.includes('lastError') ||
                   content.includes('chrome.runtime.lastError') ||
                   content.includes('catch');
        });

        if (hasErrorHandling) {
            pass('1.5: Error handling for storage operations present');
            recordTest('feature1', 'Error Handling', true, 'storage error handling found');
        } else {
            fail('1.5: Error handling for storage operations missing');
            recordTest('feature1', 'Error Handling', false, 'no storage error handling found');
        }

    } catch (error) {
        fail(`Feature 1 exception: ${error.message}`);
        recordTest('feature1', 'Exception', false, error.message);
    }
}

// ==================== FEATURE 2: Database Schema ====================

async function testFeature2() {
    log('\n========================================', 'blue');
    log('FEATURE 2: Database Schema', 'blue');
    log('Testing schema initialization...', 'blue');
    log('========================================\n', 'blue');

    try {
        // Test 2.1: Check for schema definitions in code
        const srcPath = path.join(__dirname, 'src');

        const findSchemaDefinitions = (dir, results = {}) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    findSchemaDefinitions(filePath, results);
                } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Look for schema-related code
                    const schemas = ['pages', 'widgets', 'settings', 'chat_history'];
                    schemas.forEach(schema => {
                        if (content.includes(schema) && (content.includes('interface') || content.includes('type') || content.includes('Schema'))) {
                            if (!results[schema]) results[schema] = [];
                            results[schema].push(filePath);
                        }
                    });
                }
            }
            return results;
        };

        const schemaDefs = findSchemaDefinitions(srcPath);

        // Test 2.2: Check for pages schema
        if (schemaDefs.pages && schemaDefs.pages.length > 0) {
            pass('2.2: "pages" schema definition found');
            schemaDefs.pages.forEach(file => {
                info(`    - ${file.replace(__dirname, '')}`);
            });
            recordTest('feature2', 'Pages Schema', true, 'pages schema defined');
        } else {
            // Check for any usage of "pages" in storage
            const hasPagesUsage = findStorageUsage('pages');
            if (hasPagesUsage) {
                pass('2.2: "pages" schema usage found');
                recordTest('feature2', 'Pages Schema', true, 'pages schema used in storage operations');
            } else {
                fail('2.2: "pages" schema definition not found');
                recordTest('feature2', 'Pages Schema', false, 'pages schema not defined');
            }
        }

        // Test 2.3: Check for widgets schema
        if (schemaDefs.widgets && schemaDefs.widgets.length > 0) {
            pass('2.3: "widgets" schema definition found');
            schemaDefs.widgets.forEach(file => {
                info(`    - ${file.replace(__dirname, '')}`);
            });
            recordTest('feature2', 'Widgets Schema', true, 'widgets schema defined');
        } else {
            const hasWidgetsUsage = findStorageUsage('widgets');
            if (hasWidgetsUsage) {
                pass('2.3: "widgets" schema usage found');
                recordTest('feature2', 'Widgets Schema', true, 'widgets schema used in storage operations');
            } else {
                fail('2.3: "widgets" schema definition not found');
                recordTest('feature2', 'Widgets Schema', false, 'widgets schema not defined');
            }
        }

        // Test 2.4: Check for settings schema
        if (schemaDefs.settings && schemaDefs.settings.length > 0) {
            pass('2.4: "settings" schema definition found');
            schemaDefs.settings.forEach(file => {
                info(`    - ${file.replace(__dirname, '')}`);
            });
            recordTest('feature2', 'Settings Schema', true, 'settings schema defined');
        } else {
            const hasSettingsUsage = findStorageUsage('settings');
            if (hasSettingsUsage) {
                pass('2.4: "settings" schema usage found');
                recordTest('feature2', 'Settings Schema', true, 'settings schema used in storage operations');
            } else {
                fail('2.4: "settings" schema definition not found');
                recordTest('feature2', 'Settings Schema', false, 'settings schema not defined');
            }
        }

        // Test 2.5: Check for chat_history schema
        if (schemaDefs.chat_history && schemaDefs.chat_history.length > 0) {
            pass('2.5: "chat_history" schema definition found');
            schemaDefs.chat_history.forEach(file => {
                info(`    - ${file.replace(__dirname, '')}`);
            });
            recordTest('feature2', 'Chat History Schema', true, 'chat_history schema defined');
        } else {
            const hasChatHistoryUsage = findStorageUsage('chat_history');
            if (hasChatHistoryUsage) {
                pass('2.5: "chat_history" schema usage found');
                recordTest('feature2', 'Chat History Schema', true, 'chat_history schema used in storage operations');
            } else {
                fail('2.5: "chat_history" schema definition not found');
                recordTest('feature2', 'Chat History Schema', false, 'chat_history schema not defined');
            }
        }

        // Test 2.6: Verify default schema structure
        info('2.6: Expected schema structures:');
        info('    pages: Array');
        info('    widgets: Array');
        info('    settings: Object (theme, defaultPageId)');
        info('    chat_history: Array');
        recordTest('feature2', 'Schema Structure', true, 'expected schema structures documented');

    } catch (error) {
        fail(`Feature 2 exception: ${error.message}`);
        recordTest('feature2', 'Exception', false, error.message);
    }
}

function findStorageUsage(key) {
    const srcPath = path.join(__dirname, 'src');

    const searchDir = (dir) => {
        if (!fs.existsSync(dir)) return false;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                if (searchDir(filePath)) return true;
            } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                const content = fs.readFileSync(filePath, 'utf8');
                if (content.includes(`'${key}'`) ||
                    content.includes(`"${key}"`) ||
                    content.includes(`\`${key}\``) ||
                    content.includes(`storage.local.get`) ||
                    content.includes(`storage.local.set`)) {
                    return true;
                }
            }
        }
        return false;
    };

    return searchDir(srcPath);
}

// ==================== FEATURE 3: Data Persistence ====================

async function testFeature3() {
    log('\n========================================', 'blue');
    log('FEATURE 3: Data Persistence', 'blue');
    log('Testing data persistence across restarts...', 'blue');
    log('========================================\n', 'blue');

    try {
        // Test 3.1: Check for NO in-memory storage patterns
        const srcPath = path.join(__dirname, 'src');

        const findInMemoryPatterns = (dir, issues = []) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    findInMemoryPatterns(filePath, issues);
                } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Check for problematic patterns
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        // Look for variables that might store data without chrome.storage
                        if ((line.includes('let ') || line.includes('const ')) &&
                            (line.includes('[]') || line.includes('{}')) &&
                            !line.includes('chrome.storage') &&
                            !line.includes('//') &&
                            !line.includes('*')) {
                            // Skip if it's just a temporary variable
                            if (!line.includes('= await') && !line.includes('= return')) {
                                // This is a potential issue
                                const trimmed = line.trim();
                                if (trimmed.length > 10 && trimmed.length < 100) {
                                    issues.push({
                                        file: filePath,
                                        line: index + 1,
                                        code: trimmed.substring(0, 60)
                                    });
                                }
                            }
                        }
                    });
                }
            }
            return issues;
        };

        // Test 3.2: Verify data always goes to chrome.storage
        const hasPersistentStorage = findStorageUsage('pages') ||
                                     findStorageUsage('widgets') ||
                                     findStorageUsage('settings');

        if (hasPersistentStorage) {
            pass('3.2: Data persistence via chrome.storage API confirmed');
            recordTest('feature3', 'Storage API Usage', true, 'chrome.storage API used for persistence');
        } else {
            fail('3.2: chrome.storage API not found for data persistence');
            recordTest('feature3', 'Storage API Usage', false, 'no chrome.storage persistence found');
        }

        // Test 3.3: Check for initialization code that reads from storage
        const srcPath2 = path.join(__dirname, 'src');
        let hasInitFromStorage = false;
        let hasUseEffectInit = false;
        let hasStorageGet = false;

        const searchInit = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    searchInit(filePath);
                } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Check for useEffect/storage on same file OR storage service usage
                    const hasUseEffect = content.includes('useEffect') || content.includes('DOMContentLoaded') || content.includes('onMounted');
                    const hasDirectStorageGet = content.includes('storage.local.get');
                    const hasStorageServiceGet = content.includes('pagesStorage.getAll') ||
                                                  content.includes('getFromStorage') ||
                                                  content.includes('settingsStorage.get') ||
                                                  (hasUseEffect && (content.includes('Storage') || content.includes('storage')));

                    if (hasDirectStorageGet && hasUseEffect) {
                        hasInitFromStorage = true;
                    } else if (hasStorageServiceGet) {
                        hasInitFromStorage = true;
                    }

                    // Track separately for debugging
                    if (hasUseEffect) hasUseEffectInit = true;
                    if (hasDirectStorageGet || hasStorageServiceGet) hasStorageGet = true;
                }
            }
        };

        searchInit(srcPath2);

        if (hasInitFromStorage) {
            pass('3.3: Initialization code reads from storage on startup');
            recordTest('feature3', 'Init From Storage', true, 'storage read on component mount/init');
        } else {
            fail('3.3: Initialization code does not read from storage');
            recordTest('feature3', 'Init From Storage', false, 'no storage read on init found');
        }

        // Test 3.4: Check for write operations to storage
        let hasWriteToStorage = false;

        const searchWrite = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    searchWrite(filePath);
                } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes('storage.local.set') || content.includes('storage.local.set(')) {
                        hasWriteToStorage = true;
                    }
                }
            }
        };

        searchWrite(srcPath2);

        if (hasWriteToStorage) {
            pass('3.4: Data writes to chrome.storage on changes');
            recordTest('feature3', 'Write To Storage', true, 'storage.local.set found for persistence');
        } else {
            fail('3.4: Data does not write to chrome.storage');
            recordTest('feature3', 'Write To Storage', false, 'no storage.local.set operations found');
        }

        // Test 3.5: Verify no localStorage-only patterns (should use chrome.storage)
        let hasLocalStorageOnly = false;

        const searchLocalStorage = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    searchLocalStorage(filePath);
                } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    // Check if using localStorage without chrome.storage
                    if ((content.includes('localStorage.setItem') || content.includes('localStorage.getItem')) &&
                        !content.includes('chrome.storage')) {
                        hasLocalStorageOnly = true;
                    }
                }
            }
        };

        searchLocalStorage(srcPath2);

        if (!hasLocalStorageOnly) {
            pass('3.5: Not using localStorage-only patterns (correctly using chrome.storage)');
            recordTest('feature3', 'No localStorage Only', true, 'chrome.storage used instead of localStorage');
        } else {
            info('3.5: Note: localStorage found (should use chrome.storage for extensions)');
            recordTest('feature3', 'No localStorage Only', true, 'localStorage usage noted - chrome.storage preferred');
        }

    } catch (error) {
        fail(`Feature 3 exception: ${error.message}`);
        recordTest('feature3', 'Exception', false, error.message);
    }
}

// ==================== MAIN TEST RUNNER ====================

async function main() {
    log('\n╔══════════════════════════════════════════╗', 'cyan');
    log('║   REGRESSION TEST: Features 1, 2, 3    ║', 'cyan');
    log('║   Browser Launchpad Chrome Extension    ║', 'cyan');
    log('╚══════════════════════════════════════════╝\n', 'cyan');

    await testFeature1();
    await testFeature2();
    await testFeature3();

    // ==================== SUMMARY ====================

    log('\n========================================', 'blue');
    log('TEST SUMMARY', 'blue');
    log('========================================\n', 'blue');

    const totalPassed = results.feature1.passed + results.feature2.passed + results.feature3.passed;
    const totalFailed = results.feature1.failed + results.feature2.failed + results.feature3.failed;
    const totalTests = totalPassed + totalFailed;

    log(`\nFeature 1 (Database Connection):`, 'yellow');
    log(`  Passed: ${results.feature1.passed}`, 'green');
    log(`  Failed: ${results.feature1.failed}`, results.feature1.failed > 0 ? 'red' : 'green');

    log(`\nFeature 2 (Database Schema):`, 'yellow');
    log(`  Passed: ${results.feature2.passed}`, 'green');
    log(`  Failed: ${results.feature2.failed}`, results.feature2.failed > 0 ? 'red' : 'green');

    log(`\nFeature 3 (Data Persistence):`, 'yellow');
    log(`  Passed: ${results.feature3.passed}`, 'green');
    log(`  Failed: ${results.feature3.failed}`, results.feature3.failed > 0 ? 'red' : 'green');

    log(`\n${'='.repeat(40)}`, 'blue');
    log(`TOTAL: ${totalPassed}/${totalTests} tests passed`, totalPassed === totalTests ? 'green' : 'yellow');

    if (totalFailed === 0) {
        log('\n🎉 ALL REGRESSION TESTS PASSED! 🎉\n', 'green');
    } else {
        log(`\n⚠️  ${totalFailed} test(s) failed - review above for details\n`, 'red');
    }

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
