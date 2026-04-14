import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase.from('usuarios').select('perfil, escola_id, ativo').eq('id', user.id).single()
    const perfil = userData?.perfil || ''

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'chamadas_consultar', '/api/adm/chamadas', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
      await logger.logAudit(user.id, 'chamadas_consultar', '/api/adm/chamadas', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Isolar por escola para diretor/secretaria
    const escolaId: string | null = (perfil === 'admin') ? null : (userData?.escola_id || null)

    const data = req.nextUrl.searchParams.get('data') || new Date().toISOString().split('T')[0]
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1'))
    const limit = 15

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Se houver filtro por escola, obter turmas dessa escola primeiro
    let turmaIdsFilter: string[] = []
    if (escolaId) {
      const { data: turmasData } = await admin
        .from('turmas')
        .select('id')
        .eq('escola_id', escolaId)
      turmaIdsFilter = (turmasData || []).map(t => t.id)
    }

    // Buscar aulas da data, opcionalmente filtradas por turmas da escola
    let q = admin
      .from('aulas')
      .select('id, data, horario_inicio, horario_fim, turma_id, disciplina_id, professor_id')
      .eq('data', data)

    if (turmaIdsFilter.length > 0) {
      q = (q as any).in('turma_id', turmaIdsFilter)
    }

    q = q.order('horario_inicio')

    const { data: aulaData, error: aulaError } = await q

    if (aulaError) {
      console.error('AULAS QUERY ERROR:', aulaError)
      throw new Error(`Erro ao buscar aulas: ${aulaError.message}`)
    }

    if (!aulaData?.length) {
      return NextResponse.json({ chamadas: [], total: 0, pagina: page, limite: limit, total_paginas: 0 })
    }

    // Buscar dados das turmas, disciplinas e professores
    const turmaIds = [...new Set(aulaData.map((a: any) => a.turma_id))]
    const disciplinaIds = [...new Set(aulaData.map((a: any) => a.disciplina_id))]
    const professorIds = [...new Set(aulaData.map((a: any) => a.professor_id))]

    const [{ data: turmas }, { data: disciplinas }, { data: usuarios }] = await Promise.all([
      admin.from('turmas').select('id, nome, turno, escola_id').in('id', turmaIds),
      admin.from('disciplinas').select('id, nome').in('id', disciplinaIds),
      admin.from('usuarios').select('id, nome').in('id', professorIds),
    ])

    const turmaMap = new Map((turmas || []).map((t: any) => [t.id, t]))
    const disciplinaMap = new Map((disciplinas || []).map((d: any) => [d.id, d]))
    const usuarioMap = new Map((usuarios || []).map((u: any) => [u.id, u]))

    const aulas = aulaData.map((a: any) => ({
      ...a,
      turmas: turmaMap.get(a.turma_id),
      disciplinas: disciplinaMap.get(a.disciplina_id),
      usuarios: usuarioMap.get(a.professor_id),
    }))

    if (!aulas?.length) return NextResponse.json({ chamadas: [], total: 0, pagina: page, limite: limit, total_paginas: 0 })

    const aulaIds = aulas.map((a: any) => a.id)
    const aulaMap = new Map(aulas.map((a: any) => [a.id, a]))

    // Buscar total de chamadas (sem paginação para contar)
    const { count: totalChamadas } = await admin
      .from('chamadas')
      .select('id', { count: 'exact' })
      .in('aula_id', aulaIds)

    const { data: chamadas } = await admin
      .from('chamadas')
      .select('id, status, iniciada_em, concluida_em, aula_id, registros_chamada(id, status)')
      .in('aula_id', aulaIds)
      .order('iniciada_em', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const resultado = (chamadas || []).map((c: any) => ({
      ...c,
      aulas: aulaMap.get(c.aula_id),
    }))

    const totalPaginas = Math.ceil((totalChamadas || 0) / limit)

    await logger.logAudit(user.id, 'chamadas_consultar', '/api/adm/chamadas', { chamadas: resultado.length, pagina: page }, true)

    return NextResponse.json({ chamadas: resultado, total: totalChamadas || 0, pagina, limite: limit, total_paginas: totalPaginas })
  } catch (error) {
    const err = error as Error
    console.error('ERRO API CHAMADAS:', err.message, err.stack)
    await logger.logError('/api/adm/chamadas', err, user.id, { data, page, filtroData: data })
    return NextResponse.json({
      chamadas: [],
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}
