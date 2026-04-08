import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {

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

    // Ano letivo ativo
    const { data: anoAtivo } = await admin
      .from('anos_letivos')
      .select('id, ano')
      .eq('ativo', true)
      .limit(1)
      .single()

    if (!anoAtivo) return NextResponse.json({ notas: [] })

    // Notas do diário
    const { data: notas } = await admin
      .from('notas')
      .select('*, disciplinas(nome)')
      .in('aluno_id', alunoIds)
      .eq('ano_letivo_id', anoAtivo.id)

    const resultado = (notas || []).map((n: any) => {
      const vals = [n.b1, n.b2, n.b3, n.b4].filter((v: any) => v !== null && v !== undefined) as number[]
      const media = vals.length > 0 ? parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / vals.length).toFixed(1)) : null
      const situacao = media !== null ? (media >= 5 ? 'Aprovado' : 'Recuperação') : null
      return {
        aluno_id: n.aluno_id,
        aluno_nome: (alunoMap.get(n.aluno_id) as any)?.nome_completo,
        disciplina: n.disciplinas?.nome,
        ano: anoAtivo.ano,
        b1: n.b1, b2: n.b2, b3: n.b3, b4: n.b4,
        recuperacao: n.recuperacao,
        media_final: media,
        situacao_final: situacao,
        ausencias_compensadas: n.ausencias_compensadas,
      }
    })

    return NextResponse.json({ notas: resultado })
  } catch (error) {
    await logger.logError('/api/responsavel/notas', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar notas' }, { status: 500 })
  }
}
