import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSession, hashPassword } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/api'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json())
    const email = body.email.toLowerCase()

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return jsonError('Diese E-Mail ist schon registriert.', 409)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email,
        passwordHash: await hashPassword(body.password),
      },
    })

    await createSession(user.id)
    return jsonOk({ id: user.id, email: user.email, name: user.name }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError('Ungültige Eingabe. Name, E-Mail und Passwort (min. 8 Zeichen).')
    }
    console.error(err)
    return jsonError('Registrierung fehlgeschlagen.', 500)
  }
}
