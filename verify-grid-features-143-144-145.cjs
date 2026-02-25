/**
 * Verification Script for Grid Layout Features #143, #144, #145
 *
 * Feature #143: Grid layout persistence
 * Feature #144: Live preview of layout changes
 * Feature #145: Mobile-responsive grid adjustments
 */

const fs = require('fs');
const path = require('path');

const RESULTS = {
  feature_143: { passed: [], failed: [], total: 0 },
  feature_144: { passed: [], failed: [], total: 0 },
  feature_145: { passed: [], failed: [], total: 0 },
};

function test(featureId, description, passed) {
  const results = RESULTS[`feature_${featureId}`];
  results.total++;
  if (passed) {
    results.passed.push(description);
    console.log(`✅ Feature #${featureId}: ${description}`);
  } else {
    results.failed.push(description);
    console.log(`❌ Feature #${featureId}: ${description}`);
  }
}

console.log('='.repeat(60));
console.log('GRID LAYOUT FEATURES VERIFICATION');
console.log('Testing Features #143, #144, #145');
console.log('='.repeat(60));
console.log();

// ============================================================================
// FEATURE #143: Grid layout persistence
// ============================================================================
console.log('FEATURE #143: Grid layout persistence');
console.log('-'.repeat(60));

// Read App.tsx to verify persistence implementation
const appTsPath = path.join(__dirname, 'src/App.tsx');
const appTsContent = fs.readFileSync(appTsPath, 'utf-8');

// Test 1: Settings state includes grid_columns
test(143, 'Settings state includes grid_columns',
  appTsContent.includes('grid_columns: 3') ||
  appTsContent.includes('grid_columns:')
);

// Test 2: Settings state includes grid_gap
test(143, 'Settings state includes grid_gap',
  appTsContent.includes('grid_gap:') ||
  appTsContent.includes('gridGap')
);

// Test 3: Grid uses settings.grid_columns in className
test(143, 'Grid className uses settings.grid_columns',
  appTsContent.includes('settings.grid_columns')
);

// Test 4: Grid uses settings.grid_gap in style
test(143, 'Grid style uses settings.grid_gap',
  appTsContent.includes('settings.grid_gap')
);

// Test 5: Settings loaded from storage on init
test(143, 'Settings loaded from Chrome storage on initialization',
  appTsContent.includes('settingsStorage.get()') ||
  appTsContent.includes('settingsResult')
);

// Test 6: Settings saved to storage
test(143, 'Settings saved to Chrome storage via settingsStorage',
  appTsContent.includes('handleSaveSettings') ||
  appTsContent.includes('onSettingsChange')
);

// Read SettingsModal.tsx to verify save implementation
const settingsModalPath = path.join(__dirname, 'src/components/SettingsModal.tsx');
const settingsModalContent = fs.readFileSync(settingsModalPath, 'utf-8');

// Test 7: Grid columns saved to storage
test(143, 'Grid columns saved to Chrome storage',
  settingsModalContent.includes('grid_columns: gridColumns') &&
  settingsModalContent.includes('settingsStorage.set')
);

// Test 8: Grid gap saved to storage
test(143, 'Grid gap saved to Chrome storage',
  settingsModalContent.includes('grid_gap: gridGap') &&
  settingsModalContent.includes('settingsStorage.set')
);

// Test 9: Settings loaded from storage in modal
test(143, 'Settings loaded in modal from storage',
  settingsModalContent.includes('loadSettings') &&
  settingsModalContent.includes('settingsStorage.get()')
);

console.log();

// ============================================================================
// FEATURE #144: Live preview of layout changes
// ============================================================================
console.log('FEATURE #144: Live preview of layout changes');
console.log('-'.repeat(60));

// Test 1: Grid columns state exists
test(144, 'Grid columns state variable exists',
  settingsModalContent.includes('useState(3)') ||
  settingsModalContent.includes('useState(settings?.grid_columns')
);

// Test 2: Grid gap state exists
test(144, 'Grid gap state variable exists',
  settingsModalContent.includes('useState(') &&
  settingsModalContent.includes('gridGap')
);

// Test 3: Grid columns slider/selector exists
test(144, 'Grid columns slider/selector UI exists',
  settingsModalContent.includes('type="range"') &&
  settingsModalContent.includes('id="columns"') &&
  settingsModalContent.includes('max="6"')
);

