import { SupabaseClient } from '@supabase/supabase-js'

export async function debugTabelas(supabase: SupabaseClient) {
  const tabelasParaTentar = [
    'escola',
    'escolas',
    'anos_letivos',
    'ano_letivo',
    'bimestres',
    'bimestre',
    'turmas',
    'turma',
    'disciplinas',
    'disciplina',
    'alunos',
    'aluno',
    'responsaveis',
    'responsavel',
    'usuarios',
    'usuario',
    'users',
    'user',
    'aulas',
    'aula',
    'notas',
    'nota',
    'chamadas',
    'chamada',
    'registros_chamada',
    'registro_chamada',
    'frequencia',
    'presenca',
  ]

  const resultado: { [key: string]: number } = {}

  console.log('🔍 Testando tabelas...')

  for (const tabela of tabelasParaTentar) {
    try {
      const { data, error, count } = await supabase
        .from(tabela)
        .select('*', { count: 'exact', head: true })
        .limit(1)

      if (!error) {
        resultado[tabela] = count || 0
        console.log(`✓ ${tabela}: ${count} registros`)
      } else {
        console.log(`✕ ${tabela}: erro (${error.message})`)
      }
    } catch (err) {
      console.log(`✕ ${tabela}: exceção`)
    }
  }

  console.table(resultado)
  return resultado
}
