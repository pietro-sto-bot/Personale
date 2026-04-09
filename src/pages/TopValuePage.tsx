import { useState } from 'react'
import { ExternalLinkIcon, RefreshCwIcon } from 'lucide-react'
import { useBookStore } from '../store/bookStore'
import { fetchMarketPrice, getPriceCategory } from '../api/marketPrice'
import type { Book } from '../types'

const PRICE_BADGE: Record<ReturnType<typeof getPriceCategory>, string> = {
  unknown: 'bg-slate-700 text-slate-400',
  low:     'bg-red-900/60 text-red-300',
  medium:  'bg-yellow-900/60 text-yellow-300',
  high:    'bg-green-900/60 text-green-300',
}

function marketLinks(book: Book) {
  const q = encodeURIComponent(book.isbn)
  return [
    { label: 'eBay',    url: `https://www.ebay.it/sch/i.html?_nkw=isbn+${q}+usato` },
    { label: 'Amazon',  url: `https://www.amazon.it/s?k=${q}` },
    { label: 'Vinted',  url: `https://www.vinted.it/catalog?search_text=${q}` },
    { label: 'Subito',  url: `https://www.subito.it/annunci-italia/vendita/usato/?q=${q}` },
  ]
}

export function TopValuePage() {
  const books = useBookStore((s) => s.books)
  const updateBook = useBookStore((s) => s.updateBook)
  const topValueBooks = useBookStore((s) => s.topValueBooks)()
  const totalValue = useBookStore((s) => s.totalValue)()

  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)

  const lastChecked = books
    .map((b) => b.lastChecked)
    .filter(Boolean)
    .sort()
    .at(-1)

  const handleUpdateAll = async () => {
    setUpdating(true)
    setTotal(books.length)
    setProgress(0)

    for (const book of books) {
      try {
        const result = await fetchMarketPrice(book.isbn)
        if (result) {
          const now = new Date().toISOString()
          await updateBook(book.id, {
            estimatedValue: result.price,
            valuePlatform: result.platform,
            lastChecked: now,
            worthSelling: result.price >= 5,
            priceHistory: [
              ...book.priceHistory,
              { date: now, price: result.price, platform: result.platform },
            ],
          })
        }
      } catch { /* continue */ }
      setProgress((p) => p + 1)
    }

    setUpdating(false)
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header */}
      <h1 className="text-white text-xl font-bold">Top Valore</h1>

      {/* Total value card */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-800 rounded-2xl p-5 text-center">
        <p className="text-slate-400 text-sm">Valore totale stimato</p>
        <p className="text-indigo-300 text-4xl font-bold mt-1">€{totalValue.toFixed(2)}</p>
        <p className="text-slate-500 text-xs mt-1">{books.length} libri catalogati</p>
      </div>

      {/* Price update section */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Aggiornamento prezzi</h2>
        {lastChecked && (
          <p className="text-slate-500 text-xs">
            Ultimo controllo: {new Date(lastChecked).toLocaleDateString('it-IT')}
          </p>
        )}
        {updating && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Aggiornamento...</span>
              <span>{progress}/{total}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: total > 0 ? `${(progress / total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}
        <button
          onClick={handleUpdateAll}
          disabled={updating}
          className="w-full py-2.5 bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCwIcon size={14} className={updating ? 'animate-spin' : ''} />
          {updating ? 'Aggiornamento in corso...' : 'Aggiorna ora'}
        </button>
      </div>

      {/* Top 10 list */}
      {topValueBooks.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          Nessun prezzo disponibile ancora. Premi "Aggiorna ora" per recuperarli.
        </p>
      ) : (
        <div className="space-y-2">
          <h2 className="text-white font-semibold text-sm">Top 10 libri per valore</h2>
          {topValueBooks.map((book, i) => {
            const cat = getPriceCategory(book.estimatedValue)
            return (
              <div key={book.id} className="bg-slate-800 rounded-xl p-3">
                <div className="flex gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-7 flex items-center justify-center">
                    <span className={`font-bold text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                      {i + 1}
                    </span>
                  </div>
                  {/* Cover */}
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-14 bg-slate-700 rounded flex-shrink-0 flex items-center justify-center text-slate-600 text-xs">📚</div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight line-clamp-2">{book.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5 truncate">{book.authors[0]}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRICE_BADGE[cat]}`}>
                        €{book.estimatedValue?.toFixed(2)}
                      </span>
                      {book.valuePlatform && (
                        <span className="text-slate-600 text-xs">{book.valuePlatform}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Marketplace links */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {marketLinks(book).map(({ label, url }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-indigo-400 bg-slate-700/50 px-2 py-1 rounded-lg"
                    >
                      {label}
                      <ExternalLinkIcon size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
