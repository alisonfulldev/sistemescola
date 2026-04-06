import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateAvaliacaoSchema } from '@/lib/schemas/avaliacoes'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const turmaId = req.nextUrl.searchParams.get('turma_id')
  const disciplinaId = req.nextUrl.searchParams.get('disciplina_id')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    let query = admin
      .from('avaliacoes')
      .select(`
        id, titulo, tipo, data_aplicacao, data_entrega, valor_maximo, peso, ativo,
        disciplinas(nome),
        aulas(horario_inicio)
      `)
      .eq('ativo', true)

    if (turmaId) {
      query = query.eq('turma_id', turmaId)
    }

    if (disciplinaId) {
      query = query.eq('disciplina_id', disciplinaId)
    }

    const { data: avaliacoes, error } = await query.order('data_aplicacao', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ avaliacoes: avaliacoes || [] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()

  if (!['admin', 'secretaria', 'diretor', 'professor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { aula_id, disciplina_id, turma_id, titulo, tipo, data_aplicacao, data_entrega, valor_maximo, peso } = await req.json()

  if (!aula_id || !disciplina_id || !turma_id || !titulo || !tipo || !data_aplicacao) {
    return NextResponse.json({
      error: 'Campos obrigatórios: aula_id, disciplina_id, turma_id, titulo, tipo, data_aplicacao'
    }, { status: 400 })
  }

  // Validar tipo
  const tiposValidos = ['prova', 'trabalho', 'projeto', 'participacao', 'seminario', 'lista_exercicios', 'outra']
  if (!tiposValidos.includes(tipo)) {
    return NextResponse.json({ error: `Tipo inválido. Válidos: ${tiposValidos.join(', ')}` }, { status: 400 })
  }

  // Se for professor, validar que é sua aula
  if (userData?.perfil === 'professor') {
    const { data: aula } = await supabase.from('aulas').select('professor_id').eq('id', aula_id).single()
    if (aula?.professor_id !== user.id) {
      return NextResponse.json({ error: 'Você só pode criar avaliações em suas aulas' }, { status: 403 })
    }
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Criar avaliação
    const { data: novaAvaliacao, error } = await admin
      .from('avaliacoes')
      .insert({
        aula_id,
        disciplina_id,
        turma_id,
        titulo,
        tipo,
        data_aplicacao,
        data_entrega: data_entrega || null,
        valor_maximo: valor_maximo || 10,
        peso: peso || 1,
        ativo: true
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 2. Buscar alunos da turma
    const { data: alunos } = await admin
      .from('alunos')
      .select('id')
      .eq('turma_id', turma_id)
      .eq('situacao', 'ativo')

    // 3. Criar registros de notas_avaliacao para cada aluno
    if (alunos && alunos.length > 0) {
      const notasRegistros = alunos.map(aluno => ({
        avaliacao_id: novaAvaliacao.id,
        aluno_id: aluno.id,
        nota: null,
        registrado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      }))

      await admin
        .from('notas_avaliacao')
        .insert(notasRegistros)
        .select()
    }

    return NextResponse.json({ avaliacao: novaAvaliacao }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
