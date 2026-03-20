import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Alunos do responsável
  const { data: vinculos } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id, alunos(id, nome_completo)')
    .eq('responsavel_id', user.id)

  if (!vinculos?.length) return NextResponse.json({ notas: [] })

  const alunoIds = vinculos.map((v: any) => v.aluno_id)
  const alunoMap = new Map(vinculos.map((v: any) => [v.aluno_id, v.alunos]))

  // Notas publicadas
  const { data: notas } = await admin
    .from('notas')
    .select('aluno_id, nota, provas(id, titulo, data, nota_maxima, publicada, turmas(nome))')
    .in('aluno_id', alunoIds)
    .order('aluno_id')

  const resultado = (notas || [])
    .filter((n: any) => n.provas?.publicada)
    .map((n: any) => ({
      aluno_id: n.aluno_id,
      aluno_nome: (alunoMap.get(n.aluno_id) as any)?.nome_completo,
      nota: n.nota,
      prova_id: n.provas?.id,
      titulo: n.provas?.titulo,
      data: n.provas?.data,
      nota_maxima: n.provas?.nota_maxima,
      turma: n.provas?.turmas?.nome,
    }))
    .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())

  return NextResponse.json({ notas: resultado })
}
