import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const SubscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint deve ser URL válida'),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }).optional(),
  expirationTime: z.any().optional()
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const subscription = await req.json()
    const validation = SubscribePushSchema.safeParse(subscription)
    if (!validation.success) {
      await logger.logAudit(user.id, 'push_subscribe', '/api/push/subscribe', {}, false)
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 })
    }

    const { createClient: createAdmin } = await import('@supabase/supabase-js')
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await admin.from('push_subscriptions').upsert({
      responsavel_id: user.id,
      endpoint: validation.data.endpoint,
      subscription: validation.data,
    }, { onConflict: 'responsavel_id,endpoint' })

    if (error) {
      await logger.logError('/api/push/subscribe', error, user.id)
      return NextResponse.json({ error: 'Erro ao salvar subscription' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'push_subscribe', '/api/push/subscribe', { endpoint: validation.data.endpoint }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/push/subscribe', error, user.id)
    return NextResponse.json({ error: 'Erro ao subscrever push' }, { status: 500 })
  }
}
