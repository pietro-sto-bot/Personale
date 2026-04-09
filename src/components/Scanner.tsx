import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { fetchBookByISBN } from '../api/googleBooks'
import type { Book } from '../types'

interface Props {
  onBookReady: (book: Book) => void
  onClose: () => void
}

type Phase =
  | 'scanning'
  | 'loading'
  | 'found'
  | 'not-found'
  | 'camera-denied'
  | 'manual'

const SCANNER_ID = 'qr-reader'

export function Scanner({ onBookReady, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('scanning')
  const [foundBook, setFoundBook] = useState<Book | null>(null)
  const [manualISBN, setManualISBN] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const started = useRef(false)

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
  }

  const handleDetected = async (isbn: string) => {
    if (phase !== 'scanning') return
    navigator.vibrate?.(200)
    setPhase('loading')
    await stopScanner()

    const book = await fetchBookByISBN(isbn)
    if (book) {
      setFoundBook(book)
      setPhase('found')
    } else {
      setManualISBN(isbn)
      setPhase('not-found')
    }
  }

  const handleManualSearch = async () => {
    if (!manualISBN.trim()) return
    setPhase('loading')
    const book = await fetchBookByISBN(manualISBN.trim())
    if (book) {
      setFoundBook(book)
      setPhase('found')
    } else {
      setPhase('not-found')
    }
  }

  const toggleTorch = async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      })
      setTorchOn((v) => !v)
    } catch {}
  }

  const restartScan = async () => {
    setPhase('scanning')
    setFoundBook(null)
    started.current = false
  }

  useEffect(() => {
    if (started.current || phase !== 'scanning') return
    started.current = true

    const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.7,
        },
        handleDetected,
        () => {},
      )
      .then(() => {
        // Check torch support
        try {
          const caps = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & { torch?: boolean }
          if (caps.torch) setHasTorch(true)
        } catch {}
      })
      .catch((err: Error) => {
        if (err.message?.toLowerCase().includes('permission')) {
          setPhase('camera-denied')
        } else {
          setErrorMsg(err.message ?? 'Errore fotocamera')
          setPhase('manual')
        }
      })

    return () => { stopScanner() }
  }, [phase])

  const handleClose = () => { stopScanner(); onClose() }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <span className="text-white font-semibold text-sm">Scansiona ISBN</span>
        <button onClick={handleClose} className="text-slate-300 text-sm px-3 py-1">
          Annulla
        </button>
      </div>

      {/* Camera / content area */}
      <div className="flex-1 relative overflow-hidden">
        {/* html5-qrcode mount point – always in DOM so lib can attach */}
        <div
          id={SCANNER_ID}
          className={`w-full h-full ${phase !== 'scanning' ? 'hidden' : ''}`}
        />

        {/* Scanning overlay */}
        {phase === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            <div className="relative w-64 h-40">
              {/* Corner marks */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
                <span
                  key={pos}
                  className={`absolute w-6 h-6 border-indigo-400 ${pos.includes('right') ? 'border-r-2' : 'border-l-2'} ${pos.includes('bottom') ? 'border-b-2' : 'border-t-2'}`}
                />
              ))}
              {/* Scanning line */}
              <div className="absolute left-1 right-1 h-0.5 bg-indigo-400/70 animate-[scan_2s_ease-in-out_infinite]" />
            </div>
            <p className="text-slate-300 text-xs mt-6 opacity-70">Inquadra il barcode del libro</p>
          </div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white text-sm">Ricerca libro...</p>
          </div>
        )}

        {/* Found */}
        {phase === 'found' && foundBook && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 gap-4">
            <div className="flex gap-4 w-full bg-slate-800 rounded-2xl p-4">
              {foundBook.coverUrl ? (
                <img src={foundBook.coverUrl} alt={foundBook.title} className="w-16 h-24 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-16 h-24 bg-slate-700 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-500 text-xs">No cover</div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{foundBook.title}</h3>
                <p className="text-slate-400 text-xs mt-1 truncate">{foundBook.authors.join(', ')}</p>
                <p className="text-slate-500 text-xs mt-0.5">{foundBook.publisher}{foundBook.year ? ` · ${foundBook.year}` : ''}</p>
              </div>
            </div>
            <button
              onClick={() => { onBookReady(foundBook); onClose() }}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-base"
            >
              Aggiungi alla libreria
            </button>
            <button onClick={restartScan} className="text-slate-400 text-sm">
              Scansiona un altro
            </button>
          </div>
        )}

        {/* Not found */}
        {(phase === 'not-found' || phase === 'manual') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 gap-4">
            <div className="text-4xl">🔍</div>
            <p className="text-white font-semibold text-center">
              {phase === 'not-found' ? 'Libro non trovato' : 'Inserisci ISBN manualmente'}
            </p>
            {errorMsg && <p className="text-slate-400 text-xs text-center">{errorMsg}</p>}
            <p className="text-slate-400 text-sm text-center">
              Verifica l'ISBN e riprova, oppure inseriscilo a mano
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={manualISBN}
              onChange={(e) => setManualISBN(e.target.value)}
              placeholder="es. 9788804668886"
              className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-500"
            />
            <button
              onClick={handleManualSearch}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-semibold"
            >
              Cerca
            </button>
            <button onClick={restartScan} className="text-slate-400 text-sm">
              ← Torna alla fotocamera
            </button>
          </div>
        )}

        {/* Camera denied */}
        {phase === 'camera-denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 gap-4 text-center">
            <div className="text-5xl">📷</div>
            <h3 className="text-white font-bold text-lg">Accesso fotocamera negato</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Per scansionare ISBN devi consentire l'accesso alla fotocamera.
            </p>
            <ol className="text-slate-300 text-sm text-left space-y-2 bg-slate-800 rounded-xl p-4 w-full">
              <li>1. Apri le Impostazioni del browser</li>
              <li>2. Vai su <strong>Privacy e sicurezza → Fotocamera</strong></li>
              <li>3. Cerca questo sito e seleziona <strong>Consenti</strong></li>
              <li>4. Ricarica la pagina</li>
            </ol>
            <button
              onClick={() => { setPhase('manual'); setErrorMsg('') }}
              className="w-full py-3 bg-slate-700 text-white rounded-xl text-sm font-medium"
            >
              Inserisci ISBN manualmente
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar: torch */}
      {phase === 'scanning' && hasTorch && (
        <div className="flex justify-center py-4">
          <button
            onClick={toggleTorch}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              torchOn ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <span>{torchOn ? '🔦' : '🔦'}</span>
            {torchOn ? 'Torcia on' : 'Torcia off'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0%, 100% { top: 4px; opacity: 1; }
          50% { top: calc(100% - 4px); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
