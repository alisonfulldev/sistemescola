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

  const hoje = new Date().toISOString().split('T')[0]

  // Busca alunos vinculados ao responsável
  const { data: vinculos } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id, alunos(id, nome_completo, foto_url, matricula, turmas(nome))')
    .eq('responsavel_id', user.id)

  if (!vinculos?.length) return NextResponse.json({ alunos: [] })

  const alunos = vinculos.map((v: any) => v.alunos).filter(Boolean)
  const alunoIds = alunos.map((a: any) => a.id)

  // Entradas de hoje
  const { data: entradas } = await admin
    .from('entradas')
    .select('aluno_id, hora')
    .in('aluno_id', alunoIds)
    .eq('data', hoje)

  // Último registro de chamada de hoje para cada aluno
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('aluno_id, status, registrado_em, observacao, chamadas(aulas(data))')
    .in('aluno_id', alunoIds)
    .order('registrado_em', { ascending: false })

  const entradaMap = new Map((entradas || []).map((e: any) => [e.aluno_id, e]))

  // Pega o registro mais recente de HOJE por aluno
  const registroMap = new Map<string, any>()
  for (const r of registros || []) {
    const dataAula = (r as any).chamadas?.aulas?.data
    if (dataAula !== hoje) continue
    if (!registroMap.has(r.aluno_id)) registroMap.set(r.aluno_id, r)
  }

  const resultado = alunos.map((aluno: any) => ({
    ...aluno,
    entrada: entradaMap.get(aluno.id) || null,
    registro: registroMap.get(aluno.id) || null,
  }))

  return NextResponse.json({ alunos: resultado })
}
