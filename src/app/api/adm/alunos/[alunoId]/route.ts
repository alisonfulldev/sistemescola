import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ alunoId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    const perfil = userData?.perfil || ''
    if (!['secretaria', 'admin', 'diretor'].includes(perfil)) {
      await logger.logAudit(user.id, 'aluno_consultar', '/api/adm/alunos/[alunoId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { alunoId } = await paramsPromise

    const { isValidUUID } = await import('@/lib/validate')
    if (!isValidUUID(alunoId)) {
      await logger.logAudit(user.id, 'aluno_consultar', '/api/adm/alunos/[alunoId]', { alunoId }, false)
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

    if (!aluno) {
      await logger.logAudit(user.id, 'aluno_consultar', '/api/adm/alunos/[alunoId]', { alunoId }, false)
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    const regs = (registros || []).filter((r: any) => r?.chamadas?.aulas)  // Descartar registros incompletos
    const total = regs.length
    const presentes = regs.filter((r: any) => r.status === 'presente').length
    const faltas = regs.filter((r: any) => r.status === 'falta').length
    const justificadas = regs.filter((r: any) => r.status === 'justificada').length
    const frequencia = total > 0 ? Math.round(((presentes + justificadas) / total) * 100) : null

    const historico = regs.map((r: any) => {
      const aula = r.chamadas?.aulas
      const justif = r.justificativas_falta?.[0]
      return {
        id: r.id || null,
        status: r.status || null,
        observacao: r.observacao || null,
        motivo_alteracao: r.motivo_alteracao || null,
        horario_evento: r.horario_evento || null,
        data: aula?.data || null,
        horario_inicio: aula?.horario_inicio || null,
        horario_fim: aula?.horario_fim || null,
        turma: aula?.turmas?.nome || null,
        disciplina: aula?.disciplinas?.nome || null,
        professor: aula?.usuarios?.nome || null,
        justificativa: justif ? {
          motivo: justif.motivo || null,
          criada_em: justif.criada_em || null,
          responsavel: justif.usuarios?.nome || null,
        } : null,
      }
    }).sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''))

    await logger.logAudit(user.id, 'aluno_consultar', '/api/adm/alunos/[alunoId]', { alunoId }, true)

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
  } catch (error) {
    await logger.logError('/api/adm/alunos/[alunoId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar aluno' }, { status: 500 })
  }
}
