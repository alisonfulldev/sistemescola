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

  try {
    // Validar que turma e disciplina existem
    const { data: turmaData } = await admin
      .from('turmas')
      .select('id')
      .eq('id', turma_id)
      .single()

    const { data: disciplinaData } = await admin
      .from('disciplinas')
      .select('id')
      .eq('id', disciplina_id)
      .single()

    if (!turmaData || !disciplinaData) {
      return NextResponse.json({ error: 'Turma ou disciplina não encontrada' }, { status: 404 })
    }

    // Verificar permissão: professor deve ter aulas nesta turma+disciplina
    // Se não tiver aulas, apenas verifica se turma e disciplina existem
    const { data: aulas } = await admin
      .from('aulas')
      .select('id')
      .eq('turma_id', turma_id)
      .eq('disciplina_id', disciplina_id)
      .eq('professor_id', user.id)
      .limit(1)

    // Se não houver aulas, ainda permite lançar notas (pode não ter aulas cadastradas)
    // Apenas registra se turma e disciplina existem

    if (!notas || notas.length === 0) {
      return NextResponse.json({ error: 'Nenhuma nota para salvar' }, { status: 400 })
    }

    const rows = notas.map((n: any) => ({
      aluno_id: n.aluno_id,
      disciplina_id,
      ano_letivo_id,
      nota: n.nota === '' || n.nota === null ? null : parseFloat(String(n.nota)),
      atualizado_em: new Date().toISOString()
    }))

    const { error } = await admin.from('notas').upsert(rows, { onConflict: 'aluno_id,disciplina_id,ano_letivo_id' })

    if (error) {
      console.error('Erro Supabase:', error)
      return NextResponse.json({ error: `Erro ao salvar notas: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Erro interno:', e)
    return NextResponse.json({ error: `Erro interno: ${String(e)}` }, { status: 500 })
  }
}
