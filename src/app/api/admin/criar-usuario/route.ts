import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { CreateUsuarioComSenhaSchema } from '@/lib/schemas/admin'
import { validateData, errorResponse } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: perfilData } = await supabase
      .from('usuarios')
      .select('perfil, escola_id')
      .eq('id', user.id)
      .single()

    const isAdmin = perfilData?.perfil === 'admin'
    const isSecretaria = perfilData?.perfil === 'secretaria'
    const isDiretor = perfilData?.perfil === 'diretor'
    if (!isAdmin && !isSecretaria && !isDiretor) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const body = await req.json()
    const validation = validateData(CreateUsuarioComSenhaSchema, {
      email: body.email?.toLowerCase(),
      nome: body.nome,
      senha: body.senha,
      perfil: body.perfil,
      turma_id: body.turma_id
    })

    if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

    const { email, nome, senha, perfil: novoPerfil, turma_id } = validation.data

    // Apenas admin pode criar conta admin
    if (!isAdmin && novoPerfil === 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar contas de administrador.' }, { status: 403 })
    }

    // Determinar escola_id do novo usuário:
    // - admin criando diretor: recebe escola_id via body
    // - admin criando qualquer outro: recebe escola_id via body
    // - diretor/secretaria criando qualquer usuário: herda o próprio escola_id
    let novoEscolaId: string | null = null
    if (isAdmin) {
      novoEscolaId = typeof body.escola_id === 'string' ? body.escola_id : null
    } else {
      // diretor/secretaria: novos usuários herdam a mesma escola
      novoEscolaId = perfilData?.escola_id || null
    }

    // responsavel não tem escola_id (é vinculado a alunos, não a escola diretamente)
    if (novoPerfil === 'responsavel') novoEscolaId = null

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

    const usuarioLogin = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')

    const { error: erroInsert } = await adminClient
      .from('usuarios')
      .upsert({
        id: data.user.id,
        nome: nome.trim(),
        email: email.trim(),
        perfil: novoPerfil,
        escola_id: novoEscolaId,
        usuario: usuarioLogin,
        ativo: true,
      }, { onConflict: 'id' })

    if (erroInsert) {
      await adminClient.auth.admin.deleteUser(data.user.id)
      return NextResponse.json({ error: 'Erro ao salvar usuário: ' + erroInsert.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.user.id, email: data.user.email }, { status: 201 })
  } catch (err) {
    console.error('Erro ao criar usuário:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
