import { getFromStorage, removeFromStorage, setToStorage } from '../services/storage'
import { logger } from './logger'

const GRANTED_SCOPES_KEY = 'grantedOauthScopes'

export function getManifestScopes(): string[] {
  return chrome.runtime.getManifest().oauth2?.scopes ?? []
}

export async function getGrantedScopes(): Promise<string[] | null> {
  const result = await getFromStorage<string[]>(GRANTED_SCOPES_KEY)
  if (result.error) {
    logger.error('[AuthScopes] Failed to read granted OAuth scopes:', result.error)
  }
  return result.data ?? null
}

export async function setGrantedScopes(scopes: string[]): Promise<void> {
  const result = await setToStorage({ [GRANTED_SCOPES_KEY]: scopes })
  if (!result.success) {
    logger.error('[AuthScopes] Failed to record granted OAuth scopes:', result.error)
  }
}

export async function clearGrantedScopes(): Promise<void> {
  const result = await removeFromStorage(GRANTED_SCOPES_KEY)
  if (!result.success) {
    logger.error('[AuthScopes] Failed to clear granted OAuth scopes:', result.error)
  }
}

export function scopesDiffer(granted: string[] | null, manifest: string[]): boolean {
  if (!granted) return false

  const grantedSet = new Set(granted)
  const manifestSet = new Set(manifest)

  if (grantedSet.size !== manifestSet.size) return true

  for (const scope of manifest) {
    if (!grantedSet.has(scope)) return true
  }

  return false
}

const REAUTH_ERROR_PATTERNS = [
  'invalid_scope',
  'deleted_client',
  'invalid_client',
  'consent_required',
  'interaction_required',
]

export function isReauthRequiredError(message: string): boolean {
  const lower = message.toLowerCase()
  return REAUTH_ERROR_PATTERNS.some((pattern) => lower.includes(pattern))
}
