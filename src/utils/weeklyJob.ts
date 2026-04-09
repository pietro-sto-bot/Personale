import { fetchMarketPrice } from '../api/marketPrice'
import { useBookStore } from '../store/bookStore'

const LAST_CHECK_KEY = 'lastPriceCheck'
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function runWeeklyPriceJob(): Promise<void> {
  const last = localStorage.getItem(LAST_CHECK_KEY)
  const now = Date.now()
  if (last && now - parseInt(last, 10) < ONE_WEEK_MS) return

  const { books, updateBook } = useBookStore.getState()
  if (!books.length) return

  let increased = 0
  let decreased = 0
  let topBook = { title: '', price: 0 }

  for (const book of books) {
    try {
      const result = await fetchMarketPrice(book.isbn)
      if (!result) continue

      const prev = book.estimatedValue
      const next = result.price
      const now = new Date().toISOString()

      await updateBook(book.id, {
        estimatedValue: next,
        valuePlatform: result.platform,
        lastChecked: now,
        worthSelling: next >= 5,
        priceHistory: [...book.priceHistory, { date: now, price: next, platform: result.platform }],
      })

      if (prev != null) {
        if (next > prev) increased++
        else if (next < prev) decreased++
      }
      if (next > topBook.price) topBook = { title: book.title, price: next }
    } catch {
      // continue with next book
    }
  }

  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))

  window.dispatchEvent(
    new CustomEvent('codex:price-update-complete', {
      detail: { increased, decreased, topBook },
    }),
  )
}
