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
    .select('id, aulas(professor_id)')
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

  return NextResponse.json({ ok: true })
}
