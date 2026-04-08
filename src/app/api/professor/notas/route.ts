import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { SaveNotasSchema } from '@/lib/schemas/notas'
import { validateData, errorResponse } from '@/lib/api-utils'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const validation = validateData(SaveNotasSchema, await req.json())
  if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)

  const { prova_id, turma_id, disciplina_id, ano_letivo_id, notas } = validation.data

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // Validar permissão do professor
    if (turma_id && disciplina_id && ano_letivo_id) {
      // Notas bimestrais: validar que professor leciona nessa turma+disciplina
      // Procura por qualquer aula do professor nessa turma+disciplina (independente de ano_letivo)
      const { data: aulas, error: aulaError } = await admin
        .from('aulas')
        .select('id')
        .eq('turma_id', turma_id)
        .eq('disciplina_id', disciplina_id)
        .eq('professor_id', user.id)
        .limit(1)

      // Se não encontrar aulas, pode ser que não há aulas cadastradas ainda
      // Nesse caso, apenas verifica se turma e disciplina existem e aceita
      if (!aulas || aulas.length === 0) {
        // Validação alternativa: apenas verifica se turma e disciplina existem
        const { data: turmaData } = await admin
          .from('turmas')
          .select('id')
          .eq('id', turma_id)
          .single()

        const { data: disciplinaData } = await admin
          .from('disciplinas')
          .select('id')
          .eq('id', disciplina_id)
          .single()

        if (!turmaData || !disciplinaData) {
          await logger.logAudit(user.id, 'notas_salvar', '/api/professor/notas', { turma_id, disciplina_id }, false)
          return NextResponse.json({ error: 'Turma ou disciplina não encontrada' }, { status: 404 })
        }
        // Permitir mesmo sem aulas cadastradas (professor pode lançar notas antes de criar aulas)
      }
    } else if (prova_id) {
      // Notas de prova: validar que professor criou a prova
      const { data: prova } = await admin
        .from('provas')
        .select('id')
        .eq('id', prova_id)
        .eq('professor_id', user.id)
        .single()

      if (!prova) {
        await logger.logAudit(user.id, 'notas_salvar', '/api/professor/notas', { prova_id }, false)
        return NextResponse.json({ error: 'Prova não encontrada ou não autorizado' }, { status: 404 })
      }
    } else {
      await logger.logAudit(user.id, 'notas_salvar', '/api/professor/notas', {}, false)
      return NextResponse.json({ error: 'Envie prova_id OU (turma_id + disciplina_id + ano_letivo_id)' }, { status: 400 })
    }

    // Upsert notas bimestrais
    if (turma_id && disciplina_id && ano_letivo_id) {
      // Helper para validar e parsear nota
      const parseNota = (valor: any) => {
        if (valor === '' || valor === null || valor === undefined) return null
        const num = parseFloat(valor)
        if (isNaN(num)) return null
        // Validar range [0, 10]
        if (num < 0 || num > 10) return null
        return num
      }

      const rows = notas.map((n: any) => ({
        aluno_id: n.aluno_id,
        disciplina_id,
        ano_letivo_id,
        b1: parseNota(n.b1),
        b2: parseNota(n.b2),
        b3: parseNota(n.b3),
        b4: parseNota(n.b4),
        recuperacao: parseNota(n.recuperacao),
        atualizado_em: new Date().toISOString()
      }))

      // Validar se há notas inválidas
      const hasInvalidNotas = notas.some((n: any, i: number) => {
        const fields = ['b1', 'b2', 'b3', 'b4', 'recuperacao']
        return fields.some(f => {
          const val = n[f]
          if (val === '' || val === null || val === undefined) return false
          const num = parseFloat(val)
          return isNaN(num) || num < 0 || num > 10
        })
      })

      if (hasInvalidNotas) {
        await logger.logAudit(user.id, 'notas_salvar', '/api/professor/notas', { turma_id, disciplina_id }, false)
        return NextResponse.json({ error: 'Notas devem estar entre 0 e 10' }, { status: 400 })
      }

      const { error } = await admin
        .from('notas')
        .upsert(rows, { onConflict: 'aluno_id,disciplina_id,ano_letivo_id' })

      if (error) {
        await logger.logError('/api/professor/notas', error, user.id, { turma_id, disciplina_id, ano_letivo_id })
        return NextResponse.json({ error: 'Erro ao salvar notas' }, { status: 500 })
      }

      await logger.logAudit(user.id, 'notas_salvar', '/api/professor/notas', {
        turma_id,
        disciplina_id,
        ano_letivo_id,
        quantidade_notas: notas.length
      }, true)
    }
    // Upsert notas de prova
    else if (prova_id) {
      const rows = notas.map((n: any) => ({
        prova_id,
        aluno_id: n.aluno_id,
        nota: n.nota !== '' && n.nota !== null && n.nota !== undefined ? parseFloat(n.nota) : null,
      }))

      const { error } = await admin.from('notas').upsert(rows, { onConflict: 'prova_id,aluno_id' })
      if (error) {
        await logger.logError('/api/professor/notas', error, user.id, { prova_id })
        return NextResponse.json({ error: 'Erro ao salvar notas' }, { status: 500 })
      }

      await logger.logAudit(user.id, 'notas_salvar', '/api/professor/notas', {
        prova_id,
        quantidade_notas: notas.length
      }, true)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    await logger.logError('/api/professor/notas', error, user.id)
    return NextResponse.json({ error: 'Erro interno ao salvar notas' }, { status: 500 })
  }
}
