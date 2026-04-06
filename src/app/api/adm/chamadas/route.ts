import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''
  const escolaId: string | null = null
  if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = req.nextUrl.searchParams.get('data') || new Date().toISOString().split('T')[0]

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let q = admin
    .from('aulas')
    .select('id, data, horario_inicio, horario_fim, turmas!inner(nome, turno, escola_id), disciplinas(nome), usuarios(nome)')
    .eq('data', data)
    .order('horario_inicio')
  if (escolaId) q = (q as any).eq('turmas.escola_id', escolaId)

  const { data: aulas } = await q

  if (!aulas?.length) return NextResponse.json({ chamadas: [] })

  const aulaIds = aulas.map((a: any) => a.id)
  const aulaMap = new Map(aulas.map((a: any) => [a.id, a]))

  const { data: chamadas } = await admin
    .from('chamadas')
    .select('id, status, iniciada_em, concluida_em, aula_id, registros_chamada(id, status)')
    .in('aula_id', aulaIds)
    .order('iniciada_em', { ascending: false })

  const resultado = (chamadas || []).map((c: any) => ({
    ...c,
    aulas: aulaMap.get(c.aula_id),
  }))

  return NextResponse.json({ chamadas: resultado })
}
