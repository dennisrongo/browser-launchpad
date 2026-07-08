import type { Tombstone, TombstoneStore } from '../types'

import { getFromStorage, setToStorage } from './storage'

const TOMBSTONE_KEY = 'sync_tombstones'

// Tombstones older than this are pruned. 30 days is a safe margin: any device
// that syncs at least monthly will have converged on the deletion by then, so
// keeping the tombstone longer serves no purpose and the storage grows forever.
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export async function getTombstones(): Promise<TombstoneStore> {
  const result = await getFromStorage<TombstoneStore>(TOMBSTONE_KEY)
  return result.data ?? {}
}

export async function setTombstones(store: TombstoneStore): Promise<void> {
  await setToStorage({ [TOMBSTONE_KEY]: store })
}

export async function addTombstone(
  kind: Tombstone['kind'],
  id: string,
  deletedAt: string = new Date().toISOString()
): Promise<void> {
  const store = await getTombstones()
  store[id] = { kind, id, deletedAt }
  await setTombstones(store)
}

export async function pruneTombstones(now: Date = new Date()): Promise<void> {
  const store = await getTombstones()
  const cutoff = now.getTime() - TOMBSTONE_TTL_MS
  let changed = false

  for (const id of Object.keys(store)) {
    const deletedAt = Date.parse(store[id].deletedAt)
    if (Number.isNaN(deletedAt) || deletedAt < cutoff) {
      delete store[id]
      changed = true
    }
  }

  if (changed) {
    await setTombstones(store)
  }
}

// Merge two tombstone stores by id, keeping the latest deletedAt per id.
// Used when reconciling local and cloud tombstones during sync.
export function mergeTombstoneStores(
  local: TombstoneStore,
  cloud: TombstoneStore
): TombstoneStore {
  const merged: TombstoneStore = { ...local }

  for (const id of Object.keys(cloud)) {
    const cloudTs = cloud[id]
    const localTs = merged[id]
    if (!localTs) {
      merged[id] = cloudTs
      continue
    }
    if (Date.parse(cloudTs.deletedAt) > Date.parse(localTs.deletedAt)) {
      merged[id] = cloudTs
    }
  }

  return merged
}

// Returns true if `id` is tombstoned more recently than `timestamp`.
// A tombstone only beats an item whose own timestamp is older; a newer
// timestamp means the item was re-created after deletion and should survive.
export function isTombstonedNewerThan(
  tombstones: TombstoneStore,
  id: string,
  timestamp: string | undefined
): boolean {
  const ts = tombstones[id]
  if (!ts || !timestamp) {
    // No timestamp on the item: a tombstone (if present) beats it.
    return !!ts
  }
  return Date.parse(ts.deletedAt) > Date.parse(timestamp)
}
