import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Verifica se o solicitante é admin
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('perfil')
      .eq('id', user.id)
      .single()

    if (perfil?.perfil !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }, { status: 403 })
    }

    const body = await req.json()
    const nome = typeof body.nome === 'string' ? body.nome.trim().slice(0, 200) : ''
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254).toLowerCase() : ''
    const senha = typeof body.senha === 'string' ? body.senha : ''
    const novoPerfil = typeof body.perfil === 'string' ? body.perfil : ''

    if (!nome || !email || !senha || !novoPerfil) {
      return NextResponse.json({ error: 'Campos obrigatórios: nome, email, senha, perfil' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    if (senha.length < 8 || senha.length > 128) {
      return NextResponse.json({ error: 'A senha deve ter entre 8 e 128 caracteres' }, { status: 400 })
    }

    const perfisValidos = ['professor', 'secretaria', 'responsavel', 'admin', 'cozinha', 'diretor']
    if (!perfisValidos.includes(novoPerfil)) {
      return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
    }

    // Usa service_role para criar usuário no Auth
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      user_metadata: {
        nome: nome.trim(),
        perfil: novoPerfil,
        ...(novoPerfil === 'diretor' ? { force_password_reset: true } : {})
      },
      email_confirm: true,
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este email já está cadastrado no sistema' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Insere na tabela public.usuarios (necessário para o sistema funcionar)
    const { error: erroInsert } = await adminClient
      .from('usuarios')
      .upsert({ id: data.user.id, nome: nome.trim(), email: email.trim(), perfil: novoPerfil })

    if (erroInsert) {
      // Reverte criação no auth se falhar o insert
      await adminClient.auth.admin.deleteUser(data.user.id)
      return NextResponse.json({ error: 'Erro ao salvar usuário: ' + erroInsert.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.user.id, email: data.user.email }, { status: 201 })
  } catch (err) {
    console.error('Erro ao criar usuário:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
