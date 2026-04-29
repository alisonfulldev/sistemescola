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

    // Verifica permissão: disciplina deve pertencer ao professor
    const { data: disciplina } = await admin
      .from('disciplinas')
      .select('id')
      .eq('id', disciplina_id)
      .eq('professor_id', user.id)
      .maybeSingle()

    if (!disciplina) {
      await logger.logAudit(user.id, 'notas_bimestral_consultar', '/api/professor/notas_bimestral', { disciplina_id }, false)
      return NextResponse.json({ error: 'Sem permissão para esta disciplina' }, { status: 403 })
    }

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

  // Validar com Zod
  const validation = SaveNotasSchema.safeParse(payload)
  if (!validation.success) {
    await logger.logError('/api/professor/notas_bimestral', new Error(`Validação falhou`), user.id, { issues: validation.error.issues })
    return NextResponse.json({
      error: 'Dados inválidos',
      details: validation.error.flatten().fieldErrors,
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

    // Verifica permissão: disciplina deve pertencer ao professor
    const { data: disciplinaAuth } = await admin
      .from('disciplinas')
      .select('id')
      .eq('id', disciplina_id)
      .eq('professor_id', user.id)
      .maybeSingle()

    if (!disciplinaAuth) {
      await logger.logAudit(user.id, 'notas_bimestral_salvar', '/api/professor/notas_bimestral', { disciplina_id }, false)
      return NextResponse.json({ error: 'Sem permissão para esta disciplina' }, { status: 403 })
    }

    if (!notas || notas.length === 0) {
      await logger.logAudit(user.id, 'notas_bimestral_salvar', '/api/professor/notas_bimestral', { turma_id, disciplina_id }, false)
      return NextResponse.json({ error: 'Nenhuma nota para salvar' }, { status: 400 })
    }

    const parseNota = (val: any): number | null => {
      if (val === '' || val === null || val === undefined) return null
      const n = parseFloat(String(val))
      return isNaN(n) ? null : n
    }

    // Upsert atômico — sem janela de perda de dados entre delete e insert
    const rows = notas.map((n: any) => ({
      aluno_id: n.aluno_id,
      turma_id,
      disciplina_id,
      ano_letivo_id,
      b1: parseNota(n.b1),
      b2: parseNota(n.b2),
      b3: parseNota(n.b3),
      b4: parseNota(n.b4),
      atualizado_em: new Date().toISOString()
    }))

    const { error: upsertError } = await admin
      .from('notas')
      .upsert(rows, { onConflict: 'aluno_id,disciplina_id,ano_letivo_id,turma_id' })

    if (upsertError) {
      await logger.logError('/api/professor/notas_bimestral', upsertError as Error, user.id, { turma_id, disciplina_id })
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
    await logger.logError('/api/professor/notas_bimestral', e as Error, user.id)
    return NextResponse.json({ error: 'Erro interno ao salvar notas bimestrais' }, { status: 500 })
  }
}
