import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Remover todos os diretores existentes
    const { data: existent } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('perfil', 'diretor')

    if (existent && existent.length > 0) {
      for (const user of existent) {
        await adminClient.auth.admin.deleteUser(user.id)
      }
    }

    // 2. Criar novo diretor único
    const { data, error: authError } = await adminClient.auth.admin.createUser({
      email: 'diretor@escola.com',
      password: 'diretor2026',
      user_metadata: { nome: 'Diretor da Escola', perfil: 'diretor' },
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 3. Criar registro na tabela usuarios
    const { error: dbError } = await adminClient
      .from('usuarios')
      .insert({
        id: data.user.id,
        nome: 'Diretor da Escola',
        email: 'diretor@escola.com',
        perfil: 'diretor',
        usuario: 'diretor',
        ativo: true,
      })

    if (dbError) {
      console.error('DB error:', dbError)
      await adminClient.auth.admin.deleteUser(data.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      message: 'Diretor único criado com sucesso',
      email: 'diretor@escola.com',
      usuario: 'diretor',
      senha: 'diretor2026',
    })
  } catch (err) {
    console.error('Erro:', err)
    return NextResponse.json({ error: 'Erro interno: ' + String(err) }, { status: 500 })
  }
}
