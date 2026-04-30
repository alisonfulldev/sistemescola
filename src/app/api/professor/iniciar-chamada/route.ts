import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

const IniciarChamadaSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
})

export async function POST(req: NextRequest) {
  // Valida sessão do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(IniciarChamadaSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { turma_id, disciplina_id } = validation.data as any

  const hoje = new Date().toISOString().split('T')[0]

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Valida que a disciplina pertence a este professor
  const { data: disciplinaValida } = await admin
    .from('disciplinas')
    .select('id')
    .eq('id', disciplina_id)
    .eq('professor_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  if (!disciplinaValida) {
    await logger.logError('/api/professor/iniciar-chamada', new Error('Disciplina não pertence ao professor'), user.id, { turma_id, disciplina_id })
    return NextResponse.json(
      { error: 'Disciplina não encontrada ou não pertence a este professor.' },
      { status: 403 }
    )
  }

  const agora = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const horaInicio = `${pad(agora.getHours())}:${pad(agora.getMinutes())}:00`
  const horaFim = `${pad((agora.getHours() + 1) % 24)}:${pad(agora.getMinutes())}:00`

  // Busca aula existente hoje para este professor + turma + disciplina
  const { data: aulaExistente } = await admin
    .from('aulas')
    .select('id')
    .eq('professor_id', user.id)
    .eq('turma_id', turma_id)
    .eq('disciplina_id', disciplina_id)
    .eq('data', hoje)
    .maybeSingle()

  let aulaId: string

  if (aulaExistente) {
    // Aula já existe, usa essa
    aulaId = aulaExistente.id
  } else {
    // Cria nova aula
    const { data: novaAula, error: erroAula } = await admin
      .from('aulas')
      .insert({
        professor_id: user.id,
        turma_id,
        disciplina_id,
        data: hoje,
        horario_inicio: horaInicio,
        horario_fim: horaFim,
      })
      .select('id')
      .single()

    if (erroAula || !novaAula) {
      console.error('[iniciar-chamada] Erro ao criar aula:', erroAula)
      await logger.logError('/api/professor/iniciar-chamada', erroAula || new Error('Erro criar aula'), user.id, { turma_id, disciplina_id })
      return NextResponse.json({ error: 'Erro ao criar aula' }, { status: 500 })
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
    await logger.logAudit(user.id, 'chamada_iniciar', '/api/professor/iniciar-chamada', { turma_id, disciplina_id, chamada_id: chamadaExistente.id, reutilizada: true }, true)
    return NextResponse.json({ chamada_id: chamadaExistente.id, aula_id: aulaId })
  }

  // Cria a chamada via service_role para evitar RLS
  const { data: novaChamada, error: erroChamada } = await admin
    .from('chamadas')
    .insert({ aula_id: aulaId, status: 'em_andamento' })
    .select('id')
    .single()

  if (erroChamada || !novaChamada) {
    await logger.logError('/api/professor/iniciar-chamada', erroChamada || new Error('Erro criar chamada'), user.id, { turma_id, disciplina_id })
    return NextResponse.json({ error: 'Erro ao criar chamada' }, { status: 500 })
  }

  await logger.logAudit(user.id, 'chamada_iniciar', '/api/professor/iniciar-chamada', { turma_id, disciplina_id, chamada_id: novaChamada.id }, true)
  return NextResponse.json({ chamada_id: novaChamada.id, aula_id: aulaId })
}
