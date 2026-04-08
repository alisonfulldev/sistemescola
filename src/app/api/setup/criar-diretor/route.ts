import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const { email, senha, nome } = await req.json()

  if (!email || !senha || !nome) {
    await logger.logAudit('system', 'criar_diretor', '/api/setup/criar-diretor', {}, false)
    return NextResponse.json(
      { error: 'email, senha e nome são obrigatórios' },
      { status: 400 }
    )
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    await logger.logAudit('system', 'criar_diretor', '/api/setup/criar-diretor', { email }, false)
    return NextResponse.json(
      { error: 'Email inválido' },
      { status: 400 }
    )
  }

  if (senha.length < 8) {
    await logger.logAudit('system', 'criar_diretor', '/api/setup/criar-diretor', {}, false)
    return NextResponse.json(
      { error: 'Senha deve ter pelo menos 8 caracteres' },
      { status: 400 }
    )
  }

  if (nome.trim().length < 3) {
    await logger.logAudit('system', 'criar_diretor', '/api/setup/criar-diretor', {}, false)
    return NextResponse.json(
      { error: 'Nome deve ter pelo menos 3 caracteres' },
      { status: 400 }
    )
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const emailLower = email.trim().toLowerCase()

    // Verificar se já existe
    const { data: existing } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('email', emailLower)
      .single()

    if (existing) {
      await logger.logAudit('system', 'criar_diretor', '/api/setup/criar-diretor', { email: emailLower }, false)
      return NextResponse.json({ error: 'Este email já está cadastrado' }, { status: 409 })
    }

    // Criar usuário no Auth
    const { data, error: authError } = await adminClient.auth.admin.createUser({
      email: emailLower,
      password: senha,
      user_metadata: { nome: nome.trim() },
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      await logger.logError('/api/setup/criar-diretor', authError, 'system')
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Atualizar registro criado pelo trigger (handle_new_user)
    const usuarioLogin = emailLower.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
    const { error: dbError } = await adminClient.from('usuarios').upsert({
      id: data.user.id,
      nome: nome.trim(),
      email: emailLower,
      perfil: 'diretor',
      usuario: usuarioLogin,
      ativo: true,
    }, { onConflict: 'id' })

    if (dbError) {
      console.error('DB error:', dbError)
      await adminClient.auth.admin.deleteUser(data.user.id)
      await logger.logError('/api/setup/criar-diretor', dbError, 'system')
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    await logger.logAudit('system', 'criar_diretor', '/api/setup/criar-diretor', { email: emailLower, usuario: usuarioLogin }, true)

    return NextResponse.json({
      ok: true,
      usuario: usuarioLogin,
      email: email.trim().toLowerCase(),
      nome: nome.trim(),
      id: data.user.id,
    })
  } catch (err) {
    console.error('Erro ao criar diretor:', err)
    await logger.logError('/api/setup/criar-diretor', err, 'system')
    return NextResponse.json({ error: 'Erro interno: ' + String(err) }, { status: 500 })
  }
}
