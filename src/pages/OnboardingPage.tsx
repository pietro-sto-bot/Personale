import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scanner } from '../components/Scanner'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { useAuthStore } from '../store/authStore'
import { initializeSpreadsheet } from '../api/googleSheets'
import { usePWAInstall } from '../hooks/usePWAInstall'
import type { Book } from '../types'
import { useBookStore } from '../store/bookStore'

const STEP_KEY = 'codex-onboarding-step'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(() => parseInt(localStorage.getItem(STEP_KEY) ?? '1', 10))
  const [showScanner, setShowScanner] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const { login, handleCallback } = useGoogleAuth()
  const { isAuthenticated, accessToken, setAuth } = useAuthStore()
  const { canInstall, isIOS, promptInstall } = usePWAInstall()
  const addBook = useBookStore((s) => s.addBook)

  // Handle OAuth redirect-back
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      setConnecting(true)
      handleCallback()
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // After auth: auto-create Sheets and advance to step 4
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return
    if (step !== 3) return
    setConnecting(true)
    initializeSpreadsheet(accessToken)
      .then((id) => {
        setAuth({ accessToken, userEmail: useAuthStore.getState().userEmail ?? '', sheetsId: id })
        goTo(4)
      })
      .catch(() => setError('Errore creazione foglio. Puoi procedere comunque.'))
      .finally(() => setConnecting(false))
  }, [isAuthenticated, step])

  const goTo = (n: number) => {
    setStep(n)
    localStorage.setItem(STEP_KEY, String(n))
  }

  const finish = () => {
    localStorage.setItem('codex-onboarded', '1')
    localStorage.removeItem(STEP_KEY)
    navigate('/library')
  }

  const handleBookReady = async (book: Book) => {
    await addBook(book)
    finish()
  }

  const TOTAL_STEPS = 4

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Progress bar */}
      {step > 1 && (
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
          />
        </div>
      )}

      {/* Dots */}
      <div className="flex justify-center gap-2 pt-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i + 1 === step ? 'bg-indigo-400 w-5' : i + 1 < step ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-8">
          <div className="space-y-4">
            <div className="text-7xl">📚</div>
            <h1 className="text-3xl font-bold text-white">Codex Petri</h1>
            <p className="text-slate-400 text-base leading-relaxed">
              La tua biblioteca personale.<br />
              Scansiona, cataloga e scopri il valore dei tuoi libri.
            </p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            {[
              { icon: '📷', text: 'Scansiona ISBN con la fotocamera' },
              { icon: '💰', text: 'Prezzi di mercato aggiornati' },
              { icon: '☁️', text: 'Backup su Google Sheets' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                <span className="text-xl">{icon}</span>
                <span className="text-slate-300 text-sm text-left">{text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => goTo(2)}
            className="w-full max-w-xs py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg"
          >
            Inizia →
          </button>
        </div>
      )}

      {/* ── Step 2: Install ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">📲</div>
            <h2 className="text-2xl font-bold text-white">Installa l'app</h2>
            <p className="text-slate-400 text-sm">Accedi offline, sempre a portata di mano</p>
          </div>

          {canInstall && !isIOS && (
            <button
              onClick={promptInstall}
              className="w-full max-w-xs py-4 bg-indigo-600 text-white rounded-2xl font-bold"
            >
              📲 Installa App
            </button>
          )}

          {canInstall && isIOS && (
            <div className="w-full max-w-xs space-y-2 bg-slate-800 rounded-2xl p-4">
              <p className="text-slate-400 text-xs mb-3 text-center">Per installare su iPhone/iPad:</p>
              {[
                { icon: '↑', text: 'Tocca l\'icona Condividi nel browser' },
                { icon: '⊞', text: 'Tocca "Aggiungi a Home"' },
                { icon: '✓', text: 'Tocca "Aggiungi"' },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded-xl p-3">
                  <span className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{icon}</span>
                  <span className="text-slate-300 text-sm">{text}</span>
                </div>
              ))}
            </div>
          )}

          {!canInstall && (
            <div className="w-full max-w-xs bg-slate-800 rounded-2xl p-4 text-center">
              <p className="text-green-400 text-sm">✅ App già installata o non disponibile su questo browser</p>
            </div>
          )}

          <button onClick={() => goTo(3)} className="text-slate-400 text-sm underline">
            {canInstall ? 'Salta per ora' : 'Continua →'}
          </button>
        </div>
      )}

      {/* ── Step 3: Google ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
          <div className="space-y-2">
            <div className="text-5xl">🔗</div>
            <h2 className="text-2xl font-bold text-white">Connetti Google</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Accedi per sincronizzare la tua libreria<br />su Google Sheets e fare backup automatici
            </p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!isAuthenticated ? (
            <>
              <button
                onClick={login}
                disabled={connecting}
                className="w-full max-w-xs py-4 bg-white text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {connecting ? (
                  <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>G</span>
                )}
                Accedi con Google
              </button>
              <button onClick={() => goTo(4)} className="text-slate-400 text-sm underline">
                Salta (puoi farlo dopo)
              </button>
            </>
          ) : (
            <div className="text-center space-y-4">
              {connecting ? (
                <>
                  <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-slate-400 text-sm">Creazione foglio Codex Petri...</p>
                </>
              ) : (
                <>
                  <p className="text-green-400">✅ Connesso!</p>
                  <button onClick={() => goTo(4)} className="w-full max-w-xs py-4 bg-indigo-600 text-white rounded-2xl font-bold">
                    Continua →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: First scan ──────────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
          <div className="space-y-2">
            <div className="text-5xl">🎯</div>
            <h2 className="text-2xl font-bold text-white">Scansiona il primo libro</h2>
            <p className="text-slate-400 text-sm">Punta la fotocamera sul barcode ISBN sul retro del libro</p>
          </div>

          <button
            onClick={() => setShowScanner(true)}
            className="w-full max-w-xs py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2"
          >
            📷 Scansiona ora
          </button>
          <button onClick={finish} className="text-slate-400 text-sm underline">
            Vai alla libreria →
          </button>
        </div>
      )}

      {showScanner && (
        <Scanner
          onBookReady={handleBookReady}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
