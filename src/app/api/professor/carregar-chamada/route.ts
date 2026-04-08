import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const CarregarChamadaSchema = z.object({
  chamada_id: z.string().uuid('chamada_id deve ser UUID válido')
})

export async function GET(req: NextRequest) {
  // Valida sessão
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const chamadaId = req.nextUrl.searchParams.get('chamada_id')
  const validation = CarregarChamadaSchema.safeParse({ chamada_id: chamadaId })
  if (!validation.success) {
    return NextResponse.json({ error: 'chamada_id inválido' }, { status: 400 })
  }

  try {

    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Carrega chamada + aula + turma
    const { data: chamada } = await admin
      .from('chamadas')
      .select(`
        id, status,
        aulas (
          id, data, horario_inicio, horario_fim, professor_id, turma_id,
          turmas (id, nome, turno),
          disciplinas (nome)
        )
      `)
      .eq('id', chamadaId)
      .single()

    if (!chamada) {
      await logger.logAudit(user.id, 'chamada_carregar', '/api/professor/carregar-chamada', { chamada_id: chamadaId }, false)
      return NextResponse.json({ error: 'Chamada não encontrada' }, { status: 404 })
    }

    // Garante que é do professor logado
    if ((chamada as any).aulas?.professor_id !== user.id) {
      await logger.logAudit(user.id, 'chamada_carregar', '/api/professor/carregar-chamada', { chamada_id: chamadaId }, false)
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const turmaId = (chamada as any).aulas?.turma_id
    const hoje = new Date().toISOString().split('T')[0]

    // Busca alunos da turma
    const { data: alunos } = await admin
      .from('alunos')
      .select('id, nome_completo, foto_url')
      .eq('turma_id', turmaId)
      .eq('ativo', true)
      .order('nome_completo')

    // Busca registros existentes desta chamada
    const { data: registros } = await admin
      .from('registros_chamada')
      .select('aluno_id, status, observacao')
      .eq('chamada_id', chamadaId)

    // Busca entradas de hoje
    const alunoIds = (alunos || []).map((a: any) => a.id)
    const { data: entradas } = alunoIds.length > 0
      ? await admin.from('entradas').select('aluno_id, hora').in('aluno_id', alunoIds).eq('data', hoje)
      : { data: [] }

    await logger.logAudit(user.id, 'chamada_carregar', '/api/professor/carregar-chamada', {
      chamada_id: chamadaId,
      alunos: alunos?.length || 0
    }, true)

    return NextResponse.json({ chamada, alunos: alunos || [], registros: registros || [], entradas: entradas || [] })
  } catch (error) {
    await logger.logError('/api/professor/carregar-chamada', error, user.id)
    return NextResponse.json({ error: 'Erro ao carregar chamada' }, { status: 500 })
  }
}
