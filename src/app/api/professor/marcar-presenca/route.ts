import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { chamada_id, aluno_id, status, observacao } = await req.json()
  if (!chamada_id || !aluno_id || !status) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Valida que a chamada pertence a uma aula deste professor
  const { data: chamada } = await admin
    .from('chamadas')
    .select('id, aulas(professor_id, turmas(nome))')
    .eq('id', chamada_id)
    .single()

  if (!chamada || (chamada as any).aulas?.professor_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { error } = await admin
    .from('registros_chamada')
    .upsert({
      chamada_id,
      aluno_id,
      status,
      observacao: observacao || null,
      registrado_em: new Date().toISOString(),
    }, { onConflict: 'chamada_id,aluno_id' })

  if (error) {
    console.error('Erro ao marcar presença:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notifica responsáveis quando é falta
  if (status === 'falta') {
    notificarFalta(admin, chamada_id, aluno_id, (chamada as any).aulas?.turmas?.nome || 'aula').catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

async function notificarFalta(admin: any, chamada_id: string, aluno_id: string, turmaNome: string) {
  const { data: aluno } = await admin.from('alunos').select('nome_completo').eq('id', aluno_id).single()
  const { data: vinculos } = await admin.from('responsaveis_alunos').select('responsavel_id').eq('aluno_id', aluno_id)
  if (!vinculos?.length) return

  const responsavelIds = vinculos.map((v: any) => v.responsavel_id)
  const { data: subs } = await admin.from('push_subscriptions').select('subscription').in('responsavel_id', responsavelIds)
  if (!subs?.length) return

  const webpush = await import('web-push')
  webpush.default.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const payload = JSON.stringify({
    title: '❌ Falta registrada',
    body: `${aluno?.nome_completo} teve falta registrada em ${turmaNome}`,
    tag: `falta-${aluno_id}-${chamada_id}`,
    url: '/responsavel',
  })

  await Promise.allSettled(subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload)))
}
