import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    // Verificar permissão
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo, escola_id')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'notas_consultar', '/api/adm/notas', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'notas_consultar', '/api/adm/notas', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const turma_id = searchParams.get('turma_id')
    const disciplina_id = searchParams.get('disciplina_id')
    const ano_letivo_id = searchParams.get('ano_letivo_id')

    if (!turma_id || !disciplina_id || !ano_letivo_id) {
      await logger.logAudit(user.id, 'notas_consultar', '/api/adm/notas', {}, false)
      return NextResponse.json({ error: 'Parâmetros obrigatórios' }, { status: 400 })
    }

    const db = admin()

  const { data: alunos } = await db
    .from('alunos')
    .select('id, nome_completo, numero_chamada, matricula')
    .eq('turma_id', turma_id)
    .eq('situacao', 'ativo')
    .order('numero_chamada', { nullsFirst: false })
    .order('nome_completo')

  const alunoIds = (alunos || []).map((a: any) => a.id)

  const { data: notas } = await db
    .from('notas')
    .select('*')
    .eq('disciplina_id', disciplina_id)
    .eq('ano_letivo_id', ano_letivo_id)
    .in('aluno_id', alunoIds)

  const notasPorAluno: Record<string, any> = {}
  for (const n of notas || []) notasPorAluno[n.aluno_id] = n

  // Contar faltas por aluno nesta turma — UMA QUERY COM JOINS
  let faltasMap: Record<string, number> = {}
  if (alunoIds.length > 0) {
    // UMA única query: registros_chamada → chamadas → aulas
    const { data: faltasReg } = await db
      .from('registros_chamada')
      .select('aluno_id, chamadas!inner(id, aulas!inner(turma_id))')
      .in('aluno_id', alunoIds)
      .eq('chamadas.aulas.turma_id', turma_id)
      .eq('status', 'falta')

    for (const r of faltasReg || []) {
      faltasMap[r.aluno_id] = (faltasMap[r.aluno_id] || 0) + 1
    }
  }

    return NextResponse.json({ alunos: alunos || [], notas: notasPorAluno, faltas: faltasMap })
  } catch (error) {
    await logger.logError('/api/adm/notas', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { aluno_id, disciplina_id, ano_letivo_id, b1, b2, b3, b4, recuperacao } = await req.json()
    if (!aluno_id || !disciplina_id || !ano_letivo_id) {
      return NextResponse.json({ error: 'aluno_id, disciplina_id e ano_letivo_id são obrigatórios' }, { status: 400 })
    }

    const db = admin()
    const parse = (v: any) => (v === '' || v === null || v === undefined) ? null : parseFloat(v)

    const { error } = await db.from('notas').upsert({
      aluno_id,
      disciplina_id,
      ano_letivo_id,
      b1: parse(b1),
      b2: parse(b2),
      b3: parse(b3),
      b4: parse(b4),
      recuperacao: parse(recuperacao),
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'aluno_id,disciplina_id,ano_letivo_id' })

    if (error) {
      await logger.logError('/api/adm/notas', error, user.id)
      return NextResponse.json({ error: 'Erro ao salvar notas' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'notas_atualizar', '/api/adm/notas', { aluno_id, disciplina_id, ano_letivo_id }, true)
    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/adm/notas', error, user.id)
    return NextResponse.json({ error: 'Erro ao atualizar notas' }, { status: 500 })
  }
}
