import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { prova_id, notas, publicar } = await req.json()
  // notas: [{ aluno_id, nota }]
  if (!prova_id || !Array.isArray(notas)) {
    return NextResponse.json({ error: 'prova_id e notas são obrigatórios' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Valida que a prova é do professor
  const { data: prova } = await admin
    .from('provas')
    .select('id, titulo, nota_maxima, turma_id, turmas(nome)')
    .eq('id', prova_id)
    .eq('professor_id', user.id)
    .single()

  if (!prova) return NextResponse.json({ error: 'Prova não encontrada' }, { status: 404 })

  // Upsert notas
  if (notas.length > 0) {
    const rows = notas.map((n: any) => ({
      prova_id,
      aluno_id: n.aluno_id,
      nota: n.nota !== '' && n.nota !== null && n.nota !== undefined ? parseFloat(n.nota) : null,
    }))

    const { error } = await admin.from('notas').upsert(rows, { onConflict: 'prova_id,aluno_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Se publicar, marca prova como publicada e notifica responsáveis
  if (publicar) {
    await admin.from('provas').update({ publicada: true }).eq('id', prova_id)
    notificarNotas(admin, prova_id, prova).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

async function notificarNotas(admin: any, prova_id: string, prova: any) {
  // Busca alunos da turma com suas notas
  const { data: notasData } = await admin
    .from('notas')
    .select('aluno_id, nota')
    .eq('prova_id', prova_id)

  if (!notasData?.length) return

  const webpush = await import('web-push')
  webpush.default.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    (process.env.VAPID_PRIVATE_KEY || '').trim()
  )

  const turmaNome = (prova as any).turmas?.nome || ''

  await Promise.allSettled(notasData.map(async (n: any) => {
    const { data: vinculos } = await admin
      .from('responsaveis_alunos')
      .select('responsavel_id')
      .eq('aluno_id', n.aluno_id)
    if (!vinculos?.length) return

    const respIds = vinculos.map((v: any) => v.responsavel_id)
    const { data: subs } = await admin.from('push_subscriptions').select('subscription').in('responsavel_id', respIds)
    if (!subs?.length) return

    const { data: aluno } = await admin.from('alunos').select('nome_completo').eq('id', n.aluno_id).single()

    const notaFmt = n.nota !== null ? `${n.nota}/${prova.nota_maxima}` : 'sem nota'
    const payload = JSON.stringify({
      title: `📝 Nota publicada — ${prova.titulo}`,
      body: `${aluno?.nome_completo}: ${notaFmt} · ${turmaNome}`,
      tag: `nota-${prova_id}-${n.aluno_id}`,
      url: '/responsavel',
    })

    await Promise.allSettled(subs.map((s: any) => webpush.default.sendNotification(s.subscription, payload)))
  }))
}
