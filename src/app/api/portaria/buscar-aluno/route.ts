import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { qr_code } = await req.json()

    if (!qr_code?.trim()) {
      return NextResponse.json({ error: 'QR Code não informado' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: aluno, error } = await supabase
      .from('alunos')
      .select('id, nome_completo, foto_url, qr_code, turmas(nome)')
      .eq('qr_code', qr_code.trim())
      .eq('ativo', true)
      .single()

    if (error || !aluno) {
      return NextResponse.json({ error: 'QR Code não reconhecido' }, { status: 404 })
    }

    return NextResponse.json({
      id: aluno.id,
      nome_completo: aluno.nome_completo,
      foto_url: aluno.foto_url,
      qr_code: aluno.qr_code,
      turma: aluno.turmas,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
