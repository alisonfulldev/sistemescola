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

  const { data: vinculos } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id, alunos(id, nome_completo, foto_url, matricula, turmas(nome))')
    .eq('responsavel_id', user.id)

  if (!vinculos?.length) return NextResponse.json({ alunos: [] })

  const alunos = vinculos.map((v: any) => v.alunos).filter(Boolean)
  const alunoIds = alunos.map((a: any) => a.id)

  // Registros de hoje com ID incluído
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('id, aluno_id, status, registrado_em, observacao, chamadas(aulas(data))')
    .in('aluno_id', alunoIds)
    .order('registrado_em', { ascending: false })

  // Pega o registro mais recente de HOJE por aluno
  const registroMap = new Map<string, any>()
  for (const r of registros || []) {
    const dataAula = (r as any).chamadas?.aulas?.data
    if (dataAula !== hoje) continue
    if (!registroMap.has(r.aluno_id)) registroMap.set(r.aluno_id, r)
  }

  // Busca justificativas para os registros de hoje
  const registroIds = Array.from(registroMap.values()).map((r: any) => r.id)
  const justificativaMap = new Map<string, any>()
  if (registroIds.length > 0) {
    const { data: justificativas } = await admin
      .from('justificativas_falta')
      .select('id, registro_id, motivo, status, professor_resposta')
      .in('registro_id', registroIds)
      .eq('responsavel_id', user.id)
    for (const j of justificativas || []) {
      justificativaMap.set(j.registro_id, j)
    }
  }

  const resultado = alunos.map((aluno: any) => {
    const reg = registroMap.get(aluno.id) || null
    return {
      ...aluno,
      registro: reg,
      justificativa: reg ? (justificativaMap.get(reg.id) || null) : null,
    }
  })

  return NextResponse.json({ alunos: resultado })
}
