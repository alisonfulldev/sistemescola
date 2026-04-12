import { SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function exportarDados(supabase: SupabaseClient, tipo: 'dia' | 'completo') {
  try {
    console.log(`🔄 Exportando dados (tipo: ${tipo})...`)

    // Buscar todas as tabelas do banco com tratamento de erro individual
    const resultados = await Promise.allSettled([
      supabase.from('escola').select('*'),
      supabase.from('anos_letivos').select('*'),
      supabase.from('bimestres').select('*'),
      supabase.from('calendario_escolar').select('*'),
      supabase.from('turmas').select('*'),
      supabase.from('disciplinas').select('*'),
      supabase.from('alunos').select('*'),
      supabase.from('alunos-fotos').select('*'),
      supabase.from('responsaveis').select('*'),
      supabase.from('responsaveis_alunos').select('*'),
      supabase.from('usuarios').select('*'),
      supabase.from('aulas').select('*'),
      supabase.from('notas').select('*'),
      supabase.from('notas_avaliacao').select('*'),
      supabase.from('avaliacoes').select('*'),
      supabase.from('provas').select('*'),
      supabase.from('chamadas').select('*'),
      supabase.from('registros_chamada').select('*'),
      supabase.from('justificativas').select('*'),
      supabase.from('justificativas_falta').select('*'),
      supabase.from('alertas').select('*'),
      supabase.from('entradas').select('*'),
      supabase.from('push_subscriptions').select('*'),
      supabase.from('audit_logs').select('*'),
      supabase.from('error_logs').select('*'),
      supabase.from('info_logs').select('*'),
    ])

    // Extrair dados com tratamento de erros
    const extrairDados = (index: number, nomeTabela: string) => {
      const resultado = resultados[index]
      if (resultado.status === 'fulfilled') {
        const { data, error } = resultado.value
        const dados = data || []
        console.log(`✓ ${nomeTabela}: ${dados.length} registros`, error ? `(ERRO: ${error.message})` : '')
        if (error) console.error(`  Erro em ${nomeTabela}:`, error)
        return dados
      }
      console.error(`❌ ${nomeTabela}: Promessa rejeitada -`, resultado.reason)
      return []
    }

    const escola = extrairDados(0, 'Escola')
    const anosLetivos = extrairDados(1, 'Anos Letivos')
    const bimestres = extrairDados(2, 'Bimestres')
    const calendarioEscolar = extrairDados(3, 'Calendário Escolar')
    const turmas = extrairDados(4, 'Turmas')
    const disciplinas = extrairDados(5, 'Disciplinas')
    const alunos = extrairDados(6, 'Alunos')
    const alunosFotos = extrairDados(7, 'Alunos Fotos')
    const responsaveis = extrairDados(8, 'Responsáveis')
    const responsaveisAlunos = extrairDados(9, 'Responsáveis-Alunos')
    const usuarios = extrairDados(10, 'Usuários')
    const aulas = extrairDados(11, 'Aulas')
    const notas = extrairDados(12, 'Notas')
    const notasAvaliacao = extrairDados(13, 'Notas Avaliação')
    const avaliacoes = extrairDados(14, 'Avaliações')
    const provas = extrairDados(15, 'Provas')
    const chamadas = extrairDados(16, 'Chamadas')
    const registros = extrairDados(17, 'Registros de Chamada')
    const justificativas = extrairDados(18, 'Justificativas')
    const justificativasFalta = extrairDados(19, 'Justificativas Falta')
    const alertas = extrairDados(20, 'Alertas')
    const entradas = extrairDados(21, 'Entradas')
    const pushSubscriptions = extrairDados(22, 'Push Subscriptions')
    const auditLogs = extrairDados(23, 'Audit Logs')
    const errorLogs = extrairDados(24, 'Error Logs')
    const infoLogs = extrairDados(25, 'Info Logs')

    // Filtrar por data se for "dia"
    const hoje = new Date().toISOString().split('T')[0]
    let aulasFiltered = aulas
    let aulaIdsFiltered: string[] = []

    if (tipo === 'dia') {
      aulasFiltered = aulasFiltered.filter((a: any) => a.data === hoje)
      aulaIdsFiltered = aulasFiltered.map((a: any) => a.id)
    }

    // Preparar dados por aba
    const sheets: { [key: string]: any[] } = {}

    // Configuração
    sheets['Escola'] = escola.map((e: any) => ({
      Nome: e.nome,
      Email: e.email,
      Telefone: e.telefone,
      CEP: e.cep,
      Endereço: e.endereco,
      Número: e.numero,
      Complemento: e.complemento,
      Bairro: e.bairro,
      Cidade: e.cidade,
      Estado: e.estado,
      CNPJ: e.cnpj,
      'Criado em': e.created_at,
    }))

    sheets['Anos Letivos'] = anosLetivos.map((a: any) => ({
      Ano: a.ano,
      'Data Início': a.data_inicio,
      'Data Fim': a.data_fim,
      Ativo: a.ativo ? 'Sim' : 'Não',
      'Criado em': a.created_at,
    }))

    sheets['Bimestres'] = bimestres.map((b: any) => ({
      'Ano Letivo ID': b.ano_letivo_id,
      Número: b.numero,
      'Data Início': b.data_inicio,
      'Data Fim': b.data_fim,
      'Criado em': b.created_at,
    }))

    sheets['Calendário Escolar'] = calendarioEscolar.map((c: any) => ({
      Data: c.data,
      Tipo: c.tipo,
      Descrição: c.descricao,
      'Criado em': c.created_at,
    }))

    sheets['Turmas'] = turmas.map((t: any) => ({
      ID: t.id,
      Nome: t.nome,
      Série: t.serie,
      Letra: t.turma_letra,
      Ativo: t.ativo ? 'Sim' : 'Não',
      'Criado em': t.created_at,
    }))

    sheets['Disciplinas'] = disciplinas.map((d: any) => ({
      ID: d.id,
      Nome: d.nome,
      'Carga Horária': d.carga_horaria,
      Ativo: d.ativo ? 'Sim' : 'Não',
      'Criado em': d.created_at,
    }))

    sheets['Alunos'] = alunos.map((a: any) => {
      const turma = turmas.find((t: any) => t.id === a.turma_id)
      return {
        ID: a.id,
        Matrícula: a.matricula,
        Nome: a.nome_completo,
        'Data Nascimento': a.data_nascimento,
        Turma: turma?.nome || '',
        Série: turma?.serie || '',
        CPF: a.cpf,
        Ativo: a.ativo ? 'Sim' : 'Não',
        'Criado em': a.created_at,
      }
    })

    sheets['Fotos Alunos'] = alunosFotos.map((f: any) => ({
      'Aluno ID': f.aluno_id,
      URL: f.url,
      'Criado em': f.created_at,
    }))

    sheets['Responsáveis'] = responsaveis.map((r: any) => ({
      ID: r.id,
      Nome: r.nome,
      Email: r.email,
      Celular: r.celular,
      Telefone: r.telefone,
      CPF: r.cpf,
      Parentesco: r.parentesco,
      'Criado em': r.created_at,
    }))

    sheets['Responsáveis-Alunos'] = responsaveisAlunos.map((ra: any) => ({
      'Responsável ID': ra.responsavel_id,
      'Aluno ID': ra.aluno_id,
      'Criado em': ra.created_at,
    }))

    sheets['Usuários'] = usuarios.map((u: any) => ({
      ID: u.id,
      Nome: u.nome,
      Email: u.email,
      Perfil: u.perfil,
      Ativo: u.ativo ? 'Sim' : 'Não',
      'Força Troca Senha': u.force_password_reset ? 'Sim' : 'Não',
      'Criado em': u.created_at,
    }))

    sheets['Aulas'] = aulasFiltered.map((a: any) => {
      const turma = turmas.find((t: any) => t.id === a.turma_id)
      const disciplina = disciplinas.find((d: any) => d.id === a.disciplina_id)
      return {
        ID: a.id,
        Data: a.data,
        Turma: turma?.nome || '',
        Disciplina: disciplina?.nome || '',
        'Conteúdo': a.conteudo_programatico || '',
        'Atividades': a.atividades_desenvolvidas || '',
        'Criado em': a.created_at,
      }
    })


    sheets['Notas'] = notas.map((n: any) => {
      const aluno = alunos.find((a: any) => a.id === n.aluno_id)
      const disciplina = disciplinas.find((d: any) => d.id === n.disciplina_id)
      return {
        'Aluno ID': n.aluno_id,
        'Aluno Nome': aluno?.nome_completo || '',
        'Disciplina': disciplina?.nome || '',
        'B1': n.b1 !== null ? n.b1 : '',
        'B2': n.b2 !== null ? n.b2 : '',
        'B3': n.b3 !== null ? n.b3 : '',
        'B4': n.b4 !== null ? n.b4 : '',
        'Recuperação': n.recuperacao !== null ? n.recuperacao : '',
        'Média Final': n.media_final !== null ? n.media_final : '',
        'Situação Final': n.situacao_final || '',
        'Criado em': n.created_at,
      }
    })

    sheets['Notas Avaliação'] = notasAvaliacao.map((na: any) => ({
      'Aluno ID': na.aluno_id,
      'Avaliação ID': na.avaliacao_id,
      Nota: na.nota,
      'Criado em': na.created_at,
    }))

    sheets['Avaliações'] = avaliacoes.map((av: any) => ({
      ID: av.id,
      Nome: av.nome,
      Disciplina: av.disciplina_id,
      Peso: av.peso,
      'Criado em': av.created_at,
    }))

    sheets['Provas'] = provas.map((p: any) => ({
      ID: p.id,
      Nome: p.nome,
      Data: p.data,
      Disciplina: p.disciplina_id,
      'Criado em': p.created_at,
    }))

    sheets['Chamadas'] = (tipo === 'dia' ? chamadas.filter((c: any) => {
      const aula = aulasFiltered.find((a: any) => a.id === c.aula_id)
      return !!aula
    }) : chamadas).map((c: any) => ({
      ID: c.id,
      'Aula ID': c.aula_id,
      'Criado em': c.created_at,
    }))

    sheets['Frequência'] = registros.map((r: any) => {
      const aluno = alunos.find((a: any) => a.id === r.aluno_id)
      return {
        'Aluno ID': r.aluno_id,
        'Aluno Nome': aluno?.nome_completo || '',
        Data: r.created_at?.split('T')[0] || '',
        Status: r.status || 'falta',
        Observação: r.observacao || '',
        'Justificado': r.justificado ? 'Sim' : 'Não',
        'Criado em': r.created_at,
      }
    })

    sheets['Justificativas'] = justificativas.map((j: any) => ({
      ID: j.id,
      'Aluno ID': j.aluno_id,
      Motivo: j.motivo,
      Status: j.status,
      'Resposta Professor': j.professor_resposta || '',
      'Criado em': j.created_at,
    }))

    sheets['Justificativas Falta'] = justificativasFalta.map((jf: any) => ({
      ID: jf.id,
      'Registro ID': jf.registro_id,
      Motivo: jf.motivo,
      Status: jf.status,
      'Criado em': jf.created_at,
    }))

    sheets['Alertas'] = alertas.map((al: any) => ({
      ID: al.id,
      Tipo: al.tipo,
      Mensagem: al.mensagem,
      Lido: al.lido ? 'Sim' : 'Não',
      'Criado em': al.created_at,
    }))

    sheets['Entradas'] = entradas.map((e: any) => ({
      ID: e.id,
      Tabela: e.tabela,
      Ação: e.acao,
      'Usuário ID': e.usuario_id,
      Dados: e.dados ? JSON.stringify(e.dados) : '',
      'Criado em': e.created_at,
    }))

    sheets['Push Subscriptions'] = pushSubscriptions.map((ps: any) => ({
      ID: ps.id,
      'Usuário ID': ps.usuario_id,
      Endpoint: ps.endpoint,
      'Criado em': ps.created_at,
    }))

    sheets['Audit Logs'] = auditLogs.slice(0, 1000).map((al: any) => ({
      ID: al.id,
      Ação: al.acao,
      Tabela: al.tabela,
      'ID Registro': al.id_registro,
      'Usuário ID': al.usuario_id,
      'Criado em': al.created_at,
    }))

    sheets['Error Logs'] = errorLogs.slice(0, 1000).map((el: any) => ({
      ID: el.id,
      Erro: el.erro,
      Stack: el.stack?.substring(0, 100) || '',
      'Criado em': el.created_at,
    }))

    sheets['Info Logs'] = infoLogs.slice(0, 1000).map((il: any) => ({
      ID: il.id,
      Mensagem: il.mensagem,
      Contexto: il.contexto || '',
      'Criado em': il.created_at,
    }))

    // Criar workbook
    const wb = XLSX.utils.book_new()

    // Adicionar abas em ordem
    const sheetOrder = [
      'Escola', 'Anos Letivos', 'Bimestres', 'Calendário Escolar',
      'Turmas', 'Disciplinas', 'Alunos', 'Fotos Alunos', 'Responsáveis', 'Responsáveis-Alunos',
      'Usuários', 'Aulas', 'Avaliações', 'Provas',
      'Notas', 'Notas Avaliação', 'Chamadas', 'Frequência',
      'Justificativas', 'Justificativas Falta', 'Alertas',
      'Entradas', 'Push Subscriptions', 'Audit Logs', 'Error Logs', 'Info Logs'
    ]

    sheetOrder.forEach(sheetName => {
      const data = sheets[sheetName] || []
      const ws = XLSX.utils.json_to_sheet(data)

      // Auto-ajustar largura das colunas
      if (data.length > 0) {
        const colWidths = Object.keys(data[0]).map(key => ({
          wch: Math.min(Math.max(key.length, 12), 50)
        }))
        ws['!cols'] = colWidths
      }

      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    // Gerar nome do arquivo
    const dataHoje = new Date().toISOString().split('T')[0]
    const hora = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-')
    const nomeArquivo = `dados_${tipo === 'dia' ? 'dia' : 'completo'}_${dataHoje}_${hora}.xlsx`

    // Fazer download
    XLSX.writeFile(wb, nomeArquivo)

    console.log(`✅ Arquivo ${nomeArquivo} gerado com sucesso!`)
    return { sucesso: true, mensagem: `✅ Dados exportados como ${nomeArquivo}` }
  } catch (erro) {
    console.error('❌ Erro ao exportar dados:', erro)
    return { sucesso: false, mensagem: `❌ Erro: ${(erro as Error).message}` }
  }
}
