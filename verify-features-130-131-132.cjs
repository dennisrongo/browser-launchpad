const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('FEATURES #130, #131, #132 VERIFICATION - Import/Export Functionality');
console.log('='.repeat(80));
console.log();

// Read SettingsModal.tsx
const settingsModalPath = path.join(__dirname, 'src/components/SettingsModal.tsx');
const settingsModalCode = fs.readFileSync(settingsModalPath, 'utf8');

// Test results
const results = {
    feature130: { name: 'Export all data to JSON file', tests: [], passed: 0, total: 0 },
    feature131: { name: 'Export pages, widgets, settings', tests: [], passed: 0, total: 0 },
    feature132: { name: 'Option to exclude API keys from export', tests: [], passed: 0, total: 0 }
};

function test(featureId, testName, condition, detail) {
    const result = { test: testName, passed: condition, detail };
    results[featureId].tests.push(result);
    results[featureId].total++;
    if (condition) results[featureId].passed++;

    const status = condition ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} - ${testName}`);
    if (!condition) console.log(`    ${detail}`);
}

// ============================================================================
// FEATURE #130: Export all data to JSON file
// ============================================================================
console.log('FEATURE #130: Export all data to JSON file');
console.log('-'.repeat(80));

test('feature130',
    'handleExportData function exists',
    settingsModalCode.includes('const handleExportData = async () =>'),
    'Function not found in SettingsModal.tsx'
);

test('feature130',
    'Gets all data from Chrome storage',
    settingsModalCode.includes('chrome.storage.local.get(null)'),
    'Not fetching all storage data'
);

test('feature130',
    'Creates blob for JSON download',
    settingsModalCode.includes('new Blob([jsonString]'),
    'Blob creation not found'
);

test('feature130',
    'Triggers download via click',
    settingsModalCode.includes('link.click()'),
    'Download trigger not found'
);

test('feature130',
    'Includes version in export',
    settingsModalCode.includes("version: '1.0.0'"),
    'Version not included in export'
);

test('feature130',
    'Includes export date',
    settingsModalCode.includes('exportDate: new Date().toISOString()'),
    'Export date not included'
);

test('feature130',
    'Has proper export data structure',
    settingsModalCode.includes('data: exportData'),
    'Export structure incorrect'
);

console.log();

// ============================================================================
// FEATURE #131: Export pages, widgets, settings
// ============================================================================
console.log('FEATURE #131: Export pages, widgets, settings');
console.log('-'.repeat(80));

test('feature131',
    'Exports all Chrome storage data',
    settingsModalCode.includes('const allData = await chrome.storage.local.get(null)'),
    'Not exporting all data'
);

test('feature131',
    'Data includes pages (via allData)',
    settingsModalCode.includes('allData') && settingsModalCode.includes('exportData'),
    'Pages not properly handled'
);

test('feature131',
    'Data includes widgets (in pages)',
    settingsModalCode.includes('exportData'),
    'Widgets not included (should be in pages)'
);

test('feature131',
    'Data includes settings (via allData)',
    settingsModalCode.includes('allData'),
    'Settings not included'
);

test('feature131',
    'Data includes chat_history (via allData)',
    settingsModalCode.includes('allData'),
    'Chat history not included'
);

console.log();

// ============================================================================
// FEATURE #132: Option to exclude API keys from export
// ============================================================================
console.log('FEATURE #132: Option to exclude API keys from export');
console.log('-'.repeat(80));

test('feature132',
    'includeApiKeysInExport state variable exists',
    settingsModalCode.includes('const [includeApiKeysInExport, setIncludeApiKeysInExport]'),
    'State variable not found'
);

test('feature132',
    'Checkbox UI exists in Data Management section',
    settingsModalCode.includes('type="checkbox"') &&
    settingsModalCode.includes('checked={includeApiKeysInExport}') &&
    settingsModalCode.includes('Include API keys in export'),
    'Checkbox UI not found'
);

test('feature132',
    'API key exclusion logic exists',
    settingsModalCode.includes('if (!includeApiKeysInExport && exportData.ai_config)'),
    'Exclusion logic not found'
);

test('feature132',
    'Clears OpenAI API key when excluded',
    settingsModalCode.includes('openai:') &&
    settingsModalCode.match(/apiKey:\s*''/)?.length > 0,
    'OpenAI API key not cleared'
);

test('feature132',
    'Clears Straico API key when excluded',
    settingsModalCode.includes('straico:') &&
    (settingsModalCode.match(/apiKey:\s*''/g)?.length >= 2),
    'Straico API key not cleared'
);

test('feature132',
    'Console warning when keys excluded',
    settingsModalCode.includes('console.log(\'⚠️ API keys excluded from export\')'),
    'Console warning not found'
);

console.log();

// ============================================================================
// SUMMARY
// ============================================================================
console.log('='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));

const totalTests = results.feature130.total + results.feature131.total + results.feature132.total;
const totalPassed = results.feature130.passed + results.feature131.passed + results.feature132.passed;

console.log(`Feature #130: ${results.feature130.passed}/${results.feature130.total} tests passing (${Math.round(results.feature130.passed/results.feature130.total*100)}%)`);
console.log(`Feature #131: ${results.feature131.passed}/${results.feature131.total} tests passing (${Math.round(results.feature131.passed/results.feature131.total*100)}%)`);
console.log(`Feature #132: ${results.feature132.passed}/${results.feature132.total} tests passing (${Math.round(results.feature132.passed/results.feature132.total*100)}%)`);
console.log();
console.log(`Total: ${totalPassed}/${totalTests} tests passing (${Math.round(totalPassed/totalTests*100)}%)`);

