import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '../components/Scanner'
import { useBookStore } from '../store/bookStore'
import type { Book } from '../types'

export function ScanPage() {
  const [showScanner, setShowScanner] = useState(false)
  const addBook = useBookStore((s) => s.addBook)
  const getBookByISBN = useBookStore((s) => s.getBookByISBN)
  const navigate = useNavigate()

  const handleBookReady = async (book: Book) => {
    if (getBookByISBN(book.isbn)) return // already in library
    await addBook(book)
    navigate('/library')
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-white text-xl font-bold">Aggiungi libro</h1>
      <p className="text-slate-400 text-sm">
        Scansiona il barcode ISBN sul retro del libro. Il prezzo di mercato
        verrà recuperato automaticamente.
      </p>

      <button
        onClick={() => setShowScanner(true)}
        className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-colors flex items-center justify-center gap-3"
      >
        <span className="text-2xl">📷</span>
        Scansiona barcode
      </button>

      {showScanner && (
        <Scanner
          onBookReady={handleBookReady}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
