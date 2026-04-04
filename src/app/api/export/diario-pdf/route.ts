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

    const turma = turmaRes.data as any
    const disciplina = disciplinaRes.data as any
    const anoLetivo = anoRes.data as any
    const alunos = (alunosRes.data || []) as any[]
    const aulas = (aulasRes.data || []) as any[]
    const notas = (notasRes.data || []) as any[]
    const escola = escolaRes.data as any
    const bimestres = (bimestresRes.data || []) as any[]

    // Buscar professor
    const { data: professor } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', disciplina?.professor_id)
      .single()

    // Buscar frequência
    const frequenciaMap: { [alunoId: string]: { [date: string]: string } } = {}
    if (aulas.length > 0) {
      const { data: chamadas } = await supabase
        .from('chamadas')
        .select('id, aula_id')
        .in('aula_id', aulas.map((a: any) => a.id))

      if (chamadas && chamadas.length > 0) {
        const { data: registros } = await supabase
          .from('registros_chamada')
          .select('aluno_id, status, chamada_id')
          .in('chamada_id', (chamadas as any[]).map((c: any) => c.id))

        if (registros) {
          (registros as any[]).forEach((reg: any) => {
            const aula = aulas.find((a: any) =>
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

    // Criar PDF
    const doc = new PDFDocument({ size: 'A4', margin: 30 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    const agruparAulasPorBimestre = (aulas: any[]) => {
      const mapa: { [key: number]: any[] } = {}
      aulas.forEach(aula => {
        const bim = aula.bimestre || 1
        if (!mapa[bim]) mapa[bim] = []
        mapa[bim].push(aula)
      })
      return mapa
    }

    const aulasPorBimestre = agruparAulasPorBimestre(aulas)

    // ========== PÁGINA 1: CAPA ==========
    doc.fontSize(11).font('Helvetica-Bold').text('TURNO', 50, 50, { width: 100 })
    doc.fontSize(10).font('Helvetica').text(turma?.turno?.substring(0, 3).toUpperCase() || 'MAT', 50, 65, { width: 100 })

    doc.fontSize(11).font('Helvetica-Bold').text('ENSINO', 200, 50, { width: 100 })
    doc.fontSize(10).font('Helvetica').text((turma?.grau === 'EF' ? 'EF' : 'EM') || 'EF', 200, 65, { width: 100 })

    doc.fontSize(11).font('Helvetica-Bold').text('ANO', 350, 50, { width: 100 })
    doc.fontSize(10).font('Helvetica').text((anoLetivo?.ano || 2026).toString(), 350, 65, { width: 100 })

    doc.fontSize(11).font('Helvetica-Bold').text('CLASSE M', 50, 100, { width: 100 })
    doc.fontSize(10).font('Helvetica').text(turma?.turma_letra || 'A', 50, 115, { width: 100 })

    doc.fontSize(11).font('Helvetica-Bold').text('TURMA A', 200, 100, { width: 100 })
    doc.fontSize(10).font('Helvetica').text(turma?.serie?.toString() || '4', 200, 115, { width: 100 })

    doc.fontSize(11).font('Helvetica-Bold').text('N° 04 CH', 350, 100, { width: 100 })
    doc.fontSize(10).font('Helvetica').text('04', 350, 115, { width: 100 })

    doc.fontSize(9).font('Helvetica-Bold').text('NOME DOS ALUNOS', 50, 180, { width: 500 })

    let yPos = 200
    alunos.slice(0, 20).forEach((aluno: any, idx: number) => {
      doc.fontSize(8).font('Helvetica')
      doc.text(`${String(idx + 1).padStart(2, '0')} ${(aluno.nome_completo || '').substring(0, 45)}`, 50, yPos, { width: 500 })
      yPos += 12
    })

    // ========== PÁGINA 2: LISTA DE ALUNOS COMPLETA ==========
    doc.addPage()
    doc.fontSize(12).font('Helvetica-Bold').text('LISTA DE ALUNOS — CHAMADA', { align: 'center' }).moveDown(1)

    yPos = doc.y
    doc.fontSize(8).font('Helvetica-Bold')
    doc.text('Nº', 50, yPos, { width: 40 })
    doc.text('NOME COMPLETO', 100, yPos, { width: 400 })

    yPos += 15
    doc.moveTo(50, yPos - 5).lineTo(530, yPos - 5).stroke()

    doc.font('Helvetica').fontSize(7)
    for (let i = 0; i < 55; i++) {
      const aluno = alunos[i]
      doc.text((aluno?.numero_chamada || i + 1).toString().padStart(2, '0'), 50, yPos, { width: 40 })
      doc.text((aluno?.nome_completo || '').substring(0, 50), 100, yPos, { width: 400 })
      yPos += 11
      if (yPos > 720) {
        doc.addPage()
        yPos = 50
      }
    }

    // ========== PÁGINAS 3-6: FREQUÊNCIA (1 por bimestre) ==========
    bimestres.forEach((bim: any) => {
      doc.addPage()
      doc.fontSize(10).font('Helvetica-Bold').text(`FREQUÊNCIA DOS ALUNOS — BIMESTRE ${bim.numero}`, { align: 'center' }).moveDown(0.5)
      doc.fontSize(8).text(`${bim.data_inicio} a ${bim.data_fim}`, { align: 'center' }).moveDown(0.5)

      const aulasDoB = aulasPorBimestre[bim.numero] || []
      const datas = [...new Set(aulasDoB.map((a: any) => a.data))].sort() as string[]

      if (datas.length > 0) {
        yPos = doc.y
        doc.fontSize(6).font('Helvetica-Bold')
        doc.text('Nº', 30, yPos, { width: 25 })
        let xCol = 60
        datas.forEach(data => {
          doc.text(data.slice(8, 10), xCol, yPos, { width: 15 })
          xCol += 15
        })

        yPos += 12
        doc.moveTo(30, yPos - 5).lineTo(510, yPos - 5).stroke()

        doc.font('Helvetica').fontSize(5)
        alunos.forEach((aluno: any) => {
          doc.text((aluno.numero_chamada || '').toString().padStart(2, '0'), 30, yPos, { width: 25 })
          xCol = 60
          datas.forEach(data => {
            const status = frequenciaMap[aluno.id]?.[data]
            const symbol = status === 'presente' ? 'P' : status === 'falta' ? 'F' : 'J'
            doc.text(symbol, xCol, yPos, { width: 15 })
            xCol += 15
          })
          yPos += 8
          if (yPos > 740) {
            doc.addPage()
            yPos = 50
          }
        })
      }
    })

    // ========== PÁGINAS 7-10: CONTEÚDO PROGRAMÁTICO (1 por bimestre) ==========
    bimestres.forEach((bim: any) => {
      doc.addPage()
      doc.fontSize(10).font('Helvetica-Bold').text(`CONTEÚDO PROGRAMÁTICO — BIMESTRE ${bim.numero}`, { align: 'center' }).moveDown(0.5)

      const aulasDoB = (aulasPorBimestre[bim.numero] || []).sort((a: any, b: any) =>
        new Date(a.data).getTime() - new Date(b.data).getTime()
      )

      yPos = doc.y
      doc.fontSize(7).font('Helvetica-Bold')
      doc.text('Data', 50, yPos, { width: 80 })
      doc.text('Conteúdo / Atividades', 140, yPos, { width: 360 })

      yPos += 12
      doc.moveTo(50, yPos - 5).lineTo(510, yPos - 5).stroke()

      doc.font('Helvetica').fontSize(6)
      aulasDoB.forEach((aula: any) => {
        const conteudo = (aula.conteudo_programatico || aula.atividades_desenvolvidas || '—').substring(0, 80)
        doc.text(aula.data, 50, yPos, { width: 80 })
        doc.text(conteudo, 140, yPos, { width: 360 })
        yPos += 13
        if (yPos > 740) {
          doc.addPage()
          yPos = 50
        }
      })
    })

    // ========== PÁGINA 11: AVALIAÇÃO ==========
    doc.addPage()
    doc.fontSize(10).font('Helvetica-Bold').text('AVALIAÇÃO — NOTAS', { align: 'center' }).moveDown(1)

    yPos = doc.y
    doc.fontSize(6).font('Helvetica-Bold')
    doc.text('Nº', 30, yPos, { width: 25 })
    doc.text('B1', 60, yPos, { width: 20 })
    doc.text('B2', 85, yPos, { width: 20 })
    doc.text('B3', 110, yPos, { width: 20 })
    doc.text('B4', 135, yPos, { width: 20 })
    doc.text('Rec', 160, yPos, { width: 20 })
    doc.text('Faltas', 185, yPos, { width: 25 })

    yPos += 12
    doc.moveTo(30, yPos - 5).lineTo(510, yPos - 5).stroke()

    doc.font('Helvetica').fontSize(5)
    alunos.forEach((aluno: any) => {
      const notaAluno = notas.find((n: any) => n.aluno_id === aluno.id)
      const faltas = Object.values(frequenciaMap[aluno.id] || {}).filter((s: any) => s === 'falta').length

      doc.text((aluno.numero_chamada || '').toString().padStart(2, '0'), 30, yPos, { width: 25 })
      doc.text((notaAluno?.b1 || '—').toString(), 60, yPos, { width: 20 })
      doc.text((notaAluno?.b2 || '—').toString(), 85, yPos, { width: 20 })
      doc.text((notaAluno?.b3 || '—').toString(), 110, yPos, { width: 20 })
      doc.text((notaAluno?.b4 || '—').toString(), 135, yPos, { width: 20 })
      doc.text((notaAluno?.recuperacao || '—').toString(), 160, yPos, { width: 20 })
      doc.text(faltas.toString(), 185, yPos, { width: 25 })

      yPos += 8
      if (yPos > 740) {
        doc.addPage()
        yPos = 50
      }
    })

    // ========== PÁGINA 12: ASSINATURA E RESUMO ==========
    doc.addPage()
    doc.fontSize(11).font('Helvetica-Bold').text('PROFESSOR RESPONSÁVEL', { align: 'left' }).moveDown(1.5)
    doc.fontSize(9).text('_________________________________________', { align: 'left' }).moveDown(0.3)
    doc.fontSize(8).font('Helvetica').text((professor as any)?.nome || '', { align: 'left' }).moveDown(0.2)
    doc.fontSize(6).font('Helvetica-Bold').text('ASSINATURA DO PROFESSOR', { align: 'left' }).moveDown(2)

    doc.fontSize(11).font('Helvetica-Bold').text('AULAS', { align: 'left' }).moveDown(0.5)
    doc.fontSize(8).font('Helvetica').text(`Previstas: ${aulas.length}`, { align: 'left' }).moveDown(0.3)
    doc.fontSize(8).font('Helvetica').text(`Realizadas: ${aulas.length}`, { align: 'left' })

    // ========== PÁGINAS 13-15: ACOMPANHAMENTO (1 por bimestre) ==========
    bimestres.forEach((bim: any) => {
      doc.addPage()
      doc.fontSize(10).font('Helvetica-Bold').text(`ACOMPANHAMENTO DO RENDIMENTO — BIMESTRE ${bim.numero}`, { align: 'center' }).moveDown(0.5)

      yPos = doc.y
      for (let i = 0; i < 55; i += 25) {
        doc.fontSize(6).font('Helvetica-Bold').text(`Nº ${String(i + 1).padStart(2, '0')} a ${String(Math.min(i + 25, 55)).padStart(2, '0')}`, 50, yPos, { width: 200 })
        yPos += 8
        for (let j = 0; j < 25; j++) {
          const num = i + j + 1
          if (num <= 55) {
            doc.fontSize(5).font('Helvetica').text(String(num).padStart(2, '0'), 50, yPos, { width: 30 })
            yPos += 6
          }
        }
        yPos += 10
      }
    })

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(
          new NextResponse(buffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="Diario-${turma?.nome || 'escolar'}-${anoLetivo?.ano || 2026}.pdf"`,
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
