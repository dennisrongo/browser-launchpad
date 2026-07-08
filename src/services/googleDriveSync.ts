import type { Page, Settings, TombstoneStore, VersionedBlob, Widget } from '../types'

import { logger } from '../utils/logger'
import {
  getTombstones,
  isTombstonedNewerThan,
  mergeTombstoneStores,
  setTombstones,
} from './tombstones'
import {
  mergeVersionedBlob,
  toVersionedBlob,
} from '../utils/versionedBlob'

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const GOOGLE_DRIVE_CONFIG_KEY = 'google_drive_config'
const GOOGLE_DRIVE_SYNC_STATE_KEY = 'google_drive_sync_state'
const GOOGLE_DRIVE_SYNC_FILE_NAME = 'browser-launchpad-sync.json'
const GOOGLE_DRIVE_SYNC_VERSION = '2.0.0'
const GOOGLE_DRIVE_MANIFEST_CLIENT_ID_PLACEHOLDER =
  'REPLACE_WITH_GOOGLE_EXTENSION_CLIENT_ID.apps.googleusercontent.com'

const DEFAULT_GOOGLE_DRIVE_CONFIG: GoogleDriveConfig = {
  autoSyncEnabled: false,
}

const DEFAULT_GOOGLE_DRIVE_SYNC_STATE: GoogleDriveSyncState = {
  lastSyncedAt: null,
  lastRestoredAt: null,
  lastError: null,
  syncFileId: null,
}

interface StoredGoogleDriveConfig {
  autoSyncEnabled?: boolean
}

interface GoogleDriveFile {
  id: string
  name: string
  modifiedTime?: string
}

interface GoogleDriveFileListResponse {
  files?: GoogleDriveFile[]
}

interface GoogleOAuthErrorResponse {
  error?: string
  error_description?: string
}

interface GoogleDriveSyncFileResponse {
  id: string
  name?: string
  modifiedTime?: string
}

export interface GoogleDriveConfig {
  autoSyncEnabled: boolean
}

export interface GoogleDriveManifestConfig {
  clientId: string
  isConfigured: boolean
  scopes: string[]
}

export interface GoogleDriveSyncState {
  lastSyncedAt: string | null
  lastRestoredAt: string | null
  lastError: string | null
  syncFileId: string | null
}

export interface GoogleDriveSyncPayload {
  version: string
  syncedAt: string
  data: {
    pages?: Page[]
    settings: Settings
    separateStore?: Record<string, unknown>
    tombstones?: TombstoneStore
    // Legacy v1 payloads stored only bookmark widgets under bookmarkPages.
    bookmarkPages?: Page[]
  }
}

function setStorageValue(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}

function getStorageValue<T>(keys: string | string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        resolve(result as T)
      })
    } catch (error) {
      reject(error)
    }
  })
}

function removeStorageValue(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}

