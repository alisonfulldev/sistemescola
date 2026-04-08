import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { data: perfil } = await supabase.from('usuarios').select('perfil').eq('id', user.id).single()
    if (!['secretaria', 'admin', 'diretor'].includes(perfil?.perfil || '')) {
      await logger.logAudit(user.id, 'justificativas_consultar', '/api/adm/justificativas', {}, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: justificativas } = await admin
      .from('justificativas_falta')
      .select(`
        id, motivo, status, criada_em,
        responsavel_id, usuarios!responsavel_id(nome),
        registro_id,
        registros_chamada!registro_id(
          aluno_id, alunos(nome_completo),
          chamada_id, chamadas(aulas(data, turmas(nome), usuarios(nome)))
        )
      `)
      .order('criada_em', { ascending: false })
      .limit(200)

    const resultado = (justificativas || []).map((j: any) => {
      const reg = j.registros_chamada
      const aula = reg?.chamadas?.aulas
      return {
        id: j.id,
        motivo: j.motivo,
        status: j.status,
        criada_em: j.criada_em,
        responsavel_nome: j.usuarios?.nome,
        aluno_nome: reg?.alunos?.nome_completo,
        turma: aula?.turmas?.nome,
        professor: aula?.usuarios?.nome,
        data_aula: aula?.data,
      }
    })

    await logger.logAudit(user.id, 'justificativas_consultar', '/api/adm/justificativas', { justificativas: resultado.length }, true)

    return NextResponse.json({ justificativas: resultado })
  } catch (error) {
    await logger.logError('/api/adm/justificativas', error, user.id)
    return NextResponse.json({ justificativas: [] }, { status: 500 })
  }
}
