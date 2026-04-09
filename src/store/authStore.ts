import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthState } from '../types'

interface AuthStore extends AuthState {
  setAuth: (data: { accessToken: string; userEmail: string; sheetsId: string | null }) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      accessToken: null,
      userEmail: null,
      sheetsId: null,

      setAuth: ({ accessToken, userEmail, sheetsId }) =>
        set({ isAuthenticated: true, accessToken, userEmail, sheetsId }),

      clearAuth: () =>
        set({ isAuthenticated: false, accessToken: null, userEmail: null, sheetsId: null }),
    }),
    { name: 'codex-auth' },
  ),
)