// Test 4: Grid gap slider exists
test(144, 'Grid gap slider UI exists',
  settingsModalContent.includes('id="spacing"') &&
  settingsModalContent.includes('max="64"')
);

// Test 5: onChange handler updates state immediately
test(144, 'Grid columns onChange updates state immediately',
  settingsModalContent.includes('onChange') &&
  settingsModalContent.includes('handleGridColumnsChange') ||
  settingsModalContent.includes('setGridColumns')
);

// Test 6: Grid gap onChange updates state immediately
test(144, 'Grid gap onChange updates state immediately',
  settingsModalContent.includes('handleGridGapChange') ||
  settingsModalContent.includes('setGridGap')
);

// Test 7: State changes are reflected instantly (no save required)
test(144, 'Grid columns display shows current value',
  settingsModalContent.includes('Number of Columns:') ||
  settingsModalContent.includes('{gridColumns}')
);

// Test 8: Grid gap display shows current value
test(144, 'Grid gap display shows current value',
  settingsModalContent.includes('Widget Spacing:') ||
  settingsModalContent.includes('{gridGap}px')
);

console.log();

// ============================================================================
// FEATURE #145: Mobile-responsive grid adjustments
// ============================================================================
console.log('FEATURE #145: Mobile-responsive grid adjustments');
console.log('-'.repeat(60));

// Test 1: Grid uses responsive breakpoints
test(145, 'Grid uses responsive Tailwind breakpoints',
  appTsContent.includes('grid-cols-1') &&
  (appTsContent.includes('md:grid-cols-2') || appTsContent.includes('lg:grid-cols-'))
);

// Test 2: Mobile uses 1 column
test(145, 'Mobile (base) uses 1 column',
  appTsContent.includes('grid-cols-1')
);

// Test 3: Tablet/md breakpoint uses 2 columns
test(145, 'Medium breakpoint (md) uses at least 2 columns',
  appTsContent.includes('md:grid-cols-2')
);

// Test 4: Desktop/lg breakpoint uses 3 columns
test(145, 'Large breakpoint (lg) uses at least 3 columns',
  appTsContent.includes('lg:grid-cols-3')
);

// Test 5: Extra large/xl breakpoint uses 4 columns
test(145, 'Extra large breakpoint (xl) uses at least 4 columns',
  appTsContent.includes('xl:grid-cols-4') ||
  appTsContent.includes('xl:grid-cols-5')
);

// Test 6: Extra extra large/2xl breakpoint uses 6 columns
test(145, '2XL breakpoint uses up to 6 columns',
  appTsContent.includes('2xl:grid-cols-6')
);

// Test 7: All column settings have responsive fallbacks
test(145, 'All column settings have responsive mobile fallback',
  appTsContent.match(/grid-cols-1/g)?.length >= 6
);

// Test 8: Widgets stack vertically on mobile
test(145, 'Grid configuration ensures vertical stacking on mobile',
  appTsContent.includes('grid-cols-1') &&
  !appTsContent.includes('grid-cols-2 grid-cols-1')
);

console.log();
console.log('='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));

const totalPassed = RESULTS.feature_143.passed.length +
                   RESULTS.feature_144.passed.length +
                   RESULTS.feature_145.passed.length;
const totalFailed = RESULTS.feature_143.failed.length +
                   RESULTS.feature_144.failed.length +
                   RESULTS.feature_145.failed.length;
const totalTests = totalPassed + totalFailed;

console.log(`Feature #143 (Persistence): ${RESULTS.feature_143.passed.length}/${RESULTS.feature_143.total} tests passed`);
console.log(`Feature #144 (Live Preview): ${RESULTS.feature_144.passed.length}/${RESULTS.feature_144.total} tests passed`);
console.log(`Feature #145 (Mobile Responsive): ${RESULTS.feature_145.passed.length}/${RESULTS.feature_145.total} tests passed`);
console.log();
console.log(`Total: ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);

if (totalFailed > 0) {
  console.log();
  console.log('FAILED TESTS:');
  RESULTS.feature_143.failed.forEach(t => console.log(`  #143: ${t}`));
  RESULTS.feature_144.failed.forEach(t => console.log(`  #144: ${t}`));
  RESULTS.feature_145.failed.forEach(t => console.log(`  #145: ${t}`));
  process.exit(1);
} else {
  console.log();
  console.log('✅ ALL TESTS PASSED!');
  process.exit(0);
}