function normalizeGoogleDriveConfig(
  config?: StoredGoogleDriveConfig
): GoogleDriveConfig {
  if (!config) {
    return DEFAULT_GOOGLE_DRIVE_CONFIG
  }

  return {
    autoSyncEnabled: config.autoSyncEnabled ?? false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPage(value: unknown): value is Page {
  if (!isRecord(value) || !Array.isArray(value.widgets)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.order === 'number' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  )
}

function isPageLoose(value: unknown): value is Page {
  if (!isRecord(value) || !Array.isArray(value.widgets)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.order === 'number' &&
    typeof value.created_at === 'string'
  )
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    typeof value.theme === 'string' &&
    typeof value.grid_columns === 'number' &&
    typeof value.grid_gap === 'number' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  )
}

function isGoogleDriveSyncPayload(value: unknown): value is GoogleDriveSyncPayload {
  if (!isRecord(value) || !isRecord(value.data)) {
    return false
  }

  const data = value.data

  if (
    typeof value.version !== 'string' ||
    typeof value.syncedAt !== 'string' ||
    !isSettings(data.settings)
  ) {
    return false
  }

  // v2 payload: full pages array (+ optional separateStore).
  // An empty pages array is rejected as corrupt — the app always
  // guarantees at least one page, so an empty backup would otherwise
  // wipe all local data on restore.
  if (Array.isArray(data.pages)) {
    if (data.pages.length === 0) {
      return false
    }
    if (!data.pages.every(isPageLoose)) {
      return false
    }
    if (data.separateStore !== undefined && !isRecord(data.separateStore)) {
      return false
    }
    return true
  }

  // v1 legacy payload: bookmark-only pages
  if (Array.isArray(data.bookmarkPages)) {
    return data.bookmarkPages.every(isPage)
  }

  return false
}

async function parseGoogleError(response: Response): Promise<string> {
  const text = await response.text()

  try {
    const parsed = JSON.parse(text) as GoogleOAuthErrorResponse
    return parsed.error_description || parsed.error || text || 'Unknown Google API error'
  } catch {
    return text || 'Unknown Google API error'
  }
}

function getGoogleDriveAuthTokenOptions(
  interactive: boolean
): chrome.identity.TokenDetails {
  return {
    interactive,
    scopes: [GOOGLE_DRIVE_SCOPE],
  }
}

function getGoogleDriveManifestConfigInternal(): GoogleDriveManifestConfig {
  const oauth2 = chrome.runtime.getManifest().oauth2
  const clientId = oauth2?.client_id ?? ''
  const scopes = oauth2?.scopes ?? []
  const isConfigured =
    !!clientId &&
    clientId !== GOOGLE_DRIVE_MANIFEST_CLIENT_ID_PLACEHOLDER &&
    scopes.includes(GOOGLE_DRIVE_SCOPE)

  return {
    clientId,
    isConfigured,
    scopes,
  }
}

async function getAuthToken(interactive: boolean): Promise<string> {
  const manifestConfig = getGoogleDriveManifestConfigInternal()

  if (!manifestConfig.isConfigured) {
    throw new Error(
      'Google Drive OAuth is not configured in manifest.json yet. Add your Chrome Extension OAuth client ID to public/manifest.json and reload the extension.'
    )
  }

  const result = await chrome.identity.getAuthToken(
    getGoogleDriveAuthTokenOptions(interactive)
  )

  if (!result.token) {
    throw new Error(
      interactive
        ? 'Google Drive sign-in did not return an access token.'
        : 'Google Drive is not connected. Open Settings and connect Google Drive first.'
    )
  }

  return result.token
}

async function invalidateAuthToken(token: string): Promise<void> {
  try {
    await chrome.identity.removeCachedAuthToken({ token })
  } catch (error) {
    logger.warn('Failed to remove cached Google Drive token', error)
  }
}

async function googleDriveRequest(
  url: string,
  init: RequestInit = {},
  retryOnUnauthorized = true
): Promise<Response> {
  const token = await getAuthToken(false)
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (response.status === 401 && retryOnUnauthorized) {
    await invalidateAuthToken(token)

    const freshToken = await getAuthToken(false)
    const retryHeaders = new Headers(init.headers)
    retryHeaders.set('Authorization', `Bearer ${freshToken}`)

    return fetch(url, {
      ...init,
      headers: retryHeaders,
    })
  }

  return response
}

async function listGoogleDriveAppDataFiles(): Promise<GoogleDriveFile[]> {
  const url = new URL('https://www.googleapis.com/drive/v3/files')
  url.searchParams.set('spaces', 'appDataFolder')
  url.searchParams.set('fields', 'files(id,name,modifiedTime)')
  url.searchParams.set('pageSize', '100')

  const response = await googleDriveRequest(url.toString())

  if (!response.ok) {
    throw new Error(await parseGoogleError(response))
  }

  const data = (await response.json()) as GoogleDriveFileListResponse
  return data.files ?? []
}

async function findGoogleDriveSyncFile(): Promise<GoogleDriveFile | null> {
  const files = await listGoogleDriveAppDataFiles()

  const matchingFiles = files
    .filter((file) => file.name === GOOGLE_DRIVE_SYNC_FILE_NAME)
    .sort((left, right) =>
      (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? '')
    )

  return matchingFiles[0] ?? null
}

async function uploadGoogleDriveSyncFile(
  payload: GoogleDriveSyncPayload,
  fileId?: string
): Promise<GoogleDriveSyncFileResponse> {
  const boundary = `browser-launchpad-${Date.now()}`
  const metadata = fileId
    ? { name: GOOGLE_DRIVE_SYNC_FILE_NAME }
    : { name: GOOGLE_DRIVE_SYNC_FILE_NAME, parents: ['appDataFolder'] }

  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(payload),
    `--${boundary}--`,
  ].join('\r\n')

  const url = new URL(
    fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}`
      : 'https://www.googleapis.com/upload/drive/v3/files'
  )
  url.searchParams.set('uploadType', 'multipart')
  url.searchParams.set('fields', 'id,name,modifiedTime')

  const response = await googleDriveRequest(url.toString(), {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  })

  if (!response.ok) {
    throw new Error(await parseGoogleError(response))
  }

  return (await response.json()) as GoogleDriveSyncFileResponse
}

async function downloadGoogleDriveSyncPayload(
  fileId: string
): Promise<GoogleDriveSyncPayload> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`)
  url.searchParams.set('alt', 'media')

  const response = await googleDriveRequest(url.toString())

  if (!response.ok) {
    throw new Error(await parseGoogleError(response))
  }

  const data = (await response.json()) as unknown

  if (!isGoogleDriveSyncPayload(data)) {
    throw new Error('The Google Drive sync file is not valid for Browser Launchpad.')
  }

  // v2 payloads store full (scrubbed) pages; v1 legacy payloads store bookmarkPages only.
  if (Array.isArray(data.data.pages)) {
    return {
      ...data,
      data: {
        ...data.data,
        pages: preparePagesForSync(data.data.pages),
      },
    }
  }

  return data
}

