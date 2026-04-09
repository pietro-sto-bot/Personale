import { useState, useEffect, useCallback } from 'react'
import type { SyncQueueItem } from '../types'
import { useSyncStore } from '../store/syncStore'
import { useBookStore } from '../store/bookStore'

const QUEUE_KEY = 'codex-sync-queue'

function loadQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as SyncQueueItem[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: SyncQueueItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(loadQueue)
  const { enqueue, clearQueue } = useSyncStore()
  const { updateBook } = useBookStore()

  const addToQueue = useCallback((item: SyncQueueItem) => {
    setSyncQueue((prev) => {
      const next = [...prev, item]
      saveQueue(next)
      return next
    })
    enqueue(item)
  }, [enqueue])

  const flushQueue = useCallback(async () => {
    const queue = loadQueue()
    if (!queue.length) return

    const failed: SyncQueueItem[] = []
    for (const item of queue) {
      try {
        if (item.operation === 'update') {
          await updateBook(item.bookId, item.data)
        }
        // 'add' operations are handled optimistically in bookStore.addBook
      } catch {
        failed.push(item)
      }
    }

    saveQueue(failed)
    setSyncQueue(failed)
    clearQueue()

    if (failed.length === 0) {
      // Toast: sincronizzazione completata
      const event = new CustomEvent('codex:sync-complete')
      window.dispatchEvent(event)
    }
  }, [updateBook, clearQueue])

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true)
      flushQueue()
    }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [flushQueue])

  return { isOnline, syncQueue, addToQueue, flushQueue }
}
