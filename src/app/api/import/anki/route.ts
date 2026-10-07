import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/lib/auth'
import { importAnkiFile } from '@/lib/anki-import'
import { jsonError, jsonOk, unauthorized } from '@/lib/api'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return jsonError('Keine Datei hochgeladen.')

    const name = file.name || 'import.apkg'
    if (file.size > 40 * 1024 * 1024) {
      return jsonError('Datei zu groß (max. 40 MB).')
    }

    const buffer = await file.arrayBuffer()
    const decks = await importAnkiFile(buffer, name)
    const usable = decks.filter((d) => d.cards.length > 0)
    if (usable.length === 0) {
      return jsonError('Keine Karten in der Datei gefunden.')
    }

    let deckCount = 0
    let cardCount = 0

    for (const imported of usable) {
      const deck = await prisma.deck.create({
        data: {
          userId: user.id,
          name: imported.name.slice(0, 120),
          description: `Import aus ${name}`,
          color: '#457b9d',
          cards: {
            create: imported.cards.slice(0, 20000).map((c) => ({
              front: c.front.slice(0, 5000),
              back: c.back.slice(0, 5000),
              due: new Date(),
            })),
          },
        },
      })
      deckCount += 1
      cardCount += Math.min(imported.cards.length, 20000)
      void deck
    }

    return jsonOk({ deckCount, cardCount })
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Import fehlgeschlagen.'
    return jsonError(message, 500)
  }
}