const SEPARATE_STORE_KEY_PATTERNS = [
  /^notes-notes-/,
  /^todo-list-todo-widget-/,
  /^pomodoro-history-/,
]

function isSafeSeparateStoreKey(key: string): boolean {
  return SEPARATE_STORE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

function deriveSeparateStoreKeys(pages: Page[]): string[] {
  const keys: string[] = []

  for (const page of pages) {
    for (const widget of page.widgets) {
      if (widget.type === 'notes') {
        // Keyed on widget.id (stable across renames). Falls back to the
        // legacy title-based key so older backups still restore correctly.
        keys.push(`notes-notes-${widget.id}`)
        if (widget.title) {
          keys.push(`notes-notes-${widget.title}`)
        }
      } else if (widget.type === 'todo') {
        keys.push(`todo-list-todo-widget-${widget.id}`)
        if (widget.title) {
          keys.push(`todo-list-todo-widget-${widget.title}`)
        }
      } else if (widget.type === 'pomodoro') {
        keys.push(`pomodoro-history-${widget.id}`)
      }
    }
  }

  return keys
}

async function readSeparateStore(pages: Page[]): Promise<Record<string, unknown>> {
  const keys = deriveSeparateStoreKeys(pages)
  if (keys.length === 0) {
    return {}
  }

  const result = await getStorageValue<Record<string, unknown>>(keys)
  const store: Record<string, unknown> = {}

  for (const key of keys) {
    if (result[key] !== undefined) {
      store[key] = result[key]
    }
  }

  return store
}

async function getLocalSyncData(): Promise<GoogleDriveSyncPayload['data']> {
  const result = await getStorageValue<{
    pages?: Page[]
    settings?: Settings
  }>(['pages', 'settings'])

  if (!result.settings || !isSettings(result.settings)) {
    throw new Error('Settings are not available yet. Save your settings and try again.')
  }

  const pages = Array.isArray(result.pages) ? result.pages : []
  const preparedPages = preparePagesForSync(pages)
  const separateStore = await readSeparateStore(pages)
  const tombstones = await getTombstones()

  return {
    pages: preparedPages,
    settings: result.settings,
    separateStore,
    tombstones,
  }
}

function buildSyncPayload(data: GoogleDriveSyncPayload['data']): GoogleDriveSyncPayload {
  return {
    version: GOOGLE_DRIVE_SYNC_VERSION,
    syncedAt: new Date().toISOString(),
    data,
  }
}

function isNewer(a: Widget, b: Widget): boolean {
  const aTime = a.updated_at ? Date.parse(a.updated_at) : NaN
  const bTime = b.updated_at ? Date.parse(b.updated_at) : NaN

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return true
  if (Number.isNaN(aTime)) return false
  if (Number.isNaN(bTime)) return true

  return aTime >= bTime
}

function mergePages(
  existingPages: Page[],
  syncedPages: Page[],
  tombstones: TombstoneStore
): Page[] {
  const syncedPageMap = new Map(syncedPages.map((page) => [page.id, page]))

  // Merge local pages: drop any that are tombstoned newer than their own
  // updated_at (deleted on this or another device more recently than edited).
  // For pages present on both sides, merge widgets with the same tombstone
  // rule applied per widget.
  const mergedExistingPages = existingPages
    .map((page) => {
      if (isTombstonedNewerThan(tombstones, page.id, page.updated_at)) {
        return null
      }

      const syncedPage = syncedPageMap.get(page.id)

      if (!syncedPage) {
        // Page exists locally only. Keep it: it's a local addition the cloud
        // hasn't seen, OR it survived the tombstone check above (so it was
        // re-created after any deletion). Deletions only propagate via
        // tombstones, not via absence.
        return page
      }

      const localWidgetMap = new Map(page.widgets.map((w) => [w.id, w]))
      const syncedWidgetMap = new Map(syncedPage.widgets.map((w) => [w.id, w]))
      const widgetIds = new Set([...localWidgetMap.keys(), ...syncedWidgetMap.keys()])

      const mergedWidgets = Array.from(widgetIds)
        .map((id) => {
          if (isTombstonedNewerThan(tombstones, id, undefined)) {
            // Widget is tombstoned with no competing timestamp on either side:
            // it was deleted and not re-created. Drop it.
            return null
          }
          const local = localWidgetMap.get(id)
          const synced = syncedWidgetMap.get(id)

          if (local && synced) {
            // Re-check tombstone against the survivor's updated_at so a
            // re-created widget (newer than its tombstone) survives.
            const survivor = isNewer(synced, local) ? synced : local
            if (isTombstonedNewerThan(tombstones, id, survivor.updated_at)) {
              return null
            }
            return survivor
          }
          // Widget exists on one side only: keep it (deletions are tombstone-
          // driven, not absence-driven).
          return synced ?? local ?? null
        })
        .filter((widget): widget is Widget => widget !== null && widget !== undefined)

      const newerPage = isNewerPage(syncedPage, page) ? syncedPage : page

      return {
        ...newerPage,
        updated_at: new Date().toISOString(),
        widgets: mergedWidgets,
      }
    })
    .filter((page): page is Page => page !== null)

  // Add cloud-only pages, respecting tombstones.
  const existingPageIds = new Set(existingPages.map((page) => page.id))
  const newPages = syncedPages.filter(
    (page) =>
      !existingPageIds.has(page.id) &&
      !isTombstonedNewerThan(tombstones, page.id, page.updated_at)
  )

  return [...mergedExistingPages, ...newPages].sort(
    (left, right) => left.order - right.order
  )
}

function isNewerPage(a: Page, b: Page): boolean {
  const aTime = a.updated_at ? Date.parse(a.updated_at) : NaN
  const bTime = b.updated_at ? Date.parse(b.updated_at) : NaN

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return true
  if (Number.isNaN(aTime)) return false
  if (Number.isNaN(bTime)) return true

  return aTime >= bTime
}

function mergeLegacyBookmarkPages(
  existingPages: Page[],
  syncedBookmarkPages: Page[]
): Page[] {
  const syncedPageMap = new Map(
    syncedBookmarkPages.map((page) => [page.id, page])
  )

  const mergedExistingPages = existingPages.map((page) => {
    const syncedPage = syncedPageMap.get(page.id)
    const nonBookmarkWidgets = page.widgets.filter(
      (widget) => widget.type !== 'bookmark'
    )

    if (!syncedPage) {
      return {
        ...page,
        updated_at: new Date().toISOString(),
        widgets: nonBookmarkWidgets,
      }
    }

    return {
      ...page,
      name: syncedPage.name,
      order: syncedPage.order,
      created_at: syncedPage.created_at,
      updated_at: new Date().toISOString(),
      widgets: [...nonBookmarkWidgets, ...syncedPage.widgets],
    }
  })

  const existingPageIds = new Set(existingPages.map((page) => page.id))
  const newPages = syncedBookmarkPages.filter(
    (page) => !existingPageIds.has(page.id)
  )

  return [...mergedExistingPages, ...newPages].sort(
    (left, right) => left.order - right.order
  )
}

function scrubWidgetConfig(widget: Widget): Widget {
  if (widget.type === 'weather') {
    const config = widget.config as unknown as Record<string, unknown>
    if ('apiKey' in config && config.apiKey) {
      return { ...widget, config: { ...widget.config, apiKey: '' } } as Widget
    }
  }

  if (widget.type === 'ai-chat') {
    const config = widget.config as unknown as Record<string, unknown>
    if ('openaiApiKey' in config && config.openaiApiKey) {
      return { ...widget, config: { ...widget.config, openaiApiKey: '' } } as Widget
    }
  }

  return widget
}

export function preparePagesForSync(pages: Page[]): Page[] {
  return pages.map((page) => ({
    ...page,
    widgets: page.widgets.map((widget) => ({
      ...scrubWidgetConfig(widget),
      page_id: page.id,
    })),
  }))
}

// Per-key last-write-wins merge for separate-store values. Each side's value
// may be a legacy raw blob or a VersionedBlob; legacy values are wrapped with
// a fallback timestamp before comparison. Newer updatedAt wins per key.
function mergeSeparateStore(
  local: Record<string, unknown>,
  cloud: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...local }
  const fallback = new Date(0).toISOString()

  for (const key of Object.keys(cloud)) {
    const localValue = merged[key]
    const cloudValue = cloud[key]

    const localBlob = localValue !== undefined
      ? toVersionedBlob(localValue, fallback)
      : undefined
    const cloudBlob = toVersionedBlob(cloudValue, fallback)

    if (!localBlob) {
      merged[key] = cloudBlob
      continue
    }

    merged[key] = mergeVersionedBlob(localBlob, cloudBlob)
  }

  return merged
}

