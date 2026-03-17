import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: aluno, error } = await supabase
      .from('alunos')
      .select('id, qr_code, matricula, nome_completo')
      .eq('id', params.id)
      .eq('ativo', true)
      .single()

    if (error || !aluno) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    const qrContent = aluno.qr_code || `escola_aluno_${aluno.id}`

    const pngBuffer = await QRCode.toBuffer(qrContent, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="qrcode-${aluno.matricula}.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Erro ao gerar QR Code:', err)
    return NextResponse.json({ error: 'Erro ao gerar QR Code' }, { status: 500 })
  }
}
