import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: usuario } = await admin.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['admin', 'secretaria'].includes(usuario?.perfil)) {
      await logger.logAudit(user.id, 'migrar_executar', '/api/admin/migrar', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Roda a migração via Management API do Supabase
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace('https://', '').split('.')[0]
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE registros_chamada ADD COLUMN IF NOT EXISTS motivo_alteracao TEXT;
          ALTER TABLE registros_chamada ADD COLUMN IF NOT EXISTS horario_evento TIME;
        `
      }),
    })

    const result = await res.json().catch(() => ({}))

    await logger.logAudit(user.id, 'migrar_executar', '/api/admin/migrar', { status: res.status }, true)

    return NextResponse.json({ status: res.status, result })
  } catch (error) {
    await logger.logError('/api/admin/migrar', error, user.id)
    return NextResponse.json({ error: 'Erro ao executar migração' }, { status: 500 })
  }
}
