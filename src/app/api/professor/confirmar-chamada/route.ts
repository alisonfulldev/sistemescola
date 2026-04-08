import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { ConfirmarChamadaSchema } from '@/lib/schemas/chamada'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(ConfirmarChamadaSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { chamada_id } = validation.data as any

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Valida que a chamada pertence a uma aula deste professor
    const { data: chamada } = await admin
      .from('chamadas')
      .select('id, status, aulas(professor_id)')
      .eq('id', chamada_id)
      .single()

    if (!chamada || (chamada as any).aulas?.professor_id !== user.id) {
      await logger.logAudit(user.id, 'chamada_confirmar', '/api/professor/confirmar-chamada', { chamada_id }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // IDEMPOTÊNCIA: Se já está concluída, retorna OK sem fazer nada
    if (chamada.status === 'concluida') {
      await logger.logAudit(user.id, 'chamada_confirmar', '/api/professor/confirmar-chamada', { chamada_id, ja_concluida: true }, true)
      return NextResponse.json({ ok: true, already_completed: true })
    }

    // Atualizar para concluída
    const { error } = await admin
      .from('chamadas')
      .update({ status: 'concluida', concluida_em: new Date().toISOString() })
      .eq('id', chamada_id)

    if (error) {
      await logger.logError('/api/professor/confirmar-chamada', error as Error, user.id, { chamada_id })
      return NextResponse.json({ error: 'Erro ao confirmar chamada' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'chamada_confirmar', '/api/professor/confirmar-chamada', { chamada_id }, true)

    // Enviar notificações com timeout seguro (sem fire-and-forget)
    // Usar AbortController para timeout de 5s
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      await fetch(`${req.nextUrl.origin}/api/professor/notificar-presenca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
        body: JSON.stringify({ chamada_id }),
        signal: controller.signal,
      })
    } catch (notificacaoError) {
      // Log falha de notificação mas não falha a confirmação
      await logger.logError('/api/professor/confirmar-chamada', notificacaoError as Error, user.id, { chamada_id, erro: 'notificacao_falhou' })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    await logger.logError('/api/professor/confirmar-chamada', error as Error, user.id, { chamada_id })
    return NextResponse.json({ error: 'Erro ao confirmar chamada' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
