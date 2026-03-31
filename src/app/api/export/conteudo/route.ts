import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const turmaId = req.nextUrl.searchParams.get('turma_id')
  const disciplinaId = req.nextUrl.searchParams.get('disciplina_id')
  const bimestre = req.nextUrl.searchParams.get('bimestre') ? parseInt(req.nextUrl.searchParams.get('bimestre')!) : null

  if (!turmaId) {
    return NextResponse.json({ error: 'Parâmetro obrigatório: turma_id' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Montar query
    let aulasQuery = admin
      .from('aulas')
      .select(`
        id, data, horario_inicio, horario_fim, bimestre,
        conteudo_programatico, atividades_desenvolvidas,
        disciplinas(id, nome),
        usuarios(id, nome)
      `)
      .eq('turma_id', turmaId)

    if (disciplinaId) {
      aulasQuery = aulasQuery.eq('disciplina_id', disciplinaId)
    }

    if (bimestre) {
      aulasQuery = aulasQuery.eq('bimestre', bimestre)
    }

    const { data: aulas } = await aulasQuery.order('data').order('horario_inicio')

    if (!aulas?.length) {
      return NextResponse.json({
        aulas: [],
        total_aulas: 0,
        aulas_com_conteudo: 0,
        resumo_por_bimestre: {}
      })
    }

    // Agrupar por bimestre e contar
    const resumoPorBimestre: Record<number, { total: number; com_conteudo: number; com_atividades: number }> = {}

    for (const aula of aulas) {
      const bim = aula.bimestre || 0
      if (!resumoPorBimestre[bim]) {
        resumoPorBimestre[bim] = { total: 0, com_conteudo: 0, com_atividades: 0 }
      }
      resumoPorBimestre[bim].total++
      if (aula.conteudo_programatico) resumoPorBimestre[bim].com_conteudo++
      if (aula.atividades_desenvolvidas) resumoPorBimestre[bim].com_atividades++
    }

    // Calcular percentuais
    const resumoFormatado: Record<number, any> = {}
    for (const [bim, stats] of Object.entries(resumoPorBimestre)) {
      resumoFormatado[bim] = {
        total_aulas: stats.total,
        com_conteudo: stats.com_conteudo,
        percentual_conteudo: stats.total > 0 ? Math.round((stats.com_conteudo / stats.total) * 100) : 0,
        com_atividades: stats.com_atividades,
        percentual_atividades: stats.total > 0 ? Math.round((stats.com_atividades / stats.total) * 100) : 0
      }
    }

    return NextResponse.json({
      aulas: aulas.map(a => ({
        id: a.id,
        data: a.data,
        horario: `${a.horario_inicio} - ${a.horario_fim}`,
        bimestre: a.bimestre,
        disciplina: a.disciplinas?.nome,
        professor: a.usuarios?.nome,
        conteudo_programatico: a.conteudo_programatico || '(não informado)',
        atividades_desenvolvidas: a.atividades_desenvolvidas || '(não informado)'
      })),
      total_aulas: aulas.length,
      aulas_com_conteudo: aulas.filter(a => a.conteudo_programatico).length,
      aulas_com_atividades: aulas.filter(a => a.atividades_desenvolvidas).length,
      resumo_por_bimestre: resumoFormatado
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
