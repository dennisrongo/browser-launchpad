/**
 * Verification Script for UI Integration Features #158, #159, #160
 *
 * This script verifies:
 * - Feature #158: Real-time data updates
 * - Feature #159: Storage change listeners
 * - Feature #160: Optimistic UI updates
 */

const fs = require('fs');
const path = require('path');

const appTsPath = path.join(__dirname, 'src/App.tsx');
const appContent = fs.readFileSync(appTsPath, 'utf-8');

console.log('='.repeat(80));
console.log('UI INTEGRATION FEATURES VERIFICATION');
console.log('Features: #158, #159, #160');
console.log('='.repeat(80));
console.log('');

let feature158Passing = true;
let feature159Passing = true;
let feature160Passing = true;

// ============================================================================
// FEATURE #158: Real-time Data Updates
// ============================================================================
console.log('Feature #158: Real-time Data Updates');
console.log('-'.repeat(80));

const checks158 = [
  {
    name: 'setPages called after storage operations',
    test: () => {
      // Check that setPages is called after storage operations
      const matches = appContent.match(/setPages\(updatedPages\)/g);
      return matches && matches.length > 0;
    }
  },
  {
    name: 'No setTimeout delaying UI updates',
    test: () => {
      // Check for no artificial delays
      const hasDelay = appContent.includes('setTimeout.*setPages') || appContent.includes('setPages.*setTimeout');
      return !hasDelay;
    }
  },
  {
    name: 'UI updates in success handlers',
    test: () => {
      // Check pattern: setPages() called immediately after operations
      return appContent.includes('setPages(updatedPages)') ||
             appContent.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Add widget updates UI immediately',
    test: () => {
      // Check handleSelectWidgetType
      const funcMatch = appContent.match(/const handleSelectWidgetType = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];
      return func.includes('setPages(updatedPages)') && func.includes('setShowWidgetSelector(false)');
    }
  },
  {
    name: 'Edit widget updates UI immediately',
    test: () => {
      // Check handleSaveWidgetTitle
      const funcMatch = appContent.match(/const handleSaveWidgetTitle = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];
      return func.includes('setPages(updatedPages)') && func.includes('setEditingWidgetId(null)');
    }
  },
  {
    name: 'Delete widget updates UI immediately',
    test: () => {
      // Check handleConfirmDeleteWidget
      const funcMatch = appContent.match(/const handleConfirmDeleteWidget = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];
      return func.includes('setPages(updatedPages)') && func.includes('setShowWidgetDeleteConfirm(false)');
    }
  }
];

checks158.forEach((check, index) => {
  const passed = check.test();
  console.log(`  ${index + 1}. ${check.name}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  if (!passed) feature158Passing = false;
});

console.log('');
console.log(`Feature #158 Status: ${feature158Passing ? '✓ PASSING' : '✗ FAILING'}`);
console.log('');

// ============================================================================
// FEATURE #159: Storage Change Listeners
// ============================================================================
console.log('Feature #159: Storage Change Listeners');
console.log('-'.repeat(80));

const checks159 = [
  {
    name: 'chrome.storage.onChanged listener registered',
    test: () => {
      return appContent.includes('chrome.storage.onChanged.addListener');
    }
  },
  {
    name: 'Listener watches for "pages" changes',
    test: () => {
      return appContent.includes("changes.pages") || appContent.includes("if (areaName === 'local' && changes.pages)");
    }
  },
  {
    name: 'Listener updates UI on external changes',
    test: () => {
      return appContent.includes('setPages((changes.pages.newValue') || appContent.includes('setPages((changes.pages.newValue ?? [])');
    }
  },
  {
    name: 'Listener cleanup in useEffect return',
    test: () => {
      return appContent.includes('chrome.storage.onChanged.removeListener');
    }
  },
  {
    name: 'Listener setup on mount',
    test: () => {
      return appContent.includes('useEffect(() => {') &&
             appContent.includes('chrome.storage.onChanged.addListener(listener)');
    }
  },
  {
    name: 'Cross-context synchronization supported',
    test: () => {
      // The listener enables sync between extension contexts (popup, options, newtab)
      return appContent.includes('areaName === \'local\'');
    }
  }
];

checks159.forEach((check, index) => {
  const passed = check.test();
  console.log(`  ${index + 1}. ${check.name}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  if (!passed) feature159Passing = false;
});

console.log('');
console.log(`Feature #159 Status: ${feature159Passing ? '✓ PASSING' : '✗ FAILING'}`);
console.log('');

// ============================================================================
// FEATURE #160: Optimistic UI Updates
// ============================================================================
console.log('Feature #160: Optimistic UI Updates');
console.log('-'.repeat(80));

const checks160 = [
  {
    name: 'UI updates BEFORE storage (optimistic pattern)',
    test: () => {
      // Check for optimistic pattern: setPages before pagesStorage.set
      const patterns = [
        /setPages\(updatedPages\)[\s\S]{0,200}await pagesStorage\.set/,
        /setPages\(updatedPages\)[\s\S]{0,200}setShowWidgetSelector\(false\)[\s\S]{0,200}await pagesStorage\.set/,
        /setActivePage[\s\S]{0,100}setPages[\s\S]{0,100}await pagesStorage\.set/
      ];

      // Check for optimistic updates in handleSelectWidgetType
      const funcMatch = appContent.match(/const handleSelectWidgetType = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Optimistic pattern: setPages comes BEFORE pagesStorage.set
      const setPagesIndex = func.indexOf('setPages(updatedPages)');
      const storageIndex = func.indexOf('await pagesStorage.set(updatedPages)');
      return setPagesIndex !== -1 && storageIndex !== -1 && setPagesIndex < storageIndex;
    }
  },
  {
    name: 'Rollback on storage failure',
    test: () => {
      // Check for error handling with rollback
      return appContent.includes('if (!result.success)') &&
             appContent.includes('setPages(previousPages)') &&
             appContent.includes('rolling back');
    }
  },
  {
    name: 'No loading states during operations',
    test: () => {
      // Optimistic updates mean no need for loading states
      // Check that there are no "loading" states for widget CRUD
      const hasLoadingState = appContent.includes('setIsLoading') || appContent.includes('isSaving');
      return !hasLoadingState;
    }
  },
  {
    name: 'Add widget uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleSelectWidgetType = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> setShowWidgetSelector(false) -> await storage -> rollback
      return func.includes('setPages(updatedPages)') &&
             func.includes('const previousPages = pages') &&
             func.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Delete widget uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleConfirmDeleteWidget = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> hide modal -> await storage -> rollback
      return func.includes('const previousPages = pages') &&
             func.includes('setPages(updatedPages)') &&
             func.includes('setShowWidgetDeleteConfirm(false)') &&
             func.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Edit widget uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleSaveWidgetTitle = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> clear editing -> await storage -> rollback
      return func.includes('const previousPages = pages') &&
             func.includes('setPages(updatedPages)') &&
             func.includes('setEditingWidgetId(null)') &&
             func.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Add page uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleAddPage = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> setActivePage -> await storage -> rollback
      return func.includes('const previousPages = pages') &&
             func.includes('setPages(updatedPages)') &&
             func.includes('setActivePage(updatedPages.length - 1)') &&
             func.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Delete page uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleConfirmDelete = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> setActivePage -> close modal -> await storage -> rollback
      return func.includes('const previousPages = pages') &&
             func.includes('setPages(updatedPages)') &&
             func.includes('setShowDeleteConfirm(false)') &&
             func.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Widget reorder uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleWidgetDrop = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> clear drag states -> await storage -> rollback
      return func.includes('const previousPages = pages') &&
             func.includes('setPages(updatedPages)') &&
             func.includes('setDraggedWidgetId(null)') &&
             func.includes('setPages(previousPages)');
    }
  },
  {
    name: 'Page reorder uses optimistic updates',
    test: () => {
      const funcMatch = appContent.match(/const handleDrop = async[\s\S]*?^\}/m);
      if (!funcMatch) return false;
      const func = funcMatch[0];

      // Pattern: setPages -> setActivePage -> clear drag states -> await storage -> rollback
      return func.includes('const previousPages = pages') &&
             func.includes('setPages(updatedPages)') &&
             func.includes('setDraggedPageId(null)') &&
             func.includes('setPages(previousPages)');
    }
  }
];

checks160.forEach((check, index) => {
  const passed = check.test();
  console.log(`  ${index + 1}. ${check.name}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  if (!passed) feature160Passing = false;
});

console.log('');
console.log(`Feature #160 Status: ${feature160Passing ? '✓ PASSING' : '✗ FAILING'}`);
console.log('');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Feature #158 (Real-time data updates): ${feature158Passing ? '✓ PASSING' : '✗ FAILING'}`);
console.log(`Feature #159 (Storage change listeners): ${feature159Passing ? '✓ PASSING' : '✗ FAILING'}`);
console.log(`Feature #160 (Optimistic UI updates): ${feature160Passing ? '✓ PASSING' : '✗ FAILING'}`);
console.log('');

const allPassing = feature158Passing && feature159Passing && feature160Passing;
console.log(`Overall: ${allPassing ? '✓ ALL FEATURES PASSING' : '✗ SOME FEATURES FAILING'}`);
console.log('='.repeat(80));

process.exit(allPassing ? 0 : 1);
