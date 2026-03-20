# Import/Export Feature Code Review

**Date:** 2026-02-26  
**Reviewer:** AI Code Review  
**Files Reviewed:**
- `src/components/SettingsModal.tsx` (lines 416-541)
- `src/components/ImportConfirmationModal.tsx`
- `src/services/storage.ts`
- `src/utils/security.ts`

---

## Executive Summary

The import/export feature has a **critical bug** where imported data is stored incorrectly (storing wrapper object instead of data), and several security inconsistencies around API key exclusion. The feature also has incomplete handling of widget-specific storage keys.

---

## Issues by Severity

### 🔴 Critical (Must Fix)

#### 1. Storage Key Mismatch on Import
**Location:** `SettingsModal.tsx:485, 496`

**Problem:** Import stores `pendingImportData` directly, but this is the wrapper object containing `{ version, exportDate, data }`. It should store `pendingImportData.data`.

```typescript
// Current (WRONG):
await chrome.storage.local.set(pendingImportData)

// Should be:
await chrome.storage.local.set(pendingImportData.data)
```

**Impact:** Import will fail silently or create corrupted storage state.

---

#### 2. Google OAuth Tokens Not Excluded from Export
**Location:** `SettingsModal.tsx:416-449`

**Problem:** When `includeApiKeysInExport` is `false`, these sensitive keys are still exported:
- `google_calendar_config.clientId`
- `google_calendar_tokens` (OAuth access/refresh tokens)

**Impact:** Security risk - OAuth tokens could be compromised if export file is shared.

---

### 🟠 High Priority

#### 3. Unused Component - Dead Code
**Location:** `src/components/ImportConfirmationModal.tsx`

**Problem:** This component is imported nowhere and never used. SettingsModal has its own inline confirmation modal.

**Impact:** Confusion, maintenance burden, potential bugs if someone tries to use it.

---

#### 4. Merge Mode Doesn't Merge Widget Data
**Location:** `SettingsModal.tsx:488-496`

**Problem:** Merge only considers pages at the top level. If both existing and imported data have the same page ID, widgets are completely replaced (not merged).

**Impact:** Users expecting "merge" will lose existing widgets on pages that exist in both datasets.

---

#### 5. Non-Atomic Import Operation
**Location:** `SettingsModal.tsx:484-485`

**Problem:** Clear and set are separate operations:
```typescript
await chrome.storage.local.clear()
await chrome.storage.local.set(pendingImportData) // If this fails, ALL data is lost
```

**Impact:** If import fails after clear, user loses all data with no recovery.

---

### 🟡 Medium Priority

#### 6. No Widget Type Validation
**Location:** `SettingsModal.tsx:453-478`

**Problem:** `validateImportData` doesn't validate:
- Widget types are valid values (`bookmark`, `weather`, `ai-chat`, `clock`, `todo`, `pomodoro`, `calendar`)
- Widget configs match their declared types
- Page/widget IDs are valid strings

**Impact:** Malformed import files could cause runtime errors.

---

#### 7. Orphaned Widget-Specific Storage
**Location:** Import/Export logic

**Problem:** These storage keys are exported but not handled during merge:
- `chat-history-{widgetId}`
- `todo-list-{widgetId}`
- `pomodoro-history-{widgetId}`

**Impact:** After import, widget-specific data may reference non-existent widget IDs.

---

#### 8. Strict Version Check
**Location:** `SettingsModal.tsx:456`

**Problem:** Only accepts exact version `1.0.0`. Future versions will be rejected.

```typescript
if (importData.version !== '1.0.0')
```

**Impact:** Forward incompatibility.

---

### 🟢 Low Priority

#### 9. File Type Validation Edge Case
**Location:** `SettingsModal.tsx:526`

**Problem:** Some JSON files have `text/plain` MIME type and would be rejected.

---

## Implementation Phases

### Phase 1: Critical Fixes

**Goal:** Fix bugs that cause data loss or security issues

1. **Fix storage key mismatch**
   - Change `pendingImportData` to `pendingImportData.data` in both import modes
   - Add validation that `pendingImportData.data` exists before import

2. **Exclude Google credentials from export**
   - Add `google_calendar_config.clientId` to exclusion list
   - Add `google_calendar_tokens` to exclusion list
   - Add `google_calendars` to exclusion list (contains user calendar info)

3. **Delete unused ImportConfirmationModal.tsx**

---

### Phase 2: Import Reliability

**Goal:** Make import operation safe and atomic

1. **Implement backup before import**
   - Before clearing, save current data to a backup key
   - On failure, restore from backup
   - Clear backup after successful import

2. **Improve merge mode**
   - Deep merge widgets within pages (by widget ID)
   - Handle widget-specific storage keys during merge
   - Add user feedback about what was merged vs replaced

3. **Add widget type validation**
   - Validate widget types against allowed values
   - Validate required fields exist
   - Provide specific error messages for validation failures

---

### Phase 3: Enhancements

**Goal:** Improve user experience and forward compatibility

1. **Semver version checking**
   - Accept minor/patch version differences
   - Only reject major version mismatches

2. **Import preview**
   - Show summary of what will be imported
   - Show conflicts before confirmation
   - Allow selective import

3. **Better file type handling**
   - Try parsing regardless of MIME type
   - Only reject if JSON.parse fails

---

## Testing Checklist

After each phase, verify:

- [ ] Export creates valid JSON file with correct structure
- [ ] Export excludes API keys when option is unchecked
- [ ] Import (replace mode) correctly restores all data
- [ ] Import (merge mode) combines pages correctly
- [ ] Import shows appropriate error messages
- [ ] No data loss on import failure
- [ ] Widget-specific data (todos, chat history) persists correctly
- [ ] Theme and settings restore correctly
- [ ] No console errors during import/export

---

## Files Modified

| File | Phase | Changes |
|------|-------|---------|
| `src/components/SettingsModal.tsx` | 1, 2, 3 | All import/export fixes |
| `src/components/ImportConfirmationModal.tsx` | 1 | DELETED |
| `src/types/index.ts` | 2 | Add ImportData type |

---

## Changelog

### Phase 1 - Completed
- [x] Fixed storage key mismatch (using `pendingImportData.data` instead of `pendingImportData`)
- [x] Added Google credentials exclusion from export
- [x] Deleted unused `ImportConfirmationModal.tsx`

### Phase 2 - Completed
- [x] Implemented backup before import with automatic rollback on failure
- [x] Improved merge mode with deep widget merging
- [x] Added comprehensive widget type validation

### Phase 3 - Completed
- [x] Added semver version checking for forward compatibility
- [x] Improved file type handling to be more permissive
