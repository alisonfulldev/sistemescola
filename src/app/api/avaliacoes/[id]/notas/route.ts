import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SaveAvaliacaoNotasSchema } from '@/lib/schemas/avaliacoes'
import { validateData, errorResponse } from '@/lib/api-utils'

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await paramsPromise
  if (!id) {
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
      .select('*, turmas(id)')
      .eq('id', id)
      .single()

    if (!avaliacao) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    // Obter alunos da turma (para garantir que todos apareçam)
    const { data: alunos } = await admin
      .from('alunos')
      .select('id, nome_completo, numero_chamada')
      .eq('turma_id', avaliacao.turma_id)
      .eq('situacao', 'ativo')
      .order('numero_chamada', { nullsFirst: false })
      .order('nome_completo')

    // Obter notas registradas
    const { data: notasRegistradas } = await admin
      .from('notas_avaliacao')
      .select('id, aluno_id, nota, observacao, registrado_em')
      .eq('avaliacao_id', id)

    // Mesclar: todos os alunos com suas notas (ou vazio se não tiver nota)
    const notasMap = new Map(notasRegistradas?.map(n => [n.aluno_id, n]) || [])
    const notas = (alunos || []).map(aluno => ({
      aluno_id: aluno.id,
      nota: notasMap.get(aluno.id)?.nota || null,
      alunos: {
        nome_completo: aluno.nome_completo,
        numero_chamada: aluno.numero_chamada
      }
    }))

    return NextResponse.json({
      avaliacao,
      notas,
      total_notas: notas.length
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()

  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await paramsPromise
  if (!id) {
    return NextResponse.json({ error: 'ID da avaliação não fornecido' }, { status: 400 })
  }

  const payload = { id, ...(await req.json()) }

  // Validar com Zod
  const validation = validateData(SaveAvaliacaoNotasSchema, payload)
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { notas: notasData } = validation.data

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
      .eq('id', id)
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
      avaliacao_id: id,
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

export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()

  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await paramsPromise
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
      .eq('avaliacao_id', id)
      .eq('aluno_id', aluno_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: 'Nota atualizada com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
