import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { UpdateAnoLetivoSchema } from '@/lib/schemas/crud'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ anoId: string }> }) {
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

    const { anoId } = await paramsPromise
    const db = admin()

    const { data: anoLetivo, error } = await db
      .from('anos_letivos')
      .select('*')
      .eq('id', anoId)
      .single()

    if (error || !anoLetivo) {
      return NextResponse.json({ error: 'Ano letivo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ ano_letivo: anoLetivo })
  } catch (error) {
    await logger.logError('/api/admin/anos-letivos/[anoId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar ano letivo' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params: paramsPromise }: { params: Promise<{ anoId: string }> }) {
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
      await logger.logAudit(user.id, 'anos_letivos_atualizar', '/api/admin/anos-letivos/[anoId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { anoId } = await paramsPromise
    const body = await req.json()
    const validation = validateData(UpdateAnoLetivoSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const db = admin()
    const { data: anoLetivo, error } = await db
      .from('anos_letivos')
      .update(validation.data as any)
      .eq('id', anoId)
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/anos-letivos/[anoId]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao atualizar ano letivo' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'anos_letivos_atualizar', '/api/admin/anos-letivos/[anoId]', { anoId }, true)

    return NextResponse.json({ ano_letivo: anoLetivo })
  } catch (error) {
    await logger.logError('/api/admin/anos-letivos/[anoId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao atualizar ano letivo' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ anoId: string }> }) {
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
      await logger.logAudit(user.id, 'anos_letivos_deletar', '/api/admin/anos-letivos/[anoId]', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { anoId } = await paramsPromise
    const db = admin()

    const { error } = await db.from('anos_letivos').update({ ativo: false }).eq('id', anoId)

    if (error) {
      await logger.logError('/api/admin/anos-letivos/[anoId]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao deletar ano letivo' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'anos_letivos_deletar', '/api/admin/anos-letivos/[anoId]', { anoId }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/anos-letivos/[anoId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao deletar ano letivo' }, { status: 500 })
  }
}
