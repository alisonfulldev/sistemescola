import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()

  if (!email || !senha) {
    return NextResponse.json(
      { error: 'email e senha são obrigatórios' },
      { status: 400 }
    )
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Buscar usuário por email
    const { data: { users }, error: searchError } = await adminClient.auth.admin.listUsers()

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 400 })
    }

    const user = users.find(u => u.email === email.toLowerCase())

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Atualizar senha
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: senha }
    )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Senha atualizada com sucesso',
      email: email.toLowerCase(),
    })
  } catch (err) {
    console.error('Erro ao resetar senha:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
