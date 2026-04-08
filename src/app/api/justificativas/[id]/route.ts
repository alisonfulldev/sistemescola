import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
      await logger.logAudit(user.id, 'justificativa_atualizar', '/api/justificativas/[id]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id } = await paramsPromise
    const { status, observacao_aprovacao } = await req.json()

    if (!status || !['aprovada', 'rejeitada'].includes(status)) {
      await logger.logAudit(user.id, 'justificativa_atualizar', '/api/justificativas/[id]', {}, false)
      return NextResponse.json({ error: 'Status inválido. Deve ser: aprovada ou rejeitada' }, { status: 400 })
    }

    if (!id) {
      await logger.logAudit(user.id, 'justificativa_atualizar', '/api/justificativas/[id]', {}, false)
      return NextResponse.json({ error: 'ID da justificativa não fornecido' }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await admin
      .from('justificativas')
      .update({
        status,
        aprovado_em: new Date().toISOString(),
        aprovado_por: user.id,
        observacao_aprovacao,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      await logger.logError('/api/justificativas/[id]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao atualizar justificativa' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'justificativa_atualizar', '/api/justificativas/[id]', { id, status }, true)

    return NextResponse.json({
      ok: true,
      message: `Justificativa ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} com sucesso`
    })
  } catch (error) {
    await logger.logError('/api/justificativas/[id]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao atualizar justificativa' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
      await logger.logAudit(user.id, 'justificativa_consultar', '/api/justificativas/[id]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { id } = await paramsPromise

    const { data: justificativa, error } = await admin
      .from('justificativas')
      .select(`
        *,
        alunos(nome_completo, matricula, turmas(nome)),
        usuarios:enviado_por(nome),
        usuarios:aprovado_por(nome)
      `)
      .eq('id', id)
      .single()

    if (error || !justificativa) {
      await logger.logAudit(user.id, 'justificativa_consultar', '/api/justificativas/[id]', { id }, false)
      return NextResponse.json({ error: 'Justificativa não encontrada' }, { status: 404 })
    }

    await logger.logAudit(user.id, 'justificativa_consultar', '/api/justificativas/[id]', { id }, true)

    return NextResponse.json({ justificativa })
  } catch (error) {
    await logger.logError('/api/justificativas/[id]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar justificativa' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
      await logger.logAudit(user.id, 'justificativa_deletar', '/api/justificativas/[id]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { id } = await paramsPromise

    const { error } = await admin
      .from('justificativas')
      .delete()
      .eq('id', id)

    if (error) {
      await logger.logError('/api/justificativas/[id]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao deletar justificativa' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'justificativa_deletar', '/api/justificativas/[id]', { id }, true)

    return NextResponse.json({ ok: true, message: 'Justificativa removida com sucesso' })
  } catch (error) {
    await logger.logError('/api/justificativas/[id]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao deletar justificativa' }, { status: 500 })
  }
}
