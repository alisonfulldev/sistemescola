import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, subscription')
    .eq('responsavel_id', user.id)

  const { data: vinculos } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id, alunos(nome_completo)')
    .eq('responsavel_id', user.id)

  const vapidOk = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)

  if (!subs?.length) {
    return NextResponse.json({
      ok: false,
      erro: 'Nenhuma subscription salva. Clique em "Ativar notificações" no app.',
      vinculos: vinculos?.length || 0,
      vapid: vapidOk,
    })
  }

  const rawKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const pubKey = rawKey.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  // Tenta enviar notificação de teste
  try {
    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      pubKey,
      process.env.VAPID_PRIVATE_KEY!.trim()
    )

    const payload = JSON.stringify({
      title: '✅ Teste de notificação',
      body: 'Se você recebeu isso, as notificações estão funcionando!',
      tag: 'teste',
      url: '/responsavel',
    })

      const resultados = await Promise.allSettled(
        subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload))
      )

      const erros = resultados
        .filter(r => r.status === 'rejected')
        .map((r: any) => r.reason?.message || String(r.reason))

      await logger.logAudit(user.id, 'push_teste', '/api/responsavel/teste-push', {
        subscriptions: subs.length,
        erros: erros.length
      }, erros.length === 0)

      return NextResponse.json({
        ok: erros.length === 0,
        subscriptions: subs.length,
        vinculos: vinculos?.length || 0,
        vapid: vapidOk,
        erros: erros.length > 0 ? erros : undefined,
      })
    } catch (e: any) {
      await logger.logError('/api/responsavel/teste-push', e as Error, user.id)
      return NextResponse.json({
        ok: false,
        erro: e.message,
        vapid: vapidOk,
      })
    }
  } catch (error) {
    await logger.logError('/api/responsavel/teste-push', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao testar push' }, { status: 500 })
  }
}
