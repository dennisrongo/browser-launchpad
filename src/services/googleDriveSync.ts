import type { Page, Settings } from '../types'

import { logger } from '../utils/logger'

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const GOOGLE_DRIVE_CONFIG_KEY = 'google_drive_config'
const GOOGLE_DRIVE_SYNC_STATE_KEY = 'google_drive_sync_state'
const GOOGLE_DRIVE_SYNC_FILE_NAME = 'browser-launchpad-sync.json'
const GOOGLE_DRIVE_SYNC_VERSION = '1.0.0'
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
    bookmarkPages: Page[]
    settings: Settings
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

  return (
    typeof value.version === 'string' &&
    typeof value.syncedAt === 'string' &&
    Array.isArray(data.bookmarkPages) &&
    data.bookmarkPages.every(isPage) &&
    isSettings(data.settings)
  )
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

  return {
    ...data,
    data: {
      ...data.data,
      bookmarkPages: extractBookmarkPages(data.data.bookmarkPages),
    },
  }
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

  return {
    bookmarkPages: extractBookmarkPages(pages),
    settings: result.settings,
  }
}

function buildSyncPayload(data: GoogleDriveSyncPayload['data']): GoogleDriveSyncPayload {
  return {
    version: GOOGLE_DRIVE_SYNC_VERSION,
    syncedAt: new Date().toISOString(),
    data,
  }
}

function mergeBookmarkPages(
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

export function extractBookmarkPages(pages: Page[]): Page[] {
  return pages.map((page) => ({
    ...page,
    widgets: page.widgets
      .filter((widget) => widget.type === 'bookmark')
      .map((widget) => ({
        ...widget,
        page_id: page.id,
      })),
  }))
}

export function getGoogleDriveManifestConfig(): GoogleDriveManifestConfig {
  return getGoogleDriveManifestConfigInternal()
}

export async function getStoredGoogleDriveConfig(): Promise<GoogleDriveConfig> {
  try {
    const result = await getStorageValue<{
      [GOOGLE_DRIVE_CONFIG_KEY]?: StoredGoogleDriveConfig
    }>([GOOGLE_DRIVE_CONFIG_KEY])

    return normalizeGoogleDriveConfig(result[GOOGLE_DRIVE_CONFIG_KEY])
  } catch (error) {
    logger.error('Failed to load Google Drive config', error)
    return DEFAULT_GOOGLE_DRIVE_CONFIG
  }
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

export async function isGoogleDriveConfigured(): Promise<boolean> {
  return getGoogleDriveManifestConfigInternal().isConfigured
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

export async function syncLocalDataToGoogleDrive(): Promise<GoogleDriveSyncPayload> {
  try {
    const data = await getLocalSyncData()
    const payload = buildSyncPayload(data)
    const existingFile = await findGoogleDriveSyncFile()
    const savedFile = await uploadGoogleDriveSyncFile(
      payload,
      existingFile?.id
    )

    await updateGoogleDriveSyncState({
      lastError: null,
      lastSyncedAt: payload.syncedAt,
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

export async function restoreLocalDataFromGoogleDrive(): Promise<GoogleDriveSyncPayload> {
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
    const mergedPages = mergeBookmarkPages(
      currentPages,
      payload.data.bookmarkPages
    )

    await setStorageValue({
      pages: mergedPages,
      settings: payload.data.settings,
    })

    await updateGoogleDriveSyncState({
      lastError: null,
      lastRestoredAt: new Date().toISOString(),
      syncFileId: syncFile.id,
    })

    return payload
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to restore data from Google Drive.'
    await updateGoogleDriveSyncState({ lastError: message })
    logger.error('Google Drive restore failed', error)
    throw error
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
