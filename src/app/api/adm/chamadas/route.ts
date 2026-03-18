import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = req.nextUrl.searchParams.get('data') || new Date().toISOString().split('T')[0]

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca aulas da data e suas chamadas
  const { data: aulas } = await admin
    .from('aulas')
    .select('id, data, horario_inicio, horario_fim, turmas(nome, turno), disciplinas(nome), usuarios(nome)')
    .eq('data', data)
    .order('horario_inicio')

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
