import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { jsonError, jsonOk, unauthorized } from '@/lib/api'

type Params = { params: Promise<{ deckId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { deckId } = await params

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId: user.id } })
  if (!deck) return jsonError('Stapel nicht gefunden.', 404)

  const now = new Date()
  const cards = await prisma.card.findMany({
    where: { deckId, due: { lte: now } },
  })

  const order = { learning: 0, relearning: 1, review: 2, new: 3 } as const
  cards.sort((a, b) => {
    const ao = order[a.state as keyof typeof order] ?? 9
    const bo = order[b.state as keyof typeof order] ?? 9
    if (ao !== bo) return ao - bo
    return a.due.getTime() - b.due.getTime()
  })

  return jsonOk({ deck, cards })
}
