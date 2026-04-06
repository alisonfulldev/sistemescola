import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Se prova_id passado, retorna notas da prova
  const provaId = req.nextUrl.searchParams.get('prova_id')
  if (provaId) {
    const { data: notas } = await admin.from('notas').select('aluno_id, nota').eq('prova_id', provaId)
    return NextResponse.json({ notas: notas || [] })
  }

  const { data: provas } = await admin
    .from('provas')
    .select('id, titulo, data, nota_maxima, publicada, criada_em, turmas(nome), turma_id')
    .eq('professor_id', user.id)
    .order('data', { ascending: false })

  return NextResponse.json({ provas: provas || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { titulo, turma_id, data, nota_maxima } = await req.json()
  if (!titulo?.trim() || !turma_id || !data) {
    return NextResponse.json({ error: 'titulo, turma_id e data são obrigatórios' }, { status: 400 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: prova, error } = await admin
    .from('provas')
    .insert({
      titulo: titulo.trim(),
      turma_id,
      professor_id: user.id,
      data,
      nota_maxima: nota_maxima || 10,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ prova })
}
