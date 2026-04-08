import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await admin
      .from('usuarios')
      .select('perfil, nome, escola_id, ativo')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      await logger.logError('/api/auth/perfil', error || new Error('Perfil não encontrado'), user.id)
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      perfil: data.perfil || null,
      nome: data.nome || null,
      escola_id: data.escola_id || null,
      ativo: data.ativo || false,
    })
  } catch (error) {
    await logger.logError('/api/auth/perfil', error as Error, user.id)
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
  }
}
