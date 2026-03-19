import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Reseta a senha do admin sem precisar de email.
// Uso: POST /api/recuperar-admin
// Body: { "token": "<RECOVERY_SECRET>", "email": "admin@escola.com", "nova_senha": "NovaSenha123" }

export async function POST(req: NextRequest) {
  const { token, email, nova_senha } = await req.json()

  const secret = process.env.RECOVERY_SECRET
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
  }

  if (!email || !nova_senha || nova_senha.length < 8) {
    return NextResponse.json({ error: 'email e nova_senha (mín. 8 caracteres) são obrigatórios' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca o usuário pelo email
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  const usuario = users.find(u => u.email === email)
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  // Troca a senha
  const { error } = await admin.auth.admin.updateUserById(usuario.id, { password: nova_senha })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, mensagem: `Senha de ${email} atualizada com sucesso.` })
}
