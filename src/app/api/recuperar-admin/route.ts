import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// Reseta a senha do admin sem precisar de email.
// Uso: POST /api/recuperar-admin
// Body: { "token": "<RECOVERY_SECRET>", "email": "admin@escola.com", "nova_senha": "NovaSenha123" }

const RecuperarAdminSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  email: z.string().email('Email inválido'),
  nova_senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres')
})

export async function POST(req: NextRequest) {
  const validation = RecuperarAdminSchema.safeParse(await req.json())
  if (!validation.success) {
    return NextResponse.json({ error: 'Email e senha (mín. 8 caracteres) obrigatórios' }, { status: 400 })
  }

  const { token, email, nova_senha } = validation.data as any

  const secret = process.env.RECOVERY_SECRET
  if (!secret || token !== secret) {
    await logger.logInfo('/api/recuperar-admin', `Tentativa de recuperação com token inválido: ${email}`)
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
  }

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Busca o usuário pelo email
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) {
      await logger.logError('/api/recuperar-admin', listErr as Error)
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
    }

    const usuario = users.find(u => u.email === email)
    if (!usuario) {
      await logger.logInfo('/api/recuperar-admin', `Tentativa de recuperação para usuário não encontrado: ${email}`)
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Troca a senha
    const { error } = await admin.auth.admin.updateUserById(usuario.id, { password: nova_senha })
    if (error) {
      await logger.logError('/api/recuperar-admin', error as Error, usuario.id)
      return NextResponse.json({ error: 'Erro ao atualizar senha' }, { status: 500 })
    }

    await logger.logAudit(usuario.id, 'senha_recuperada', '/api/recuperar-admin', { email }, true)

    return NextResponse.json({ ok: true, mensagem: `Senha de ${email} atualizada com sucesso.` })
  } catch (error) {
    await logger.logError('/api/recuperar-admin', error as Error)
    return NextResponse.json({ error: 'Erro interno ao recuperar admin' }, { status: 500 })
  }
}
