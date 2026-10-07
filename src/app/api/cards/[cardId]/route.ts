import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { schedule, type Rating } from '@/lib/sm2'
import { jsonError, jsonOk, unauthorized } from '@/lib/api'
import type { Card as StudyCard } from '@/types'

type Params = { params: Promise<{ cardId: string }> }

async function ownedCard(userId: string, cardId: string) {
  return prisma.card.findFirst({
    where: { id: cardId, deck: { userId } },
  })
}

const editSchema = z.object({
  front: z.string().trim().min(1).max(5000),
  back: z.string().trim().min(1).max(5000),
})

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { cardId } = await params
  const card = await ownedCard(user.id, cardId)
  if (!card) return jsonError('Karte nicht gefunden.', 404)

  try {
    const body = editSchema.parse(await req.json())
    const updated = await prisma.card.update({
      where: { id: cardId },
      data: { front: body.front, back: body.back },
    })
    return jsonOk(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError('Ungültige Eingabe.')
    console.error(err)
    return jsonError('Speichern fehlgeschlagen.', 500)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { cardId } = await params
  const card = await ownedCard(user.id, cardId)
  if (!card) return jsonError('Karte nicht gefunden.', 404)
  await prisma.card.delete({ where: { id: cardId } })
  return jsonOk({ ok: true })
}

const rateSchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
})

function toStudyCard(card: {
  id: string
  deckId: string
  front: string
  back: string
  ease: number
  interval: number
  reps: number
  lapses: number
  state: string
  due: Date
  createdAt: Date
  updatedAt: Date
}): StudyCard {
  return {
    id: card.id,
    deckId: card.deckId,
    front: card.front,
    back: card.back,
    ease: card.ease,
    interval: card.interval,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as StudyCard['state'],
    due: card.due.getTime(),
    createdAt: card.createdAt.getTime(),
    updatedAt: card.updatedAt.getTime(),
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { cardId } = await params
  const card = await ownedCard(user.id, cardId)
  if (!card) return jsonError('Karte nicht gefunden.', 404)

  try {
    const body = rateSchema.parse(await req.json())
    const result = schedule(toStudyCard(card), body.rating as Rating)
    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        ease: result.ease,
        interval: result.interval,
        reps: result.reps,
        lapses: result.lapses,
        state: result.state,
        due: new Date(result.due),
      },
    })
    return jsonOk(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError('Ungültige Bewertung.')
    console.error(err)
    return jsonError('Bewertung fehlgeschlagen.', 500)
  }
}
