import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Verifica se o solicitante é admin
    const supabase = await createServerClient()
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

    const { nome, email, senha, perfil: novoPerfil } = await req.json()

    if (!nome?.trim() || !email?.trim() || !senha?.trim() || !novoPerfil) {
      return NextResponse.json({ error: 'Campos obrigatórios: nome, email, senha, perfil' }, { status: 400 })
    }

    if (senha.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const perfisValidos = ['professor', 'secretaria', 'responsavel', 'admin']
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
      user_metadata: { nome: nome.trim(), perfil: novoPerfil },
      email_confirm: true,
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este email já está cadastrado no sistema' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ id: data.user.id, email: data.user.email }, { status: 201 })
  } catch (err) {
    console.error('Erro ao criar usuário:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
