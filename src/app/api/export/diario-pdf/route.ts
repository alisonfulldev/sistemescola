import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { DiarioPDF } from '@/lib/pdf/diario-pdf'
import React from 'react'

export async function GET(req: NextRequest) {
  try {
    const turmaId = req.nextUrl.searchParams.get('turma_id')
    const disciplinaId = req.nextUrl.searchParams.get('disciplina_id')
    const anoLetivoId = req.nextUrl.searchParams.get('ano_letivo_id')

    if (!turmaId || !disciplinaId || !anoLetivoId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: turma_id, disciplina_id, ano_letivo_id' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    // Buscar dados consolidados
    const [
      { data: turma }: any,
      { data: disciplina }: any,
      { data: anoLetivo }: any,
      { data: alunos }: any,
      { data: aulas }: any,
      { data: notas }: any,
      { data: escola }: any,
      { data: professor }: any,
      { data: bimestres }: any,
      { data: registrosChamada }: any,
    ] = await Promise.all([
      supabase.from('turmas').select('*').eq('id', turmaId).single(),
      supabase.from('disciplinas').select('*').eq('id', disciplinaId).single(),
      supabase.from('anos_letivos').select('*').eq('id', anoLetivoId).single(),
      supabase
        .from('alunos')
        .select('id, numero_chamada, nome_completo')
        .eq('turma_id', turmaId)
        .eq('ativo', true)
        .order('numero_chamada'),
      supabase
        .from('aulas')
        .select(
          'id, data, horario_inicio, horario_fim, conteudo_programatico, atividades_desenvolvidas, bimestre'
        )
        .eq('turma_id', turmaId)
        .eq('disciplina_id', disciplinaId)
        .order('data'),
      supabase.from('notas').select('aluno_id, b1, b2, b3, b4, recuperacao').eq('disciplina_id', disciplinaId),
      supabase.from('escola').select('*').limit(1).single(),
      supabase.from('usuarios').select('nome').eq('id', (disciplina as any)?.professor_id).single(),
      supabase
        .from('bimestres')
        .select('numero, data_inicio, data_fim')
        .eq('ano_letivo_id', anoLetivoId)
        .order('numero'),
      supabase
        .from('registros_chamada')
        .select('aluno_id, status, chamadas(aulas(data, bimestre))')
        .in(
          'chamada_id',
          supabase.from('chamadas').select('id').in('aula_id', (aulas || []).map((a: any) => a.id))
        ),
    ])

    // Construir mapa de frequência: { aluno_id: { data: status } }
    const frequenciaMap: { [alunoId: string]: { [date: string]: string } } = {}
    if (registrosChamada) {
      registrosChamada.forEach((reg: any) => {
        const alunoId = reg.aluno_id
        const data = reg.chamadas?.aulas?.data
        if (alunoId && data) {
          if (!frequenciaMap[alunoId]) frequenciaMap[alunoId] = {}
          frequenciaMap[alunoId][data] = reg.status || 'falta'
        }
      })
    }

    // Construir mapa de notas: { aluno_id: { b1, b2, b3, b4, recuperacao } }
    const notasMap: { [alunoId: string]: { b1?: number; b2?: number; b3?: number; b4?: number; recuperacao?: number } } = {}
    if (notas) {
      (notas as any[]).forEach((nota) => {
        notasMap[nota.aluno_id] = {
          b1: nota.b1,
          b2: nota.b2,
          b3: nota.b3,
          b4: nota.b4,
          recuperacao: nota.recuperacao,
        }
      })
    }

    // Montar payload para o componente PDF
    const diarioData = {
      escola,
      ano_letivo: anoLetivo,
      bimestres: bimestres || [],
      turma,
      disciplina,
      professor,
      alunos: alunos || [],
      aulas: aulas || [],
      frequencia: frequenciaMap,
      notas: notasMap,
    }

    // Renderizar PDF
    const pdfStream = await renderToStream(React.createElement(DiarioPDF, { data: diarioData }))

    // Retornar como response
    return new NextResponse(pdfStream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="diario-${turma?.nome}-${anoLetivo?.ano}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}
