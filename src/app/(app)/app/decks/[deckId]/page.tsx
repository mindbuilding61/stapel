'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface CardRow {
  id: string
  front: string
  back: string
}

export default function DeckPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cards, setCards] = useState<CardRow[]>([])
  const [stats, setStats] = useState({ total: 0, due: 0, new: 0, learning: 0, review: 0 })
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [adding, setAdding] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/decks/${deckId}`)
    if (res.status === 401) {
      router.push('/login')
      return
    }
    if (!res.ok) return
    const data = await res.json()
    setName(data.deck.name)
    setDescription(data.deck.description)
    setCards(data.cards)
    setStats(data.stats)
  }, [deckId, router])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    const res = await fetch(`/api/decks/${deckId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ front, back }),
    })
    if (!res.ok) return
    setFront('')
    setBack('')
    setAdding(false)
    await refresh()
  }

  async function handleDeleteCard(cardId: string) {
    if (!confirm('Karte löschen?')) return
    await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
    await refresh()
  }

  return (
    <main className="page deck-page">
      <header className="page-header">
        <Link href="/app" className="btn btn-ghost back">
          ← Stapel
        </Link>
        <h1 className="page-title">{name}</h1>
        {description && <p className="page-sub">{description}</p>}
        <p className="stats-line">
          {stats.due} fällig · {stats.new} neu · {stats.learning} Lernen · {stats.review} Review
        </p>
        <div className="home-actions">
          <Link
            href={`/app/decks/${deckId}/study`}
            className={`btn btn-primary ${stats.due === 0 ? 'is-disabled' : ''}`}
            aria-disabled={stats.due === 0}
            onClick={(e) => {
              if (stats.due === 0) e.preventDefault()
            }}
          >
            {stats.due > 0 ? `${stats.due} lernen` : 'Nichts fällig'}
          </Link>
          <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>
            Karte hinzufügen
          </button>
        </div>
      </header>

      {adding && (
        <form className="editor-form" onSubmit={handleAdd}>
          <label htmlFor="front">Vorderseite</label>
          <textarea id="front" rows={3} value={front} onChange={(e) => setFront(e.target.value)} />
          <label htmlFor="back">Rückseite</label>
          <textarea id="back" rows={3} value={back} onChange={(e) => setBack(e.target.value)} />
          <div className="form-row">
            <button type="submit" className="btn btn-primary" disabled={!front.trim() || !back.trim()}>
              Speichern
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <ul className="card-list">
        {cards.map((card) => (
          <li key={card.id} className="card-item">
            <div className="card-item-main static">
              <span className="card-front-preview">{card.front}</span>
              <span className="card-back-preview">{card.back}</span>
            </div>
            <button
              type="button"
              className="btn btn-icon"
              aria-label="Karte löschen"
              onClick={() => handleDeleteCard(card.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
