'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeckRow {
  id: string
  name: string
  description: string
  color: string
  total: number
  due: number
}

export default function AppHomePage() {
  const router = useRouter()
  const [rows, setRows] = useState<DeckRow[]>([])
  const [userName, setUserName] = useState('')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(async () => {
    const [me, decks] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/decks'),
    ])
    if (me.status === 401 || decks.status === 401) {
      router.push('/login')
      return
    }
    const user = await me.json()
    const list = await decks.json()
    setUserName(user.name || '')
    setRows(list)
  }, [router])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const res = await fetch('/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setBusy(false)
    if (!res.ok) return
    const deck = await res.json()
    setName('')
    setCreating(false)
    router.push(`/app/decks/${deck.id}`)
  }

  async function handleDelete(deckId: string) {
    if (!confirm('Stapel wirklich löschen?')) return
    await fetch(`/api/decks/${deckId}`, { method: 'DELETE' })
    await refresh()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  async function handleImport(file: File) {
    setBusy(true)
    setImportMsg('Import läuft…')
    const body = new FormData()
    body.append('file', file)
    const res = await fetch('/api/import/anki', { method: 'POST', body })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setImportMsg(data.error || 'Import fehlgeschlagen')
      return
    }
    setImportMsg(`${data.deckCount} Stapel, ${data.cardCount} Karten importiert.`)
    await refresh()
  }

  return (
    <main className="page home">
      <header className="home-hero">
        <div className="top-bar">
          <p className="brand-mark">Stapel</p>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Abmelden{userName ? ` (${userName})` : ''}
          </button>
        </div>
        <h1 className="home-title">Was willst du heute lernen?</h1>
        <p className="home-sub">
          Anki-Decks importieren, online lernen, mit Login auf allen Geräten.
        </p>
        <div className="home-actions">
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Neuer Stapel
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            Anki importieren
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".apkg,.colpkg,.txt,.tsv,.csv"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImport(file)
              e.target.value = ''
            }}
          />
        </div>
        {importMsg && <p className="import-msg">{importMsg}</p>}
        <p className="hint-line">
          Unterstützt: Anki <code>.apkg</code>, Text-Export <code>.txt</code>/<code>.tsv</code>
        </p>
      </header>

      {creating && (
        <form className="create-form" onSubmit={handleCreate}>
          <label htmlFor="deck-name">Name des Stapels</label>
          <input
            id="deck-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Spanisch A1"
          />
          <div className="form-row">
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || busy}>
              Anlegen
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCreating(false)
                setName('')
              }}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <section className="deck-list" aria-label="Deine Stapel">
        {rows.length === 0 && !creating && (
          <p className="empty-hint">Noch keine Stapel. Importiere ein Anki-Deck oder leg einen an.</p>
        )}
        {rows.map((deck) => (
          <article key={deck.id} className="deck-row">
            <Link
              href={`/app/decks/${deck.id}`}
              className="deck-main"
              style={{ ['--deck-accent' as string]: deck.color }}
            >
              <span className="deck-accent" />
              <span className="deck-body">
                <span className="deck-name">{deck.name}</span>
                <span className="deck-meta">
                  {deck.due > 0 ? `${deck.due} fällig` : 'nichts fällig'} · {deck.total} Karten
                </span>
              </span>
            </Link>
            <div className="deck-side">
              {deck.due > 0 && (
                <Link href={`/app/decks/${deck.id}/study`} className="btn btn-study">
                  Lernen
                </Link>
              )}
              <button
                type="button"
                className="btn btn-icon"
                aria-label={`${deck.name} löschen`}
                onClick={() => handleDelete(deck.id)}
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
