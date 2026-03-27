import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { registro_id } = body
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim().slice(0, 1000) : ''

  if (!registro_id || !motivo) {
    return NextResponse.json({ error: 'registro_id e motivo obrigatórios' }, { status: 400 })
  }

  const { isValidUUID } = await import('@/lib/validate')
  if (!isValidUUID(registro_id)) {
    return NextResponse.json({ error: 'registro_id inválido' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifica que o registro é de um aluno vinculado ao responsável
  const { data: registro } = await admin
    .from('registros_chamada')
    .select('id, aluno_id, status')
    .eq('id', registro_id)
    .single()

  if (!registro || registro.status !== 'falta') {
    return NextResponse.json({ error: 'Registro não encontrado ou não é uma falta' }, { status: 400 })
  }

  const { data: vinculo } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id')
    .eq('responsavel_id', user.id)
    .eq('aluno_id', registro.aluno_id)
    .maybeSingle()

  if (!vinculo) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { error } = await admin
    .from('justificativas_falta')
    .upsert({
      registro_id,
      responsavel_id: user.id,
      motivo: motivo.trim(),
      status: 'pendente',
    }, { onConflict: 'registro_id,responsavel_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
