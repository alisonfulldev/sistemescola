import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria', 'diretor'].includes(perfil?.perfil)) {
      await logger.logAudit(user.id, 'gerar_link_reset', '/api/admin/gerar-link-reset', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email) {
      await logger.logAudit(user.id, 'gerar_link_reset', '/api/admin/gerar-link-reset', {}, false)
      return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })
    }

    const origin = req.nextUrl.origin

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${origin}/redefinir-senha`,
      },
    })

    if (error) {
      await logger.logError('/api/admin/gerar-link-reset', error as Error, user.id)
      return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
    }

    await logger.logAudit(user.id, 'gerar_link_reset', '/api/admin/gerar-link-reset', { email }, true)

    return NextResponse.json({ link: (data as any).properties?.action_link })
  } catch (error) {
    await logger.logError('/api/admin/gerar-link-reset', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao gerar link' }, { status: 500 })
  }
}