export async function getStoredGoogleDriveConfig(): Promise<GoogleDriveConfig> {
  // Sync is always on now — the manual toggle was removed from the UI.
  // Storage key is retained for backward compat but the value is forced true.
  return { autoSyncEnabled: true }
}

export async function setGoogleDriveConfig(
  config: GoogleDriveConfig
): Promise<void> {
  await setStorageValue({
    [GOOGLE_DRIVE_CONFIG_KEY]: {
      autoSyncEnabled: config.autoSyncEnabled,
    },
  })
}

export async function getGoogleDriveSyncState(): Promise<GoogleDriveSyncState> {
  try {
    const result = await getStorageValue<{
      [GOOGLE_DRIVE_SYNC_STATE_KEY]?: GoogleDriveSyncState
    }>([GOOGLE_DRIVE_SYNC_STATE_KEY])

    return {
      ...DEFAULT_GOOGLE_DRIVE_SYNC_STATE,
      ...(result[GOOGLE_DRIVE_SYNC_STATE_KEY] ?? {}),
    }
  } catch (error) {
    logger.error('Failed to load Google Drive sync state', error)
    return DEFAULT_GOOGLE_DRIVE_SYNC_STATE
  }
}

export async function updateGoogleDriveSyncState(
  updates: Partial<GoogleDriveSyncState>
): Promise<GoogleDriveSyncState> {
  const currentState = await getGoogleDriveSyncState()
  const nextState = {
    ...currentState,
    ...updates,
  }

  await setStorageValue({ [GOOGLE_DRIVE_SYNC_STATE_KEY]: nextState })
  return nextState
}

