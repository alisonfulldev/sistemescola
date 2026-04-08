import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { UpdateAlunoSchema } from '@/lib/schemas/crud'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ alunoId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'alunos_atualizar', '/api/admin/alunos/[alunoId]', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'alunos_atualizar', '/api/admin/alunos/[alunoId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { alunoId } = await paramsPromise
    const body = await req.json()
    const validation = validateData(UpdateAlunoSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const db = admin()
    const { data: aluno, error } = await db
      .from('alunos')
      .update(validation.data)
      .eq('id', alunoId)
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/alunos/[alunoId]', error, user.id)
      return NextResponse.json({ error: 'Erro ao atualizar aluno' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'alunos_atualizar', '/api/admin/alunos/[alunoId]', { alunoId }, true)

    return NextResponse.json({ aluno })
  } catch (error) {
    await logger.logError('/api/admin/alunos/[alunoId]', error, user.id)
    return NextResponse.json({ error: 'Erro ao atualizar aluno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ alunoId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'alunos_deletar', '/api/admin/alunos/[alunoId]', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'alunos_deletar', '/api/admin/alunos/[alunoId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { alunoId } = await paramsPromise
    const db = admin()

    // Soft delete: marcar como inativo
    const { error } = await db.from('alunos').update({ situacao: 'inativo' }).eq('id', alunoId)

    if (error) {
      await logger.logError('/api/admin/alunos/[alunoId]', error, user.id)
      return NextResponse.json({ error: 'Erro ao deletar aluno' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'alunos_deletar', '/api/admin/alunos/[alunoId]', { alunoId }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/alunos/[alunoId]', error, user.id)
    return NextResponse.json({ error: 'Erro ao deletar aluno' }, { status: 500 })
  }
}
