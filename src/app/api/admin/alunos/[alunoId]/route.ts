import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function DELETE(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ alunoId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: userData } = await supabase
      .from('usuarios')
      .select('perfil, ativo')
      .eq('id', user.id)
      .single()

    if (!userData?.ativo || !['admin', 'ti', 'diretor', 'secretaria'].includes(userData?.perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { alunoId } = await paramsPromise
    const db = admin()

    // Deletar aluno cascateia automaticamente:
    // notas, entradas, registros_chamada, responsaveis_alunos, alertas (todos ON DELETE CASCADE)
    const { error } = await db.from('alunos').delete().eq('id', alunoId)
    if (error) {
      await logger.logError('/api/admin/alunos/[alunoId]', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao excluir aluno' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'aluno_excluir', '/api/admin/alunos/[alunoId]', { alunoId }, true)
    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/alunos/[alunoId]', error as Error, user.id)
    return NextResponse.json({ error: 'Erro interno ao excluir aluno' }, { status: 500 })
  }
}
