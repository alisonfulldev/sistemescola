import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const hoje = new Date().toISOString().split('T')[0]

  // Busca alunos vinculados ao responsável
  const { data: vinculos } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id, alunos(id, nome_completo, foto_url, matricula, turmas(id, nome, serie, turno, grau, turma_letra))')
    .eq('responsavel_id', user.id)

  if (!vinculos?.length) return NextResponse.json({ alunos: [] })

  const alunos = vinculos.map((v: any) => v.alunos).filter(Boolean)
  const alunoIds = alunos.map((a: any) => a.id)

  // Busca IDs das chamadas de hoje (filtra no banco, não em memória)
  const { data: chamadasHoje } = await admin
    .from('chamadas')
    .select('id, aulas!inner(data)')
    .eq('aulas.data', hoje)

  const chamadasIds = (chamadasHoje || []).map((c: any) => c.id)

  // Busca apenas registros de hoje, com limite seguro
  const registroMap = new Map<string, any>()
  if (chamadasIds.length > 0) {
    const { data: registros } = await admin
      .from('registros_chamada')
      .select('id, aluno_id, status, registrado_em, observacao, chamada_id')
      .in('aluno_id', alunoIds)
      .in('chamada_id', chamadasIds)
      .order('registrado_em', { ascending: false })
      .limit(500)

    for (const r of registros || []) {
      if (!registroMap.has(r.aluno_id)) registroMap.set(r.aluno_id, r)
    }
  }

  // Busca justificativas dos registros de hoje
  const registroIds = Array.from(registroMap.values()).map((r: any) => r.id)
  const justificativaMap = new Map<string, any>()
  if (registroIds.length > 0) {
    const { data: justificativas } = await admin
      .from('justificativas_falta')
      .select('id, registro_id, motivo, status, professor_resposta')
      .in('registro_id', registroIds)
      .eq('responsavel_id', user.id)
    for (const j of justificativas || []) {
      justificativaMap.set(j.registro_id, j)
    }
  }

  // Get turma IDs
  const turmaIds = Array.from(new Set(alunos.map((a: any) => a.turmas?.id).filter(Boolean)))

  // Get last aula content per turma
  const ultimaAulaMap = new Map<string, any>()
  if (turmaIds.length > 0) {
    for (const turmaId of turmaIds) {
      const { data: ultAula } = await admin
        .from('chamadas')
        .select('aulas!inner(conteudo_programatico, atividades_desenvolvidas, data, turma_id, disciplinas(nome))')
        .eq('aulas.turma_id', turmaId)
        .eq('status', 'concluida')
        .order('aulas.data', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (ultAula?.aulas) ultimaAulaMap.set(turmaId, ultAula.aulas)
    }
  }

  const resultado = alunos.map((aluno: any) => {
    const reg = registroMap.get(aluno.id) || null
    const turmaId = aluno.turmas?.id
    return {
      ...aluno,
      registro: reg,
      justificativa: reg ? (justificativaMap.get(reg.id) || null) : null,
      ultima_aula: turmaId ? (ultimaAulaMap.get(turmaId) || null) : null,
    }
  })

  return NextResponse.json({ alunos: resultado })
}
