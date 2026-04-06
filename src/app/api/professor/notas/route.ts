import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { prova_id, turma_id, disciplina_id, ano_letivo_id, notas } = await req.json()
  // Suporta tanto notas de prova (prova_id) quanto notas bimestrais (turma_id + disciplina_id + ano_letivo_id)

  if (!Array.isArray(notas) || notas.length === 0) {
    return NextResponse.json({ error: 'Envie um array "notas" não vazio' }, { status: 400 })
  }

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

      if (!prova) return NextResponse.json({ error: 'Prova não encontrada ou não autorizado' }, { status: 404 })
    } else {
      return NextResponse.json({ error: 'Envie prova_id OU (turma_id + disciplina_id + ano_letivo_id)' }, { status: 400 })
    }

    // Upsert notas bimestrais
    if (turma_id && disciplina_id && ano_letivo_id) {
      const rows = notas.map((n: any) => ({
        aluno_id: n.aluno_id,
        disciplina_id,
        ano_letivo_id,
        nota: n.nota !== '' && n.nota !== null && n.nota !== undefined ? parseFloat(n.nota) : null,
        b1: null,
        b2: null,
        b3: null,
        b4: null,
        recuperacao: null,
        atualizado_em: new Date().toISOString()
      }))

      const { error } = await admin
        .from('notas')
        .upsert(rows, { onConflict: 'aluno_id,disciplina_id,ano_letivo_id' })

      if (error) return NextResponse.json({ error: `Erro ao salvar notas: ${error.message}` }, { status: 500 })
    }
    // Upsert notas de prova
    else if (prova_id) {
      const rows = notas.map((n: any) => ({
        prova_id,
        aluno_id: n.aluno_id,
        nota: n.nota !== '' && n.nota !== null && n.nota !== undefined ? parseFloat(n.nota) : null,
      }))

      const { error } = await admin.from('notas').upsert(rows, { onConflict: 'prova_id,aluno_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
