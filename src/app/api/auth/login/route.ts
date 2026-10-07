import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createSession, verifyPassword } from '@/lib/auth'
import { jsonError, jsonOk } from '@/lib/api'

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json())
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    })
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError('E-Mail oder Passwort stimmt nicht.', 401)
    }
    await createSession(user.id)
    return jsonOk({ id: user.id, email: user.email, name: user.name })
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError('Ungültige Eingabe.')
    console.error(err)
    return jsonError('Login fehlgeschlagen.', 500)
  }
}
