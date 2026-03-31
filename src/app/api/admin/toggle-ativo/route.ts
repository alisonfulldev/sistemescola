import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria', 'diretor'].includes(perfil?.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { user_id, ativo } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Bloqueia desativação de usuários admin
  const { data: alvo } = await admin.from('usuarios').select('perfil').eq('id', user_id).single()
  if (alvo?.perfil === 'admin') {
    return NextResponse.json({ error: 'Usuários admin não podem ser desativados pelo painel.' }, { status: 403 })
  }

  // Atualiza na tabela pública
  await admin.from('usuarios').update({ ativo }).eq('id', user_id)

  // Bloqueia ou desbloqueia no Supabase Auth
  const { error } = await admin.auth.admin.updateUserById(user_id, {
    ban_duration: ativo ? 'none' : '876000h', // 'none' = desbanir, '876000h' ≈ 100 anos
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
