export type WidgetCacheType = 'weather' | 'calendar' | 'google-tasks' | 'x-timeline'

export interface CachePolicy {
  freshMs: number
  maxAgeMs: number
}

const MINUTE = 60 * 1000

export const CACHE_POLICIES: Record<WidgetCacheType, CachePolicy> = {
  weather: { freshMs: 2 * MINUTE, maxAgeMs: 30 * MINUTE },
  calendar: { freshMs: 30 * 1000, maxAgeMs: 10 * MINUTE },
  'google-tasks': { freshMs: 15 * 1000, maxAgeMs: 5 * MINUTE },
  'x-timeline': { freshMs: MINUTE, maxAgeMs: 15 * MINUTE },
}

interface CacheEntry {
  type: WidgetCacheType
  widgetId: string
  data: unknown
  fetchedAt: number
}

export interface CacheHit<T> {
  data: T
  fetchedAt: number
  fresh: boolean
}

type KeyPart = string | number | boolean | null | undefined

const entries = new Map<string, CacheEntry>()

export function widgetCacheKey(type: WidgetCacheType, widgetId: string, ...params: KeyPart[]): string {
  return [type, widgetId, ...params.map((part) => String(part ?? ''))].join('|')
}

export function readWidgetCache<T>(key: string): CacheHit<T> | null {
  const entry = entries.get(key)
  if (!entry) return null

  const age = Date.now() - entry.fetchedAt
  const { freshMs, maxAgeMs } = CACHE_POLICIES[entry.type]
  if (age < 0 || age >= maxAgeMs) {
    entries.delete(key)
    return null
  }

  return { data: entry.data as T, fetchedAt: entry.fetchedAt, fresh: age < freshMs }
}

export function writeWidgetCache<T>(type: WidgetCacheType, widgetId: string, key: string, data: T): number {
  const fetchedAt = Date.now()
  entries.set(key, { type, widgetId, data, fetchedAt })
  return fetchedAt
}

export function patchWidgetCache<T>(key: string, update: (data: T) => T): void {
  const entry = entries.get(key)
  if (entry) entry.data = update(entry.data as T)
}

export function invalidateWidgetCache(widgetId: string, type?: WidgetCacheType): void {
  for (const [key, entry] of entries) {
    if (entry.widgetId === widgetId && (!type || entry.type === type)) entries.delete(key)
  }
}

export function invalidateWidgetCacheType(type: WidgetCacheType): void {
  for (const [key, entry] of entries) {
    if (entry.type === type) entries.delete(key)
  }
}

export function clearWidgetCache(): void {
  entries.clear()
}
