import { useState, type FormEvent } from 'react'
import './LoginPage.css'
import { loginSchema, type LoginFormErrors } from './loginSchema'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginFormErrors>({})

  function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const result = loginSchema.safeParse({ username, password })
    if (result.success) {
      setErrors({})
      return
    }

    const fieldErrors: LoginFormErrors = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof LoginFormErrors
      if (!fieldErrors[field]) fieldErrors[field] = issue.message
    }
    setErrors(fieldErrors)
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

          <button type="submit" className="login-submit">
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
