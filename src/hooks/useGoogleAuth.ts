import { useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets openid email profile'

export function useGoogleAuth() {
  const { setAuth, clearAuth, isAuthenticated, userEmail } = useAuthStore()

  const login = useCallback(() => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }, [])

  const handleCallback = useCallback(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = hash.get('access_token')
    const expiresIn = hash.get('expires_in')
    if (!accessToken || !expiresIn) return false

    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((info) => {
        setAuth({ accessToken, userEmail: info.email, sheetsId: null })
      })

    return true
  }, [setAuth])

  return { login, logout: clearAuth, handleCallback, isAuthenticated, userEmail }
}
