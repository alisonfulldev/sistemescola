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

    if (!usuario || !['cozinha', 'secretaria', 'admin'].includes(usuario.perfil)) {
      await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', {}, false)
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const hoje = new Date().toISOString().split('T')[0]

    // Busca IDs das chamadas de hoje
    const { data: chamadasHoje } = await admin
      .from('chamadas')
      .select('id, aulas!inner(data)')
      .eq('aulas.data', hoje)

    const chamadasIds = (chamadasHoje || []).map((c: any) => c.id)

    if (chamadasIds.length === 0) {
      const { count: totalAlunos } = await admin
        .from('alunos')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', { totalAlunos }, true)

      return NextResponse.json({
        totalPresentes: 0,
        totalAlunos: totalAlunos || 0,
        porTurno: {},
        atualizadoEm: new Date().toISOString(),
      })
    }

    // Busca registros das chamadas de hoje
    const { data: registrosHoje } = await admin
      .from('registros_chamada')
      .select('chamada_id, status, aluno_id')
      .in('chamada_id', chamadasIds)
      .in('status', ['presente', 'justificada'])

    // Busca turmas dos alunos
    const alunoIds = Array.from(new Set((registrosHoje || []).map((r: any) => r.aluno_id)))

    const { data: alunosData } = await admin
      .from('alunos')
      .select('id, turma_id, turmas!inner(nome, turno)')
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

    for (const r of registrosHoje || []) {
      const info = alunoMap[r.aluno_id]
      const turno = info?.turno || 'outro'
      const turma = info?.turma || '?'
      if (!porTurno[turno]) porTurno[turno] = { total: 0, turmas: {} }
      porTurno[turno].total++
      porTurno[turno].turmas[turma] = (porTurno[turno].turmas[turma] || 0) + 1
    }

    const totalPresentes = (registrosHoje || []).length

    const { count: totalAlunos } = await admin
      .from('alunos')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true)

    await logger.logAudit(user.id, 'presenca_cozinha_consultar', '/api/cozinha/presenca', {
      totalPresentes,
      totalAlunos
    }, true)

    return NextResponse.json({
      totalPresentes,
      totalAlunos: totalAlunos || 0,
      porTurno,
      atualizadoEm: new Date().toISOString(),
    })
  } catch (error) {
    await logger.logError('/api/cozinha/presenca', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar presença' }, { status: 500 })
  }
}
