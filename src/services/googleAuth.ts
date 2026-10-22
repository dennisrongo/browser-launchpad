import { logger } from '../utils/logger'

export type GoogleAuthErrorKind = 'credentials' | 'consent' | 'unauthorized' | 'network' | 'unknown'

export interface GoogleAuthIssue {
  kind: GoogleAuthErrorKind
  title: string
  description: string
  needsReconnect: boolean
  raw: string
}

const AUTH_RESTORED_EVENT = 'launchpad:google-auth-restored'

export class GoogleAuthError extends Error {
  kind: GoogleAuthErrorKind

  constructor(kind: GoogleAuthErrorKind, message: string) {
    super(message)
    this.name = 'GoogleAuthError'
    this.kind = kind
  }
}

function classifyMessage(message: string): GoogleAuthErrorKind {
  const lower = message.toLowerCase()

  if (
    lower.includes('invalid credentials') ||
    lower.includes('credentials rejected') ||
    lower.includes('not signed in')
  ) {
    return 'credentials'
  }

  if (
    lower.includes('did not approve') ||
    lower.includes('not approve') ||
    lower.includes('consent') ||
    lower.includes('invalid_scope') ||
    lower.includes('access_denied') ||
    lower.includes('interaction_required')
  ) {
    return 'consent'
  }

  if (lower.includes('unauthorized') || lower.includes('401')) {
    return 'unauthorized'
  }

  if (lower === 'failed to fetch' || lower.includes('networkerror') || lower.includes('net::err')) {
    return 'network'
  }

  return 'unknown'
}

export function describeAuthError(error: unknown, serviceName: string): GoogleAuthIssue {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const kind = error instanceof GoogleAuthError ? error.kind : classifyMessage(raw)

  switch (kind) {
    case 'credentials':
      return {
        kind,
        title: 'Google session expired',
        description: `Chrome needs you to confirm your Google account again before ${serviceName} can load.`,
        needsReconnect: true,
        raw,
      }
    case 'unauthorized':
      return {
        kind,
        title: 'Access needs refreshing',
        description: `Google stopped accepting the saved access for ${serviceName}. Reconnecting takes a few seconds.`,
        needsReconnect: true,
        raw,
      }
    case 'consent':
      return {
        kind,
        title: 'Permission needed',
        description: `Grant access to ${serviceName} to keep this widget up to date.`,
        needsReconnect: true,
        raw,
      }
    case 'network':
      return {
        kind,
        title: "Can't reach Google",
        description: 'Check your connection and try again.',
        needsReconnect: false,
        raw,
      }
    default:
      return {
        kind,
        title: 'Something went wrong',
        description: `${serviceName} couldn't be loaded. Try again in a moment.`,
        needsReconnect: false,
        raw,
      }
  }
}

async function requestToken(scopes: string[], interactive: boolean): Promise<string> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive, scopes })
    if (!result.token) {
      throw new GoogleAuthError(
        'consent',
        interactive ? 'Sign-in did not return an access token.' : 'Not connected.'
      )
    }
    return result.token
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error
    const message = error instanceof Error ? error.message : String(error)
    throw new GoogleAuthError(classifyMessage(message), message)
  }
}

export function getGoogleAccessToken(scopes: string[]): Promise<string> {
  return requestToken(scopes, false)
}

const GOOGLE_HOST_PATTERN = /^https:\/\/([a-z0-9-]+\.)*google\.[a-z.]+(\/|$)/i

export async function withTabRestore<T>(task: () => Promise<T>): Promise<T> {
  const origin = await chrome.tabs.getCurrent().catch(() => undefined)
  const openedTabIds: number[] = []
  const onCreated = (tab: chrome.tabs.Tab) => {
    if (tab.id !== undefined) openedTabIds.push(tab.id)
  }
  chrome.tabs.onCreated.addListener(onCreated)

  const refocusOrigin = async () => {
    if (origin?.id === undefined) return
    await chrome.tabs.update(origin.id, { active: true }).catch(() => undefined)
    if (origin.windowId !== undefined) {
      await chrome.windows.update(origin.windowId, { focused: true }).catch(() => undefined)
    }
  }

  try {
    const result = await task()

    for (const tabId of openedTabIds) {
      const tab = await chrome.tabs.get(tabId).catch(() => undefined)
      if (tab?.url && GOOGLE_HOST_PATTERN.test(tab.url)) {
        await chrome.tabs.remove(tabId).catch(() => undefined)
      }
    }

    await refocusOrigin()
    return result
  } catch (error) {
    await refocusOrigin()
    throw error
  } finally {
    chrome.tabs.onCreated.removeListener(onCreated)
  }
}

export function authorizeGoogle(scopes: string[]): Promise<string> {
  return withTabRestore(async () => {
    try {
      return await requestToken(scopes, true)
    } catch (error) {
      if (!(error instanceof GoogleAuthError) || error.kind !== 'credentials') throw error

      logger.warn('[GoogleAuth] Interactive sign-in failed; clearing cached tokens and retrying.', error)
      await chrome.identity.clearAllCachedAuthTokens().catch(() => undefined)
      return requestToken(scopes, true)
    }
  })
}

export async function reconnectGoogle(scopes: string[]): Promise<string> {
  const token = await authorizeGoogle(scopes)
  window.dispatchEvent(new CustomEvent(AUTH_RESTORED_EVENT))
  return token
}

export function onGoogleAuthRestored(handler: () => void): () => void {
  window.addEventListener(AUTH_RESTORED_EVENT, handler)
  return () => window.removeEventListener(AUTH_RESTORED_EVENT, handler)
}

export async function invalidateGoogleToken(accessToken: string): Promise<void> {
  try {
    await chrome.identity.removeCachedAuthToken({ token: accessToken })
  } catch (error) {
    logger.warn('[GoogleAuth] Failed to remove cached token.', error)
  }
}

export async function throwForBadResponse(
  response: Response,
  accessToken: string,
  failureLabel: string
): Promise<never> {
  if (response.status === 401) {
    await invalidateGoogleToken(accessToken)
    throw new GoogleAuthError('unauthorized', `Unauthorized (${failureLabel})`)
  }
  const body = await response.text()
  if (response.status === 403 && /insufficient|scope/i.test(body)) {
    throw new GoogleAuthError('consent', `${failureLabel}: insufficient permissions`)
  }
  throw new GoogleAuthError('unknown', `${failureLabel}: ${body.slice(0, 200)}`)
}
