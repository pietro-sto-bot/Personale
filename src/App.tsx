import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ScanIcon, BookOpenIcon, TrendingUpIcon, SettingsIcon } from 'lucide-react'
import { ScanPage } from './pages/ScanPage'
import { LibraryPage } from './pages/LibraryPage'
import { TopValuePage } from './pages/TopValuePage'
import { SettingsPage } from './pages/SettingsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { BookDetail } from './components/BookDetail'
import { InstallBanner } from './components/InstallBanner'
import { OfflineBadge } from './components/OfflineBadge'
import { useBookStore } from './store/bookStore'
import { useAuthStore } from './store/authStore'
import { runWeeklyPriceJob } from './utils/weeklyJob'

const queryClient = new QueryClient()

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-700 text-white text-sm px-4 py-3 rounded-2xl shadow-xl max-w-xs text-center animate-[fadeIn_0.3s_ease]">
      {message}
    </div>
  )
}

// ── BookDetailPage ─────────────────────────────────────────────────────────
function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const book = useBookStore((s) => s.books.find((b) => b.id === id))
  if (!book) { navigate('/library', { replace: true }); return null }
  return <BookDetail book={book} onClose={() => navigate(-1)} />
}

// ── Guard ──────────────────────────────────────────────────────────────────
function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const onboarded = localStorage.getItem('codex-onboarded')
  if (!onboarded) return <Navigate to="/" replace />
  return <>{children}</>
}

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/scan',      label: 'Scansiona',   Icon: ScanIcon },
  { to: '/library',   label: 'Libreria',    Icon: BookOpenIcon },
  { to: '/top-value', label: 'Valore',      Icon: TrendingUpIcon },
  { to: '/settings',  label: 'Impostazioni',Icon: SettingsIcon },
]

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [toast, setToast] = useState<string | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Weekly price job on mount
  useEffect(() => {
    if (!isAuthenticated) return
    runWeeklyPriceJob().catch(() => {})
  }, [isAuthenticated])

  // Listen for price-update-complete event
  useEffect(() => {
    const handler = (e: Event) => {
      const { increased, decreased, topBook } = (e as CustomEvent).detail
      const parts: string[] = []
      if (increased) parts.push(`📈 ${increased} aumentati`)
      if (decreased) parts.push(`📉 ${decreased} diminuiti`)
      if (topBook.title) parts.push(`🏆 "${topBook.title.slice(0, 20)}…" vale €${topBook.price.toFixed(2)}`)
      if (parts.length) setToast(parts.join(' · '))
    }
    window.addEventListener('codex:price-update-complete', handler)
    return () => window.removeEventListener('codex:price-update-complete', handler)
  }, [])

  // Listen for offline sync complete
  useEffect(() => {
    const handler = () => setToast('✅ Sincronizzazione completata')
    window.addEventListener('codex:sync-complete', handler)
    return () => window.removeEventListener('codex:sync-complete', handler)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 flex flex-col max-w-md mx-auto relative">
          {/* Offline badge – always in header area */}
          <OfflineBadge />

          {/* Toast */}
          {toast && <Toast message={toast} onDone={() => setToast(null)} />}

          <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
            <Routes>
              <Route path="/" element={<OnboardingPage />} />
              <Route path="/scan"      element={<RequireOnboarding><ScanPage /></RequireOnboarding>} />
              <Route path="/library"   element={<RequireOnboarding><LibraryPage /></RequireOnboarding>} />
              <Route path="/top-value" element={<RequireOnboarding><TopValuePage /></RequireOnboarding>} />
              <Route path="/settings"  element={<RequireOnboarding><SettingsPage /></RequireOnboarding>} />
              <Route path="/book/:id"  element={<RequireOnboarding><BookDetailPage /></RequireOnboarding>} />
            </Routes>
          </main>

          {/* Bottom nav – only after onboarding */}
          <nav
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur border-t border-slate-800 flex z-30"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 text-xs transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span className={isActive ? 'font-medium' : ''}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <InstallBanner />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
