import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  pageLandscape: {
    padding: 20,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottom: '1 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    marginBottom: 3,
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 5,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginVertical: 10,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#000',
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellSmall: {
    padding: 2,
    borderRightWidth: 1,
    borderColor: '#000',
    fontSize: 7,
    textAlign: 'center',
  },
  smallText: {
    fontSize: 7,
  },
  section: {
    marginTop: 15,
    marginBottom: 10,
  },
})

interface DiarioData {
  escola?: { nome_oficial?: string; municipio?: string; diretor?: string }
  ano_letivo?: { ano?: number; data_inicio?: string; data_fim?: string }
  bimestres?: Array<{ numero: number; data_inicio: string; data_fim: string }>
  turma?: { nome?: string; serie?: number; turma_letra?: string; turno?: string; grau?: string }
  disciplina?: { nome?: string }
  professor?: { nome?: string }
  alunos?: Array<{ id: string; numero_chamada?: number; nome_completo?: string }>
  aulas?: Array<{
    id: string
    data: string
    horario_inicio?: string
    horario_fim?: string
    conteudo_programatico?: string
    atividades_desenvolvidas?: string
    bimestre?: number
  }>
  frequencia?: { [alunoId: string]: { [data: string]: 'presente' | 'falta' | 'justificada' } }
  notas?: { [alunoId: string]: { b1?: number; b2?: number; b3?: number; b4?: number; recuperacao?: number } }
}

