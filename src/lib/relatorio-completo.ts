import { SupabaseClient } from '@supabase/supabase-js'

export async function gerarRelatorioCompleto(supabase: SupabaseClient) {
  console.log('📋 RELATÓRIO COMPLETO DO BANCO DE DADOS\n')

  const tabelas = [
    'escola',
    'anos_letivos',
    'bimestres',
    'turmas',
    'disciplinas',
    'alunos',
    'responsaveis',
    'usuarios',
    'aulas',
    'notas',
    'chamadas',
    'registros_chamada',
  ]

  const relatorio: any = {}

  for (const tabela of tabelas) {
    try {
      const { data, error, count } = await supabase
        .from(tabela)
        .select('*')
        .limit(100)

      if (error) {
        relatorio[tabela] = {
          total: 0,
          erro: error.message,
          dados: []
        }
        console.log(`❌ ${tabela}: ${error.message}`)
      } else {
        relatorio[tabela] = {
          total: data?.length || 0,
          erro: null,
          dados: data || [],
          preview: data && data.length > 0 ? data[0] : null
        }
        console.log(`✓ ${tabela}: ${data?.length || 0} registros`)
        if (data && data.length > 0) {
          console.log(`  Exemplo do primeiro registro:`, data[0])
        }
      }
    } catch (err) {
      relatorio[tabela] = {
        total: 0,
        erro: (err as Error).message,
        dados: []
      }
      console.log(`⚠️ ${tabela}: Erro na busca`)
    }
  }

  console.log('\n📊 RESUMO:')
  Object.entries(relatorio).forEach(([tabela, info]: [string, any]) => {
    console.log(`  ${tabela}: ${info.total} registros`)
  })

  return relatorio
}
