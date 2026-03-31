import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica se é admin, secretaria ou diretor
  const { data: usuario } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const isAdmin = usuario?.perfil === 'admin'
  const isSecretaria = usuario?.perfil === 'secretaria'
  const isDiretor = usuario?.perfil === 'diretor'
  if (!isAdmin && !isSecretaria && !isDiretor) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { user_id, nome, email, perfil, senha } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

  // Secretaria não pode alterar perfis — apenas admin/diretor pode
  if (perfil && !isAdmin && !isDiretor) {
    return NextResponse.json({ error: 'Apenas administradores podem alterar perfis' }, { status: 403 })
  }

  const perfisValidos = ['professor', 'secretaria', 'responsavel', 'admin', 'cozinha', 'diretor']
  if (perfil && !perfisValidos.includes(perfil)) {
    return NextResponse.json({ error: 'Perfil inválido' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Atualiza email e/ou senha no Auth
  const authUpdate: any = {}
  if (email?.trim()) authUpdate.email = email.trim()
  if (senha?.trim()) {
    if (senha.length < 6) return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    authUpdate.password = senha
  }
  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(user_id, authUpdate)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Atualiza nome e/ou perfil na tabela usuarios
  const dbUpdate: any = {}
  if (nome?.trim()) dbUpdate.nome = nome.trim()
  if (email?.trim()) dbUpdate.email = email.trim()
  if (perfil) dbUpdate.perfil = perfil
  if (Object.keys(dbUpdate).length > 0) {
    await admin.from('usuarios').update(dbUpdate).eq('id', user_id)
  }

  return NextResponse.json({ ok: true })
}