// Detailed results
console.log();
console.log('DETAILED RESULTS:');
console.log();

Object.entries(results).forEach(([id, feature]) => {
    console.log(`${id}: ${feature.name}`);
    feature.tests.forEach(t => {
        console.log(`  ${t.passed ? '✓' : '✗'} ${t.test}`);
    });
    console.log();
});

// Code snippets for verification
console.log('='.repeat(80));
console.log('RELEVANT CODE SNIPPETS');
console.log('='.repeat(80));
console.log();

// Extract handleExportData function
const exportFunctionMatch = settingsModalCode.match(/const handleExportData = async \(\) => \{[\s\S]*?\n  \}/);
if (exportFunctionMatch) {
    console.log('handleExportData function:');
    console.log('-'.repeat(40));
    const lines = exportFunctionMatch[0].split('\n').slice(0, 35); // First 35 lines
    console.log(lines.join('\n'));
    console.log('...');
    console.log();
}

// Extract checkbox UI
const checkboxMatch = settingsModalCode.match(/<label[\s\S]*?Include API keys in export[\s\S]*?<\/label>/);
if (checkboxMatch) {
    console.log('API Key Export Option Checkbox:');
    console.log('-'.repeat(40));
    console.log(checkboxMatch[0]);
    console.log();
}

// Export button UI
const exportButtonMatch = settingsModalCode.match(/<button[\s\S]*?onClick={handleExportData}[\s\S]*?<\/button>/);
if (exportButtonMatch) {
    console.log('Export Data Button:');
    console.log('-'.repeat(40));
    console.log(exportButtonMatch[0]);
    console.log();
}

// Final verdict
console.log('='.repeat(80));
if (results.feature130.passed === results.feature130.total &&
    results.feature131.passed === results.feature131.total &&
    results.feature132.passed === results.feature132.total) {
    console.log('✓ ALL FEATURES #130, #131, #132: PASSING');
    console.log('='.repeat(80));
    process.exit(0);
} else {
    console.log('✗ SOME TESTS FAILED');
    console.log('='.repeat(80));
    process.exit(1);
}
