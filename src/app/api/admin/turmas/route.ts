import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateTurmaSchema } from '@/lib/schemas/crud'
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
      .select('perfil, escola_id, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'turmas_listar', '/api/admin/turmas', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'turmas_listar', '/api/admin/turmas', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const db = admin()
    let query = db.from('turmas').select('*').eq('ativo', true)

    // Diretor/secretaria vê apenas sua escola
    if (userData.perfil !== 'admin') {
      query = query.eq('escola_id', userData.escola_id)
    }

    const { data: turmas, error } = await query.order('nome')

    if (error) {
      await logger.logError('/api/admin/turmas', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao buscar turmas' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'turmas_listar', '/api/admin/turmas', { total: turmas?.length || 0 }, true)

    return NextResponse.json({ turmas: turmas || [] })
  } catch (error) {
    await logger.logError('/api/admin/turmas', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar turmas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, escola_id, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'turmas_criar', '/api/admin/turmas', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'turmas_criar', '/api/admin/turmas', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await req.json()
    const validation = validateData(CreateTurmaSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const { nome, serie, turno, turma_letra, escola_id, ativo } = validation.data as any

    // Diretor/secretaria só pode criar em sua escola
    if (userData.perfil !== 'admin' && escola_id !== userData.escola_id) {
      await logger.logAudit(user.id, 'turmas_criar', '/api/admin/turmas', { escola_id }, false)
      return NextResponse.json({ error: 'Não pode criar turma em outra escola' }, { status: 403 })
    }

    const db = admin()
    const { data: turma, error } = await db
      .from('turmas')
      .insert([{
        nome,
        serie,
        turno,
        turma_letra,
        escola_id,
        ativo,
      }])
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/turmas', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao criar turma' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'turmas_criar', '/api/admin/turmas', { turma_id: turma.id, nome }, true)

    return NextResponse.json({ turma }, { status: 201 })
  } catch (error) {
    await logger.logError('/api/admin/turmas', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao criar turma' }, { status: 500 })
  }
}
