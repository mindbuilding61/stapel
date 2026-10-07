'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Registrierung fehlgeschlagen')
      return
    }
    router.push('/app')
    router.refresh()
  }

  return (
    <main className="page auth-page">
      <p className="brand-mark">Stapel</p>
      <h1 className="home-title">Konto anlegen</h1>
      <p className="home-sub">Dann kannst du Anki-Decks importieren und überall lernen.</p>

      <form className="create-form" onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
        <label htmlFor="email">E-Mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Passwort (min. 8 Zeichen)</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '…' : 'Registrieren'}
          </button>
          <Link className="btn btn-ghost" href="/login">
            Schon Konto?
          </Link>
        </div>
      </form>
    </main>
  )
}
