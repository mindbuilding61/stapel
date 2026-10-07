import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { jsonError, jsonOk, unauthorized } from '@/lib/api'

type Params = { params: Promise<{ deckId: string }> }

async function ownedDeck(userId: string, deckId: string) {
  return prisma.deck.findFirst({ where: { id: deckId, userId } })
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { deckId } = await params

  const deck = await ownedDeck(user.id, deckId)
  if (!deck) return jsonError('Stapel nicht gefunden.', 404)

  const now = new Date()
  const cards = await prisma.card.findMany({
    where: { deckId },
    orderBy: { createdAt: 'asc' },
  })

  const stats = {
    total: cards.length,
    due: cards.filter((c) => c.due <= now).length,
    new: cards.filter((c) => c.state === 'new').length,
    learning: cards.filter((c) => c.state === 'learning' || c.state === 'relearning').length,
    review: cards.filter((c) => c.state === 'review').length,
  }

  return jsonOk({ deck, cards, stats })
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { deckId } = await params

  const deck = await ownedDeck(user.id, deckId)
  if (!deck) return jsonError('Stapel nicht gefunden.', 404)

  await prisma.deck.delete({ where: { id: deckId } })
  return jsonOk({ ok: true })
}
