import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''
  const escolaId: string | null = null
  if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const mesAno = req.nextUrl.searchParams.get('mes') || (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()

  const [ano, mes] = mesAno.split('-')
  const inicio = `${ano}-${mes}-01`
  const fim = new Date(+ano, +mes, 0).toISOString().split('T')[0]

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let qt = admin.from('turmas').select('id, nome, turno').eq('ativo', true).order('nome')
  if (escolaId) qt = (qt as any).eq('escola_id', escolaId)
  const { data: turmas } = await qt
  if (!turmas?.length) return NextResponse.json({ dados: [] })

  // Aulas do período
  const { data: aulas } = await admin
    .from('aulas')
    .select('id, turma_id')
    .gte('data', inicio)
    .lte('data', fim)

  if (!aulas?.length) return NextResponse.json({ dados: turmas.map((t: any) => ({ ...t, aulas_realizadas: 0, presentes: 0, faltas: 0, justificadas: 0, freq: 0 })) })

  const aulaIds = aulas.map((a: any) => a.id)
  const aulaTurmaMap = new Map(aulas.map((a: any) => [a.id, a.turma_id]))

  // Chamadas concluídas dessas aulas
  const { data: chamadas } = await admin
    .from('chamadas')
    .select('id, aula_id, status')
    .in('aula_id', aulaIds)
    .eq('status', 'concluida')

  if (!chamadas?.length) return NextResponse.json({ dados: turmas.map((t: any) => ({ ...t, aulas_realizadas: 0, presentes: 0, faltas: 0, justificadas: 0, freq: 0 })) })

  const chamadaIds = chamadas.map((c: any) => c.id)
  const chamadaAulaMap = new Map(chamadas.map((c: any) => [c.id, c.aula_id]))

  // Registros de chamada
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('chamada_id, status')
    .in('chamada_id', chamadaIds)

  // Agrega por turma
  const stats = new Map<string, any>()
  for (const t of turmas) {
    stats.set(t.id, { aulas_realizadas: 0, presentes: 0, faltas: 0, justificadas: 0, totalReg: 0 })
  }

  for (const c of chamadas) {
    const aulaId = c.aula_id
    const turmaId = aulaTurmaMap.get(aulaId)
    if (!turmaId || !stats.has(turmaId)) continue
    stats.get(turmaId).aulas_realizadas++
  }

  for (const r of registros || []) {
    const aulaId = chamadaAulaMap.get(r.chamada_id)
    const turmaId = aulaTurmaMap.get(aulaId)
    if (!turmaId || !stats.has(turmaId)) continue
    const s = stats.get(turmaId)
    s.totalReg++
    if (r.status === 'presente') s.presentes++
    else if (r.status === 'falta') s.faltas++
    else if (r.status === 'justificada') s.justificadas++
  }

  const dados = turmas.map((t: any) => {
    const s = stats.get(t.id) || { aulas_realizadas: 0, presentes: 0, faltas: 0, justificadas: 0, totalReg: 0 }
    return { ...t, ...s, freq: s.totalReg > 0 ? Math.round((s.presentes / s.totalReg) * 100) : 0 }
  })

  return NextResponse.json({ dados })
}
