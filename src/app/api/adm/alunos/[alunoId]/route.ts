import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: { alunoId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''
  if (!['secretaria', 'admin', 'diretor'].includes(perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { alunoId } = params

  const { isValidUUID } = await import('@/lib/validate')
  if (!isValidUUID(alunoId)) {
    return NextResponse.json({ error: 'alunoId inválido' }, { status: 400 })
  }

  const [
    { data: aluno },
    { data: vinculos },
    { data: registros },
    { data: alertas },
  ] = await Promise.all([
    admin.from('alunos')
      .select('*, turmas(nome, turno)')
      .eq('id', alunoId)
      .single(),

    admin.from('responsaveis_alunos')
      .select('responsavel_id, usuarios(nome, email)')
      .eq('aluno_id', alunoId),

    admin.from('registros_chamada')
      .select(`
        id, status, observacao, motivo_alteracao, horario_evento,
        chamadas(
          id, iniciada_em, concluida_em,
          aulas(data, horario_inicio, horario_fim, turmas(nome), disciplinas(nome), usuarios(nome))
        ),
        justificativas_falta(motivo, criada_em, usuarios!responsavel_id(nome))
      `)
      .eq('aluno_id', alunoId),

    admin.from('alertas')
      .select('id, tipo, mensagem, criado_em, lido')
      .eq('aluno_id', alunoId)
      .order('criado_em', { ascending: false }),
  ])

  if (!aluno) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

  const regs = registros || []
  const total = regs.length
  const presentes = regs.filter((r: any) => r.status === 'presente').length
  const faltas = regs.filter((r: any) => r.status === 'falta').length
  const justificadas = regs.filter((r: any) => r.status === 'justificada').length
  const frequencia = total > 0 ? Math.round(((presentes + justificadas) / total) * 100) : null

  const historico = regs.map((r: any) => ({
    id: r.id,
    status: r.status,
    observacao: r.observacao,
    motivo_alteracao: r.motivo_alteracao,
    horario_evento: r.horario_evento,
    data: r.chamadas?.aulas?.data,
    horario_inicio: r.chamadas?.aulas?.horario_inicio,
    horario_fim: r.chamadas?.aulas?.horario_fim,
    turma: r.chamadas?.aulas?.turmas?.nome,
    disciplina: r.chamadas?.aulas?.disciplinas?.nome,
    professor: r.chamadas?.aulas?.usuarios?.nome,
    justificativa: r.justificativas_falta?.[0] ? {
      motivo: r.justificativas_falta[0].motivo,
      criada_em: r.justificativas_falta[0].criada_em,
      responsavel: r.justificativas_falta[0].usuarios?.nome,
    } : null,
  })).sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''))

  return NextResponse.json({
    aluno: {
      ...aluno,
      turma_nome: aluno.turmas?.nome,
      turma_turno: aluno.turmas?.turno,
    },
    responsaveis: (vinculos || []).map((v: any) => ({
      id: v.responsavel_id,
      nome: v.usuarios?.nome,
      email: v.usuarios?.email,
    })),
    frequencia: { total, presentes, faltas, justificadas, pct: frequencia },
    historico,
    alertas: alertas || [],
  })
}
