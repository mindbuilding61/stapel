'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { previewIntervals, type Rating } from '@/lib/sm2'
import type { Card } from '@/types'

const RATINGS: { key: Rating; label: string }[] = [
  { key: 'again', label: 'Nochmal' },
  { key: 'hard', label: 'Schwer' },
  { key: 'good', label: 'Gut' },
  { key: 'easy', label: 'Leicht' },
]

function toClientCard(raw: {
  id: string
  deckId: string
  front: string
  back: string
  ease: number
  interval: number
  reps: number
  lapses: number
  state: string
  due: string
  createdAt: string
  updatedAt: string
}): Card {
  return {
    id: raw.id,
    deckId: raw.deckId,
    front: raw.front,
    back: raw.back,
    ease: raw.ease,
    interval: raw.interval,
    reps: raw.reps,
    lapses: raw.lapses,
    state: raw.state as Card['state'],
    due: new Date(raw.due).getTime(),
    createdAt: new Date(raw.createdAt).getTime(),
    updatedAt: new Date(raw.updatedAt).getTime(),
  }
}

export default function StudyPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const router = useRouter()
  const [queue, setQueue] = useState<Card[]>([])
  const [deckName, setDeckName] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)
  const [loading, setLoading] = useState(true)
  const [previews, setPreviews] = useState<Record<Rating, string> | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/decks/${deckId}/study`)
    if (res.status === 401) {
      router.push('/login')
      return
    }
    const data = await res.json()
    setDeckName(data.deck?.name ?? '')
    const cards = (data.cards || []).map(toClientCard)
    setQueue(cards)
    setLoading(false)
    if (cards[0]) setPreviews(previewIntervals(cards[0]))
  }, [deckId, router])

  useEffect(() => {
    load()
  }, [load])

  const current = queue[0]

  useEffect(() => {
    if (current) setPreviews(previewIntervals(current))
  }, [current])

  async function rate(rating: Rating) {
    if (!current) return
    await fetch(`/api/cards/${current.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    })
    setDone((d) => d + 1)
    setFlipped(false)
    setQueue((q) => q.slice(1))
  }

  if (loading) {
    return (
      <main className="page study-page">
        <p className="boot-hint">Session startet…</p>
      </main>
    )
  }

  if (!current) {
    return (
      <main className="page study-page study-done">
        <p className="brand-mark">Stapel</p>
        <h1 className="home-title">Fertig für heute</h1>
        <p className="home-sub">
          {done === 0 ? 'Keine Karten fällig.' : `${done} Karten geschafft.`}
        </p>
        <Link href={`/app/decks/${deckId}`} className="btn btn-primary">
          Zurück zum Stapel
        </Link>
      </main>
    )
  }

  return (
    <main className="page study-page">
      <header className="study-bar">
        <Link href={`/app/decks/${deckId}`} className="btn btn-ghost">
          Beenden
        </Link>
        <span className="study-progress">
          {deckName} · noch {queue.length}
          {done > 0 ? ` · ${done} fertig` : ''}
        </span>
      </header>

      <button
        type="button"
        className={`flashcard ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}
      >
        <span className="flashcard-face flashcard-front">
          <span className="flashcard-label">Frage</span>
          <span className="flashcard-text">{current.front}</span>
          {!flipped && <span className="flashcard-hint">Tippen zum Umdrehen</span>}
        </span>
        <span className="flashcard-face flashcard-back">
          <span className="flashcard-label">Antwort</span>
          <span className="flashcard-text">{current.back}</span>
        </span>
      </button>

      {flipped ? (
        <div className="rating-row" role="group" aria-label="Bewertung">
          {RATINGS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`btn rating rating-${key}`}
              onClick={() => rate(key)}
            >
              <span className="rating-label">{label}</span>
              <span className="rating-interval">{previews?.[key] ?? ''}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="btn btn-secondary reveal" onClick={() => setFlipped(true)}>
          Antwort zeigen
        </button>
      )}
    </main>
  )
}
