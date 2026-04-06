import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const turma_id = searchParams.get('turma_id')
  const disciplina_id = searchParams.get('disciplina_id')
  const ano_letivo_id = searchParams.get('ano_letivo_id')

  if (!turma_id || !disciplina_id || !ano_letivo_id) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: notas } = await admin
    .from('notas')
    .select('aluno_id, nota')
    .eq('disciplina_id', disciplina_id)
    .eq('ano_letivo_id', ano_letivo_id)
    .eq('turma_id', turma_id)

  const notasMap: Record<string, { nota: any }> = {}
  for (const n of notas || []) {
    notasMap[n.aluno_id] = { nota: n.nota }
  }

  return NextResponse.json({ notas: notasMap })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { turma_id, disciplina_id, ano_letivo_id, notas } = await req.json()

  if (!turma_id || !disciplina_id || !ano_letivo_id || !Array.isArray(notas)) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifica se professor leciona disciplina na turma
  const { data: aulas } = await admin
    .from('aulas')
    .select('id')
    .eq('turma_id', turma_id)
    .eq('disciplina_id', disciplina_id)
    .eq('professor_id', user.id)

  if (!aulas || aulas.length === 0) {
    return NextResponse.json({ error: 'Não autorizado para esta turma/disciplina' }, { status: 403 })
  }

  const rows = notas.map((n: any) => ({
    aluno_id: n.aluno_id,
    disciplina_id,
    ano_letivo_id,
    turma_id,
    nota: n.nota === '' ? null : parseFloat(n.nota),
    atualizado_em: new Date().toISOString()
  }))

  const { error } = await admin.from('notas').upsert(rows, { onConflict: 'aluno_id,disciplina_id,ano_letivo_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
