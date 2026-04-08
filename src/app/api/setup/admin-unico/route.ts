import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Remover todos os diretores existentes
    const { data: existent } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('perfil', 'diretor')

    let removidos = 0
    if (existent && existent.length > 0) {
      for (const user of existent) {
        await adminClient.auth.admin.deleteUser(user.id)
        removidos++
      }
    }

    // 2. Gerar senha segura aleatória
    const gerarSenha = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
      let senha = ''
      for (let i = 0; i < 16; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return senha
    }

    const emailDiretor = 'diretor@escola.com'
    const senhaDiretor = gerarSenha()

    // Criar novo diretor único
    const { data, error: authError } = await adminClient.auth.admin.createUser({
      email: emailDiretor,
      password: senhaDiretor,
      user_metadata: { nome: 'Diretor da Escola', perfil: 'diretor' },
      email_confirm: true,
    })

    if (authError) {
      console.error('Auth error:', authError)
      await logger.logError('/api/setup/admin-unico', authError as Error, 'system')
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 3. Criar registro na tabela usuarios
    const { error: dbError } = await adminClient
      .from('usuarios')
      .insert({
        id: data.user.id,
        nome: 'Diretor da Escola',
        email: emailDiretor,
        perfil: 'diretor',
        usuario: 'diretor',
        ativo: true,
      })

    if (dbError) {
      console.error('DB error:', dbError)
      await adminClient.auth.admin.deleteUser(data.user.id)
      await logger.logError('/api/setup/admin-unico', dbError as Error, 'system')
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    await logger.logAudit('system', 'setup_admin_unico', '/api/setup/admin-unico', { removidos }, true)

    return NextResponse.json({
      ok: true,
      message: 'Diretor único criado com sucesso',
      email: emailDiretor,
      usuario: 'diretor',
      tempPassword: senhaDiretor,
      warning: '⚠️ GUARDE ESTA SENHA EM LOCAL SEGURO! Essa é a única vez que ela será exibida. O diretor deverá usar esta senha para primeiro login e depois alterar para uma senha pessoal.',
    })
  } catch (err) {
    console.error('Erro:', err)
    await logger.logError('/api/setup/admin-unico', err as Error, 'system')
    return NextResponse.json({ error: 'Erro interno: ' + String(err) }, { status: 500 })
  }
}
