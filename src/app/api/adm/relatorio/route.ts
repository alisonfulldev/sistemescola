import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: anoAtivo } = await admin
    .from('anos_letivos')
    .select('id')
    .eq('ativo', true)
    .limit(1)
    .single()

  const [
    { data: turmas },
    { data: alunos },
    { data: chamadas },
    { data: notasDiario },
    { data: conteudos },
  ] = await Promise.all([
    admin.from('turmas')
      .select('id, nome, serie, turma_letra, turno, grau, aulas_previstas, disciplinas(id, nome, usuarios(nome))')
      .eq('ativo', true)
      .order('nome'),
    admin.from('alunos')
      .select('id, turma_id, situacao'),
    admin.from('chamadas')
      .select('id, status, aulas!inner(turma_id, data)')
      .eq('status', 'concluida'),
    anoAtivo ? admin.from('notas')
      .select('aluno_id, disciplina_id, b1, b2, b3, b4, recuperacao')
      .eq('ano_letivo_id', anoAtivo.id) : Promise.resolve({ data: [] }),
    admin.from('aulas')
      .select('turma_id, conteudo_programatico')
      .not('conteudo_programatico', 'is', null),
  ])

  const turmasResumo = (turmas || []).map((turma: any) => {
    const alunosTurma = (alunos || []).filter((a: any) => a.turma_id === turma.id)
    const totalAtivos = alunosTurma.filter((a: any) => a.situacao === 'ativo').length
    const aulasTurma = (chamadas || []).filter((c: any) => c.aulas?.turma_id === turma.id)
    const aulasRealizadas = new Set(aulasTurma.map((c: any) => c.aulas?.data)).size
    const conteudosTurma = (conteudos || []).filter((c: any) => c.turma_id === turma.id).length
    const alunoIdsTurma = alunosTurma.map((a: any) => a.id)

    // Notas lançadas
    const notasTurma = (notasDiario || []).filter((n: any) => alunoIdsTurma.includes(n.aluno_id))
    const notasLancadas = notasTurma.length

    // Frequência geral
    const totalRegistros = aulasTurma.reduce((acc: number, c: any) => acc + (c.registros_chamada?.length || 0), 0)
    const freqGeral = totalRegistros > 0
      ? Math.round((aulasTurma.reduce((acc: number, c: any) => acc + (c.registros_chamada?.filter((r: any) => r.status === 'presente').length || 0), 0) / totalRegistros) * 100)
      : null

    // Alunos em recuperação
    const alunosRecuperacao = alunoIdsTurma.filter((id: string) => {
      const notasAluno = notasTurma.filter((n: any) => n.aluno_id === id)
      if (!notasAluno.length) return false
      for (const nota of notasAluno) {
        const vals = [nota.b1, nota.b2, nota.b3, nota.b4].filter((v: any) => v !== null)
        if (vals.length > 0) {
          const media = vals.reduce((a: number, b: number) => a + b, 0) / vals.length
          if (media < 5) return true
        }
      }
      return false
    }).length

    // PDF pronto
    const pdfPronto = totalAtivos > 0 && aulasRealizadas > 0 && notasLancadas >= totalAtivos

    return {
      id: turma.id,
      nome: turma.nome,
      serie: turma.serie,
      turma_letra: turma.turma_letra,
      turno: turma.turno,
      grau: turma.grau,
      professor: turma.disciplinas?.[0]?.usuarios?.nome || '—',
      componente: turma.disciplinas?.[0]?.nome || '—',
      aulas_previstas: turma.aulas_previstas || 0,
      aulas_realizadas: aulasRealizadas,
      total_alunos: totalAtivos,
      conteudos_registrados: conteudosTurma,
      notas_lancadas: notasLancadas,
      freq_geral: freqGeral,
      alunos_recuperacao: alunosRecuperacao,
      pdf_pronto: pdfPronto,
    }
  })

  return NextResponse.json({ turmas: turmasResumo })
}
