import { SupabaseClient } from '@supabase/supabase-js'

export async function debugComSQL(supabase: SupabaseClient) {
  console.log('🔍 Executando queries SQL para debug...')

  const queries = [
    { nome: 'Escola', query: 'SELECT COUNT(*) as total FROM escola' },
    { nome: 'Anos Letivos', query: 'SELECT COUNT(*) as total FROM anos_letivos' },
    { nome: 'Bimestres', query: 'SELECT COUNT(*) as total FROM bimestres' },
    { nome: 'Turmas', query: 'SELECT COUNT(*) as total FROM turmas' },
    { nome: 'Disciplinas', query: 'SELECT COUNT(*) as total FROM disciplinas' },
    { nome: 'Alunos', query: 'SELECT COUNT(*) as total FROM alunos' },
    { nome: 'Responsáveis', query: 'SELECT COUNT(*) as total FROM responsaveis' },
    { nome: 'Usuários', query: 'SELECT COUNT(*) as total FROM usuarios' },
    { nome: 'Aulas', query: 'SELECT COUNT(*) as total FROM aulas' },
    { nome: 'Notas', query: 'SELECT COUNT(*) as total FROM notas' },
    { nome: 'Chamadas', query: 'SELECT COUNT(*) as total FROM chamadas' },
    { nome: 'Registros de Chamada', query: 'SELECT COUNT(*) as total FROM registros_chamada' },
  ]

  const resultado: { [key: string]: number } = {}

  for (const { nome, query } of queries) {
    try {
      const { data, error } = await (supabase.rpc('exec_sql', { sql: query }) as any).catch(() => ({ data: null, error: { message: 'Função RPC não disponível' } }))

      if (data) {
        console.log(`✓ ${nome}: ${data[0]?.total || 0}`)
        resultado[nome] = data[0]?.total || 0
      } else {
        // Tentar com select count
        const { count } = await supabase.from(nome.toLowerCase().replace(' ', '_')).select('*', { count: 'exact', head: true })
        console.log(`✓ ${nome}: ${count || 0} (via select count)`)
        resultado[nome] = count || 0
      }
    } catch (err) {
      console.log(`✕ ${nome}: erro`)
    }
  }

  console.table(resultado)
  return resultado
}
