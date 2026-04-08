import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { UpdateDisciplinaSchema } from '@/lib/schemas/crud'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ disciplinaId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo || !['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { disciplinaId } = await paramsPromise
    const db = admin()

    const { data: disciplina, error } = await db
      .from('disciplinas')
      .select('*')
      .eq('id', disciplinaId)
      .single()

    if (error || !disciplina) {
      return NextResponse.json({ error: 'Disciplina não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ disciplina })
  } catch (error) {
    await logger.logError('/api/admin/disciplinas/[disciplinaId]', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar disciplina' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ disciplinaId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo || !['admin', 'secretaria', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'disciplinas_atualizar', '/api/admin/disciplinas/[disciplinaId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { disciplinaId } = await paramsPromise
    const body = await req.json()
    const validation = validateData(UpdateDisciplinaSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const db = admin()
    const { data: disciplina, error } = await db
      .from('disciplinas')
      .update(validation.data)
      .eq('id', disciplinaId)
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/disciplinas/[disciplinaId]', error, user.id)
      return NextResponse.json({ error: 'Erro ao atualizar disciplina' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'disciplinas_atualizar', '/api/admin/disciplinas/[disciplinaId]', { disciplinaId }, true)

    return NextResponse.json({ disciplina })
  } catch (error) {
    await logger.logError('/api/admin/disciplinas/[disciplinaId]', error, user.id)
    return NextResponse.json({ error: 'Erro ao atualizar disciplina' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ disciplinaId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo || !['admin', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'disciplinas_deletar', '/api/admin/disciplinas/[disciplinaId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { disciplinaId } = await paramsPromise
    const db = admin()

    const { error } = await db.from('disciplinas').update({ ativo: false }).eq('id', disciplinaId)

    if (error) {
      await logger.logError('/api/admin/disciplinas/[disciplinaId]', error, user.id)
      return NextResponse.json({ error: 'Erro ao deletar disciplina' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'disciplinas_deletar', '/api/admin/disciplinas/[disciplinaId]', { disciplinaId }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/disciplinas/[disciplinaId]', error, user.id)
    return NextResponse.json({ error: 'Erro ao deletar disciplina' }, { status: 500 })
  }
}
