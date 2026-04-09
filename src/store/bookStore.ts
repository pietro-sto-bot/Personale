import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book } from '../types'
import { appendBook, updateBook as sheetsUpdateBook, fetchAllBooks } from '../api/googleSheets'
import { fetchMarketPrice } from '../api/marketPrice'
import { useAuthStore } from './authStore'

const CACHE_KEY = 'codex-books-cache'

type SortBy = 'title' | 'author' | 'dateAdded' | 'value'

interface BookState {
  books: Book[]
  isLoading: boolean
  searchQuery: string
  filterGenre: string | null
  filterStatus: string | null
  sortBy: SortBy
}

interface BookActions {
  addBook: (book: Book) => Promise<void>
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>
  removeBook: (id: string) => void
  getBookByISBN: (isbn: string) => Book | undefined
  loadBooksFromCache: () => void
  syncFromSheets: () => Promise<void>
  setSearchQuery: (q: string) => void
  setFilter: (key: 'filterGenre' | 'filterStatus', value: string | null) => void
  setSortBy: (sortBy: SortBy) => void
}

interface BookComputed {
  filteredBooks: () => Book[]
  topValueBooks: () => Book[]
  totalValue: () => number
  stats: () => { total: number; worthSelling: number; totalValue: number }
}

type BookStore = BookState & BookActions & BookComputed

export const useBookStore = create<BookStore>()(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────────────────────────────
      books: [],
      isLoading: false,
      searchQuery: '',
      filterGenre: null,
      filterStatus: null,
      sortBy: 'dateAdded',

      // ── Actions ────────────────────────────────────────────────────────

      addBook: async (book) => {
        // 1. Add to store immediately
        set((s) => ({ books: [book, ...s.books] }))

        // 2. Persist to localStorage cache
        const updated = [book, ...get().books.filter((b) => b.id !== book.id)]
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated))

        // 3. Sync to Google Sheets (fire and await)
        const { isAuthenticated, accessToken, sheetsId } = useAuthStore.getState()
        if (isAuthenticated && accessToken && sheetsId) {
          try {
            const rowIndex = await appendBook(accessToken, sheetsId, book)
            if (rowIndex > 0) {
              set((s) => ({
                books: s.books.map((b) =>
                  b.id === book.id ? { ...b, sheetsRowIndex: rowIndex } : b,
                ),
              }))
            }
          } catch (err) {
            console.error('[bookStore] appendBook failed:', err)
          }
        }

        // 4. Fetch market price in background (no await)
        fetchMarketPrice(book.isbn).then((result) => {
          if (!result) return
          const now = new Date().toISOString()
          const priceEntry = { date: now, price: result.price, platform: result.platform }
          set((s) => ({
            books: s.books.map((b) =>
              b.id === book.id
                ? {
                    ...b,
                    estimatedValue: result.price,
                    valuePlatform: result.platform,
                    lastChecked: now,
                    worthSelling: result.price >= 5,
                    priceHistory: [...b.priceHistory, priceEntry],
                  }
                : b,
            ),
          }))
        }).catch(() => {})
      },

      updateBook: async (id, updates) => {
        set((s) => ({
          books: s.books.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        }))

        const book = get().books.find((b) => b.id === id)
        const { isAuthenticated, accessToken, sheetsId } = useAuthStore.getState()
        if (book?.sheetsRowIndex && isAuthenticated && accessToken && sheetsId) {
          try {
            await sheetsUpdateBook(accessToken, sheetsId, book.sheetsRowIndex, {
              ...book,
              ...updates,
            })
          } catch (err) {
            console.error('[bookStore] updateBook sheets sync failed:', err)
          }
        }
      },

      getBookByISBN: (isbn) => get().books.find((b) => b.isbn === isbn),

      removeBook: (id) => {
        set((s) => ({ books: s.books.filter((b) => b.id !== id) }))
        localStorage.setItem(CACHE_KEY, JSON.stringify(get().books))
      },

      loadBooksFromCache: () => {
        try {
          const raw = localStorage.getItem(CACHE_KEY)
          if (raw) set({ books: JSON.parse(raw) as Book[] })
        } catch {
          // corrupted cache – ignore
        }
      },

      syncFromSheets: async () => {
        const { isAuthenticated, accessToken, sheetsId } = useAuthStore.getState()
        if (!isAuthenticated || !accessToken || !sheetsId) return

        set({ isLoading: true })
        try {
          const books = await fetchAllBooks(accessToken, sheetsId)
          set({ books })
          localStorage.setItem(CACHE_KEY, JSON.stringify(books))
        } catch (err) {
          console.error('[bookStore] syncFromSheets failed:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      setFilter: (key, value) => set({ [key]: value }),

      setSortBy: (sortBy) => set({ sortBy }),

      // ── Computed ───────────────────────────────────────────────────────

      filteredBooks: () => {
        const { books, searchQuery, filterGenre, filterStatus, sortBy } = get()

        let result = books.filter((b) => {
          if (filterStatus && b.status !== filterStatus) return false
          if (filterGenre && !b.genre.includes(filterGenre)) return false
          if (searchQuery) {
            const q = searchQuery.toLowerCase()
            const inTitle   = b.title.toLowerCase().includes(q)
            const inAuthors = b.authors.some((a) => a.toLowerCase().includes(q))
            const inISBN    = b.isbn.includes(q)
            if (!inTitle && !inAuthors && !inISBN) return false
          }
          return true
        })

        result = [...result].sort((a, b) => {
          switch (sortBy) {
            case 'title':     return a.title.localeCompare(b.title, 'it')
            case 'author':    return (a.authors[0] ?? '').localeCompare(b.authors[0] ?? '', 'it')
            case 'value':     return (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0)
            case 'dateAdded':
            default:          return b.dateAdded.localeCompare(a.dateAdded)
          }
        })

        return result
      },

      topValueBooks: () =>
        [...get().books]
          .filter((b) => b.worthSelling && b.estimatedValue != null)
          .sort((a, b) => (b.estimatedValue ?? 0) - (a.estimatedValue ?? 0))
          .slice(0, 10),

      totalValue: () =>
        get().books.reduce((sum, b) => sum + (b.estimatedValue ?? 0), 0),

      stats: () => {
        const { books } = get()
        return {
          total:        books.length,
          worthSelling: books.filter((b) => b.worthSelling).length,
          totalValue:   books.reduce((sum, b) => sum + (b.estimatedValue ?? 0), 0),
        }
      },
    }),
    { name: 'codex-books' },
  ),
)
