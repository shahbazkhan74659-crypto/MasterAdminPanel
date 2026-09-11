import { useEffect, useState, type FormEvent } from 'react'
import './LoginPage.css'
import { loginSchema, type LoginFormErrors } from './loginSchema'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/auth-api/me')
      .then((res) => res.json())
      .then((body: { authenticated: boolean }) => {
        if (cancelled) return
        if (body.authenticated) {
          window.location.href = '/'
          return
        }
        setCheckingSession(false)
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)

    const result = loginSchema.safeParse({ username, password })
    if (!result.success) {
      const fieldErrors: LoginFormErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormErrors
        if (!fieldErrors[field]) fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    setSubmitting(true)
    try {
      const res = await fetch('/auth-api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const body = await res.json()
      if (res.ok && body.ok) {
        window.location.href = '/'
        return
      }
      setServerError(body.error ?? 'Login failed')
    } catch {
      setServerError('Could not reach the server. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingSession) {
    return <div className="login-shell" />
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1 className="login-title">Master Admin Panel</h1>
        <p className="login-sub">Sign in to continue</p>

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="login-field">
            <label className="login-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className={`login-input${errors.username ? ' has-error' : ''}`}
              type="text"
              placeholder="e.g. admin"
              autoComplete="off"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {errors.username && <p className="login-error">{errors.username}</p>}
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`login-input${errors.password ? ' has-error' : ''}`}
              type="password"
              placeholder="••••••••"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="login-error">{errors.password}</p>}
          </div>

          {serverError && <p className="login-error login-error-server">{serverError}</p>}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
