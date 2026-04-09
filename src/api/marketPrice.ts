import type { PriceCategory } from '../types'

const SERPAPI_KEY = import.meta.env.VITE_SERPAPI_KEY as string

// ─── fetchMarketPrice ──────────────────────────────────────────────────────

export async function fetchMarketPrice(
  isbn: string,
): Promise<{ price: number; platform: string } | null> {
  // 1) Try Open Library (CORS-friendly, no key needed)
  try {
    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    )
    if (olRes.ok) {
      const olData = await olRes.json()
      const entry = olData[`ISBN:${isbn}`]
      if (entry) {
        // Open Library doesn't provide prices, but we can signal the book exists
        // and use its identifiers to refine a shopping search
      }
    }
  } catch {
    // silently continue to fallback
  }

  // 2) Fallback: SerpAPI Google Shopping
  if (!SERPAPI_KEY || SERPAPI_KEY === 'your_serpapi_key') return null

  try {
    const url = new URL('https://serpapi.com/search')
    url.searchParams.set('engine', 'google_shopping')
    url.searchParams.set('q', `isbn ${isbn} usato`)
    url.searchParams.set('api_key', SERPAPI_KEY)
    url.searchParams.set('hl', 'it')
    url.searchParams.set('gl', 'it')

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const data = await res.json()
    const results: Array<{ price?: string; source?: string }> =
      data.shopping_results ?? []

    for (const item of results) {
      if (!item.price) continue
      const priceStr = item.price.replace(/[^\d,\.]/g, '').replace(',', '.')
      const price = parseFloat(priceStr)
      if (!isNaN(price) && price > 0) {
        return { price, platform: item.source ?? 'Google Shopping' }
      }
    }
  } catch (err) {
    console.error('[marketPrice] SerpAPI error:', err)
  }

  return null
}

// ─── getPriceCategory ──────────────────────────────────────────────────────

export function getPriceCategory(price: number | null): PriceCategory {
  if (price == null || price === 0) return 'unknown'
  if (price < 5)  return 'low'
  if (price <= 15) return 'medium'
  return 'high'
}