export function DiarioPDF({ data }: { data: DiarioData }) {
  const alunosOrdenados = (data.alunos || []).sort((a, b) => (a.numero_chamada || 999) - (b.numero_chamada || 999))
  const aulasOrdenadas = (data.aulas || []).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
  const bimestres = data.bimestres || []

  // Agrupar aulas por bimestre
  const aulasPorBimestre: { [key: number]: typeof aulasOrdenadas } = {}
  aulasOrdenadas.forEach((aula) => {
    const bim = aula.bimestre || 1
    if (!aulasPorBimestre[bim]) aulasPorBimestre[bim] = []
    aulasPorBimestre[bim].push(aula)
  })

  // Agrupar frequência por bimestre e data
  const frequenciaPorBimestre: { [key: number]: { [data: string]: string } } = {}
  if (data.frequencia) {
    Object.entries(data.frequencia).forEach(([alunoId, dias]) => {
      Object.entries(dias).forEach(([data, status]) => {
        const aula = aulasOrdenadas.find((a) => a.data === data)
        const bim = aula?.bimestre || 1
        if (!frequenciaPorBimestre[bim]) frequenciaPorBimestre[bim] = {}
        frequenciaPorBimestre[bim][data] = status
      })
    })
  }

  return (
    <Document>
      {/* Capa */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>DIÁRIO DE CLASSE</Text>
          <Text style={styles.subtitle}>Estudapp — Plataforma Educacional</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>ESCOLA: {data.escola?.nome_oficial || 'Não informado'}</Text>
          <Text style={styles.label}>MUNICÍPIO: {data.escola?.municipio || ''}</Text>
          <Text style={styles.label}>DIRETOR: {data.escola?.diretor || ''}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>ANO LETIVO: {data.ano_letivo?.ano || new Date().getFullYear()}</Text>
          <Text style={styles.label}>TURMA: {data.turma?.nome || ''}</Text>
          <Text style={styles.label}>SÉRIE: {data.turma?.serie || ''}º {data.turma?.turma_letra || ''}</Text>
          <Text style={styles.label}>GRAU: {data.turma?.grau === 'EF' ? 'Ensino Fundamental' : 'Ensino Médio'}</Text>
          <Text style={styles.label}>TURNO: {data.turma?.turno || ''}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>DISCIPLINA: {data.disciplina?.nome || ''}</Text>
          <Text style={styles.label}>PROFESSOR: {data.professor?.nome || ''}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>TOTAL DE ALUNOS: {alunosOrdenados.length}</Text>
          <Text style={styles.label}>AULAS PREVISTAS: {data.aulas?.length || 0}</Text>
        </View>
      </Page>

      {/* Lista de Alunos */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>LISTA DE ALUNOS</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCell, { flex: 0.2 }]}>
              <Text>Nº</Text>
            </View>
            <View style={[styles.tableCell, { flex: 1 }]}>
              <Text>NOME DO ALUNO</Text>
            </View>
          </View>

          {alunosOrdenados.slice(0, 55).map((aluno, idx) => (
            <View key={aluno.id || idx} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 0.2 }]}>
                <Text>{aluno.numero_chamada || idx + 1}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text>{aluno.nome_completo || ''}</Text>
              </View>
            </View>
          ))}

          {/* Preencher até 55 linhas */}
          {Array.from({ length: Math.max(0, 55 - alunosOrdenados.length) }).map((_, idx) => (
            <View key={`empty-${idx}`} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 0.2 }]}>
                <Text>{alunosOrdenados.length + idx + 1}</Text>
              </View>
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text></Text>
              </View>
            </View>
          ))}
        </View>
      </Page>

      {/* Frequência por Bimestre */}
      {bimestres.map((bimestre) => {
        const aulasDoB = aulasPorBimestre[bimestre.numero] || []
        const datas = [...new Set(aulasDoB.map((a) => a.data))].sort()

        return (
          <Page key={`freq-${bimestre.numero}`} size="A4" orientation="landscape" style={styles.pageLandscape}>
            <View style={styles.header}>
              <Text style={styles.subtitle}>
                FREQUÊNCIA DOS ALUNOS — BIMESTRE {bimestre.numero} ({bimestre.data_inicio} a {bimestre.data_fim})
              </Text>
            </View>

            <View style={{ fontSize: 6, overflow: 'hidden' }}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={[styles.tableCellSmall, { flex: 0.15, minWidth: 30 }]}>
                  <Text>Nº</Text>
                </View>
                {datas.map((data) => (
                  <View key={data} style={[styles.tableCellSmall, { flex: 0.08, minWidth: 20 }]}>
                    <Text style={styles.smallText}>{data.slice(8, 10)}</Text>
                  </View>
                ))}
              </View>

              {alunosOrdenados.map((aluno) => (
                <View key={aluno.id} style={styles.tableRow}>
                  <View style={[styles.tableCellSmall, { flex: 0.15, minWidth: 30 }]}>
                    <Text>{aluno.numero_chamada || ''}</Text>
                  </View>
                  {datas.map((data) => {
                    const status = data.frequencia?.[aluno.id]?.[data] || ''
                    const symbol = status === 'presente' ? 'P' : status === 'falta' ? 'F' : 'J'
                    return (
                      <View key={`${aluno.id}-${data}`} style={[styles.tableCellSmall, { flex: 0.08, minWidth: 20 }]}>
                        <Text>{symbol}</Text>
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </Page>
        )
      })}

      {/* Conteúdo Programático por Bimestre */}
      {bimestres.map((bimestre) => {
        const aulasDoB = aulasPorBimestre[bimestre.numero] || []

        return (
          <Page key={`conteudo-${bimestre.numero}`} size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.subtitle}>
                RESUMO DO CONTEÚDO PROGRAMÁTICO — BIMESTRE {bimestre.numero}
              </Text>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={[styles.tableCell, { flex: 0.2 }]}>
                  <Text>Data</Text>
                </View>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <Text>Conteúdo / Atividades</Text>
                </View>
              </View>

              {aulasDoB.map((aula) => (
                <View key={aula.id} style={styles.tableRow}>
                  <View style={[styles.tableCell, { flex: 0.2 }]}>
                    <Text>{aula.data}</Text>
                  </View>
                  <View style={[styles.tableCell, { flex: 1 }]}>
                    <Text style={styles.smallText}>
                      {aula.conteudo_programatico || aula.atividades_desenvolvidas || '—'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Page>
        )
      })}

      {/* Avaliação */}
      <Page size="A4" orientation="landscape" style={styles.pageLandscape}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>AVALIAÇÃO — NOTAS POR BIMESTRE</Text>
        </View>

        <View style={{ fontSize: 7, overflow: 'hidden' }}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={[styles.tableCellSmall, { flex: 0.15, minWidth: 40 }]}>
              <Text>Nº</Text>
            </View>
            <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
              <Text>B1</Text>
            </View>
            <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
              <Text>B2</Text>
            </View>
            <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
              <Text>B3</Text>
            </View>
            <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
              <Text>B4</Text>
            </View>
            <View style={[styles.tableCellSmall, { flex: 0.08 }]}>
              <Text>Rec</Text>
            </View>
            <View style={[styles.tableCellSmall, { flex: 0.08 }]}>
              <Text>Faltas</Text>
            </View>
          </View>

          {alunosOrdenados.map((aluno) => {
            const notasAluno = data.notas?.[aluno.id] || {}
            const faltas = Object.values(data.frequencia?.[aluno.id] || {}).filter((s) => s === 'falta').length

            return (
              <View key={aluno.id} style={styles.tableRow}>
                <View style={[styles.tableCellSmall, { flex: 0.15, minWidth: 40 }]}>
                  <Text>{aluno.numero_chamada || ''}</Text>
                </View>
                <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
                  <Text>{notasAluno.b1 || '—'}</Text>
                </View>
                <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
                  <Text>{notasAluno.b2 || '—'}</Text>
                </View>
                <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
                  <Text>{notasAluno.b3 || '—'}</Text>
                </View>
                <View style={[styles.tableCellSmall, { flex: 0.05 }]}>
                  <Text>{notasAluno.b4 || '—'}</Text>
                </View>
                <View style={[styles.tableCellSmall, { flex: 0.08 }]}>
                  <Text>{notasAluno.recuperacao || '—'}</Text>
                </View>
                <View style={[styles.tableCellSmall, { flex: 0.08 }]}>
                  <Text>{faltas}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </Page>

      {/* Assinatura */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.label}>PROFESSOR RESPONSÁVEL</Text>
          <Text style={{ marginTop: 30, marginBottom: 50 }}>_________________________________</Text>
          <Text>{data.professor?.nome || ''}</Text>
          <Text style={styles.smallText}>Assinatura</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>AULAS</Text>
          <Text style={styles.smallText}>Previstas: {data.aulas?.length || 0}</Text>
          <Text style={styles.smallText}>Realizadas: {aulasOrdenadas.length}</Text>
        </View>
      </Page>
    </Document>
  )
}
