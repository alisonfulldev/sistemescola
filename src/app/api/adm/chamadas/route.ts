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

    let q = admin
      .from('aulas')
      .select('id, data, horario_inicio, horario_fim, turmas!inner(nome, turno, escola_id), disciplinas(nome), usuarios(nome)')
      .eq('data', data)
      .order('horario_inicio')
    if (escolaId) q = (q as any).eq('turmas.escola_id', escolaId)

    const { data: aulas } = await q

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

    return NextResponse.json({ chamadas: resultado, total: totalChamadas || 0, pagina: page, limite: limit, total_paginas: totalPaginas })
  } catch (error) {
    const err = error as Error
    console.error('ERRO API CHAMADAS:', err.message, err.stack)
    await logger.logError('/api/adm/chamadas', err, user.id)
    return NextResponse.json({
      chamadas: [],
      error: err.message,
      stack: err.stack
    }, { status: 500 })
  }
}
