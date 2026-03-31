import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''

  const alunoId = req.nextUrl.searchParams.get('aluno_id')
  const status = req.nextUrl.searchParams.get('status') // 'pendente', 'aprovada', 'rejeitada'

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    let query = admin
      .from('justificativas')
      .select(`
        id, aluno_id, data_falta, motivo, descricao_detalhada,
        status, documento_url, enviado_em, aprovado_em,
        alunos(nome_completo, matricula, turmas(nome)),
        usuarios:enviado_por(nome),
        usuarios:aprovado_por(nome)
      `)

    // Filtros baseado em perfil e parâmetros
    if (perfil === 'responsavel') {
      // Responsável vê apenas as justificativas de seus filhos
      const { data: minhaFamilias } = await supabase
        .from('responsaveis_alunos')
        .select('aluno_id')
        .eq('responsavel_id', user.id)

      const meusFilhos = minhaFamilias?.map(f => f.aluno_id) || []
      query = query.in('aluno_id', meusFilhos.length > 0 ? meusFilhos : [''])
    } else if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (alunoId) {
      query = query.eq('aluno_id', alunoId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: justificativas, error } = await query.order('data_falta', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ justificativas: justificativas || [] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: userData } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
  const perfil = userData?.perfil || ''

  const { aluno_id, data_falta, motivo, descricao_detalhada, documento_url, tipo_documento } = await req.json()

  if (!aluno_id || !data_falta || !motivo) {
    return NextResponse.json({
      error: 'Campos obrigatórios: aluno_id, data_falta, motivo'
    }, { status: 400 })
  }

  // Validar motivo
  const motivosValidos = ['medico', 'dentista', 'falecimento', 'acompanhamento_responsavel', 'consulta_especialista', 'atividade_escolar', 'motivo_pessoal', 'outro']
  if (!motivosValidos.includes(motivo)) {
    return NextResponse.json({ error: `Motivo inválido. Válidos: ${motivosValidos.join(', ')}` }, { status: 400 })
  }

  // Responsável só pode enviar para seus filhos
  if (perfil === 'responsavel') {
    const { data: filhos } = await supabase
      .from('responsaveis_alunos')
      .select('aluno_id')
      .eq('responsavel_id', user.id)

    const meusFilhos = filhos?.map(f => f.aluno_id) || []
    if (!meusFilhos.includes(aluno_id)) {
      return NextResponse.json({ error: 'Sem permissão para justificar este aluno' }, { status: 403 })
    }
  } else if (!['admin', 'secretaria', 'diretor'].includes(perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const { error } = await admin
      .from('justificativas')
      .upsert(
        {
          aluno_id,
          data_falta,
          motivo,
          descricao_detalhada,
          documento_url,
          tipo_documento,
          enviado_por: user.id,
          enviado_em: new Date().toISOString()
        },
        { onConflict: 'aluno_id,data_falta' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, message: 'Justificativa enviada com sucesso' }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
