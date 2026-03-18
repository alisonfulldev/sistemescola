import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica se é admin
  const { data: usuario } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria'].includes(usuario?.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { user_id, nome, senha } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Atualiza senha no Auth (se informada)
  if (senha?.trim()) {
    if (senha.length < 6) return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(user_id, { password: senha })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Atualiza nome na tabela usuarios (se informado)
  if (nome?.trim()) {
    await admin.from('usuarios').update({ nome }).eq('id', user_id)
  }

  return NextResponse.json({ ok: true })
}
