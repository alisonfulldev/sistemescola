import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Rota temporária de primeiro acesso — remove após criar o admin
// Só funciona se NÃO existir nenhum usuário admin no sistema
export async function POST() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Bloqueia se já existir um admin
  const { data: existente } = await admin
    .from('usuarios')
    .select('id')
    .eq('perfil', 'admin')
    .limit(1)
    .maybeSingle()

  if (existente) {
    return NextResponse.json({ error: 'Já existe um administrador no sistema.' }, { status: 403 })
  }

  const email = 'ti@escola.com'
  const senha = 'TI@Escola2026!'

  // Remove usuário antigo se existir (para recriar corretamente)
  const { data: antigo } = await admin.auth.admin.listUsers()
  const usuarioAntigo = antigo?.users?.find(u => u.email === email)
  if (usuarioAntigo) {
    await admin.auth.admin.deleteUser(usuarioAntigo.id)
    await admin.from('usuarios').delete().eq('id', usuarioAntigo.id)
  }

  // Cria via API oficial do Supabase (hash correto)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: 'Administrador TI', perfil: 'admin' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('usuarios').insert({
    id: data.user.id,
    nome: 'Administrador TI',
    email,
    perfil: 'admin',
    ativo: true,
  })

  return NextResponse.json({ ok: true, email, senha })
}
