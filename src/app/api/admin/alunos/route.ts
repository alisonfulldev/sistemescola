import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { CreateAlunoSchema } from '@/lib/schemas/crud'
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
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const db = admin()
    const turmaIdParam = req.nextUrl.searchParams.get('turma_id')
    const situacaoParam = req.nextUrl.searchParams.get('situacao') || 'ativo'

    let query = db
      .from('alunos')
      .select('id, nome_completo, matricula, turma_id, turmas(nome), situacao, data_nascimento, foto_url')
      .eq('situacao', situacaoParam)

    if (turmaIdParam) {
      query = query.eq('turma_id', turmaIdParam)
    }

    const { data: alunos, error } = await query.order('nome_completo').limit(500)

    if (error) {
      await logger.logError('/api/admin/alunos', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 })
    }

    return NextResponse.json({ alunos: alunos || [] })
  } catch (error) {
    await logger.logError('/api/admin/alunos', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 })
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

    if (!userData?.ativo) {
      await logger.logAudit(user.id, 'alunos_criar', '/api/admin/alunos', {}, false)
      return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
    }

    if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil)) {
      await logger.logAudit(user.id, 'alunos_criar', '/api/admin/alunos', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await req.json()
    const validation = validateData(CreateAlunoSchema, body)
    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const { nome_completo, data_nascimento, matricula, turma_id, contato_responsavel, situacao, foto_url } = validation.data as any

    const db = admin()
    const { data: aluno, error } = await db
      .from('alunos')
      .insert([{
        nome_completo,
        data_nascimento,
        matricula,
        turma_id,
        contato_responsavel,
        situacao,
        foto_url,
      }])
      .select()
      .single()

    if (error) {
      await logger.logError('/api/admin/alunos', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao criar aluno' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'alunos_criar', '/api/admin/alunos', { aluno_id: aluno.id, nome: nome_completo }, true)

    return NextResponse.json({ aluno }, { status: 201 })
  } catch (error) {
    await logger.logError('/api/admin/alunos', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao criar aluno' }, { status: 500 })
  }
}
