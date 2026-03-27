import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

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

    return NextResponse.json({
      ok: erros.length === 0,
      subscriptions: subs.length,
      vinculos: vinculos?.length || 0,
      vapid: vapidOk,
      erros: erros.length > 0 ? erros : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      erro: e.message,
      vapid: vapidOk,
      debug: {
        keyLength: pubKey.length,
        keyStart: pubKey.substring(0, 10),
        keyEnd: pubKey.substring(pubKey.length - 5),
        hasEquals: pubKey.includes('='),
        hasPlus: pubKey.includes('+'),
        hasSlash: pubKey.includes('/'),
      }
    })
  }
}
