import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateAvaliacaoSchema } from '@/lib/schemas/avaliacoes'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const turmaId = req.nextUrl.searchParams.get('turma_id')
  const disciplinaId = req.nextUrl.searchParams.get('disciplina_id')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    let query = admin
      .from('avaliacoes')
      .select(`
        id, titulo, tipo, data_aplicacao, data_entrega, valor_maximo, peso, ativo,
        disciplinas(nome),
        aulas(horario_inicio)
      `)
      .eq('ativo', true)

    if (turmaId) {
      query = query.eq('turma_id', turmaId)
    }

    if (disciplinaId) {
      query = query.eq('disciplina_id', disciplinaId)
    }

    const { data: avaliacoes, error } = await query.order('data_aplicacao', { ascending: false })

    if (error) {
      await logger.logError('/api/avaliacoes', error, user.id, { turmaId, disciplinaId })
      return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
    }

    return NextResponse.json({ avaliacoes: avaliacoes || [] })
  } catch (error) {
    await logger.logError('/api/avaliacoes', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()

  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    await logger.logAudit(user.id, 'avaliacao_criar', '/api/avaliacoes', {}, false)
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const validation = validateData(CreateAvaliacaoSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { aula_id, disciplina_id, turma_id, titulo, tipo, data_aplicacao, data_entrega, valor_maximo, peso } = validation.data

  // Se for professor, validar que é sua aula
  if (userData?.perfil === 'professor') {
    const { data: aula } = await supabase.from('aulas').select('professor_id').eq('id', aula_id).single()
    if (aula?.professor_id !== user.id) {
      await logger.logAudit(user.id, 'avaliacao_criar', '/api/avaliacoes', { aula_id }, false)
      return NextResponse.json({ error: 'Você só pode criar avaliações em suas aulas' }, { status: 403 })
    }
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Usar RPC atômica para criar avaliação + registros de nota em uma transação
    // Evita estado inconsistente se server falhar no meio
    const { data: avaliacao_id, error: rpcError } = await admin
      .rpc('criar_avaliacao_completa', {
        p_aula_id: aula_id,
        p_disciplina_id: disciplina_id,
        p_turma_id: turma_id,
        p_titulo: titulo,
        p_tipo: tipo,
        p_data_aplicacao: data_aplicacao,
        p_data_entrega: data_entrega || null,
        p_valor_maximo: valor_maximo || 10,
        p_peso: peso || 1,
      })

    if (rpcError || !avaliacao_id) {
      await logger.logError('/api/avaliacoes', rpcError || new Error('RPC retornou null'), user.id, { titulo, turma_id, tipo })
      return NextResponse.json({ error: 'Erro ao criar avaliação' }, { status: 500 })
    }

    // Buscar a avaliação criada para retornar
    const { data: novaAvaliacao } = await admin
      .from('avaliacoes')
      .select()
      .eq('id', avaliacao_id)
      .single()

    // Buscar contagem de alunos para log
    const { count: alunosCount } = await admin
      .from('alunos')
      .select('id', { count: 'exact' })
      .eq('turma_id', turma_id)
      .eq('situacao', 'ativo')

    await logger.logAudit(user.id, 'avaliacao_criar', '/api/avaliacoes', {
      avaliacao_id,
      titulo,
      turma_id,
      tipo,
      alunos: alunosCount || 0,
      metodo: 'rpc_atomica'
    }, true)

    return NextResponse.json({ avaliacao: novaAvaliacao }, { status: 201 })
  } catch (error) {
    await logger.logError('/api/avaliacoes', error, user.id)
    return NextResponse.json({ error: 'Erro interno ao criar avaliação' }, { status: 500 })
  }
}
