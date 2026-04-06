import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { chamada_id, aluno_id, status, observacao, motivo_alteracao, horario_evento, status_anterior, chamada_concluida } = await req.json()
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

  const upsertData: any = {
    chamada_id,
    aluno_id,
    status,
    observacao: observacao || null,
    registrado_em: new Date().toISOString(),
  }

  const { error } = await admin
    .from('registros_chamada')
    .upsert(upsertData, { onConflict: 'chamada_id,aluno_id' })

  if (error) {
    console.error('Erro ao marcar presença:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Campos de alteração: UPDATE separado para não interferir no upsert base
  if (chamada_concluida && motivo_alteracao) {
    const { error: updateError } = await admin
      .from('registros_chamada')
      .update({ motivo_alteracao, horario_evento: horario_evento || null })
      .eq('chamada_id', chamada_id)
      .eq('aluno_id', aluno_id)
    if (updateError) {
      console.error('Erro ao salvar motivo/horario:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  const turmaNome = (chamada as any).aulas?.turmas?.nome || 'aula'

  // Notifica quando é chamada nova com falta
  if (!chamada_concluida && status === 'falta') {
    notificarFalta(admin, chamada_id, aluno_id, turmaNome).catch(() => {})
  }

  // Notifica quando é EDIÇÃO (chamada concluída) e houve mudança de status
  if (chamada_concluida && status_anterior !== status) {
    notificarAlteracao(admin, aluno_id, turmaNome, status_anterior, status, motivo_alteracao, horario_evento).catch(() => {})
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
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    (process.env.VAPID_PRIVATE_KEY || '').trim()
  )

  const payload = JSON.stringify({
    title: '❌ Falta registrada',
    body: `${aluno?.nome_completo} teve falta registrada em ${turmaNome}`,
    tag: `falta-${aluno_id}-${chamada_id}`,
    url: '/responsavel',
  })

  await Promise.allSettled(subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload)))
}

async function notificarAlteracao(admin: any, aluno_id: string, turmaNome: string, _statusAnterior: string | null, novoStatus: string, motivo: string, horario: string) {
  const { data: aluno } = await admin.from('alunos').select('nome_completo').eq('id', aluno_id).single()
  const { data: vinculos } = await admin.from('responsaveis_alunos').select('responsavel_id').eq('aluno_id', aluno_id)
  if (!vinculos?.length) return

  const responsavelIds = vinculos.map((v: any) => v.responsavel_id)
  const { data: subs } = await admin.from('push_subscriptions').select('subscription').in('responsavel_id', responsavelIds)
  if (!subs?.length) return

  const webpush = await import('web-push')
  webpush.default.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    (process.env.VAPID_PRIVATE_KEY || '').trim()
  )

  const emoji = novoStatus === 'presente' ? '✅' : novoStatus === 'falta' ? '❌' : '📝'
  const statusLabel = novoStatus === 'presente' ? 'Presente' : novoStatus === 'falta' ? 'Falta' : 'Justificada'
  const horarioLabel = horario ? ` às ${horario.slice(0, 5)}` : ''

  const payload = JSON.stringify({
    title: `${emoji} Presença atualizada — ${turmaNome}`,
    body: `${aluno?.nome_completo}: ${statusLabel}${horarioLabel}${motivo ? ` · ${motivo}` : ''}`,
    tag: `alteracao-${aluno_id}`,
    url: '/responsavel',
  })

  await Promise.allSettled(subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload)))
}