export async function resetGoogleDriveSyncState(): Promise<void> {
  await removeStorageValue(GOOGLE_DRIVE_SYNC_STATE_KEY)
}

export async function isGoogleDriveAuthorized(): Promise<boolean> {
  try {
    await getAuthToken(false)
    return true
  } catch {
    return false
  }
}

export async function initiateGoogleDriveAuth(): Promise<string> {
  const token = await getAuthToken(true)
  await updateGoogleDriveSyncState({ lastError: null })
  return token
}

export async function getValidGoogleDriveAccessToken(): Promise<string> {
  return getAuthToken(false)
}

// Hash of the local data snapshot at the moment we last synced (upload or
// pull). Auto-sync skips uploading when the current local hash matches this,
// because there's nothing new to push. Any genuine local edit changes the hash.
let lastSyncedContentHash: string | null = null

function computeLocalDataHash(
  pages: Page[],
  settings: Settings,
  separateStore: Record<string, unknown>,
  tombstones: TombstoneStore
): string {
  // JSON.stringify on the data snapshot. Fields like syncedAt/timestamps live
  // in the payload wrapper, not here, so this is stable for identical content.
  return JSON.stringify({ pages, settings, separateStore, tombstones })
}

export async function syncLocalDataToGoogleDrive(): Promise<GoogleDriveSyncPayload | null> {
  try {
    const data = await getLocalSyncData()
    const localPages = data.pages ?? []
    const localSettings = data.settings
    const localSeparateStore = data.separateStore ?? {}
    const localTombstones = data.tombstones ?? {}

    // Short-circuit: if local content is unchanged since the last successful
    // sync (upload OR pull), there's nothing to push. This is what breaks the
    // auto-pull -> auto-upload feedback loop: a pull records its hash, and the
    // subsequent storage-change-triggered upload sees the same hash and bails.
    const currentHash = computeLocalDataHash(localPages, localSettings, localSeparateStore, localTombstones)
    if (lastSyncedContentHash === currentHash) {
      return null
    }

    // Pull-before-upload: reconcile with the current cloud state so this
    // device's upload doesn't clobber changes another device made since our
    // last pull. This is the critical fix for the edit-clobber data-loss path.
    // The merge respects tombstones so deletions still propagate; it does NOT
    // resurrect tombstoned items that the cloud still has.
    const existingFile = await findGoogleDriveSyncFile()
    let mergedPages = localPages
    let mergedSeparateStore = localSeparateStore
    let mergedTombstones = localTombstones
    let mergedSettings = localSettings

    if (existingFile) {
      try {
        const cloud = await downloadGoogleDriveSyncPayload(existingFile.id)
        const cloudTombstones = cloud.data.tombstones ?? {}
        mergedTombstones = mergeTombstoneStores(localTombstones, cloudTombstones)
        if (Array.isArray(cloud.data.pages)) {
          mergedPages = mergePages(localPages, cloud.data.pages, mergedTombstones)
        }
        if (cloud.data.separateStore) {
          mergedSeparateStore = mergeSeparateStore(localSeparateStore, cloud.data.separateStore)
        }
      } catch (error) {
        // Cloud read failed (network blip, corrupt file): fall back to
        // uploading local state. Better a stale upload than none.
        logger.warn('Could not read cloud state before sync; uploading local only', error)
      }
    }

    const payload = buildSyncPayload({
      pages: mergedPages,
      settings: mergedSettings,
      separateStore: mergedSeparateStore,
      tombstones: mergedTombstones,
    })

    const savedFile = await uploadGoogleDriveSyncFile(payload, existingFile?.id)

    // Record the hash of what we just pushed so we don't re-upload it. Apply
    // preparePagesForSync so the hash matches what the pull path would record
    // (same transformation, no API keys in the hash).
    lastSyncedContentHash = computeLocalDataHash(preparePagesForSync(mergedPages), mergedSettings, mergedSeparateStore, mergedTombstones)

    // Persist the merged tombstones back to local storage so the next sync
    // builds on the reconciled state.
    await setTombstones(mergedTombstones)

    await updateGoogleDriveSyncState({
      lastError: null,
      lastSyncedAt: payload.syncedAt,
      lastRestoredAt: payload.syncedAt,
      syncFileId: savedFile.id,
    })

    return payload
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to sync data to Google Drive.'
    await updateGoogleDriveSyncState({ lastError: message })
    logger.error('Google Drive sync failed', error)
    throw error
  }
}

