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

    const { data: usuario } = await admin
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!usuario?.ativo) {
      await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['cozinha', 'secretaria', 'admin'].includes(usuario.perfil)) {
      await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', {}, false)
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Data de hoje no fuso horário do Brasil
    const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      .split('/').reverse().join('-')

    const { count: totalAlunos } = await admin
      .from('alunos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    // Busca todas as chamadas CONCLUÍDAS de hoje, ordenadas da mais recente para a mais antiga
    const { data: chamadasConcluidas } = await admin
      .from('chamadas')
      .select('id, concluida_em, aulas!inner(data, turma_id)')
      .eq('aulas.data', hoje)
      .eq('status', 'concluida')
      .order('concluida_em', { ascending: false })

    if (!chamadasConcluidas?.length) {
      await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', { totalAlunos }, true)
      return NextResponse.json({
        totalPresentes: 0,
        totalAlunos: totalAlunos || 0,
        porTurno: {},
        atualizadoEm: new Date().toISOString(),
      })
    }

    // Por turma, mantém apenas a chamada mais recente (a lista já está ordenada desc)
    const chamadaRecentePorTurma: Record<string, string> = {}
    for (const c of chamadasConcluidas) {
      const turmaId = (c.aulas as any)?.turma_id
      if (turmaId && !chamadaRecentePorTurma[turmaId]) {
        chamadaRecentePorTurma[turmaId] = c.id
      }
    }

    const chamadaIds = Object.values(chamadaRecentePorTurma)

    // Busca apenas os presentes (não justificada, pois aluno ausente não vai comer)
    const { data: registros } = await admin
      .from('registros_chamada')
      .select('aluno_id')
      .in('chamada_id', chamadaIds)
      .eq('status', 'presente')

    if (!registros?.length) {
      await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', { totalAlunos, totalPresentes: 0 }, true)
      return NextResponse.json({
        totalPresentes: 0,
        totalAlunos: totalAlunos || 0,
        porTurno: {},
        atualizadoEm: new Date().toISOString(),
      })
    }

    // Busca turma e turno de cada aluno presente
    const alunoIds = [...new Set(registros.map((r: any) => r.aluno_id))]

    const { data: alunosData } = await admin
      .from('alunos')
      .select('id, turmas!inner(nome, turno)')
      .in('id', alunoIds)

    const alunoMap: Record<string, { turma: string; turno: string }> = {}
    for (const a of alunosData || []) {
      const turmas = a.turmas as any
      alunoMap[a.id] = {
        turma: turmas?.nome || '?',
        turno: turmas?.turno || 'outro',
      }
    }

    // Agrupa por turno e turma
    const porTurno: Record<string, { total: number; turmas: Record<string, number> }> = {}

    for (const r of registros) {
      const info = alunoMap[(r as any).aluno_id]
      if (!info) continue
      const { turno, turma } = info
      if (!porTurno[turno]) porTurno[turno] = { total: 0, turmas: {} }
      porTurno[turno].total++
      porTurno[turno].turmas[turma] = (porTurno[turno].turmas[turma] || 0) + 1
    }

    const totalPresentes = registros.length

    await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', {
      totalPresentes,
      totalAlunos,
      turmasComChamada: chamadaIds.length,
    }, true)

    return NextResponse.json({
      totalPresentes,
      totalAlunos: totalAlunos || 0,
      porTurno,
      atualizadoEm: new Date().toISOString(),
    })
  } catch (error) {
    await logger.logError('/api/cozinha/presenca', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar presença' }, { status: 500 })
  }
}
