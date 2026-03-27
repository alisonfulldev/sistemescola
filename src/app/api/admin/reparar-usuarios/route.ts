import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Endpoint temporário: sincroniza usuários do Auth que estão faltando na tabela public.usuarios
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria'].includes(perfil?.perfil)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Lista todos os usuários do Auth
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })

  // Lista quem já existe em public.usuarios
  const { data: existentes } = await admin.from('usuarios').select('id')
  const existentesIds = new Set((existentes || []).map((u: any) => u.id))

  // Insere os que estão faltando
  const faltando = authUsers.filter(u => !existentesIds.has(u.id))
  const inseridos: string[] = []

  for (const u of faltando) {
    const nome = u.user_metadata?.nome || u.email?.split('@')[0] || 'Usuário'
    const perfil = u.user_metadata?.perfil || 'responsavel'
    const { error } = await admin.from('usuarios').insert({
      id: u.id,
      nome,
      email: u.email,
      perfil,
    })
    if (!error) inseridos.push(u.email || u.id)
  }

  return NextResponse.json({ inseridos, total: inseridos.length })
}
