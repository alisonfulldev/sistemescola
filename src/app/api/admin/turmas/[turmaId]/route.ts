import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { UpdateTurmaSchema } from '@/lib/schemas/crud'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ turmaId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, escola_id, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { turmaId } = await paramsPromise
    const db = admin()

    const { data: turma, error } = await db
      .from('turmas')
      .select('*')
      .eq('id', turmaId)
      .single()

    if (error || !turma) {
      return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
    }

    // Diretor/secretaria só pode ver sua escola
    if (userData.perfil !== 'admin' && turma.escola_id !== userData.escola_id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    return NextResponse.json({ turma })
  } catch (error) {
    await logger.logError('/api/admin/turmas/[turmaId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar turma' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ turmaId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, escola_id, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'turmas_atualizar', '/api/admin/turmas/[turmaId]', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'turmas_atualizar', '/api/admin/turmas/[turmaId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { turmaId } = await paramsPromise
    const body = await req.json()
    const validation = validateData(UpdateTurmaSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const db = admin()

    // Verificar se turma existe e se usuário tem permissão
    const { data: turma } = await db.from('turmas').select('escola_id').eq('id', turmaId).single()
    if (!turma) {
      return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
    }

    if (userData.perfil !== 'admin' && turma.escola_id !== userData.escola_id) {
      await logger.logAudit(user.id, 'turmas_atualizar', '/api/admin/turmas/[turmaId]', { turmaId }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { data: updated, error } = await db
      .from('turmas')
      .update(validation.data as any)
      .eq('id', turmaId)
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/turmas/[turmaId]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao atualizar turma' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'turmas_atualizar', '/api/admin/turmas/[turmaId]', { turmaId }, true)

    return NextResponse.json({ turma: updated })
  } catch (error) {
    await logger.logError('/api/admin/turmas/[turmaId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao atualizar turma' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ turmaId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, escola_id, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'turmas_deletar', '/api/admin/turmas/[turmaId]', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'turmas_deletar', '/api/admin/turmas/[turmaId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { turmaId } = await paramsPromise
    const db = admin()

    // Soft delete: marcar como inativo
    const { data: turma } = await db.from('turmas').select('escola_id').eq('id', turmaId).single()
    if (!turma) {
      return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
    }

    if (userData.perfil !== 'admin' && turma.escola_id !== userData.escola_id) {
      await logger.logAudit(user.id, 'turmas_deletar', '/api/admin/turmas/[turmaId]', { turmaId }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { error } = await db.from('turmas').update({ ativo: false }).eq('id', turmaId)

    if (error) {
      await logger.logError('/api/admin/turmas/[turmaId]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao deletar turma' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'turmas_deletar', '/api/admin/turmas/[turmaId]', { turmaId }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/turmas/[turmaId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao deletar turma' }, { status: 500 })
  }
}
