import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { jsonError, jsonOk, unauthorized } from '@/lib/api'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const now = new Date()
  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { cards: true } },
      cards: {
        where: { due: { lte: now } },
        select: { id: true },
      },
    },
  })

  return jsonOk(
    decks.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      color: d.color,
      createdAt: d.createdAt,
      total: d._count.cards,
      due: d.cards.length,
    })),
  )
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().max(20).optional(),
})

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  try {
    const body = createSchema.parse(await req.json())
    const deck = await prisma.deck.create({
      data: {
        userId: user.id,
        name: body.name,
        description: body.description ?? '',
        color: body.color ?? '#2a9d8f',
      },
    })
    return jsonOk(deck, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError('Name fehlt oder ist ungültig.')
    console.error(err)
    return jsonError('Stapel konnte nicht angelegt werden.', 500)
  }
}
