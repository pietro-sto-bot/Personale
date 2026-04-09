import type { Book } from '../types'
import { PriceSparkline } from './PriceSparkline'

interface Props {
  book: Book
  onClose: () => void
}

const STATUS_LABELS: Record<Book['status'], string> = {
  unread: 'Da leggere',
  read: 'Letto',
  'want-to-sell': 'Da vendere',
  sold: 'Venduto',
}

export function BookDetail({ book, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto">
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <button onClick={onClose} className="text-slate-400 text-2xl leading-none">&larr;</button>
        <h2 className="text-white font-semibold text-sm flex-1 truncate">{book.title}</h2>
      </div>
      <div className="p-4 space-y-4">
        {book.coverUrl && (
          <img src={book.coverUrl} alt={book.title} className="w-32 rounded-lg mx-auto shadow-lg" />
        )}
        <div className="space-y-1">
          <p className="text-slate-300 text-sm font-medium">{book.authors.join(', ')}</p>
          <p className="text-slate-500 text-xs">{book.publisher}{book.year ? ` · ${book.year}` : ''}</p>
          {book.genre.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {book.genre.map((g) => (
                <span key={g} className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{g}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs">Pagine</p>
            <p className="text-white font-semibold">{book.pages || '—'}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs">Lingua</p>
            <p className="text-white font-semibold uppercase">{book.language || '—'}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs">Stato</p>
            <p className="text-white font-semibold text-xs">{STATUS_LABELS[book.status]}</p>
          </div>
        </div>

        {book.estimatedValue != null && (
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">
              Valore stimato · <span className="text-slate-500">{book.valuePlatform}</span>
            </p>
            <p className="text-indigo-400 text-xl font-bold">€{book.estimatedValue.toFixed(2)}</p>
            {book.worthSelling && (
              <p className="text-green-400 text-xs mt-1">Vale la pena venderlo</p>
            )}
            {book.priceHistory.length > 1 && <PriceSparkline history={book.priceHistory} />}
          </div>
        )}

        {book.description && (
          <p className="text-slate-400 text-sm leading-relaxed">{book.description}</p>
        )}

        {book.notes && (
          <div className="bg-slate-800 rounded-xl p-3">
            <p className="text-slate-500 text-xs mb-1">Note</p>
            <p className="text-slate-300 text-sm">{book.notes}</p>
          </div>
        )}

        <div className="text-xs text-slate-600">ISBN: {book.isbn}</div>
      </div>
    </div>
  )
}
