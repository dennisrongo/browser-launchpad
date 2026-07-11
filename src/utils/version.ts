import { getFromStorage, setToStorage } from '../services/storage'
import { logger } from './logger'

const LAST_SEEN_VERSION_KEY = 'lastSeenVersion'
const PREVIOUS_VERSION_KEY = 'previousVersion'

export async function getLastSeenVersion(): Promise<string | null> {
  const result = await getFromStorage<string>(LAST_SEEN_VERSION_KEY)
  if (result.error) {
    logger.error('[Version] Failed to read last seen version:', result.error)
  }
  return result.data ?? null
}

export async function getPreviousVersion(): Promise<string | null> {
  const result = await getFromStorage<string>(PREVIOUS_VERSION_KEY)
  if (result.error) {
    logger.error('[Version] Failed to read previous version:', result.error)
  }
  return result.data ?? null
}

export async function recordVersionInstall(version: string): Promise<void> {
  const result = await setToStorage({ [LAST_SEEN_VERSION_KEY]: version })
  if (result.success) {
    logger.info('[Version] Recorded install version:', version)
  } else {
    logger.error('[Version] Failed to record install version:', result.error)
  }
}

export async function recordVersionUpdate(newVersion: string): Promise<void> {
  const previous = await getLastSeenVersion()
  const items: Record<string, string> = { [LAST_SEEN_VERSION_KEY]: newVersion }
  if (previous && previous !== newVersion) {
    items[PREVIOUS_VERSION_KEY] = previous
  }
  const result = await setToStorage(items)
  if (result.success) {
    logger.info('[Version] Recorded update:', { previous, current: newVersion })
  } else {
    logger.error('[Version] Failed to record update version:', result.error)
  }
}