let isRestoringFromGoogleDrive = false

export function getIsRestoringFromGoogleDrive(): boolean {
  return isRestoringFromGoogleDrive
}

export async function restoreLocalDataFromGoogleDrive(): Promise<GoogleDriveSyncPayload> {
  isRestoringFromGoogleDrive = true
  try {
    const syncFile = await findGoogleDriveSyncFile()

    if (!syncFile) {
      throw new Error('No Browser Launchpad backup was found in Google Drive yet.')
    }

    const payload = await downloadGoogleDriveSyncPayload(syncFile.id)
    const current = await getStorageValue<{
      pages?: Page[]
    }>(['pages'])
    const currentPages = Array.isArray(current.pages) ? current.pages : []
    const localTombstones = await getTombstones()
    const mergedTombstones = mergeTombstoneStores(localTombstones, payload.data.tombstones ?? {})

    let mergedPages: Page[]

    if (Array.isArray(payload.data.pages)) {
      mergedPages = mergePages(currentPages, payload.data.pages, mergedTombstones)
    } else if (Array.isArray(payload.data.bookmarkPages)) {
      mergedPages = mergeLegacyBookmarkPages(
        currentPages,
        payload.data.bookmarkPages
      )
    } else {
      mergedPages = currentPages
    }

    await setStorageValue({
      pages: mergedPages,
      settings: payload.data.settings,
    })

    await setTombstones(mergedTombstones)

    if (payload.data.separateStore) {
      const localSeparateStore = await readSeparateStore(currentPages)
      const mergedSeparateStore = mergeSeparateStore(localSeparateStore, payload.data.separateStore)
      const safeEntries = Object.entries(mergedSeparateStore).filter(
        ([key]) => isSafeSeparateStoreKey(key)
      )
      if (safeEntries.length > 0) {
        await setStorageValue(Object.fromEntries(safeEntries))
      }
    }

    lastSyncedContentHash = computeLocalDataHash(
      mergedPages,
      payload.data.settings,
      payload.data.separateStore ?? {},
      mergedTombstones
    )

    await updateGoogleDriveSyncState({
      lastError: null,
      lastRestoredAt: payload.syncedAt,
      syncFileId: syncFile.id,
    })

    return payload
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to restore data from Google Drive.'
    await updateGoogleDriveSyncState({ lastError: message })
    logger.error('Google Drive restore failed', error)
    throw error
  } finally {
    isRestoringFromGoogleDrive = false
  }
}

