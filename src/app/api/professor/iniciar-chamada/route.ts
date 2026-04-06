import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Valida sessão do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { turma_id } = await req.json()
  if (!turma_id) return NextResponse.json({ error: 'turma_id obrigatório' }, { status: 400 })

  const hoje = new Date().toISOString().split('T')[0]

  // Usa service_role para bypassar RLS em todas as operações
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca aula de hoje para este professor+turma
  const { data: aulaHoje } = await admin
    .from('aulas')
    .select('id')
    .eq('professor_id', user.id)
    .eq('turma_id', turma_id)
    .eq('data', hoje)
    .limit(1)
    .maybeSingle()

  let aulaId: string

  if (aulaHoje) {
    aulaId = aulaHoje.id
  } else {
    // Busca disciplina_id de aulas anteriores nesta turma
    const { data: aulaAnterior } = await admin
      .from('aulas')
      .select('disciplina_id')
      .eq('professor_id', user.id)
      .eq('turma_id', turma_id)
      .not('disciplina_id', 'is', null)
      .limit(1)
      .maybeSingle()

    let disciplinaId = aulaAnterior?.disciplina_id

    if (!disciplinaId) {
      const { data: disc } = await admin
        .from('disciplinas')
        .select('id')
        .eq('professor_id', user.id)
        .limit(1)
        .maybeSingle()
      disciplinaId = disc?.id
    }

    // Validação: professor deve ter uma disciplina
    if (!disciplinaId) {
      return NextResponse.json(
        { error: 'Professor sem disciplina atribuída. Configure as disciplinas antes de iniciar chamada.' },
        { status: 400 }
      )
    }

    const agora = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const horaInicio = `${pad(agora.getHours())}:${pad(agora.getMinutes())}:00`
    const horaFim = `${pad((agora.getHours() + 1) % 24)}:${pad(agora.getMinutes())}:00`

    const { data: novaAula, error } = await admin
      .from('aulas')
      .insert({
        professor_id: user.id,
        turma_id,
        disciplina_id: disciplinaId,
        data: hoje,
        horario_inicio: horaInicio,
        horario_fim: horaFim,
      })
      .select('id')
      .single()

    if (error || !novaAula) {
      console.error('Erro ao criar aula:', JSON.stringify(error))
      return NextResponse.json({ error: error?.message || 'Erro ao criar aula' }, { status: 500 })
    }
    aulaId = novaAula.id
  }

  // Verifica se já existe chamada para esta aula
  const { data: chamadaExistente } = await admin
    .from('chamadas')
    .select('id, status')
    .eq('aula_id', aulaId)
    .maybeSingle()

  if (chamadaExistente) {
    return NextResponse.json({ chamada_id: chamadaExistente.id })
  }

  // Cria a chamada via service_role para evitar RLS
  const { data: novaChamada, error: erroChamada } = await admin
    .from('chamadas')
    .insert({ aula_id: aulaId, status: 'em_andamento' })
    .select('id')
    .single()

  if (erroChamada || !novaChamada) {
    console.error('Erro ao criar chamada:', JSON.stringify(erroChamada))
    return NextResponse.json({ error: erroChamada?.message || 'Erro ao criar chamada' }, { status: 500 })
  }

  return NextResponse.json({ chamada_id: novaChamada.id })
}
