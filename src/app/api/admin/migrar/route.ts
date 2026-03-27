import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: usuario } = await admin.from('usuarios').select('perfil').eq('id', user.id).single()
  if (usuario?.perfil !== 'admin') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

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
  return NextResponse.json({ status: res.status, result })
}
