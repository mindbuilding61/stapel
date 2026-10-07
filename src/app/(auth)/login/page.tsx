'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Login fehlgeschlagen')
      return
    }
    router.push('/app')
    router.refresh()
  }

  return (
    <main className="page auth-page">
      <p className="brand-mark">Stapel</p>
      <h1 className="home-title">Anmelden</h1>
      <p className="home-sub">Deine Karten unter karteikarten.motizen.de</p>

      <form className="create-form" onSubmit={onSubmit}>
        <label htmlFor="email">E-Mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '…' : 'Einloggen'}
          </button>
          <Link className="btn btn-ghost" href="/register">
            Registrieren
          </Link>
        </div>
      </form>
    </main>
  )
}
