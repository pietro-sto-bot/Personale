import { create } from 'zustand'
import type { SyncQueueItem } from '../types'

interface SyncStore {
  isSyncing: boolean
  lastSync: string | null
  error: string | null
  queue: SyncQueueItem[]
  setSyncing: (isSyncing: boolean) => void
  setSynced: (timestamp: string) => void
  setError: (error: string | null) => void
  enqueue: (item: SyncQueueItem) => void
  clearQueue: () => void
}

export const useSyncStore = create<SyncStore>((set) => ({
  isSyncing: false,
  lastSync: null,
  error: null,
  queue: [],

  setSyncing: (isSyncing) => set({ isSyncing }),
  setSynced: (timestamp) => set({ lastSync: timestamp, isSyncing: false, error: null }),
  setError: (error) => set({ error, isSyncing: false }),
  enqueue: (item) => set((s) => ({ queue: [...s.queue, item] })),
  clearQueue: () => set({ queue: [] }),
}))
