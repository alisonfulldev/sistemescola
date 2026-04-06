import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['secretaria', 'admin', 'diretor'].includes(perfil?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const tipo = req.nextUrl.searchParams.get('tipo') || 'geral'
  const turmaId = req.nextUrl.searchParams.get('turma_id')
  const alunoId = req.nextUrl.searchParams.get('aluno_id')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const wb = XLSX.utils.book_new()

  if (tipo === 'aluno' && alunoId) {
    await exportarAluno(admin, alunoId, wb)
  } else if (tipo === 'turma' && turmaId) {
    await exportarTurma(admin, turmaId, wb)
  } else {
    await exportarGeral(admin, wb)
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const nomeArquivo = `meu-aluno-${tipo}-${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}

// ─── Exportar aluno específico ───────────────────────────────────────────────
async function exportarAluno(admin: any, alunoId: string, wb: XLSX.WorkBook) {
  const { data: aluno } = await admin
    .from('alunos')
    .select('*, turmas(nome, turno)')
    .eq('id', alunoId)
    .single()

  const { data: vinculos } = await admin
    .from('responsaveis_alunos')
    .select('usuarios(nome, email)')
    .eq('aluno_id', alunoId)

  const { data: registros } = await admin
    .from('registros_chamada')
    .select(`
      id, status, observacao, motivo_alteracao, horario_evento,
      chamadas(aulas(data, horario_inicio, horario_fim, turmas(nome), disciplinas(nome), usuarios(nome))),
      justificativas_falta(motivo, criada_em, usuarios!responsavel_id(nome))
    `)
    .eq('aluno_id', alunoId)

  // Aba: Dados do aluno
  const responsaveis = (vinculos || []).map((v: any) => v.usuarios?.nome).join(', ')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valor'],
    ['Nome completo', aluno?.nome_completo],
    ['Matrícula', aluno?.matricula],
    ['Turma', aluno?.turmas?.nome],
    ['Turno', aluno?.turmas?.turno],
    ['Responsável(eis)', responsaveis],
    ['Contato', aluno?.contato_responsavel || ''],
    ['Status', aluno?.ativo ? 'Ativo' : 'Inativo'],
    ['Data de exportação', new Date().toLocaleString('pt-BR')],
  ]), 'Dados do Aluno')

  // Aba: Histórico de chamadas
  const total = (registros || []).length
  const presentes = (registros || []).filter((r: any) => r.status === 'presente').length
  const faltas = (registros || []).filter((r: any) => r.status === 'falta').length
  const justificadas = (registros || []).filter((r: any) => r.status === 'justificada').length
  const freq = total > 0 ? Math.round(((presentes + justificadas) / total) * 100) : 0

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valor'],
    ['Total de registros', total],
    ['Presenças', presentes],
    ['Faltas', faltas],
    ['Justificadas', justificadas],
    ['Frequência (%)', `${freq}%`],
    ['Situação', freq >= 75 ? 'Regular' : 'Em risco de reprovação'],
  ]), 'Resumo de Frequência')

  const histRows = [['Data', 'Turma', 'Disciplina', 'Professor', 'Status', 'Horário', 'Observação', 'Motivo de Alteração', 'Justificativa do Responsável', 'Data da Justificativa']]
  for (const r of (registros || []).sort((a: any, b: any) => (b.chamadas?.aulas?.data || '').localeCompare(a.chamadas?.aulas?.data || ''))) {
    const aula = r.chamadas?.aulas
    const just = r.justificativas_falta?.[0]
    histRows.push([
      aula?.data ? new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      aula?.turmas?.nome || '',
      aula?.disciplinas?.nome || '',
      aula?.usuarios?.nome || '',
      r.status === 'presente' ? 'Presente' : r.status === 'falta' ? 'Falta' : 'Justificada',
      aula?.horario_inicio ? `${aula.horario_inicio.slice(0,5)} – ${aula.horario_fim?.slice(0,5)}` : '',
      r.observacao || '',
      r.motivo_alteracao || '',
      just?.motivo || '',
      just?.criada_em ? new Date(just.criada_em).toLocaleString('pt-BR') : '',
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histRows), 'Histórico de Chamadas')
}

// ─── Exportar turma completa ─────────────────────────────────────────────────
async function exportarTurma(admin: any, turmaId: string, wb: XLSX.WorkBook) {
  const { data: turma } = await admin.from('turmas').select('nome, turno').eq('id', turmaId).single()
  const { data: alunos } = await admin.from('alunos').select('id, nome_completo, matricula, contato_responsavel').eq('turma_id', turmaId).eq('ativo', true).order('nome_completo')

  if (!alunos?.length) return

  const { data: registros } = await admin
    .from('registros_chamada')
    .select('aluno_id, status, chamadas(aulas(data, turma_id))')
    .in('aluno_id', alunos.map((a: any) => a.id))
    .eq('chamadas.aulas.turma_id', turmaId)

  // Frequência por aluno
  const freqMap: Record<string, any> = {}
  for (const a of alunos) {
    freqMap[a.id] = { total: 0, presentes: 0, faltas: 0, justificadas: 0 }
  }
  for (const r of (registros || [])) {
    if (!freqMap[r.aluno_id]) continue
    freqMap[r.aluno_id].total++
    if (r.status === 'presente') freqMap[r.aluno_id].presentes++
    else if (r.status === 'falta') freqMap[r.aluno_id].faltas++
    else if (r.status === 'justificada') freqMap[r.aluno_id].justificadas++
  }

  const rows = [['Nome', 'Matrícula', 'Turma', 'Turno', 'Total Aulas', 'Presenças', 'Faltas', 'Justificadas', 'Frequência (%)', 'Situação', 'Contato Responsável']]
  for (const a of alunos) {
    const f = freqMap[a.id]
    const pct = f.total > 0 ? Math.round(((f.presentes + f.justificadas) / f.total) * 100) : 0
    rows.push([
      a.nome_completo,
      a.matricula,
      turma?.nome || '',
      turma?.turno || '',
      f.total,
      f.presentes,
      f.faltas,
      f.justificadas,
      `${pct}%`,
      pct >= 75 ? 'Regular' : 'Em risco',
      a.contato_responsavel || '',
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `Turma ${turma?.nome}`)
}

// ─── Exportar geral (todas as turmas) ───────────────────────────────────────
async function exportarGeral(admin: any, wb: XLSX.WorkBook) {
  const { data: alunos } = await admin
    .from('alunos')
    .select('id, nome_completo, matricula, contato_responsavel, ativo, turmas(id, nome, turno)')
    .order('nome_completo')

  const { data: registros } = await admin
    .from('registros_chamada')
    .select('aluno_id, status')

  const { data: justificativas } = await admin
    .from('justificativas_falta')
    .select('id, motivo, status, criada_em, registro_id, usuarios!responsavel_id(nome), registros_chamada(aluno_id, chamadas(aulas(data, turmas(nome), usuarios(nome))))')
    .order('criada_em', { ascending: false })

  const { data: chamadas } = await admin
    .from('chamadas')
    .select('id, status, iniciada_em, concluida_em, aulas(data, turmas(nome), disciplinas(nome), usuarios(nome))')
    .order('iniciada_em', { ascending: false })

  // Aba: Todos os alunos
  const freqMap: Record<string, any> = {}
  for (const a of (alunos || [])) freqMap[a.id] = { total: 0, presentes: 0, faltas: 0, justificadas: 0 }
  for (const r of (registros || [])) {
    if (!freqMap[r.aluno_id]) continue
    freqMap[r.aluno_id].total++
    if (r.status === 'presente') freqMap[r.aluno_id].presentes++
    else if (r.status === 'falta') freqMap[r.aluno_id].faltas++
    else if (r.status === 'justificada') freqMap[r.aluno_id].justificadas++
  }

  const alunosRows = [['Nome', 'Matrícula', 'Turma', 'Turno', 'Status', 'Total Aulas', 'Presenças', 'Faltas', 'Justificadas', 'Frequência (%)', 'Situação', 'Contato Responsável']]
  for (const a of (alunos || [])) {
    const f = freqMap[a.id] || { total: 0, presentes: 0, faltas: 0, justificadas: 0 }
    const pct = f.total > 0 ? Math.round(((f.presentes + f.justificadas) / f.total) * 100) : 0
    alunosRows.push([
      a.nome_completo, a.matricula,
      a.turmas?.nome || '', a.turmas?.turno || '',
      a.ativo ? 'Ativo' : 'Inativo',
      f.total, f.presentes, f.faltas, f.justificadas,
      `${pct}%`,
      f.total === 0 ? 'Sem registros' : pct >= 75 ? 'Regular' : 'Em risco',
      a.contato_responsavel || '',
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alunosRows), 'Alunos e Frequência')

  // Aba: Justificativas
  const justRows = [['Data da Falta', 'Aluno', 'Turma', 'Professor', 'Motivo', 'Responsável', 'Data da Justificativa']]
  for (const j of (justificativas || [])) {
    const reg = j.registros_chamada
    const aula = reg?.chamadas?.aulas
    justRows.push([
      aula?.data ? new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      '', // aluno_id precisa de join extra — ver abaixo
      aula?.turmas?.nome || '',
      aula?.usuarios?.nome || '',
      j.motivo || '',
      j.usuarios?.nome || '',
      new Date(j.criada_em).toLocaleString('pt-BR'),
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(justRows), 'Justificativas')

  // Aba: Chamadas realizadas
  const chamRows = [['Data', 'Turma', 'Disciplina', 'Professor', 'Status', 'Iniciada em', 'Concluída em']]
  for (const c of (chamadas || [])) {
    const aula = c.aulas
    chamRows.push([
      aula?.data ? new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      aula?.turmas?.nome || '',
      aula?.disciplinas?.nome || '',
      aula?.usuarios?.nome || '',
      c.status === 'concluida' ? 'Concluída' : c.status === 'em_andamento' ? 'Em andamento' : 'Pendente',
      c.iniciada_em ? new Date(c.iniciada_em).toLocaleString('pt-BR') : '',
      c.concluida_em ? new Date(c.concluida_em).toLocaleString('pt-BR') : '',
    ])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chamRows), 'Chamadas Realizadas')

  // Aba: Metadados
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Relatório gerado em', new Date().toLocaleString('pt-BR')],
    ['Sistema', 'Meu Aluno'],
    ['Total de alunos', (alunos || []).length],
    ['Total de chamadas', (chamadas || []).length],
    ['Total de justificativas', (justificativas || []).length],
  ]), 'Metadados')
}
