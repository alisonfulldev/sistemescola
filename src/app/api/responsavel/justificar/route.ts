import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

const JustificarFaltaSchema = z.object({
  registro_id: z.string().uuid('registro_id deve ser UUID válido'),
  motivo: z.string().min(3, 'Motivo deve ter no mínimo 3 caracteres').max(1000, 'Motivo máximo 1000 caracteres')
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(JustificarFaltaSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { registro_id, motivo } = validation.data

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifica que o registro é de um aluno vinculado ao responsável
  const { data: registro } = await admin
    .from('registros_chamada')
    .select('id, aluno_id, status')
    .eq('id', registro_id)
    .single()

  if (!registro || registro.status !== 'falta') {
    await logger.logAudit(user.id, 'falta_justificar', '/api/responsavel/justificar', { registro_id }, false)
    return NextResponse.json({ error: 'Registro não encontrado ou não é uma falta' }, { status: 400 })
  }

  const { data: vinculo } = await admin
    .from('responsaveis_alunos')
    .select('aluno_id')
    .eq('responsavel_id', user.id)
    .eq('aluno_id', registro.aluno_id)
    .maybeSingle()

  if (!vinculo) {
    await logger.logAudit(user.id, 'falta_justificar', '/api/responsavel/justificar', { registro_id }, false)
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const { error } = await admin
      .from('justificativas_falta')
      .upsert({
        registro_id,
        responsavel_id: user.id,
        motivo: motivo.trim(),
        status: 'pendente',
      }, { onConflict: 'registro_id,responsavel_id' })

    if (error) {
      await logger.logError('/api/responsavel/justificar', error, user.id, { registro_id })
      return NextResponse.json({ error: 'Erro ao justificar falta' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'falta_justificar', '/api/responsavel/justificar', {
      registro_id,
      aluno_id: registro.aluno_id
    }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/responsavel/justificar', error, user.id)
    return NextResponse.json({ error: 'Erro interno ao justificar falta' }, { status: 500 })
  }
}
