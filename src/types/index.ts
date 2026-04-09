export interface Book {
  id: string
  isbn: string
  title: string
  authors: string[]
  publisher: string
  year: number
  genre: string[]
  language: string
  pages: number
  coverUrl: string
  description: string
  dateAdded: string
  estimatedValue: number | null
  valuePlatform: string | null
  lastChecked: string | null
  worthSelling: boolean
  status: 'unread' | 'read' | 'want-to-sell' | 'sold'
  notes: string
  priceHistory: PricePoint[]
  sheetsRowIndex?: number
}

export interface PricePoint {
  date: string
  price: number
  platform: string
}

export interface SyncQueueItem {
  bookId: string
  operation: 'add' | 'update'
  timestamp: string
  data: Partial<Book>
}

export interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
  userEmail: string | null
  sheetsId: string | null
}

export type PriceCategory = 'low' | 'medium' | 'high' | 'unknown'

// Kept for Google Books API response mapping
export interface GoogleBooksVolume {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    imageLinks?: {
      thumbnail?: string
      smallThumbnail?: string
    }
    language?: string
    industryIdentifiers?: Array<{
      type: string
      identifier: string
    }>
  }
}
