import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const HistoricoSchema = z.object({
  aluno_id: z.string().uuid('aluno_id deve ser UUID válido')
})

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const alunoIdParam = req.nextUrl.searchParams.get('aluno_id')
  const validation = HistoricoSchema.safeParse({ aluno_id: alunoIdParam })

  if (!validation.success) {
    await logger.logAudit(user.id, 'historico_consultar', '/api/responsavel/historico', { aluno_id: alunoIdParam }, false)
    return NextResponse.json({ error: 'aluno_id deve ser UUID válido' }, { status: 400 })
  }

  const { aluno_id } = validation.data

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verifica se o responsável tem vínculo com esse aluno
    const { data: vinculo } = await admin
      .from('responsaveis_alunos')
      .select('aluno_id')
      .eq('responsavel_id', user.id)
      .eq('aluno_id', aluno_id)
      .maybeSingle()

    if (!vinculo) {
      await logger.logAudit(user.id, 'historico_consultar', '/api/responsavel/historico', { aluno_id }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Dados do aluno
    const { data: aluno } = await admin
      .from('alunos')
      .select('nome_completo, matricula, turmas(nome)')
      .eq('id', aluno_id)
      .single()

    if (!aluno) {
      await logger.logAudit(user.id, 'historico_consultar', '/api/responsavel/historico', { aluno_id }, false)
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    // Registros de chamada do aluno
    const { data: registros } = await admin
      .from('registros_chamada')
      .select('status, registrado_em, observacao, chamadas(id, aulas(data, turmas(nome), disciplinas(nome)))')
      .eq('aluno_id', aluno_id)
      .order('registrado_em', { ascending: false })

    const historico = (registros || [])
      .filter((r: any) => r?.chamadas?.aulas)  // Filtrar registros com dados incompletos
      .map((r: any) => ({
        status: r.status,
        registrado_em: r.registrado_em,
        observacao: r.observacao || null,
        data: r.chamadas?.aulas?.data || null,
        turma: r.chamadas?.aulas?.turmas?.nome || null,
        disciplina: r.chamadas?.aulas?.disciplinas?.nome || null,
      }))

    const total = historico.length
    const presentes = historico.filter(r => r.status === 'presente').length
    const faltas = historico.filter(r => r.status === 'falta').length
    const justificadas = historico.filter(r => r.status === 'justificada').length

    await logger.logAudit(user.id, 'historico_consultar', '/api/responsavel/historico', { aluno_id, registros: total }, true)

    return NextResponse.json({ aluno, historico, stats: { total, presentes, faltas, justificadas } })
  } catch (error) {
    await logger.logError('/api/responsavel/historico', error, user.id, { aluno_id })
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 })
  }
}
