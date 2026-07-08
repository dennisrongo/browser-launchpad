import type { VersionedBlob } from '../types'

// Type guard for the versioned envelope. Anything that isn't a v1 blob is
// treated as legacy raw data and wrapped on first read.
export function isVersionedBlob<T>(value: unknown): value is VersionedBlob<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as VersionedBlob<T>).v === 1 &&
    typeof (value as VersionedBlob<T>).updatedAt === 'string' &&
    'data' in (value as VersionedBlob<T>)
  )
}

// Coerce any stored value into a VersionedBlob. Legacy raw values get wrapped
// with the supplied fallback timestamp (typically the widget's created_at).
export function toVersionedBlob<T>(
  stored: unknown,
  fallbackUpdatedAt: string
): VersionedBlob<T> {
  if (isVersionedBlob<T>(stored)) {
    return stored
  }
  return { v: 1, updatedAt: fallbackUpdatedAt, data: stored as T }
}

// Last-write-wins merge for two versioned blobs. Returns the blob whose
// updatedAt is newer; on a tie, the "incoming" value wins.
export function mergeVersionedBlob<T>(
  local: VersionedBlob<T>,
  incoming: VersionedBlob<T>
): VersionedBlob<T> {
  return Date.parse(incoming.updatedAt) >= Date.parse(local.updatedAt)
    ? incoming
    : local
}

// Convenience: stamp a fresh updatedAt onto a data value for writing.
export function makeVersionedBlob<T>(
  data: T,
  updatedAt: string = new Date().toISOString()
): VersionedBlob<T> {
  return { v: 1, updatedAt, data }
}
