import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // UMA ÚNICA QUERY com todos os joins
    // Justificativas → registros_chamada → chamadas → aulas + alunos
    const { data: justificativas } = await admin
      .from('justificativas_falta')
      .select(`
        id, registro_id, motivo, status, professor_resposta, criada_em, responsavel_id,
        usuarios(nome),
        registros_chamada!inner(
          id, aluno_id, chamada_id, status,
          chamadas!inner(
            id,
            aulas!inner(id, data, turmas(nome))
          ),
          alunos(id, nome_completo)
        )
      `)
      .in('registros_chamada.chamadas.aulas.professor_id', [user.id])
      .in('registros_chamada.status', ['falta', 'justificada'])
      .order('criada_em', { ascending: false })

    if (!justificativas?.length) {
      await logger.logAudit(user.id, 'justificativas_consultar', '/api/professor/justificativas', { justificativas: 0 }, true)
      return NextResponse.json({ justificativas: [] })
    }

    const resultado = justificativas.map((j: any) => {
      const reg = j.registros_chamada as any
      return {
        id: j.id,
        registro_id: j.registro_id,
        motivo: j.motivo,
        status: j.status,
        professor_resposta: j.professor_resposta,
        criada_em: j.criada_em,
        responsavel_nome: j.usuarios?.nome,
        aluno_nome: reg?.alunos?.nome_completo,
        data: reg?.chamadas?.aulas?.data,
        turma: reg?.chamadas?.aulas?.turmas?.nome,
      }
    })

    await logger.logAudit(user.id, 'justificativas_consultar', '/api/professor/justificativas', { justificativas: resultado.length }, true)

    return NextResponse.json({ justificativas: resultado })
  } catch (error) {
    await logger.logError('/api/professor/justificativas', error, user.id)
    return NextResponse.json({ justificativas: [] }, { status: 500 })
  }
}
