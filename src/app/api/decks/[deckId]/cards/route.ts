import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { jsonError, jsonOk, unauthorized } from '@/lib/api'

type Params = { params: Promise<{ deckId: string }> }

const schema = z.object({
  front: z.string().trim().min(1).max(5000),
  back: z.string().trim().min(1).max(5000),
})

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { deckId } = await params

  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId: user.id } })
  if (!deck) return jsonError('Stapel nicht gefunden.', 404)

  try {
    const body = schema.parse(await req.json())
    const card = await prisma.card.create({
      data: {
        deckId,
        front: body.front,
        back: body.back,
        due: new Date(),
      },
    })
    return jsonOk(card, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError('Vorder- und Rückseite nötig.')
    console.error(err)
    return jsonError('Karte konnte nicht gespeichert werden.', 500)
  }
}
