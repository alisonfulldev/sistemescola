import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'

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
    const [turmaRes, disciplinaRes, anoRes, alunosRes, aulasRes, notasRes, escolaRes, bimestresRes] =
      await Promise.all([
        supabase.from('turmas').select('*').eq('id', turmaId).single(),
        supabase.from('disciplinas').select('*').eq('id', disciplinaId).single(),
        supabase.from('anos_letivos').select('*').eq('id', anoLetivoId).single(),
        supabase.from('alunos').select('id, numero_chamada, nome_completo')
          .eq('turma_id', turmaId).eq('ativo', true).order('numero_chamada'),
        supabase.from('aulas').select('id, data, horario_inicio, horario_fim, conteudo_programatico, atividades_desenvolvidas, bimestre')
          .eq('turma_id', turmaId).eq('disciplina_id', disciplinaId).order('data'),
        supabase.from('notas').select('aluno_id, b1, b2, b3, b4, recuperacao').eq('disciplina_id', disciplinaId),
        supabase.from('escola').select('*').limit(1).single(),
        supabase.from('bimestres').select('numero, data_inicio, data_fim')
          .eq('ano_letivo_id', anoLetivoId).order('numero'),
      ])

    const turma = turmaRes.data
    const disciplina = disciplinaRes.data
    const anoLetivo = anoRes.data
    const alunos = alunosRes.data || []
    const aulas = aulasRes.data || []
    const notas = notasRes.data || []
    const escola = escolaRes.data
    const bimestres = bimestresRes.data || []

    // Buscar professor
    const { data: professor } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', (disciplina as any)?.professor_id)
      .single()

    // Buscar frequência
    const frequenciaMap: { [alunoId: string]: { [date: string]: string } } = {}
    if (aulas.length > 0) {
      const { data: chamadas } = await supabase
        .from('chamadas')
        .select('id, aula_id')
        .in('aula_id', (aulas as any[]).map((a: any) => a.id))

      if (chamadas && chamadas.length > 0) {
        const { data: registros } = await supabase
          .from('registros_chamada')
          .select('aluno_id, status, chamada_id')
          .in('chamada_id', (chamadas as any[]).map((c: any) => c.id))

        if (registros) {
          (registros as any[]).forEach((reg: any) => {
            const aula = (aulas as any[]).find((a: any) =>
              (chamadas as any[]).find((c: any) => c.id === reg.chamada_id)?.aula_id === a.id
            )
            if (aula) {
              if (!frequenciaMap[reg.aluno_id]) frequenciaMap[reg.aluno_id] = {}
              frequenciaMap[reg.aluno_id][aula.data] = reg.status || 'falta'
            }
          })
        }
      }
    }

    // Criar PDF com pdfkit
    const doc = new PDFDocument({ bufferPages: true })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    // PÁGINA 1: CAPA
    doc.fontSize(20).font('Helvetica-Bold').text('DIÁRIO DE CLASSE', { align: 'center' }).moveDown()
    doc.fontSize(12).font('Helvetica').text('Estudapp — Plataforma Educacional', { align: 'center' }).moveDown(2)

    doc.fontSize(10).font('Helvetica-Bold').text('ESCOLA', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text(((escola as any)?.nome_oficial || 'Não informado'), 0, doc.y, { width: 500 }).moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('MUNICÍPIO', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text(((escola as any)?.municipio || ''), 0, doc.y, { width: 500 }).moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('ANO LETIVO', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text(`${(anoLetivo as any)?.ano || new Date().getFullYear()}`, 0, doc.y, { width: 500 }).moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('TURMA', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text((turma as any)?.nome || '', 0, doc.y, { width: 500 }).moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('SÉRIE', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text(`${(turma as any)?.serie}º ${(turma as any)?.turma_letra || ''}`, 0, doc.y, { width: 500 }).moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('DISCIPLINA', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text((disciplina as any)?.nome || '', 0, doc.y, { width: 500 }).moveDown(0.5)

    doc.fontSize(10).font('Helvetica-Bold').text('PROFESSOR', 0, doc.y, { width: 500 })
    doc.fontSize(9).font('Helvetica').text((professor as any)?.nome || '', 0, doc.y, { width: 500 }).moveDown(1)

    doc.fontSize(10).font('Helvetica-Bold').text(`Total de alunos: ${alunos.length}`, { align: 'left' }).moveDown(0.5)
    doc.fontSize(10).font('Helvetica-Bold').text(`Aulas no período: ${aulas.length}`, { align: 'left' })

    // PÁGINA 2: LISTA DE ALUNOS
    doc.addPage()
    doc.fontSize(14).font('Helvetica-Bold').text('LISTA DE ALUNOS', { align: 'center' }).moveDown(1)

    let yPos = doc.y
    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('Nº', 50, yPos, { width: 50 })
    doc.text('NOME DO ALUNO', 100, yPos, { width: 400 })

    yPos += 15
    doc.moveTo(50, yPos - 5).lineTo(530, yPos - 5).stroke()

    doc.font('Helvetica').fontSize(8)
    alunos.slice(0, 55).forEach((aluno: any, idx: number) => {
      doc.text((aluno.numero_chamada || idx + 1).toString(), 50, yPos, { width: 50 })
      doc.text((aluno.nome_completo || '').substring(0, 60), 100, yPos, { width: 400 })
      yPos += 12
    })

    // Preencher até 55 linhas
    for (let i = alunos.length; i < 55; i++) {
      doc.text((i + 1).toString(), 50, yPos, { width: 50 })
      yPos += 12
    }

    // PÁGINA 3: FREQUÊNCIA
    if (aulas.length > 0) {
      doc.addPage()
      doc.fontSize(12).font('Helvetica-Bold').text('FREQUÊNCIA DOS ALUNOS', { align: 'center' }).moveDown(0.5)
      doc.fontSize(9).text(`Período: ${(bimestres[0] as any)?.data_inicio || ''} a ${(bimestres[0] as any)?.data_fim || ''}`, { align: 'center' }).moveDown(1)

      yPos = doc.y
      doc.fontSize(7).font('Helvetica-Bold')

      const dataColunas = [...new Set((aulas as any[]).map(a => a.data))].sort()
      doc.text('Nº', 30, yPos, { width: 30 })
      let xPos = 65
      dataColunas.forEach(data => {
        doc.text(data.slice(8, 10), xPos, yPos, { width: 20 })
        xPos += 20
      })

      yPos += 12
      doc.moveTo(30, yPos - 5).lineTo(530, yPos - 5).stroke()

      doc.font('Helvetica').fontSize(6)
      alunos.forEach((aluno: any) => {
        doc.text((aluno.numero_chamada || '').toString(), 30, yPos, { width: 30 })
        xPos = 65
        dataColunas.forEach(data => {
          const status = frequenciaMap[aluno.id]?.[data]
          const symbol = status === 'presente' ? 'P' : status === 'falta' ? 'F' : 'J'
          doc.text(symbol, xPos, yPos, { width: 20 })
          xPos += 20
        })
        yPos += 10
        if (yPos > 750) {
          doc.addPage()
          yPos = 50
        }
      })
    }

    // PÁGINA 4: CONTEÚDO PROGRAMÁTICO
    if (aulas.length > 0) {
      doc.addPage()
      doc.fontSize(12).font('Helvetica-Bold').text('CONTEÚDO PROGRAMÁTICO', { align: 'center' }).moveDown(1)

      doc.fontSize(8).font('Helvetica-Bold')
      yPos = doc.y
      doc.text('Data', 50, yPos, { width: 80 })
      doc.text('Conteúdo / Atividades', 140, yPos, { width: 380 })
      yPos += 12
      doc.moveTo(50, yPos - 5).lineTo(530, yPos - 5).stroke()

      doc.font('Helvetica').fontSize(7)
      ;(aulas as any[]).forEach(aula => {
        doc.text(aula.data, 50, yPos, { width: 80 })
        const conteudo = (aula.conteudo_programatico || aula.atividades_desenvolvidas || '—').substring(0, 100)
        doc.text(conteudo, 140, yPos, { width: 380 })
        yPos += 15
        if (yPos > 750) {
          doc.addPage()
          yPos = 50
        }
      })
    }

    // PÁGINA 5: NOTAS
    doc.addPage()
    doc.fontSize(12).font('Helvetica-Bold').text('NOTAS POR BIMESTRE', { align: 'center' }).moveDown(1)

    doc.fontSize(7).font('Helvetica-Bold')
    yPos = doc.y
    doc.text('Nº', 40, yPos, { width: 30 })
    doc.text('B1', 75, yPos, { width: 25 })
    doc.text('B2', 105, yPos, { width: 25 })
    doc.text('B3', 135, yPos, { width: 25 })
    doc.text('B4', 165, yPos, { width: 25 })
    doc.text('Rec', 195, yPos, { width: 25 })
    doc.text('Faltas', 225, yPos, { width: 30 })

    yPos += 12
    doc.moveTo(40, yPos - 5).lineTo(530, yPos - 5).stroke()

    doc.font('Helvetica').fontSize(6)
    alunos.forEach((aluno: any) => {
      const notaAluno = notas.find((n: any) => n.aluno_id === aluno.id)
      const faltas = Object.values(frequenciaMap[aluno.id] || {}).filter((s: any) => s === 'falta').length

      doc.text((aluno.numero_chamada || '').toString(), 40, yPos, { width: 30 })
      doc.text((notaAluno?.b1 || '—').toString(), 75, yPos, { width: 25 })
      doc.text((notaAluno?.b2 || '—').toString(), 105, yPos, { width: 25 })
      doc.text((notaAluno?.b3 || '—').toString(), 135, yPos, { width: 25 })
      doc.text((notaAluno?.b4 || '—').toString(), 165, yPos, { width: 25 })
      doc.text((notaAluno?.recuperacao || '—').toString(), 195, yPos, { width: 25 })
      doc.text(faltas.toString(), 225, yPos, { width: 30 })

      yPos += 10
      if (yPos > 750) {
        doc.addPage()
        yPos = 50
      }
    })

    // PÁGINA 6: ASSINATURA
    doc.addPage()
    doc.fontSize(12).font('Helvetica-Bold').text('PROFESSOR RESPONSÁVEL', { align: 'left' }).moveDown(2)
    doc.fontSize(9).text('_________________________________________', { align: 'left' }).moveDown(0.5)
    doc.fontSize(9).font('Helvetica').text((professor as any)?.nome || '', { align: 'left' }).moveDown(0.3)
    doc.fontSize(7).text('Assinatura', { align: 'left' })

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="diario-${(turma as any)?.nome || 'diario'}-${(anoLetivo as any)?.ano || new Date().getFullYear()}.pdf"`,
            },
          })
        )
      })
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}
