import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateJustificativaSchema } from '@/lib/schemas/justificativas'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''

  const alunoId = req.nextUrl.searchParams.get('aluno_id')
  const status = req.nextUrl.searchParams.get('status') // 'pendente', 'aprovada', 'rejeitada'

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    let query = admin
      .from('justificativas')
      .select(`
        id, aluno_id, data_falta, motivo, descricao_detalhada,
        status, documento_url, enviado_em, aprovado_em,
        alunos(nome_completo, matricula, turmas(nome)),
        usuarios:enviado_por(nome),
        usuarios:aprovado_por(nome)
      `)

    // Filtros baseado em perfil e parâmetros
    if (perfil === 'responsavel') {
      // Responsável vê apenas as justificativas de seus filhos
      const { data: minhaFamilias } = await supabase
        .from('responsaveis_alunos')
        .select('aluno_id')
        .eq('responsavel_id', user.id)

      const meusFilhos = minhaFamilias?.map(f => f.aluno_id) || []
      query = query.in('aluno_id', meusFilhos.length > 0 ? meusFilhos : [''])
    } else if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (alunoId) {
      query = query.eq('aluno_id', alunoId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: justificativas, error } = await query.order('data_falta', { ascending: false })

    if (error) {
      await logger.logError('/api/justificativas', error, user.id, { alunoId, status })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ justificativas: justificativas || [] })
  } catch (error) {
    await logger.logError('/api/justificativas', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar justificativas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(CreateJustificativaSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { aluno_id, data_falta, motivo, descricao_detalhada, documento_url, tipo_documento } = validation.data

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''

  // Responsável só pode enviar para seus filhos
  if (perfil === 'responsavel') {
    const { data: filhos } = await supabase
      .from('responsaveis_alunos')
      .select('aluno_id')
      .eq('responsavel_id', user.id)

    const meusFilhos = filhos?.map(f => f.aluno_id) || []
    if (!meusFilhos.includes(aluno_id)) {
      await logger.logAudit(user.id, 'justificativa_criar', '/api/justificativas', { aluno_id }, false)
      return NextResponse.json({ error: 'Sem permissão para justificar este aluno' }, { status: 403 })
    }
  } else if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
    await logger.logAudit(user.id, 'justificativa_criar', '/api/justificativas', {}, false)
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { error } = await admin
      .from('justificativas')
      .upsert(
        {
          aluno_id,
          data_falta,
          motivo,
          descricao_detalhada,
          documento_url,
          tipo_documento,
          enviado_por: user.id,
          enviado_em: new Date().toISOString()
        },
        { onConflict: 'aluno_id,data_falta' }
      )

    if (error) {
      await logger.logError('/api/justificativas', error, user.id, { aluno_id })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logger.logAudit(user.id, 'justificativa_criar', '/api/justificativas', { aluno_id, data_falta, motivo }, true)

    return NextResponse.json({ ok: true, message: 'Justificativa enviada com sucesso' }, { status: 201 })
  } catch (error) {
    await logger.logError('/api/justificativas', error, user.id)
    return NextResponse.json({ error: 'Erro ao criar justificativa' }, { status: 500 })
  }
}
