import html2pdf from 'html2pdf.js'

export async function gerarDiarioPDF(data: any) {
  const element = document.createElement('div')
  element.innerHTML = criarHTML(data)

  const opt: any = {
    margin: 10,
    filename: `Diario-${data.turma?.nome}-${data.ano_letivo?.ano}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
  }

  ;(html2pdf() as any).set(opt).from(element).save()
}

function criarHTML(data: any) {
  const alunos = data.alunos || []
  const aulas = data.aulas || []
  const notas = data.notas || {}
  const frequencia = data.frequencia || {}
  const bimestres = data.bimestres || []
  const turma = data.turma
  const anoLetivo = data.ano_letivo
  const professor = data.professor
  const escola = data.escola

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10px; }
          .page { page-break-after: always; padding: 20px; min-height: 280mm; }
          .header { text-align: center; font-weight: bold; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #000; padding: 4px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .capa { display: flex; flex-direction: column; gap: 10px; }
          .info-line { display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <!-- PÁGINA 1: CAPA -->
        <div class="page">
          <div class="capa">
            <div class="info-line">
              <div><b>TURNO:</b> ${turma?.turno?.substring(0, 3).toUpperCase() || 'MAT'}</div>
              <div><b>ENSINO:</b> ${turma?.grau === 'EF' ? 'EF' : 'EM'}</div>
              <div><b>ANO:</b> ${anoLetivo?.ano || 2026}</div>
            </div>
            <div class="info-line">
              <div><b>SÉRIE:</b> ${turma?.serie}º ${turma?.turma_letra || 'A'}</div>
            </div>
            <hr>
            <div><b>ESCOLA:</b> ${escola?.nome_oficial || 'Não informado'}</div>
            <div><b>MUNICÍPIO:</b> ${escola?.municipio || ''}</div>
            <div><b>DISCIPLINA:</b> ${data.disciplina?.nome || ''}</div>
            <div><b>PROFESSOR:</b> ${professor?.nome || ''}</div>
            <div><b>TOTAL DE ALUNOS:</b> ${alunos.length}</div>
            <div><b>AULAS NO PERÍODO:</b> ${aulas.length}</div>
          </div>
        </div>

        <!-- PÁGINA 2: LISTA DE ALUNOS -->
        <div class="page">
          <h3 style="text-align: center;">LISTA DE ALUNOS</h3>
          <table>
            <tr><th>Nº</th><th>NOME COMPLETO</th></tr>
            ${alunos
              .slice(0, 55)
              .map(
                (a: any, i: number) =>
                  `<tr><td>${(a.numero_chamada || i + 1).toString().padStart(2, '0')}</td><td>${a.nome_completo || ''}</td></tr>`
              )
              .join('')}
            ${Array.from({ length: Math.max(0, 55 - alunos.length) })
              .map((_, i) => `<tr><td>${(alunos.length + i + 1).toString().padStart(2, '0')}</td><td></td></tr>`)
              .join('')}
          </table>
        </div>

        <!-- FREQUÊNCIA E CONTEÚDO POR BIMESTRE -->
        ${bimestres
          .map((bim: any) => {
            const aulasB = aulas.filter((a: any) => a.bimestre === bim.numero).sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
            const datas: string[] = [...new Set(aulasB.map((a: any) => a.data))] as string[]
            datas.sort()

            return `
              <!-- FREQUÊNCIA BIMESTRE ${bim.numero} -->
              <div class="page">
                <h3 style="text-align: center;">FREQUÊNCIA — BIMESTRE ${bim.numero}</h3>
                <p style="text-align: center; font-size: 9px;">${bim.data_inicio} a ${bim.data_fim}</p>
                <table style="font-size: 8px;">
                  <tr>
                    <th>Nº</th>
                    ${datas.map((d: string) => `<th>${d.slice(8, 10)}</th>`).join('')}
                  </tr>
                  ${alunos
                    .map((a: any) => {
                      return `<tr>
                        <td>${(a.numero_chamada || '').toString().padStart(2, '0')}</td>
                        ${datas
                          .map((d: string) => {
                            const status = frequencia[a.id]?.[d]
                            const symbol = status === 'presente' ? 'P' : status === 'falta' ? 'F' : 'J'
                            return `<td>${symbol}</td>`
                          })
                          .join('')}
                      </tr>`
                    })
                    .join('')}
                </table>
              </div>

              <!-- CONTEÚDO BIMESTRE ${bim.numero} -->
              <div class="page">
                <h3 style="text-align: center;">CONTEÚDO PROGRAMÁTICO — BIMESTRE ${bim.numero}</h3>
                <table>
                  <tr><th>Data</th><th>Conteúdo / Atividades</th></tr>
                  ${aulasB.map((a: any) => `<tr><td>${a.data}</td><td>${(a.conteudo_programatico || a.atividades_desenvolvidas || '—').substring(0, 100)}</td></tr>`).join('')}
                </table>
              </div>
            `
          })
          .join('')}

        <!-- PÁGINA: AVALIAÇÃO -->
        <div class="page">
          <h3 style="text-align: center;">AVALIAÇÃO — NOTAS</h3>
          <table style="font-size: 8px;">
            <tr>
              <th>Nº</th><th>B1</th><th>B2</th><th>B3</th><th>B4</th><th>Rec</th><th>Faltas</th>
            </tr>
            ${alunos
              .map((a: any) => {
                const n = notas[a.id] || {}
                const faltas = Object.values(frequencia[a.id] || {}).filter((s: any) => s === 'falta').length
                return `<tr>
                  <td>${(a.numero_chamada || '').toString().padStart(2, '0')}</td>
                  <td>${n.b1 || '—'}</td>
                  <td>${n.b2 || '—'}</td>
                  <td>${n.b3 || '—'}</td>
                  <td>${n.b4 || '—'}</td>
                  <td>${n.recuperacao || '—'}</td>
                  <td>${faltas}</td>
                </tr>`
              })
              .join('')}
          </table>
        </div>

        <!-- PÁGINA: ASSINATURA -->
        <div class="page">
          <h3>PROFESSOR RESPONSÁVEL</h3>
          <div style="margin-top: 40px;">
            <div style="border-bottom: 1px solid #000; width: 200px; height: 30px;"></div>
            <div style="margin-top: 10px;">${professor?.nome || ''}</div>
            <div style="font-size: 8px;">Assinatura</div>
          </div>
          <div style="margin-top: 40px;">
            <div><b>AULAS</b></div>
            <div>Previstas: ${aulas.length}</div>
            <div>Realizadas: ${aulas.length}</div>
          </div>
        </div>
      </body>
    </html>
  `
}
