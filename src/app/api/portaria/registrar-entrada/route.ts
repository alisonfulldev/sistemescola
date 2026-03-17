import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { qr_code } = await req.json()

    if (!qr_code?.trim()) {
      return NextResponse.json({ error: 'QR Code não informado' }, { status: 400 })
    }

    // Portaria usa service_role (sem autenticação necessária)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Busca o aluno pelo qr_code
    const { data: aluno, error: alunoError } = await supabase
      .from('alunos')
      .select('id, nome_completo, foto_url, turma_id, turmas(nome)')
      .eq('qr_code', qr_code.trim())
      .eq('ativo', true)
      .single()

    if (alunoError || !aluno) {
      return NextResponse.json({ error: 'QR Code não reconhecido' }, { status: 404 })
    }

    const hoje = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

    // Verifica se já foi registrado hoje
    const { data: entradaExistente } = await supabase
      .from('entradas')
      .select('id, hora')
      .eq('aluno_id', aluno.id)
      .eq('data', hoje)
      .single()

    if (entradaExistente) {
      return NextResponse.json(
        {
          aluno: {
            id: aluno.id,
            nome_completo: aluno.nome_completo,
            foto_url: aluno.foto_url,
            turma: aluno.turmas,
          },
          hora: entradaExistente.hora,
        },
        { status: 409 }
      )
    }

    // Registra a nova entrada
    const agora = new Date()
    const hora = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })

    const { error: insertError } = await supabase
      .from('entradas')
      .insert({
        aluno_id: aluno.id,
        data: hoje,
        hora,
        dispositivo: 'portaria',
      })

    if (insertError) {
      // Corrida de dados: outra requisição registrou ao mesmo tempo
      if (insertError.code === '23505') {
        const { data: entradaRace } = await supabase
          .from('entradas')
          .select('hora')
          .eq('aluno_id', aluno.id)
          .eq('data', hoje)
          .single()

        return NextResponse.json(
          {
            aluno: {
              id: aluno.id,
              nome_completo: aluno.nome_completo,
              foto_url: aluno.foto_url,
              turma: aluno.turmas,
            },
            hora: entradaRace?.hora || hora,
          },
          { status: 409 }
        )
      }
      console.error('Erro ao registrar entrada:', insertError)
      return NextResponse.json({ error: 'Erro ao registrar entrada' }, { status: 500 })
    }

    return NextResponse.json(
      {
        aluno: {
          id: aluno.id,
          nome_completo: aluno.nome_completo,
          foto_url: aluno.foto_url,
          turma: aluno.turmas,
        },
        hora,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Erro na portaria:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
