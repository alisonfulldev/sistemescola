import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { usuario } = await req.json()
  if (!usuario || typeof usuario !== 'string') {
    return NextResponse.json({ error: 'Usuário não informado' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const usuarioLower = usuario.trim().toLowerCase()

  // Tenta buscar por usuario primeiro
  let { data, error } = await adminClient
    .from('usuarios')
    .select('email')
    .eq('usuario', usuarioLower)
    .eq('ativo', true)
    .single()

  // Se não encontrar, tenta buscar por email (fallback)
  if (error || !data) {
    const { data: dataEmail, error: errorEmail } = await adminClient
      .from('usuarios')
      .select('email')
      .eq('email', usuarioLower)
      .eq('ativo', true)
      .single()

    data = dataEmail
    error = errorEmail
  }

  console.log('buscar-email:', { usuario: usuarioLower, data, error })

  if (error || !data) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json({ error: 'Usuário não encontrado', details: error?.message }, { status: 404 })
  }

  return NextResponse.json({ email: data.email })
}
