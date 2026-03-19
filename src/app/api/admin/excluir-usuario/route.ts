import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (perfil?.perfil !== 'admin') return NextResponse.json({ error: 'Apenas admin' }, { status: 403 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Remove vínculos com alunos
  await admin.from('responsaveis_alunos').delete().eq('responsavel_id', user_id)

  // Remove da tabela public.usuarios — ignora erro de FK (outros registros referenciam)
  const { error: erroDelete } = await admin.from('usuarios').delete().eq('id', user_id)
  if (erroDelete) {
    return NextResponse.json({ error: 'Não foi possível excluir: ' + erroDelete.message }, { status: 500 })
  }

  // Remove do Auth
  const { error } = await admin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
