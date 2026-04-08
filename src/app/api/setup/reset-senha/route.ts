import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const ResetSenhaSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
})

export async function POST(req: NextRequest) {
  const validation = ResetSenhaSchema.safeParse(await req.json())
  if (!validation.success) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
  }

  const { email, senha } = validation.data

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Buscar usuário por email
    const { data: { users }, error: searchError } = await adminClient.auth.admin.listUsers()

    if (searchError) {
      await logger.logError('/api/setup/reset-senha', searchError, undefined, { email })
      return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 400 })
    }

    const user = users.find(u => u.email === email.toLowerCase())

    if (!user) {
      await logger.logInfo('/api/setup/reset-senha', `Usuário não encontrado: ${email}`)
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Atualizar senha
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: senha }
    )

    if (updateError) {
      await logger.logError('/api/setup/reset-senha', updateError, user.id, { email })
      return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 400 })
    }

    await logger.logAudit(user.id, 'senha_reset', '/api/setup/reset-senha', { email }, true)

    return NextResponse.json({
      ok: true,
      message: 'Senha atualizada com sucesso',
      email: email.toLowerCase(),
    })
  } catch (err) {
    await logger.logError('/api/setup/reset-senha', err)
    return NextResponse.json({ error: 'Erro interno ao resetar senha' }, { status: 500 })
  }
}
