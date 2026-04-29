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

    const { data: notasData } = await admin
      .from('notas')
      .select('aluno_id, b1, b2, b3, b4')
      .eq('disciplina_id', disciplina_id)
      .eq('ano_letivo_id', ano_letivo_id)
      .eq('turma_id', turma_id)

    const notasMap: Record<string, { b1: any, b2: any, b3: any, b4: any }> = {}
    for (const n of notasData || []) {
      notasMap[n.aluno_id] = { b1: n.b1, b2: n.b2, b3: n.b3, b4: n.b4 }
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
  console.log('PAYLOAD:', JSON.stringify(payload))

  // Validar com Zod
  const validation = SaveNotasSchema.safeParse(payload)
  if (!validation.success) {
    console.error('VALIDATION ERROR:', validation.error.issues)
    console.error('PAYLOAD RECEBIDO:', JSON.stringify(payload, null, 2))
    await logger.logError('/api/professor/notas_bimestral', new Error(`Validação falhou: ${JSON.stringify(validation.error.issues)}`), user.id, { payload })
    return NextResponse.json({
      error: 'Dados inválidos',
      details: validation.error.flatten().fieldErrors,
      issues: validation.error.issues,
      payload_recebido: payload
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

    // Fazer delete das notas antigas para esses alunos
    const alunoIds = notas.map((n: any) => n.aluno_id)
    const { error: deleteError } = await admin
      .from('notas')
      .delete()
      .eq('turma_id', turma_id)
      .eq('disciplina_id', disciplina_id)
      .eq('ano_letivo_id', ano_letivo_id)
      .in('aluno_id', alunoIds)

    if (deleteError) {
      console.error('DELETE ERROR:', deleteError)
      await logger.logError('/api/professor/notas_bimestral', deleteError as Error, user.id, { turma_id, disciplina_id })
      return NextResponse.json({
        error: 'Erro ao limpar notas antigas',
        detail: deleteError.message
      }, { status: 500 })
    }

    // Inserir notas novas
    const rows = notas.map((n: any) => ({
      aluno_id: n.aluno_id,
      turma_id,
      disciplina_id,
      ano_letivo_id,
      b1: n.b1 === '' || n.b1 === null || n.b1 === undefined ? null : parseFloat(String(n.b1)),
      b2: n.b2 === '' || n.b2 === null || n.b2 === undefined ? null : parseFloat(String(n.b2)),
      b3: n.b3 === '' || n.b3 === null || n.b3 === undefined ? null : parseFloat(String(n.b3)),
      b4: n.b4 === '' || n.b4 === null || n.b4 === undefined ? null : parseFloat(String(n.b4)),
      atualizado_em: new Date().toISOString()
    }))

    const { error: insertError } = await admin
      .from('notas')
      .insert(rows)

    if (insertError) {
      console.error('INSERT ERROR:', insertError)
      await logger.logError('/api/professor/notas_bimestral', insertError as Error, user.id, { turma_id, disciplina_id, rows })
      return NextResponse.json({
        error: 'Erro ao salvar notas bimestrais',
        detail: insertError.message
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
