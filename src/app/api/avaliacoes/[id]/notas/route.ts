import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (!params.id) {
    return NextResponse.json({ error: 'ID da avaliação não fornecido' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Obter informações da avaliação
    const { data: avaliacao } = await admin
      .from('avaliacoes')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    // Obter notas
    const { data: notas } = await admin
      .from('notas_avaliacao')
      .select(`
        id, aluno_id, nota, observacao, registrado_em,
        alunos(nome_completo, numero_chamada),
        usuarios:registrado_por(nome)
      `)
      .eq('avaliacao_id', params.id)
      .order('alunos.numero_chamada', { nullsFirst: false })
      .order('alunos.nome_completo')

    return NextResponse.json({
      avaliacao,
      notas: notas || [],
      total_notas: notas?.length || 0
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()

  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  if (!params.id) {
    return NextResponse.json({ error: 'ID da avaliação não fornecido' }, { status: 400 })
  }

  const { notas: notasData } = await req.json()

  if (!Array.isArray(notasData) || notasData.length === 0) {
    return NextResponse.json({ error: 'Envie um array "notas" com dados a inserir' }, { status: 400 })
  }

  // Validar estrutura
  for (const nota of notasData) {
    if (!nota.aluno_id || nota.nota === undefined) {
      return NextResponse.json({
        error: 'Cada nota deve ter: aluno_id e nota'
      }, { status: 400 })
    }

    if (typeof nota.nota === 'number' && (nota.nota < 0 || nota.nota > 99.9)) {
      return NextResponse.json({ error: 'Nota deve estar entre 0 e 99.9' }, { status: 400 })
    }
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Validar que avaliação existe
    const { data: avaliacao } = await admin
      .from('avaliacoes')
      .select('id, aula_id')
      .eq('id', params.id)
      .single()

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    // Se for professor, validar que é sua aula
    if (userData?.perfil === 'professor') {
      const { data: aula } = await supabase.from('aulas').select('professor_id').eq('id', avaliacao.aula_id).single()
      if (aula?.professor_id !== user.id) {
        return NextResponse.json({ error: 'Você só pode registrar notas em suas aulas' }, { status: 403 })
      }
    }

    // Preparar dados para insert (upsert)
    const notasParaInserir = notasData.map(nota => ({
      avaliacao_id: params.id,
      aluno_id: nota.aluno_id,
      nota: nota.nota === '' || nota.nota === null ? null : parseFloat(nota.nota),
      observacao: nota.observacao || null,
      registrado_por: user.id,
      registrado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    }))

    // Inserir em lote com upsert
    const { error } = await admin
      .from('notas_avaliacao')
      .upsert(notasParaInserir, { onConflict: 'avaliacao_id,aluno_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `${notasParaInserir.length} nota(s) registrada(s) com sucesso`
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()

  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { aluno_id, nota, observacao } = await req.json()

  if (!aluno_id || nota === undefined) {
    return NextResponse.json({ error: 'Campos obrigatórios: aluno_id, nota' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { error } = await admin
      .from('notas_avaliacao')
      .update({
        nota: nota === '' || nota === null ? null : parseFloat(nota),
        observacao,
        atualizado_em: new Date().toISOString()
      })
      .eq('avaliacao_id', params.id)
      .eq('aluno_id', aluno_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: 'Nota atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
