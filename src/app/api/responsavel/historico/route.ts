import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const aluno_id = req.nextUrl.searchParams.get('aluno_id')
  if (!aluno_id) return NextResponse.json({ error: 'aluno_id obrigatório' }, { status: 400 })

  const { isValidUUID } = await import('@/lib/validate')
  if (!isValidUUID(aluno_id)) {
    return NextResponse.json({ error: 'aluno_id inválido' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifica se o responsável tem vínculo com esse aluno
  const { data: vinculo } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id')
    .eq('responsavel_id', user.id)
    .eq('aluno_id', aluno_id)
    .maybeSingle()

  if (!vinculo) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Dados do aluno
  const { data: aluno } = await admin
    .from('alunos')
    .select('nome_completo, matricula, turmas(nome)')
    .eq('id', aluno_id)
    .single()

  // Registros de chamada do aluno
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('status, registrado_em, observacao, chamadas(id, aulas(data, turmas(nome), disciplinas(nome)))')
    .eq('aluno_id', aluno_id)
    .order('registrado_em', { ascending: false })

  const historico = (registros || []).map((r: any) => ({
    status: r.status,
    registrado_em: r.registrado_em,
    observacao: r.observacao,
    data: r.chamadas?.aulas?.data,
    turma: r.chamadas?.aulas?.turmas?.nome,
    disciplina: r.chamadas?.aulas?.disciplinas?.nome,
  }))

  const total = historico.length
  const presentes = historico.filter(r => r.status === 'presente').length
  const faltas = historico.filter(r => r.status === 'falta').length
  const justificadas = historico.filter(r => r.status === 'justificada').length

  return NextResponse.json({ aluno, historico, stats: { total, presentes, faltas, justificadas } })
}
