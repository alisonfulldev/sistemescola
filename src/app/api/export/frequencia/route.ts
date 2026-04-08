import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
      await logger.logAudit(user.id, 'exportar_frequencia', '/api/export/frequencia', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

  const turmaId = req.nextUrl.searchParams.get('turma_id')
  const bimestre = req.nextUrl.searchParams.get('bimestre') ? parseInt(req.nextUrl.searchParams.get('bimestre')!) : null
  const anoLetivoId = req.nextUrl.searchParams.get('ano_letivo_id')

  if (!turmaId || !anoLetivoId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: turma_id, ano_letivo_id' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Alunos da turma
    const { data: alunos } = await admin
      .from('alunos')
      .select('id, nome_completo, numero_chamada, matricula')
      .eq('turma_id', turmaId)
      .eq('ativo', true)
      .order('numero_chamada', { nullsFirst: false })
      .order('nome_completo')

    if (!alunos?.length) return NextResponse.json({ aulas: [], alunos: [], frequencia: {} })

    const alunoIds = alunos.map(a => a.id)

    // 2. Aulas do período
    let aulaQuery = admin
      .from('aulas')
      .select('id, data, disciplinas(nome)')
      .eq('turma_id', turmaId)

    if (bimestre) {
      aulaQuery = aulaQuery.eq('bimestre', bimestre)
    }

    const { data: aulasData } = await aulaQuery.order('data')

    if (!aulasData?.length) {
      return NextResponse.json({
        aulas: [],
        alunos,
        frequencia: {},
        resumo: {
          total_aulas: 0,
          presentes_media: 0,
          faltas_media: 0,
          justificadas_media: 0
        }
      })
    }

    const aulaIds = aulasData.map(a => a.id)

    // 3. Chamadas concluídas
    const { data: chamadas } = await admin
      .from('chamadas')
      .select('id, aula_id')
      .in('aula_id', aulaIds)
      .eq('status', 'concluida')

    const chamadaIds = chamadas?.map(c => c.id) || []

    // 4. Registros de frequência
    const { data: registros } = await admin
      .from('registros_chamada')
      .select('chamada_id, aluno_id, status')
      .in('chamada_id', chamadaIds)

    // Montar grid: aluno × aula
    const frequenciaGrid: Record<string, Record<string, string | null>> = {}
    const resumoPorAluno: Record<string, { presentes: number; faltas: number; justificadas: number }> = {}

    for (const aluno of alunos) {
      frequenciaGrid[aluno.id] = {}
      resumoPorAluno[aluno.id] = { presentes: 0, faltas: 0, justificadas: 0 }

      // Preencher todas as aulas com null (para anotar depois)
      for (const aula of aulasData) {
        frequenciaGrid[aluno.id][aula.id] = null
      }
    }

    // Preenc her com dados reais
    for (const reg of registros || []) {
      const aulasParaChamada = chamadas?.find(c => c.id === reg.chamada_id)?.aula_id
      if (aulasParaChamada && frequenciaGrid[reg.aluno_id]) {
        frequenciaGrid[reg.aluno_id][aulasParaChamada] = reg.status
        resumoPorAluno[reg.aluno_id][
          reg.status === 'presente' ? 'presentes' :
          reg.status === 'falta' ? 'faltas' : 'justificadas'
        ]++
      }
    }

    // Calcular médias
    let totalPresentes = 0, totalFaltas = 0, totalJustificadas = 0
    for (const aluno of alunos) {
      const resumo = resumoPorAluno[aluno.id]
      totalPresentes += resumo.presentes
      totalFaltas += resumo.faltas
      totalJustificadas += resumo.justificadas
    }

    const totalRegistros = totalPresentes + totalFaltas + totalJustificadas
    const mediaPresentes = alunos.length > 0 ? totalPresentes / alunos.length : 0
    const mediaFaltas = alunos.length > 0 ? totalFaltas / alunos.length : 0
    const mediaJustificadas = alunos.length > 0 ? totalJustificadas / alunos.length : 0

    await logger.logAudit(user.id, 'exportar_frequencia', '/api/export/frequencia', {
      turma_id: turmaId,
      total_aulas: aulasData.length,
      total_alunos: alunos.length
    }, true)

    return NextResponse.json({
      aulas: aulasData,
      alunos,
      frequencia: frequenciaGrid,
      resumo_por_aluno: resumoPorAluno,
      resumo_geral: {
        total_aulas: aulasData.length,
        total_alunos: alunos.length,
        total_registros: totalRegistros,
        presentes_total: totalPresentes,
        faltas_total: totalFaltas,
        justificadas_total: totalJustificadas,
        presentes_media: Math.round(mediaPresentes),
        faltas_media: Math.round(mediaFaltas),
        justificadas_media: Math.round(mediaJustificadas)
      }
    })
  } catch (error) {
    await logger.logError('/api/export/frequencia', error, user.id)
    return NextResponse.json({ error: 'Erro ao exportar frequência' }, { status: 500 })
  }
}
