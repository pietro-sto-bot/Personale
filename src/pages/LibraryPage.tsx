import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, RefreshCwIcon, ChevronDownIcon } from 'lucide-react'
import { useBookStore } from '../store/bookStore'
import { BookCard } from '../components/BookCard'
import type { Book } from '../types'

type SortKey = 'dateAdded' | 'title' | 'author' | 'value'

const STATUS_FILTERS: { label: string; value: Book['status'] | 'all' }[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'Da leggere', value: 'unread' },
  { label: 'Letti', value: 'read' },
  { label: 'Da vendere', value: 'want-to-sell' },
  { label: 'Venduti', value: 'sold' },
]

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: 'Data aggiunta', value: 'dateAdded' },
  { label: 'Titolo', value: 'title' },
  { label: 'Autore', value: 'author' },
  { label: 'Valore', value: 'value' },
]

export function LibraryPage() {
  const navigate = useNavigate()
  const books = useBookStore((s) => s.books)
  const setSearchQuery = useBookStore((s) => s.setSearchQuery)
  const setFilter = useBookStore((s) => s.setFilter)
  const setSortBy = useBookStore((s) => s.setSortBy)
  const filteredBooks = useBookStore((s) => s.filteredBooks)()
  const syncFromSheets = useBookStore((s) => s.syncFromSheets)
  const isLoading = useBookStore((s) => s.isLoading)
  const stats = useBookStore((s) => s.stats)()

  const [inputValue, setInputValue] = useState('')
  const [activeStatus, setActiveStatus] = useState<Book['status'] | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('dateAdded')
  const [showSort, setShowSort] = useState(false)
  const [pulling, setPulling] = useState(false)
  const touchStartY = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchQuery(inputValue), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [inputValue, setSearchQuery])

  const handleStatusFilter = (val: Book['status'] | 'all') => {
    setActiveStatus(val)
    setFilter('filterStatus', val === 'all' ? null : val)
  }

  const handleSort = (val: SortKey) => {
    setSortKey(val)
    setSortBy(val)
    setShowSort(false)
  }

  // Pull-to-refresh
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (dy > 80 && !isLoading) {
      setPulling(true)
      await syncFromSheets()
      setPulling(false)
    }
  }, [isLoading, syncFromSheets])

  return (
    <div
      className="flex flex-col min-h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">Libreria</h1>
          <button
            onClick={() => syncFromSheets()}
            className={`text-slate-400 p-1 ${isLoading ? 'animate-spin' : ''}`}
            title="Sincronizza"
          >
            <RefreshCwIcon size={18} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '📚', label: 'Libri', value: stats.total },
            { icon: '💰', label: 'Valore', value: `€${stats.totalValue.toFixed(0)}` },
            { icon: '🏷️', label: 'Da vendere', value: stats.worthSelling },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-2 text-center">
              <p className="text-base">{icon}</p>
              <p className="text-white font-bold text-sm">{value}</p>
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Cerca titolo, autore, ISBN..."
          className="w-full bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
        />

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusFilter(f.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                activeStatus === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative flex justify-end">
          <button
            onClick={() => setShowSort((v) => !v)}
            className="flex items-center gap-1 text-slate-400 text-xs"
          >
            Ordina: <span className="text-white">{SORT_OPTIONS.find((o) => o.value === sortKey)?.label}</span>
            <ChevronDownIcon size={14} />
          </button>
          {showSort && (
            <div className="absolute top-6 right-0 bg-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => handleSort(o.value)}
                  className={`w-full text-left px-4 py-2.5 text-sm ${
                    sortKey === o.value ? 'text-indigo-400 font-medium' : 'text-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {(pulling || isLoading) && (
        <div className="flex items-center justify-center py-2 gap-2 text-slate-400 text-xs">
          <RefreshCwIcon size={14} className="animate-spin" />
          Sincronizzazione...
        </div>
      )}

      {/* Book grid */}
      <div className="flex-1 px-4 pb-4">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-6xl opacity-30">📚</div>
            <p className="text-slate-500 text-sm text-center">
              {books.length === 0
                ? 'Nessun libro ancora.\nScansiona il primo!'
                : 'Nessun risultato per questi filtri.'}
            </p>
            {books.length === 0 && (
              <button
                onClick={() => navigate('/scan')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold text-sm"
              >
                Aggiungi libro
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/scan')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center z-20 active:scale-95 transition-transform"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      >
        <PlusIcon size={28} color="white" />
      </button>
    </div>
  )
}
