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

  if (!['admin', 'ti', 'secretaria', 'diretor'].includes(perfil?.perfil)) {
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

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Impede exclusão de perfis protegidos
  const { data: usuarioDeletar } = await admin
    .from('usuarios')
    .select('perfil')
    .eq('id', user_id)
    .single()

  if (['admin', 'ti', 'diretor', 'secretaria'].includes(usuarioDeletar?.perfil)) {
    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', { user_id }, false)
    return NextResponse.json({ error: 'Este perfil não pode ser deletado' }, { status: 403 })
  }

  try {
    // Remove vínculos de responsável com alunos (sem ON DELETE CASCADE automático)
    await admin.from('responsaveis_alunos').delete().eq('responsavel_id', user_id)

    // Tenta hard delete via Auth: Supabase cascateia para public.usuarios automaticamente
    // (public.usuarios.id REFERENCES auth.users ON DELETE CASCADE)
    // Pode falhar se o usuário é professor com disciplinas/aulas vinculadas (ON DELETE RESTRICT)
    const { error: authError } = await admin.auth.admin.deleteUser(user_id)

    if (!authError) {
      // Hard delete bem-sucedido — usuário removido do Auth e do DB via CASCADE
      await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', { user_id, modo: 'hard' }, true)
      return NextResponse.json({ ok: true })
    }

    // Hard delete falhou (usuário tem disciplinas/aulas vinculadas com ON DELETE RESTRICT)
    // Fallback: soft delete — bane do Auth + marca inativo no DB
    // O usuário não consegue mais logar e some da listagem
    await admin.from('usuarios').update({ ativo: false }).eq('id', user_id)
    await admin.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })

    await logger.logAudit(user.id, 'usuario_excluir', '/api/admin/excluir-usuario', { user_id, modo: 'soft' }, true)
    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/excluir-usuario', error as Error, user.id, { user_id })
    return NextResponse.json({ error: 'Erro interno ao excluir usuário' }, { status: 500 })
  }
}
