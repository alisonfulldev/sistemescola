import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id } = await paramsPromise
  const { status, observacao_aprovacao } = await req.json()

  if (!status || !['aprovada', 'rejeitada'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido. Deve ser: aprovada ou rejeitada' }, { status: 400 })
  }

  if (!id) {
    return NextResponse.json({ error: 'ID da justificativa não fornecido' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { error } = await admin
      .from('justificativas')
      .update({
        status,
        aprovado_em: new Date().toISOString(),
        aprovado_por: user.id,
        observacao_aprovacao,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `Justificativa ${status === 'aprovada' ? 'aprovada' : 'rejeitada'} com sucesso`
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { id } = await paramsPromise

  try {
    const { data: justificativa, error } = await admin
      .from('justificativas')
      .select(`
        *,
        alunos(nome_completo, matricula, turmas(nome)),
        usuarios:enviado_por(nome),
        usuarios:aprovado_por(nome)
      `)
      .eq('id', id)
      .single()

    if (error || !justificativa) {
      return NextResponse.json({ error: 'Justificativa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ justificativa })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  if (!['admin', 'secretaria', 'diretor'].includes(userData?.perfil || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { id } = await paramsPromise

  try {
    const { error } = await admin
      .from('justificativas')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: 'Justificativa removida com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
