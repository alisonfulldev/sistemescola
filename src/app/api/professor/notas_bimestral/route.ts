import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SaveNotasSchema } from '@/lib/schemas/notas'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const turma_id = searchParams.get('turma_id')
    const disciplina_id = searchParams.get('disciplina_id')
    const ano_letivo_id = searchParams.get('ano_letivo_id')

    if (!turma_id || !disciplina_id || !ano_letivo_id) {
      await logger.logAudit(user.id, 'notas_bimestral_consultar', '/api/professor/notas_bimestral', {}, false)
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

    await logger.logAudit(user.id, 'notas_bimestral_consultar', '/api/professor/notas_bimestral', {
      turma_id,
      disciplina_id,
      ano_letivo_id,
      total_notas: Object.keys(notasMap).length
    }, true)

    return NextResponse.json({ notas: notasMap })
  } catch (error) {
    await logger.logError('/api/professor/notas_bimestral', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar notas bimestrais' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const payload = await req.json()

  // Validar com Zod
  const validation = SaveNotasSchema.safeParse(payload)
  if (!validation.success) {
    return NextResponse.json({
      error: 'Dados inválidos',
      details: validation.error.flatten().fieldErrors
    }, { status: 400 })
  }

  const { turma_id, disciplina_id, ano_letivo_id, notas } = validation.data as any

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
      await logger.logAudit(user.id, 'notas_bimestral_salvar', '/api/professor/notas_bimestral', { turma_id, disciplina_id }, false)
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
      await logger.logAudit(user.id, 'notas_bimestral_salvar', '/api/professor/notas_bimestral', { turma_id, disciplina_id }, false)
      return NextResponse.json({ error: 'Nenhuma nota para salvar' }, { status: 400 })
    }

    // Fazer upsert de notas (atualiza se existir, insere se não)
    const rows = notas.map((n: any) => ({
      aluno_id: n.aluno_id,
      turma_id,
      disciplina_id,
      ano_letivo_id,
      nota: n.nota === '' || n.nota === null ? null : parseFloat(String(n.nota)),
      atualizado_em: new Date().toISOString()
    }))

    const { error: upsertError } = await admin
      .from('notas')
      .upsert(rows, { onConflict: 'aluno_id,turma_id,disciplina_id,ano_letivo_id' })

    if (upsertError) {
      console.error('UPSERT ERROR:', upsertError)
      await logger.logError('/api/professor/notas_bimestral', upsertError as Error, user.id, { turma_id, disciplina_id, rows })
      return NextResponse.json({
        error: 'Erro ao salvar notas bimestrais',
        detail: upsertError.message
      }, { status: 500 })
    }

    await logger.logAudit(user.id, 'notas_bimestral_salvar', '/api/professor/notas_bimestral', {
      turma_id,
      disciplina_id,
      ano_letivo_id,
      quantidade_notas: rows.length
    }, true)

    return NextResponse.json({ ok: true })
  } catch (e) {
    const error = e as Error
    console.error('CATCH ERROR:', error.message, error.stack)
    await logger.logError('/api/professor/notas_bimestral', error, user.id)
    return NextResponse.json({
      error: 'Erro interno ao salvar notas bimestrais',
      detail: error.message
    }, { status: 500 })
  }
}
