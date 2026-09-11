import { useEffect, useState, type ReactNode } from 'react'

// Phase 24a: the whole app now sits behind the session. No client router exists
// (see main.tsx's plain pathname check), so an unauthenticated visitor gets a
// hard redirect to /login rather than client-side navigation.
function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/auth-api/me')
      .then((res) => res.json())
      .then((body: { authenticated: boolean }) => {
        if (cancelled) return
        if (!body.authenticated) {
          window.location.href = '/login'
          return
        }
        setAuthenticated(true)
      })
      .catch(() => {
        if (!cancelled) window.location.href = '/login'
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!authenticated) {
    return <div style={{ height: '100vh', width: '100%', background: '#1e1e1e', color: '#cccccc' }} />
  }

  return <>{children}</>
}

export default AuthGate
