import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { justificativa_id, status, professor_resposta } = await req.json()
    if (!justificativa_id || !['aprovada', 'rejeitada'].includes(status)) {
      await logger.logAudit(user.id, 'justificativa_responder', '/api/professor/justificativas/responder', {}, false)
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Valida que a justificativa é de uma chamada deste professor
    const { data: just } = await admin
      .from('justificativas_falta')
      .select('id, registro_id, responsavel_id, registros_chamada(chamada_id, chamadas(aulas(professor_id)))')
      .eq('id', justificativa_id)
      .single()

    if (!just) {
      await logger.logAudit(user.id, 'justificativa_responder', '/api/professor/justificativas/responder', { justificativa_id }, false)
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }
    if ((just as any).registros_chamada?.chamadas?.aulas?.professor_id !== user.id) {
      await logger.logAudit(user.id, 'justificativa_responder', '/api/professor/justificativas/responder', { justificativa_id }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Atualiza justificativa
    await admin.from('justificativas_falta').update({
      status,
      professor_resposta: professor_resposta?.trim() || null,
      respondida_em: new Date().toISOString(),
    }).eq('id', justificativa_id)

    // Se aprovada, muda o registro para 'justificada'
    if (status === 'aprovada') {
      await admin.from('registros_chamada').update({ status: 'justificada' }).eq('id', (just as any).registro_id)
    }

    // Notifica o responsável
    notificarResposta(admin, (just as any).responsavel_id, status).catch(() => {})

    await logger.logAudit(user.id, 'justificativa_responder', '/api/professor/justificativas/responder', { justificativa_id, status }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/professor/justificativas/responder', error, user.id)
    return NextResponse.json({ error: 'Erro ao responder justificativa' }, { status: 500 })
  }
}

async function notificarResposta(admin: any, responsavel_id: string, status: string) {
  const { data: subs } = await admin.from('push_subscriptions').select('subscription').eq('responsavel_id', responsavel_id)
  if (!subs?.length) return

  const webpush = await import('web-push')
  webpush.default.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    (process.env.VAPID_PRIVATE_KEY || '').trim()
  )

  const payload = JSON.stringify({
    title: status === 'aprovada' ? '✅ Justificativa aprovada' : '❌ Justificativa rejeitada',
    body: status === 'aprovada' ? 'A falta do seu filho foi justificada pelo professor.' : 'O professor não aprovou a justificativa da falta.',
    tag: `justificativa-resposta-${responsavel_id}`,
    url: '/responsavel',
  })

  await Promise.allSettled(subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload)))
}
