import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateAnoLetivoSchema } from '@/lib/schemas/crud'
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
    const { data: anosLetivos, error } = await db
      .from('anos_letivos')
      .select('*')
      .order('ano', { ascending: false })
      .limit(100)

    if (error) {
      await logger.logError('/api/admin/anos-letivos', error, user.id)
      return NextResponse.json({ error: 'Erro ao buscar anos letivos' }, { status: 500 })
    }

    return NextResponse.json({ anos_letivos: anosLetivos || [] })
  } catch (error) {
    await logger.logError('/api/admin/anos-letivos', error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar anos letivos' }, { status: 500 })
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

    if (!userData?.ativo || !['admin', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'anos_letivos_criar', '/api/admin/anos-letivos', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await req.json()
    const validation = validateData(CreateAnoLetivoSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const { ano, data_inicio, data_fim, ativo, nome } = validation.data

    const db = admin()
    const { data: anoLetivo, error } = await db
      .from('anos_letivos')
      .insert([{
        ano,
        data_inicio,
        data_fim,
        ativo,
        nome: nome || String(ano),
      }])
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/anos-letivos', error, user.id)
      return NextResponse.json({ error: 'Erro ao criar ano letivo' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'anos_letivos_criar', '/api/admin/anos-letivos', { ano }, true)

    return NextResponse.json({ ano_letivo: anoLetivo }, { status: 201 })
  } catch (error) {
    await logger.logError('/api/admin/anos-letivos', error, user.id)
    return NextResponse.json({ error: 'Erro ao criar ano letivo' }, { status: 500 })
  }
}
