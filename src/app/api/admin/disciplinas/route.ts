import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateDisciplinaSchema } from '@/lib/schemas/crud'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo || !['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const db = admin()
    const { data: disciplinas, error } = await db
      .from('disciplinas')
      .select('*')
      .eq('ativo', true)
      .order('nome')
      .limit(500)

    if (error) {
      await logger.logError('/api/admin/disciplinas', error, user.id)
      return NextResponse.json({ error: 'Erro ao buscar disciplinas' }, { status: 500 })
    }

    return NextResponse.json({ disciplinas: disciplinas || [] })
  } catch (error) {
    await logger.logError('/api/admin/disciplinas', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar disciplinas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo || !['admin', 'secretaria', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'disciplinas_criar', '/api/admin/disciplinas', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await req.json()
    const validation = validateData(CreateDisciplinaSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const { nome, codigo, descricao, carga_horaria, ativo } = validation.data

    const db = admin()
    const { data: disciplina, error } = await db
      .from('disciplinas')
      .insert([{ nome, codigo, descricao, carga_horaria, ativo }])
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/disciplinas', error, user.id)
      return NextResponse.json({ error: 'Erro ao criar disciplina' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'disciplinas_criar', '/api/admin/disciplinas', { disciplina_id: disciplina.id, nome }, true)

    return NextResponse.json({ disciplina }, { status: 201 })
  } catch (error) {
    await logger.logError('/api/admin/disciplinas', error, user.id)
    return NextResponse.json({ error: 'Erro ao criar disciplina' }, { status: 500 })
  }
}
