import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

function adminDb() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: u } = await supabase.from('usuarios').select('perfil, ativo, escola_id').eq('id', user.id).single()
  if (!u?.ativo || !['admin', 'ti', 'diretor'].includes(u.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const db = adminDb()
  const escolaId = u.escola_id

  // ── Busca todos os dados em paralelo ─────────────────────────────────
  const [
    { data: alunos },
    { data: turmas },
    { data: disciplinas },
    { data: notas },
    { data: usuarios },
    { data: registros },
    { data: anosLetivos },
  ] = await Promise.all([
    db.from('alunos')
      .select('nome_completo, matricula, numero_chamada, situacao, nome_responsavel, contato_responsavel, turmas(nome, serie, turma_letra, grau, turno)')
      .eq('ativo', true)
      .order('nome_completo'),
    db.from('turmas')
      .select('nome, turno, grau, serie, turma_letra, aulas_previstas, ano_letivo, ativo')
      .order('nome'),
    db.from('disciplinas')
      .select('nome, curso, codigo_disciplina, ativo, usuarios(nome)')
      .order('nome'),
    db.from('notas')
      .select('b1, b2, b3, b4, nota, alunos(nome_completo, matricula, turmas(nome)), disciplinas(nome), anos_letivos(ano)')
      .order('alunos(nome_completo)'),
    db.from('usuarios')
      .select('nome, email, perfil, ativo, criado_em')
      .not('perfil', 'eq', 'ti')
      .order('nome'),
    db.from('registros_chamada')
      .select('status, alunos(nome_completo, matricula, turmas(nome))'),
    db.from('anos_letivos')
      .select('ano, data_inicio, data_fim, ativo')
      .order('ano', { ascending: false }),
  ])

  const wb = XLSX.utils.book_new()
  const fmt = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : ''

  // ── ABA 1: Alunos ─────────────────────────────────────────────────────
  const dadosAlunos = (alunos || []).map((a: any) => ({
    'Nome Completo': a.nome_completo,
    'Matrícula': a.matricula,
    'Nº Chamada': a.numero_chamada ?? '',
    'Turma': a.turmas?.nome ?? '',
    'Grau': a.turmas?.grau ?? '',
    'Série': a.turmas?.serie ? `${a.turmas.serie}º` : '',
    'Turma Letra': a.turmas?.turma_letra ?? '',
    'Turno': a.turmas?.turno ?? '',
    'Situação': a.situacao ?? 'ativo',
    'Responsável': a.nome_responsavel ?? '',
    'Contato Responsável': a.contato_responsavel ?? '',
  }))
  const wsAlunos = XLSX.utils.json_to_sheet(dadosAlunos)
  ajustarColunas(wsAlunos, dadosAlunos)
  XLSX.utils.book_append_sheet(wb, wsAlunos, 'Alunos')

  // ── ABA 2: Notas ──────────────────────────────────────────────────────
  const dadosNotas = (notas || []).map((n: any) => ({
    'Aluno': n.alunos?.nome_completo ?? '',
    'Matrícula': n.alunos?.matricula ?? '',
    'Turma': n.alunos?.turmas?.nome ?? '',
    'Disciplina': n.disciplinas?.nome ?? '',
    'Ano Letivo': n.anos_letivos?.ano ?? '',
    'B1': n.b1 ?? '',
    'B2': n.b2 ?? '',
    'B3': n.b3 ?? '',
    'B4': n.b4 ?? '',
    'Nota Final': n.nota ?? '',
    'Média': n.b1 != null && n.b2 != null && n.b3 != null && n.b4 != null
      ? Number(((n.b1 + n.b2 + n.b3 + n.b4) / 4).toFixed(1)) : '',
    'Situação': (() => {
      const media = n.b1 != null && n.b2 != null && n.b3 != null && n.b4 != null
        ? (n.b1 + n.b2 + n.b3 + n.b4) / 4 : null
      if (media === null) return ''
      return media >= 5 ? 'Aprovado' : 'Reprovado'
    })(),
  }))
  const wsNotas = XLSX.utils.json_to_sheet(dadosNotas)
  ajustarColunas(wsNotas, dadosNotas)
  XLSX.utils.book_append_sheet(wb, wsNotas, 'Notas')

  // ── ABA 3: Frequência ─────────────────────────────────────────────────
  const freqMap = new Map<string, { nome: string; matricula: string; turma: string; presente: number; falta: number; justificada: number }>()
  for (const r of (registros || []) as any[]) {
    const key = r.alunos?.matricula
    if (!key) continue
    if (!freqMap.has(key)) {
      freqMap.set(key, { nome: r.alunos.nome_completo, matricula: key, turma: r.alunos.turmas?.nome ?? '', presente: 0, falta: 0, justificada: 0 })
    }
    const entry = freqMap.get(key)!
    if (r.status === 'presente') entry.presente++
    else if (r.status === 'falta') entry.falta++
    else if (r.status === 'justificada') entry.justificada++
  }
  const dadosFreq = Array.from(freqMap.values())
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(f => {
      const total = f.presente + f.falta + f.justificada
      const pct = total > 0 ? Number(((f.presente / total) * 100).toFixed(1)) : 0
      return {
        'Aluno': f.nome,
        'Matrícula': f.matricula,
        'Turma': f.turma,
        'Total Aulas': total,
        'Presenças': f.presente,
        'Faltas': f.falta,
        'Justificadas': f.justificada,
        '% Frequência': pct,
        'Situação': pct >= 75 ? 'Regular' : 'Em risco',
      }
    })
  const wsFreq = XLSX.utils.json_to_sheet(dadosFreq)
  ajustarColunas(wsFreq, dadosFreq)
  XLSX.utils.book_append_sheet(wb, wsFreq, 'Frequência')

  // ── ABA 4: Turmas ─────────────────────────────────────────────────────
  const dadosTurmas = (turmas || []).map((t: any) => ({
    'Nome': t.nome,
    'Grau': t.grau ?? '',
    'Série': t.serie ? `${t.serie}º` : '',
    'Letra': t.turma_letra ?? '',
    'Turno': t.turno,
    'Ano Letivo': t.ano_letivo ?? '',
    'Aulas Previstas': t.aulas_previstas ?? '',
    'Status': t.ativo ? 'Ativa' : 'Inativa',
  }))
  const wsTurmas = XLSX.utils.json_to_sheet(dadosTurmas)
  ajustarColunas(wsTurmas, dadosTurmas)
  XLSX.utils.book_append_sheet(wb, wsTurmas, 'Turmas')

  // ── ABA 5: Disciplinas ────────────────────────────────────────────────
  const dadosDisciplinas = (disciplinas || []).map((d: any) => ({
    'Disciplina': d.nome,
    'Professor': (d.usuarios as any)?.nome ?? '',
    'Curso': d.curso ?? '',
    'Código': d.codigo_disciplina ?? '',
    'Status': d.ativo ? 'Ativa' : 'Inativa',
  }))
  const wsDisciplinas = XLSX.utils.json_to_sheet(dadosDisciplinas)
  ajustarColunas(wsDisciplinas, dadosDisciplinas)
  XLSX.utils.book_append_sheet(wb, wsDisciplinas, 'Disciplinas')

  // ── ABA 6: Usuários ───────────────────────────────────────────────────
  const dadosUsuarios = (usuarios || []).map((u: any) => ({
    'Nome': u.nome,
    'Email': u.email,
    'Perfil': u.perfil,
    'Status': u.ativo ? 'Ativo' : 'Inativo',
    'Criado em': u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '',
  }))
  const wsUsuarios = XLSX.utils.json_to_sheet(dadosUsuarios)
  ajustarColunas(wsUsuarios, dadosUsuarios)
  XLSX.utils.book_append_sheet(wb, wsUsuarios, 'Usuários')

  // ── ABA 7: Anos Letivos ───────────────────────────────────────────────
  const dadosAnos = (anosLetivos || []).map((a: any) => ({
    'Ano': a.ano,
    'Início': fmt(a.data_inicio),
    'Fim': fmt(a.data_fim),
    'Status': a.ativo ? 'Ativo' : 'Inativo',
  }))
  const wsAnos = XLSX.utils.json_to_sheet(dadosAnos)
  ajustarColunas(wsAnos, dadosAnos)
  XLSX.utils.book_append_sheet(wb, wsAnos, 'Anos Letivos')

  // ── Gera o arquivo e retorna ──────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const nomeArquivo = `dados-escola-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}

function ajustarColunas(ws: XLSX.WorkSheet, dados: any[]) {
  if (!dados.length) return
  const cols = Object.keys(dados[0])
  ws['!cols'] = cols.map(col => {
    const maxLen = Math.max(
      col.length,
      ...dados.map(r => String(r[col] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
}
