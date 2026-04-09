import { useState } from 'react'
import { ExternalLinkIcon, DownloadIcon, Trash2Icon, SmartphoneIcon } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useGoogleAuth } from '../hooks/useGoogleAuth'
import { useSyncStore } from '../store/syncStore'
import { useBookStore } from '../store/bookStore'
import { usePWAInstall } from '../hooks/usePWAInstall'

const APP_VERSION = '1.0.0'

export function SettingsPage() {
  const { login, logout } = useGoogleAuth()
  const { isAuthenticated, userEmail, sheetsId } = useAuthStore()
  const { isSyncing, lastSync, error, setSyncing, setSynced, setError } = useSyncStore()
  const syncFromSheets = useBookStore((s) => s.syncFromSheets)
  const books = useBookStore((s) => s.books)
  const stats = useBookStore((s) => s.stats)()
  const { canInstall, promptInstall } = usePWAInstall()
  const [darkMode] = useState(true) // always dark for now

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncFromSheets()
      setSynced(new Date().toISOString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sincronizzazione')
    }
  }

  const handleExportJSON = () => {
    const json = JSON.stringify(books, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codex-petri-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearCache = () => {
    if (!confirm('Sei sicuro? Verranno rimossi tutti i dati locali.')) return
    localStorage.clear()
    window.location.reload()
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <h1 className="text-white text-xl font-bold">Impostazioni</h1>

      {/* Account */}
      <section className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Account Google</h2>
        {isAuthenticated ? (
          <>
            <p className="text-slate-400 text-sm">{userEmail}</p>
            <button
              onClick={logout}
              className="text-red-400 text-sm font-medium"
            >
              Disconnetti
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="w-full py-3 bg-white text-slate-900 rounded-xl font-semibold text-sm"
          >
            Accedi con Google
          </button>
        )}
      </section>

      {/* Google Sheets */}
      <section className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Google Sheets</h2>
        {sheetsId ? (
          <>
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetsId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-indigo-400 text-sm"
            >
              Apri foglio <ExternalLinkIcon size={14} />
            </a>
            {lastSync && (
              <p className="text-slate-500 text-xs">
                Ultimo sync: {new Date(lastSync).toLocaleString('it-IT')}
              </p>
            )}
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleSync}
              disabled={isSyncing || !isAuthenticated}
              className="w-full py-2.5 bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
            >
              {isSyncing ? 'Sincronizzazione...' : 'Sync ora'}
            </button>
          </>
        ) : (
          <p className="text-slate-500 text-sm">
            {isAuthenticated ? 'Nessun foglio collegato.' : 'Accedi a Google per attivare la sincronizzazione.'}
          </p>
        )}
      </section>

      {/* App */}
      <section className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">App</h2>

        {canInstall && (
          <button
            onClick={promptInstall}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <SmartphoneIcon size={16} />
            Installa App
          </button>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Dark mode</span>
          <div className={`w-10 h-6 rounded-full flex items-center px-1 ${darkMode ? 'bg-indigo-600' : 'bg-slate-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Versione</span>
          <span className="text-slate-500 text-sm">{APP_VERSION}</span>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <h2 className="text-white font-semibold text-sm mb-3">Statistiche</h2>
        {[
          { label: 'Libri catalogati', value: stats.total, color: 'text-white' },
          { label: 'Da vendere', value: stats.worthSelling, color: 'text-amber-400' },
          { label: 'Valore totale', value: `€${stats.totalValue.toFixed(2)}`, color: 'text-indigo-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">{label}</span>
            <span className={`font-medium ${color}`}>{value}</span>
          </div>
        ))}
      </section>

      {/* Data */}
      <section className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-semibold text-sm">Dati</h2>

        <button
          onClick={handleExportJSON}
          className="w-full py-2.5 bg-slate-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
        >
          <DownloadIcon size={16} />
          Esporta libreria (JSON)
        </button>

        <button
          onClick={handleClearCache}
          className="w-full py-2.5 border border-red-800 text-red-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
        >
          <Trash2Icon size={16} />
          Cancella cache locale
        </button>
      </section>
    </div>
  )
}
