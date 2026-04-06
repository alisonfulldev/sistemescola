import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const turmaId = req.nextUrl.searchParams.get('turma_id')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Aulas do professor
  let aulasQuery = admin
    .from('aulas')
    .select('id, data, turmas(nome)')
    .eq('professor_id', user.id)
  if (turmaId) aulasQuery = aulasQuery.eq('turma_id', turmaId)
  const { data: aulas } = await aulasQuery
  if (!aulas?.length) return NextResponse.json({ chamadas: [] })

  const aulaMap = new Map(aulas.map((a: any) => [a.id, a]))
  const aulaIds = aulas.map((a: any) => a.id)

  // 2. Chamadas dessas aulas
  const { data: chamadas } = await admin
    .from('chamadas')
    .select('id, status, aula_id, concluida_em')
    .in('aula_id', aulaIds)
    .order('concluida_em', { ascending: false })
    .limit(30)

  if (!chamadas?.length) return NextResponse.json({ chamadas: [] })

  const chamadaIds = chamadas.map((c: any) => c.id)

  // 3. Registros dessas chamadas (busca separada para garantir)
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('chamada_id, status')
    .in('chamada_id', chamadaIds)

  // Agrupa registros por chamada_id
  const regMap = new Map<string, any[]>()
  for (const r of registros || []) {
    if (!regMap.has(r.chamada_id)) regMap.set(r.chamada_id, [])
    regMap.get(r.chamada_id)!.push(r)
  }

  const resultado = chamadas.map((c: any) => {
    const aula = aulaMap.get(c.aula_id) as any
    const regs = regMap.get(c.id) || []
    return {
      id: c.id,
      data: aula?.data,
      turma: aula?.turmas?.nome,
      status: c.status,
      total: regs.length,
      presentes: regs.filter((r: any) => r.status === 'presente').length,
      faltas: regs.filter((r: any) => r.status === 'falta').length,
      justificadas: regs.filter((r: any) => r.status === 'justificada').length,
    }
  })

  return NextResponse.json({ chamadas: resultado })
}
