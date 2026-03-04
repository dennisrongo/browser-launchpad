# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Overview

Browser Launchpad is a Chrome Extension (Manifest v3) that replaces the new tab page with a customizable, widget-based dashboard. Built with React, TypeScript, Vite, and Tailwind CSS. Data persistence uses Chrome Storage API.

## Build Commands

```bash
npm run dev          # Start development server with hot reload (port 8080)
npm run build        # Production build (runs tsc then vite build)
npm run lint         # Run ESLint on .ts/.tsx files
npm run type         # TypeScript type check (no emit)
```

**No test framework is configured.** Do not create test files unless asked to set up testing first.

## Code Style Guidelines

### Imports

Order imports as follows, separated by blank lines:

```typescript
// 1. React imports
import { useState, useEffect, useCallback } from 'react'

// 2. External packages (lucide-react, date-fns, etc.)
import { Pencil, Trash2, X } from 'lucide-react'

// 3. Internal types (use `import type` for type-only imports)
import type { Widget, WidgetConfig } from '../types'

// 4. Internal utilities and services
import { getFromStorage, setToStorage } from '../services/storage'
import { logger } from '../utils/logger'
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `BookmarkWidget`, `ErrorBoundary` |
| Component files | PascalCase.tsx | `BookmarkWidget.tsx` |
| Utility files | camelCase.ts | `logger.ts`, `theme.ts` |
| Types/Interfaces | PascalCase | `WidgetConfig`, `StorageResult` |
| Functions | camelCase | `handleAddBookmark`, `fetchPageTitle` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PAGES`, `DEFAULT_WIDGET_CONFIGS` |
| CSS classes | kebab-case (Tailwind) | `glass-card`, `btn-primary` |

### TypeScript

- **Strict mode is enabled.** All code must pass strict type checking.
- Use `import type` for type-only imports.
- Prefer interfaces for object shapes, types for unions/primitives.
- Avoid `any` - use `unknown` with type guards or define proper types.
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safety.

```typescript
// Good
export interface Widget {
  id: string
  type: WidgetType
  config: WidgetConfig
}

// Good - discriminated union
export type WidgetType = 'bookmark' | 'weather' | 'ai-chat' | 'clock'

// Good - type-only import
import type { ThemeName } from '../utils/theme'
```

### React Components

- Use functional components with hooks.
- Define prop interfaces inline or above component.
- Use `onConfigChange?.()` pattern for optional callbacks.
- Extract complex logic into custom hooks when reusable.

```typescript
interface BookmarkWidgetProps {
  title: string
  config: BookmarkWidgetConfig
  onConfigChange?: (newConfig: BookmarkWidgetConfig) => void
}

export function BookmarkWidget({ title: _title, config, onConfigChange }: BookmarkWidgetProps) {
  const [bookmarks, setBookmarks] = useState(config.bookmarks || [])
  // ...
}
```

### Styling (Tailwind CSS)

- Use Tailwind utility classes exclusively.
- Custom theme values available: `bg-surface`, `text-text-muted`, `border-border`, `rounded-card`, `rounded-button`, `rounded-input`.
- Use semantic color names: `primary`, `secondary`, `accent`, `surface`, `text`, `border`.
- Custom button classes: `btn-primary`, `btn-secondary`, `btn-ghost`.
- Custom card classes: `glass-card`, `glass-modal`, `glass-dropdown`.
- Animations: `animate-fade-in`, `animate-modal-in`, `animate-dropdown-in`.

```typescript
// Good - using semantic colors and custom values
<button className="btn-primary px-4 py-2 rounded-button">
  Save
</button>

// Good - responsive design
<div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
```

### Error Handling

- **Chrome Storage API:** Always check `chrome.runtime.lastError` after async operations.
- **Use the logger utility** for consistent error logging.
- **Optimistic UI updates:** Show changes immediately, rollback on failure.

```typescript
// Chrome Storage pattern
export function getFromStorage<T>(keys: string): Promise<StorageResult<T>> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage error:', chrome.runtime.lastError.message)
          resolve({ data: null, error: chrome.runtime.lastError.message ?? null })
          return
        }
        resolve({ data: result[keys] ?? null, error: null })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      resolve({ data: null, error: errorMessage })
    }
  })
}

// Optimistic update pattern
const handleSave = async () => {
  const previousPages = pages
  setPages(updatedPages)  // Optimistic update
  
  const result = await pagesStorage.set(updatedPages)
  if (!result.success) {
    console.error('Failed to save, rolling back:', result.error)
    setPages(previousPages)  // Rollback
  }
}
```

### Chrome Extension Specifics

- **Manifest v3** - service worker, not background page.
- **CSP Configuration:** Must be kept in sync between `public/manifest.json` and `newtab.html`.
- **Chrome Storage API** is the only data storage mechanism (no localStorage, no IndexedDB).
- When adding new API endpoints, update `connect-src` in both CSP locations.
- Use `chrome.runtime.sendMessage()` for background communication.

```typescript
// Message pattern
const response = await chrome.runtime.sendMessage({ type: 'FETCH_PAGE_TITLE', url })
if (response?.success) {
  return response.title
}
```

### File Structure

```
src/
├── components/     # Reusable UI components (Header, Modal, etc.)
├── widgets/        # Widget implementations (BookmarkWidget, etc.)
├── hooks/          # Custom React hooks (currently empty)
├── services/       # API and storage services
├── types/          # TypeScript type definitions (index.ts)
├── utils/          # Utility functions (logger, theme, etc.)
├── App.tsx         # Main application component
├── main.tsx        # Entry point
└── background.ts   # Chrome extension service worker
```

### Adding New Widgets

1. Add type to `WidgetType` in `src/types/index.ts`.
2. Create config interface in `src/types/index.ts`.
3. Add to `DEFAULT_WIDGET_CONFIGS` and `DEFAULT_WIDGET_TITLES` in `App.tsx`.
4. Create widget component in `src/widgets/NewWidget.tsx`.
5. Add to widget type selector if applicable.

### Do Not

- Do not use `localStorage` or `sessionStorage` - use Chrome Storage API only.
- Do not create mock data or in-memory storage for persistent data.
- Do not remove and re-add the extension during development (clears storage).
- Do not add comments unless explaining complex logic - code should be self-documenting.
- Do not use emojis in code (UI text is fine).

## Development Workflow

1. Run `npm run dev` to start development server.
2. Load extension from `dist/` folder in `chrome://extensions`.
3. Use the **reload button** on extension card to update (don't remove/re-add).
4. Run `npm run type` and `npm run lint` before committing.
