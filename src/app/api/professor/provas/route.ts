import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

const CreateProvaSchema = z.object({
  titulo: z.string().min(1, 'Título obrigatório').max(255, 'Título muito longo'),
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  data: z.string().date('Data deve ser válida'),
  nota_maxima: z.number().min(0.1, 'Nota máxima deve ser positiva').max(100, 'Nota máxima não pode exceder 100').optional().default(10)
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Se prova_id passado, retorna notas da prova
    const provaId = req.nextUrl.searchParams.get('prova_id')
    if (provaId) {
      const { data: notas } = await admin.from('notas').select('aluno_id, nota').eq('prova_id', provaId)
      return NextResponse.json({ notas: notas || [] })
    }

    const { data: provas } = await admin
      .from('provas')
      .select('id, titulo, data, nota_maxima, publicada, criada_em, turmas(nome), turma_id')
      .eq('professor_id', user.id)
      .order('data', { ascending: false })

    return NextResponse.json({ provas: provas || [] })
  } catch (error) {
    await logger.logError('/api/professor/provas', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar provas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(CreateProvaSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { titulo, turma_id, data, nota_maxima } = validation.data

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { data: prova, error } = await admin
      .from('provas')
      .insert({
        titulo: titulo.trim(),
        turma_id,
        professor_id: user.id,
        data,
        nota_maxima,
      })
      .select()
      .single()

    if (error) {
      await logger.logError('/api/professor/provas', error, user.id, { titulo, turma_id })
      return NextResponse.json({ error: 'Erro ao criar prova' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'prova_criar', '/api/professor/provas', {
      prova_id: prova.id,
      titulo,
      turma_id,
      data
    }, true)

    return NextResponse.json({ prova })
  } catch (error) {
    await logger.logError('/api/professor/provas', error, user.id)
    return NextResponse.json({ error: 'Erro interno ao criar prova' }, { status: 500 })
  }
}
