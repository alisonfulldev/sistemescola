import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const NotificarPresencaSchema = z.object({
  chamada_id: z.string().uuid('chamada_id deve ser UUID válido')
})

export async function POST(req: NextRequest) {
  let user: any = null
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    user = authUser

    const validation = NotificarPresencaSchema.safeParse(await req.json())
    if (!validation.success) return NextResponse.json({ error: 'chamada_id inválido' }, { status: 400 })

    const { chamada_id } = validation.data as any

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Valida que a chamada pertence a uma aula deste professor
    const { data: chamada } = await supabase
      .from('chamadas')
      .select('aulas(professor_id, turmas(nome))')
      .eq('id', chamada_id)
      .maybeSingle()

    if (!chamada || (chamada as any).aulas?.professor_id !== user.id) {
      await logger.logAudit(user.id, 'presenca_notificar', '/api/professor/notificar-presenca', { chamada_id }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const turmaNome = (chamada as any).aulas?.turmas?.nome || 'aula'

    // Busca alunos presentes nesta chamada
    const { data: registros } = await supabase
      .from('registros_chamada')
      .select('aluno_id, alunos(nome_completo)')
      .eq('chamada_id', chamada_id)
      .eq('status', 'presente')

    if (!registros?.length) return NextResponse.json({ ok: true })

    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
      process.env.VAPID_PRIVATE_KEY!
    )

    // Para cada aluno presente, notifica os responsáveis
    await Promise.allSettled(
      registros.map(async (reg: any) => {
        const { data: vinculos } = await supabase
          .from('responsaveis_alunos')
          .select('responsavel_id')
          .eq('aluno_id', reg.aluno_id)

        if (!vinculos?.length) return

        const responsavelIds = vinculos.map((v: any) => v.responsavel_id)
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .in('responsavel_id', responsavelIds)

        if (!subs?.length) return

        const payload = JSON.stringify({
          title: '✅ Presença confirmada',
          body: `${reg.alunos?.nome_completo} está presente na ${turmaNome}`,
          tag: `presenca-${reg.aluno_id}-${chamada_id}`,
          url: '/responsavel',
        })

        await Promise.allSettled(
          subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload))
        )
      })
    )

    await logger.logAudit(user.id, 'presenca_notificar', '/api/professor/notificar-presenca', { chamada_id }, true)
    return NextResponse.json({ ok: true })
  } catch (err) {
    await logger.logError('/api/professor/notificar-presenca', err as Error, user.id)
    return NextResponse.json({ ok: true })
  }
}
