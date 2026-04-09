import { useState, useEffect } from 'react'
import { usePWAInstall } from '../hooks/usePWAInstall'

const DISMISSED_KEY = 'pwa-banner-dismissed'
const DELAY_MS = 30_000

export function InstallBanner() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall()
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isInstalled) return
    if (localStorage.getItem(DISMISSED_KEY) === '1') return
    if (!canInstall) return

    const t = setTimeout(() => {
      setMounted(true)
      // Trigger slide-up animation on next frame
      requestAnimationFrame(() => setVisible(true))
    }, DELAY_MS)

    return () => clearTimeout(t)
  }, [canInstall, isInstalled])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => setMounted(false), 400)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  const handleInstall = async () => {
    await promptInstall()
    dismiss()
  }

  if (!mounted) return null

  return (
    <div
      className={`fixed bottom-20 left-0 right-0 z-40 px-4 transition-transform duration-400 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <div>
              <p className="text-white font-semibold text-sm">Installa Codex Petri</p>
              <p className="text-slate-400 text-xs">Accedi offline, sempre a portata di mano</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-500 hover:text-slate-300 text-xl leading-none p-1"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Android: native prompt */}
        {!isIOS && (
          <div className="px-4 pb-4 pt-2">
            <button
              onClick={handleInstall}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Installa App
            </button>
          </div>
        )}

        {/* iOS: step-by-step instructions */}
        {isIOS && (
          <div className="px-4 pb-4 pt-2 space-y-2">
            <p className="text-slate-400 text-xs mb-3">Segui questi passaggi per installare:</p>
            {[
              { icon: '↑', label: 'Tocca l\'icona Condividi nella barra del browser' },
              { icon: '⊞', label: 'Scorri e tocca "Aggiungi a Home"' },
              { icon: '✓', label: 'Tocca "Aggiungi" in alto a destra' },
            ].map(({ icon, label }, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-700/50 rounded-xl p-3">
                <span className="flex-shrink-0 w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {icon}
                </span>
                <p className="text-slate-300 text-xs leading-relaxed pt-0.5">{label}</p>
              </div>
            ))}
            <button
              onClick={dismiss}
              className="w-full py-2.5 bg-slate-700 text-slate-300 rounded-xl text-sm mt-1"
            >
              Ho capito
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
