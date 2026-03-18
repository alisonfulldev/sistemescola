import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { chamada_id } = await req.json()
    if (!chamada_id) return NextResponse.json({ ok: true })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Busca alunos presentes nesta chamada
    const { data: registros } = await supabase
      .from('registros_chamada')
      .select('aluno_id, alunos(nome_completo)')
      .eq('chamada_id', chamada_id)
      .eq('status', 'presente')

    if (!registros?.length) return NextResponse.json({ ok: true })

    // Busca nome da turma via chamada
    const { data: chamada } = await supabase
      .from('chamadas')
      .select('aulas(turmas(nome))')
      .eq('id', chamada_id)
      .single()

    const turmaNome = (chamada as any)?.aulas?.turmas?.nome || 'aula'

    const webpush = await import('web-push')
    webpush.default.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro ao notificar presença:', err)
    return NextResponse.json({ ok: true })
  }
}
