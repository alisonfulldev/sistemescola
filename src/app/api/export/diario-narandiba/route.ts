import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const turmaId = req.nextUrl.searchParams.get('turma_id')
  const anoLetivoId = req.nextUrl.searchParams.get('ano_letivo_id')

  if (!turmaId || !anoLetivoId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: turma_id, ano_letivo_id' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Turma e escola
    const { data: turma } = await admin
      .from('turmas')
      .select('*, escola:school_id(nome_oficial, municipio, uf, diretor, cep, logradouro, numero, bairro, telefone, email)')
      .eq('id', turmaId)
      .single()

    if (!turma) return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })

    // 2. Ano letivo e bimestres
    const { data: anoLetivo } = await admin
      .from('anos_letivos')
      .select('*')
      .eq('id', anoLetivoId)
      .single()

    const { data: bimestres } = await admin
      .from('bimestres')
      .select('*')
      .eq('ano_letivo_id', anoLetivoId)
      .order('numero')

    // 3. Calendário escolar
    const { data: calendario } = await admin
      .from('calendario_escolar')
      .select('data, tipo_dia, descricao')
      .eq('ano_letivo_id', anoLetivoId)
      .order('data')

    // 4. Alunos com responsáveis
    const { data: alunos } = await admin
      .from('alunos')
      .select(`
        id, nome_completo, matricula, numero_chamada, data_nascimento,
        naturalidade, nacionalidade, nome_mae, cpf_aluno, rg_aluno,
        responsaveis_alunos(id, parentesco, cpf_responsavel, telefone_primario,
          telefone_secundario, profissao, usuarios(id, nome, email))
      `)
      .eq('turma_id', turmaId)
      .eq('ativo', true)
      .order('numero_chamada', { nullsFirst: false })
      .order('nome_completo')

    // 5. Disciplinas da turma (via aulas)
    const { data: aulas } = await admin
      .from('aulas')
      .select('disciplina_id, disciplinas(id, nome), usuarios(id, nome)')
      .eq('turma_id', turmaId)
      .eq('ativo', true)

    const disciplinaMap = new Map()
    for (const aula of aulas || []) {
      if (aula.disciplina_id && !disciplinaMap.has(aula.disciplina_id)) {
        disciplinaMap.set(aula.disciplina_id, {
          id: (aula.disciplinas as any)?.id,
          nome: (aula.disciplinas as any)?.nome,
          professor_id: (aula.usuarios as any)?.id,
          professor_nome: (aula.usuarios as any)?.nome
        })
      }
    }
    const disciplinas = Array.from(disciplinaMap.values())

    // 6. Aulas completas com conteúdo
    const { data: aulasCompletas } = await admin
      .from('aulas')
      .select('id, data, horario_inicio, horario_fim, bimestre, conteudo_programatico, atividades_desenvolvidas, disciplinas(nome), usuarios(nome)')
      .eq('turma_id', turmaId)
      .gte('data', anoLetivo?.data_inicio)
      .lte('data', anoLetivo?.data_fim)
      .order('data')

    // 7. Frequência (registros de chamada)
    const { data: chamadas } = await admin
      .from('chamadas')
      .select('id, aula_id, aulas(data)')
      .eq('aulas.turma_id', turmaId)

    const chamadaIds = chamadas?.map(c => c.id) || []
    const { data: registrosFrequencia } = await admin
      .from('registros_chamada')
      .select('chamada_id, aluno_id, status, chamadas(aulas(data))')
      .in('chamada_id', chamadaIds)

    // Mapear frequência: { aluno_id: { data: status } }
    const frequenciaMap: Record<string, Record<string, string>> = {}
    for (const aluno of alunos || []) frequenciaMap[aluno.id] = {}
    for (const reg of registrosFrequencia || []) {
      const data = (reg.chamadas as any)?.aulas?.data
      if (data && reg.aluno_id) {
        frequenciaMap[reg.aluno_id] = frequenciaMap[reg.aluno_id] || {}
        frequenciaMap[reg.aluno_id][data] = reg.status
      }
    }

    // 8. Notas por bimestre
    const { data: notas } = await admin
      .from('notas')
      .select('aluno_id, disciplina_id, b1, b2, b3, b4, recuperacao')
      .eq('ano_letivo_id', anoLetivoId)
      .in('aluno_id', alunos?.map(a => a.id) || [])

    const notasMap: Record<string, any> = {}
    for (const nota of notas || []) {
      notasMap[nota.aluno_id] = notasMap[nota.aluno_id] || {}
      notasMap[nota.aluno_id][nota.disciplina_id] = {
        b1: nota.b1,
        b2: nota.b2,
        b3: nota.b3,
        b4: nota.b4,
        recuperacao: nota.recuperacao
      }
    }

    // 9. Justificativas aprovadas
    const { data: justificativas } = await admin
      .from('justificativas')
      .select('aluno_id, data_falta, motivo, descricao_detalhada, status')
      .eq('status', 'aprovada')
      .in('aluno_id', alunos?.map(a => a.id) || [])
      .order('data_falta')

    // 10. Avaliações com notas
    const { data: avaliacoes } = await admin
      .from('avaliacoes')
      .select('id, titulo, tipo, data_aplicacao, disciplina_id, valor_maximo')
      .eq('turma_id', turmaId)
      .order('data_aplicacao')

    const { data: notasAvaliacao } = await admin
      .from('notas_avaliacao')
      .select('avaliacao_id, aluno_id, nota')
      .in('avaliacao_id', avaliacoes?.map(a => a.id) || [])

    const notasAvaliacaoMap: Record<string, Record<string, number>> = {}
    for (const na of notasAvaliacao || []) {
      notasAvaliacaoMap[na.avaliacao_id] = notasAvaliacaoMap[na.avaliacao_id] || {}
      notasAvaliacaoMap[na.avaliacao_id][na.aluno_id] = na.nota
    }

    // Montar resposta consolidada
    return NextResponse.json({
      escola: turma.escola,
      ano_letivo: anoLetivo,
      bimestres: bimestres || [],
      calendario: calendario || [],
      turma: {
        id: turma.id,
        nome: turma.nome,
        serie: turma.serie,
        turma_letra: turma.turma_letra,
        turno: turma.turno,
        grau: turma.grau,
        aulas_previstas: turma.aulas_previstas
      },
      disciplinas,
      alunos: alunos || [],
      aulas: aulasCompletas || [],
      frequencia: frequenciaMap,
      notas: notasMap,
      justificativas,
      avaliacoes,
      notas_avaliacao: notasAvaliacaoMap
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
