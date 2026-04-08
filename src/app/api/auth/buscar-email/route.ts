import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const BuscarEmailSchema = z.object({
  usuario: z.string().min(1, 'Usuário obrigatório')
})

export async function POST(req: NextRequest) {
  try {
    const validation = BuscarEmailSchema.safeParse(await req.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'Usuário obrigatório' }, { status: 400 })
    }

    const { usuario } = validation.data

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const usuarioLower = usuario.trim().toLowerCase()

    // Tenta buscar por usuario primeiro
    let { data, error } = await adminClient
      .from('usuarios')
      .select('email')
      .eq('usuario', usuarioLower)
      .eq('ativo', true)
      .single()

    // Se não encontrar, tenta buscar por email (fallback)
    if (error || !data) {
      const { data: dataEmail, error: errorEmail } = await adminClient
        .from('usuarios')
        .select('email')
        .eq('email', usuarioLower)
        .eq('ativo', true)
        .single()

      data = dataEmail
      error = errorEmail
    }

    if (error || !data) {
      await logger.logInfo('/api/auth/buscar-email', `Usuário não encontrado: ${usuarioLower}`)
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ email: data.email })
  } catch (error) {
    await logger.logError('/api/auth/buscar-email', error)
    return NextResponse.json({ error: 'Erro ao buscar email' }, { status: 500 })
  }
}
