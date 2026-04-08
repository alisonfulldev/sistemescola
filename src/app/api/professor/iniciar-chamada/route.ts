import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

const IniciarChamadaSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido')
})

export async function POST(req: NextRequest) {
  // Valida sessão do usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(IniciarChamadaSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { turma_id } = validation.data

  const hoje = new Date().toISOString().split('T')[0]

  // Usa service_role para bypassar RLS em todas as operações
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca disciplina_id de aulas anteriores nesta turma (para usar em UPSERT)
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
    await logger.logError('/api/professor/iniciar-chamada', new Error('Professor sem disciplina'), user.id, { turma_id })
    return NextResponse.json(
      { error: 'Professor sem disciplina atribuída. Configure as disciplinas antes de iniciar chamada.' },
      { status: 400 }
    )
  }

  // UPSERT aula — se já existe (UNIQUE professor_id, turma_id, data), retorna; senão cria
  // Isso previne race condition onde dois requests simultaneamente criam duplicatas
  const agora = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const horaInicio = `${pad(agora.getHours())}:${pad(agora.getMinutes())}:00`
  const horaFim = `${pad((agora.getHours() + 1) % 24)}:${pad(agora.getMinutes())}:00`

  const { data: novaAula, error: erroAula } = await admin
    .from('aulas')
    .upsert({
      professor_id: user.id,
      turma_id,
      disciplina_id: disciplinaId,
      data: hoje,
      horario_inicio: horaInicio,
      horario_fim: horaFim,
    }, {
      onConflict: 'professor_id,turma_id,data'
    })
    .select('id')
    .single()

  if (erroAula || !novaAula) {
    await logger.logError('/api/professor/iniciar-chamada', erroAula || new Error('Erro criar aula'), user.id, { turma_id })
    return NextResponse.json({ error: 'Erro ao criar aula' }, { status: 500 })
  }

  const aulaId = novaAula.id

  // Verifica se já existe chamada para esta aula
  const { data: chamadaExistente } = await admin
    .from('chamadas')
    .select('id, status')
    .eq('aula_id', aulaId)
    .maybeSingle()

  if (chamadaExistente) {
    await logger.logAudit(user.id, 'chamada_iniciar', '/api/professor/iniciar-chamada', { turma_id, chamada_id: chamadaExistente.id, reutilizada: true }, true)
    return NextResponse.json({ chamada_id: chamadaExistente.id })
  }

  // Cria a chamada via service_role para evitar RLS
  const { data: novaChamada, error: erroChamada } = await admin
    .from('chamadas')
    .insert({ aula_id: aulaId, status: 'em_andamento' })
    .select('id')
    .single()

  if (erroChamada || !novaChamada) {
    await logger.logError('/api/professor/iniciar-chamada', erroChamada || new Error('Erro criar chamada'), user.id, { turma_id })
    return NextResponse.json({ error: 'Erro ao criar chamada' }, { status: 500 })
  }

  await logger.logAudit(user.id, 'chamada_iniciar', '/api/professor/iniciar-chamada', { turma_id, chamada_id: novaChamada.id }, true)
  return NextResponse.json({ chamada_id: novaChamada.id })
}