export async function pullAndMergeFromGoogleDrive(): Promise<boolean> {
  try {
    const authorized = await isGoogleDriveAuthorized()
    if (!authorized) {
      return false
    }

    const syncFile = await findGoogleDriveSyncFile()
    if (!syncFile) {
      return false
    }

    const payload = await downloadGoogleDriveSyncPayload(syncFile.id)
    const syncState = await getGoogleDriveSyncState()

    if (
      payload.syncedAt === syncState.lastSyncedAt &&
      payload.syncedAt === syncState.lastRestoredAt
    ) {
      // No-op: cloud hasn't advanced. Still record the hash so the first
      // post-reload auto-sync short-circuits instead of uploading redundantly.
      const current = await getStorageValue<{ pages?: Page[] }>(['pages'])
      const currentPages = Array.isArray(current.pages) ? current.pages : []
      const localSeparateStore = await readSeparateStore(currentPages)
      const localTombstones = await getTombstones()
      lastSyncedContentHash = computeLocalDataHash(
        preparePagesForSync(currentPages),
        (await getStorageValue<{ settings?: Settings }>(['settings'])).settings as Settings,
        localSeparateStore,
        localTombstones
      )
      return false
    }

    isRestoringFromGoogleDrive = true
    try {
      const current = await getStorageValue<{ pages?: Page[] }>(['pages'])
      const currentPages = Array.isArray(current.pages) ? current.pages : []
      const localTombstones = await getTombstones()
      const mergedTombstones = mergeTombstoneStores(localTombstones, payload.data.tombstones ?? {})

      let mergedPages: Page[]
      let didPagesChange = false

      if (Array.isArray(payload.data.pages)) {
        const before = JSON.stringify(currentPages)
        mergedPages = mergePages(currentPages, payload.data.pages, mergedTombstones)
        didPagesChange = JSON.stringify(mergedPages) !== before
      } else if (Array.isArray(payload.data.bookmarkPages)) {
        const before = JSON.stringify(currentPages)
        mergedPages = mergeLegacyBookmarkPages(
          currentPages,
          payload.data.bookmarkPages
        )
        didPagesChange = JSON.stringify(mergedPages) !== before
      } else {
        mergedPages = currentPages
      }

      if (didPagesChange) {
        await setStorageValue({
          pages: mergedPages,
          settings: payload.data.settings,
        })
      }

      await setTombstones(mergedTombstones)

      if (payload.data.separateStore) {
        const localSeparateStore = await readSeparateStore(currentPages)
        const mergedSeparateStore = mergeSeparateStore(localSeparateStore, payload.data.separateStore)
        const safeEntries = Object.entries(mergedSeparateStore).filter(
          ([key]) => isSafeSeparateStoreKey(key)
        )
        if (safeEntries.length > 0) {
          await setStorageValue(Object.fromEntries(safeEntries))
        }
      }

      // Record the hash of the freshly-pulled local state. Apply
      // preparePagesForSync so the hash matches what the upload path would
      // compute (same transformation, no API keys in the hash) - this fixes
      // the hash divergence that caused redundant post-pull uploads.
      const postPullPages = didPagesChange ? mergedPages : currentPages
      lastSyncedContentHash = computeLocalDataHash(
        preparePagesForSync(postPullPages),
        payload.data.settings,
        payload.data.separateStore ?? {},
        mergedTombstones
      )

      await updateGoogleDriveSyncState({
        lastError: null,
        lastRestoredAt: payload.syncedAt,
        syncFileId: syncFile.id,
      })

      return didPagesChange
    } finally {
      isRestoringFromGoogleDrive = false
    }
  } catch (error) {
    logger.error('Google Drive auto-pull failed', error)
    return false
  }
}

export async function disconnectGoogleDrive(): Promise<void> {
  let token: string | null = null

  try {
    token = await getAuthToken(false)
  } catch {
    token = null
  }

  if (token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
      })
    } catch (error) {
      logger.warn('Failed to revoke Google Drive token', error)
    }

    await invalidateAuthToken(token)
  }

  try {
    await chrome.identity.clearAllCachedAuthTokens()
  } catch (error) {
    logger.warn('Failed to clear cached Google auth tokens', error)
  }

  await updateGoogleDriveSyncState({ lastError: null })
}
