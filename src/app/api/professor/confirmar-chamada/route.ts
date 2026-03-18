import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { chamada_id } = await req.json()
  if (!chamada_id) return NextResponse.json({ error: 'chamada_id obrigatório' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Valida que a chamada pertence a uma aula deste professor
  const { data: chamada } = await admin
    .from('chamadas')
    .select('id, aulas(professor_id)')
    .eq('id', chamada_id)
    .single()

  if (!chamada || (chamada as any).aulas?.professor_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { error } = await admin
    .from('chamadas')
    .update({ status: 'concluida', concluida_em: new Date().toISOString() })
    .eq('id', chamada_id)

  if (error) {
    console.error('Erro ao confirmar chamada:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Dispara notificações push para responsáveis dos alunos presentes
  fetch(`${req.nextUrl.origin}/api/professor/notificar-presenca`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
    body: JSON.stringify({ chamada_id }),
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
