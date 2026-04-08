import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const ToggleAtivoSchema = z.object({
  user_id: z.string().uuid('user_id deve ser UUID válido'),
  ativo: z.boolean()
})

// Ban duration para usuários inativos (100 anos efetivamente)
const BAN_DURATION_INACTIVE = '876000h'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria', 'diretor'].includes(perfil?.perfil)) {
      await logger.logAudit(user.id, 'usuario_toggle_ativo', '/api/admin/toggle-ativo', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const validation = ToggleAtivoSchema.safeParse(await req.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'user_id e ativo obrigatórios' }, { status: 400 })
    }

    const { user_id, ativo } = validation.data as any

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Bloqueia desativação de usuários admin
    const { data: alvo } = await admin.from('usuarios').select('perfil').eq('id', user_id).single()
    if (alvo?.perfil === 'admin') {
      await logger.logAudit(user.id, 'usuario_toggle_ativo', '/api/admin/toggle-ativo', { user_id }, false)
      return NextResponse.json({ error: 'Usuários admin não podem ser desativados pelo painel.' }, { status: 403 })
    }

    // Atualiza na tabela pública
    await admin.from('usuarios').update({ ativo }).eq('id', user_id)

    // Bloqueia ou desbloqueia no Supabase Auth
    const { error } = await admin.auth.admin.updateUserById(user_id, {
      ban_duration: ativo ? 'none' : BAN_DURATION_INACTIVE,
    })

    if (error) {
      await logger.logError('/api/admin/toggle-ativo', error as Error, user.id, { user_id })
      return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'usuario_toggle_ativo', '/api/admin/toggle-ativo', { user_id, ativo }, true)

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/admin/toggle-ativo', error as Error, user.id)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
