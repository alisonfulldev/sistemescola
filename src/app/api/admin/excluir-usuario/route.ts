import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { DeleteUsuarioSchema } from '@/lib/schemas/admin'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('usuarios').select('perfil, ativo').eq('id', user.id).single()

  if (!perfil?.ativo) {
    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', {}, false)
    return NextResponse.json({ error: 'Usuário inativo' }, { status: 403 })
  }

  if (!['admin', 'secretaria', 'diretor'].includes(perfil?.perfil)) {
    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', {}, false)
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const validation = validateData(DeleteUsuarioSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { user_id } = validation.data as any

  // Impede auto-exclusão
  if (user_id === user.id) {
    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', { user_id }, false)
    return NextResponse.json({ error: 'Não é possível excluir a própria conta' }, { status: 400 })
  }

  // Impede exclusão de perfis protegidos
  const { data: usuarioDeletar } = await admin
    .from('usuarios')
    .select('perfil')
    .eq('id', user_id)
    .single()

  if (['admin', 'diretor', 'secretaria'].includes(usuarioDeletar?.perfil)) {
    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', { user_id }, false)
    return NextResponse.json({ error: 'Este perfil não pode ser deletado' }, { status: 403 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // FASE 1: Soft delete primeiro — marca como inativo
    // Se algo falhar depois, a conta fica inativa mas não "fantasma" no DB
    const { error: erroSoftDelete } = await admin
      .from('usuarios')
      .update({ ativo: false })
      .eq('id', user_id)

    if (erroSoftDelete) {
      await logger.logError('/api/admin/excluir-usuario', erroSoftDelete as Error, user.id, { user_id })
      return NextResponse.json({ error: 'Erro ao desativar usuário' }, { status: 500 })
    }

    // FASE 2: Remove do Auth (irreversível)
    const { error: authError } = await admin.auth.admin.deleteUser(user_id)
    if (authError) {
      // Nota: Já marcamos como inativo, então ao menos a conta está desativada
      await logger.logError('/api/admin/excluir-usuario', authError as Error, user.id, { user_id, status: 'soft_deleted_but_auth_failed' })
      return NextResponse.json({
        error: 'Usuário desativado mas erro ao remover autenticação. Contate o suporte.',
        status: 500
      }, { status: 500 })
    }

    // FASE 3: Remove vínculos com alunos (se houver)
    await admin.from('responsaveis_alunos').delete().eq('responsavel_id', user_id)

    // FASE 4: Remove da tabela public.usuarios (hard delete)
    const { error: erroDelete } = await admin.from('usuarios').delete().eq('id', user_id)
    if (erroDelete) {
      // Aqui já deletamos do auth, então apenas logamos mas continuamos
      await logger.logError('/api/admin/excluir-usuario', erroDelete as Error, user.id, { user_id, status: 'auth_deleted_but_db_failed' })
      // Retornamos OK mesmo assim — a conta foi deletada do Auth
    }

    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', { user_id, metodo: 'soft_then_hard_delete' }, true)
    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/excluir-usuario', error as Error, user.id, { user_id })
    return NextResponse.json({ error: 'Erro interno ao excluir usuário' }, { status: 500 })
  }
}
