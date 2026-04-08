import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Aulas do professor
    const { data: aulas } = await admin
      .from('aulas')
      .select('id, turma_id, turmas(id, nome)')
      .eq('professor_id', user.id)

    if (!aulas?.length) {
      await logger.logAudit(user.id, 'visao_geral_consultar', '/api/professor/visao-geral', { chamadas: 0 }, true)
      return NextResponse.json({ totalChamadas: 0, mediaFrequencia: 0, alunosEmRisco: [], turmas: [] })
    }

  const aulaIds = aulas.map((a: any) => a.id)

  // Chamadas concluídas
  const { data: chamadas } = await admin
    .from('chamadas')
    .select('id, aula_id')
    .in('aula_id', aulaIds)
    .eq('status', 'concluida')

  if (!chamadas?.length) return NextResponse.json({ totalChamadas: 0, mediaFrequencia: 0, alunosEmRisco: [], turmas: [] })

  const chamadaIds = chamadas.map((c: any) => c.id)

  // Registros de todas as chamadas
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('chamada_id, aluno_id, status, alunos(id, nome_completo, turma_id, turmas(nome))')
    .in('chamada_id', chamadaIds)

  // Agrupa por chamada para frequência geral
  const chamadaMap = new Map<string, { presentes: number; total: number }>()
  for (const r of registros || []) {
    if (!chamadaMap.has(r.chamada_id)) chamadaMap.set(r.chamada_id, { presentes: 0, total: 0 })
    const c = chamadaMap.get(r.chamada_id)!
    c.total++
    if (r.status === 'presente' || r.status === 'justificada') c.presentes++
  }

  const freqs = Array.from(chamadaMap.values()).filter(c => c.total > 0).map(c => (c.presentes / c.total) * 100)
  const mediaFrequencia = freqs.length > 0 ? Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length) : 0

  // Conta chamadas por turma e frequência por turma
  const aulaMap = new Map(aulas.map((a: any) => [a.id, a]))
  const chamadaLookupMap = new Map(chamadas.map((c: any) => [c.id, c]))  // Evitar O(n²) find()
  const turmaStats = new Map<string, { nome: string; chamadas: number; presentes: number; total: number }>()

  for (const c of chamadas) {
    const aula = aulaMap.get(c.aula_id) as any
    if (!aula) continue
    const turmaId = aula.turma_id
    const turmaNome = (aula as any).turmas?.nome || turmaId
    if (!turmaStats.has(turmaId)) turmaStats.set(turmaId, { nome: turmaNome, chamadas: 0, presentes: 0, total: 0 })
    turmaStats.get(turmaId)!.chamadas++
  }

  for (const r of registros || []) {
    const chamada = chamadaLookupMap.get(r.chamada_id)  // O(1) lookup ao invés de O(n) find()
    if (!chamada) continue
    const aula = aulaMap.get(chamada.aula_id) as any
    if (!aula) continue
    const turmaId = aula.turma_id
    if (!turmaStats.has(turmaId)) continue
    const ts = turmaStats.get(turmaId)!
    ts.total++
    if (r.status === 'presente' || r.status === 'justificada') ts.presentes++
  }

  const turmas = Array.from(turmaStats.entries()).map(([id, v]) => ({
    id,
    nome: v.nome,
    chamadas: v.chamadas,
    frequencia: v.total > 0 ? Math.round((v.presentes / v.total) * 100) : 0,
  }))

  // Alunos em risco: freq < 75% (mínimo 2 chamadas registradas)
  const alunoStats = new Map<string, { nome: string; turma: string; presentes: number; total: number; faltas: number }>()
  for (const r of registros || []) {
    const aluno = (r as any).alunos
    if (!aluno) continue
    if (!alunoStats.has(r.aluno_id)) {
      alunoStats.set(r.aluno_id, {
        nome: aluno.nome_completo,
        turma: aluno.turmas?.nome || '',
        presentes: 0,
        total: 0,
        faltas: 0,
      })
    }
    const as_ = alunoStats.get(r.aluno_id)!
    as_.total++
    if (r.status === 'presente' || r.status === 'justificada') as_.presentes++
    if (r.status === 'falta') as_.faltas++
  }

    const alunosEmRisco = Array.from(alunoStats.values())
      .filter(a => a.total >= 2 && (a.presentes / a.total) * 100 < 75)
      .sort((a, b) => (a.presentes / a.total) - (b.presentes / b.total))
      .slice(0, 5)
      .map(a => ({ ...a, frequencia: Math.round((a.presentes / a.total) * 100) }))

    const resultado = {
      totalChamadas: chamadas.length,
      mediaFrequencia,
      alunosEmRisco,
      turmas,
    }

    await logger.logAudit(user.id, 'visao_geral_consultar', '/api/professor/visao-geral', { chamadas: chamadas.length, turmas: turmas.length }, true)

    return NextResponse.json(resultado)
  } catch (error) {
    await logger.logError('/api/professor/visao-geral', error, user.id)
    return NextResponse.json({ totalChamadas: 0, mediaFrequencia: 0, alunosEmRisco: [], turmas: [] }, { status: 500 })
  }
}
