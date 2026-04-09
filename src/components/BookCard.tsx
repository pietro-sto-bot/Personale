import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Book } from '../types'
import { getPriceCategory } from '../api/marketPrice'

interface Props {
  book: Book
  onClick?: () => void
}

const STATUS_ICONS: Record<Book['status'], string> = {
  unread: '📖',
  read: '✅',
  'want-to-sell': '🏷️',
  sold: '💸',
}

const STATUS_LABELS: Record<Book['status'], string> = {
  unread: 'Da leggere',
  read: 'Letto',
  'want-to-sell': 'Da vendere',
  sold: 'Venduto',
}

const PRICE_BADGE: Record<ReturnType<typeof getPriceCategory>, string> = {
  unknown: 'bg-slate-700 text-slate-400',
  low:     'bg-red-900/60 text-red-300',
  medium:  'bg-yellow-900/60 text-yellow-300',
  high:    'bg-green-900/60 text-green-300',
}

export function BookCard({ book, onClick }: Props) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ob = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); ob.disconnect() } },
      { threshold: 0.1 },
    )
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  const priceCategory = getPriceCategory(book.estimatedValue)

  const handleClick = () => {
    if (onClick) { onClick(); return }
    navigate(`/book/${book.id}`)
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`flex gap-3 p-3 bg-slate-800 rounded-xl cursor-pointer active:scale-95 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Cover */}
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt={book.title}
          className="w-14 h-20 object-cover rounded-lg flex-shrink-0 bg-slate-700"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-20 bg-slate-700 rounded-lg flex-shrink-0 flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">📚</span>
          <span className="text-slate-500 text-[10px] text-center leading-tight px-1">No cover</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{book.title}</h3>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{book.authors.join(', ')}</p>
        <p className="text-slate-500 text-xs mt-0.5">
          {[book.publisher, book.year || null].filter(Boolean).join(' · ')}
        </p>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Status badge */}
          <span className="text-xs flex items-center gap-1 text-slate-400">
            <span>{STATUS_ICONS[book.status]}</span>
            <span>{STATUS_LABELS[book.status]}</span>
          </span>

          {/* Price badge */}
          {book.estimatedValue != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRICE_BADGE[priceCategory]}`}>
              €{book.estimatedValue.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
