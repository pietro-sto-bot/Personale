import type { Book } from '../types'

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes'

export async function fetchBookByISBN(isbn: string): Promise<Book | null> {
  try {
    const res = await fetch(`${BASE_URL}?q=isbn:${isbn}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()
    if (!data.items?.length) return null

    const info = data.items[0].volumeInfo
    const rawYear = info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) : 0

    return {
      id: crypto.randomUUID(),
      isbn,
      title: info.title ?? 'Titolo sconosciuto',
      authors: info.authors ?? [],
      publisher: info.publisher ?? '',
      year: isNaN(rawYear) ? 0 : rawYear,
      genre: info.categories ?? [],
      language: info.language ?? '',
      pages: info.pageCount ?? 0,
      coverUrl: info.imageLinks?.thumbnail?.replace('http:', 'https:') ?? '',
      description: info.description ?? '',
      dateAdded: new Date().toISOString(),
      estimatedValue: null,
      valuePlatform: null,
      lastChecked: null,
      worthSelling: false,
      status: 'unread',
      notes: '',
      priceHistory: [],
    }
  } catch (err) {
    console.error('[googleBooks] fetchBookByISBN error:', err)
    return null
  }
}
