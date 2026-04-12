import { SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function exportarDados(supabase: SupabaseClient, tipo: 'dia' | 'completo') {
  try {
    // Buscar todas as tabelas do banco
    const [
      { data: alunos },
      { data: turmas },
      { data: disciplinas },
      { data: notas },
      { data: aulas },
      { data: chamadas },
      { data: registros },
      { data: responsaveis },
      { data: usuarios },
      { data: escola },
      { data: anosLetivos },
      { data: bimestres },
    ] = await Promise.all([
      supabase.from('alunos').select('*'),
      supabase.from('turmas').select('*'),
      supabase.from('disciplinas').select('*'),
      supabase.from('notas').select('*'),
      supabase.from('aulas').select('*'),
      supabase.from('chamadas').select('*'),
      supabase.from('registros_chamada').select('*'),
      supabase.from('responsaveis').select('*'),
      supabase.from('usuarios').select('*'),
      supabase.from('escola').select('*'),
      supabase.from('anos_letivos').select('*'),
      supabase.from('bimestres').select('*'),
    ])

    // Filtrar por data se for "dia"
    const hoje = new Date().toISOString().split('T')[0]
    let aulasFiltered = aulas || []
    let aulaIdsFiltered: string[] = []

    if (tipo === 'dia') {
      aulasFiltered = aulasFiltered.filter((a: any) => a.data === hoje)
      aulaIdsFiltered = aulasFiltered.map((a: any) => a.id)
    }

    // Preparar dados por aba
    const sheets: { [key: string]: any[] } = {}

    // ABA 1: Escola
    sheets['Escola'] = (escola || []).map((e: any) => ({
      Nome: e.nome,
      'E-mail': e.email,
      Telefone: e.telefone,
      CEP: e.cep,
      Endereço: e.endereco,
      Número: e.numero,
      Complemento: e.complemento,
      Bairro: e.bairro,
      Cidade: e.cidade,
      Estado: e.estado,
      CNPJ: e.cnpj,
      'Data de Criação': e.created_at,
    }))

    // ABA 2: Anos Letivos
    sheets['Anos Letivos'] = (anosLetivos || []).map((a: any) => ({
      Ano: a.ano,
      'Data Início': a.data_inicio,
      'Data Fim': a.data_fim,
      Ativo: a.ativo ? 'Sim' : 'Não',
    }))

    // ABA 3: Bimestres
    sheets['Bimestres'] = (bimestres || []).map((b: any) => ({
      'Ano Letivo': b.ano_letivo_id,
      Número: b.numero,
      'Data Início': b.data_inicio,
      'Data Fim': b.data_fim,
    }))

    // ABA 4: Turmas
    sheets['Turmas'] = (turmas || []).map((t: any) => ({
      ID: t.id,
      Nome: t.nome,
      Série: t.serie,
      Turma: t.turma_letra,
      Ativo: t.ativo ? 'Sim' : 'Não',
      'Criado em': t.created_at,
    }))

    // ABA 5: Disciplinas
    sheets['Disciplinas'] = (disciplinas || []).map((d: any) => ({
      ID: d.id,
      Nome: d.nome,
      'Carga Horária': d.carga_horaria,
      Ativo: d.ativo ? 'Sim' : 'Não',
      'Criado em': d.created_at,
    }))

    // ABA 6: Alunos
    sheets['Alunos'] = (alunos || []).map((a: any) => {
      const turma = turmas?.find((t: any) => t.id === a.turma_id)
      return {
        ID: a.id,
        Matrícula: a.matricula,
        Nome: a.nome_completo,
        'Data de Nascimento': a.data_nascimento,
        Turma: turma?.nome || '',
        Série: turma?.serie || '',
        CPF: a.cpf,
        Ativo: a.ativo ? 'Sim' : 'Não',
        'Criado em': a.created_at,
      }
    })

    // ABA 7: Responsáveis
    sheets['Responsáveis'] = (responsaveis || []).map((r: any) => ({
      ID: r.id,
      Nome: r.nome,
      Email: r.email,
      Celular: r.celular,
      Telefone: r.telefone,
      CPF: r.cpf,
      Parentesco: r.parentesco,
      'Criado em': r.created_at,
    }))

    // ABA 8: Usuários
    sheets['Usuários'] = (usuarios || []).map((u: any) => ({
      ID: u.id,
      Nome: u.nome,
      Email: u.email,
      Perfil: u.perfil,
      Ativo: u.ativo ? 'Sim' : 'Não',
      'Força Troca Senha': u.force_password_reset ? 'Sim' : 'Não',
      'Criado em': u.created_at,
    }))

    // ABA 9: Aulas
    let aulasSheet = aulasFiltered.map((a: any) => {
      const turma = turmas?.find((t: any) => t.id === a.turma_id)
      const disciplina = disciplinas?.find((d: any) => d.id === a.disciplina_id)
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
    sheets['Aulas'] = aulasSheet

    // ABA 10: Notas
    let notasSheet = (notas || []).map((n: any) => {
      const aluno = alunos?.find((a: any) => a.id === n.aluno_id)
      const disciplina = disciplinas?.find((d: any) => d.id === n.disciplina_id)
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
      }
    })
    sheets['Notas'] = notasSheet

    // ABA 11: Chamadas (apenas do dia se aplicável)
    let chamadasFiltered = chamadas || []
    if (tipo === 'dia') {
      chamadasFiltered = chamadasFiltered.filter((c: any) => aulaIdsFiltered.includes(c.aula_id))
    }

    sheets['Chamadas'] = chamadasFiltered.map((c: any) => {
      const aula = aulasFiltered.find((a: any) => a.id === c.aula_id)
      return {
        ID: c.id,
        'Aula ID': c.aula_id,
        'Aula Data': aula?.data || '',
        'Criado em': c.created_at,
      }
    })

    // ABA 12: Frequência (registros de chamada)
    let registrosFiltered = registros || []
    if (tipo === 'dia') {
      const chamadasIds = chamadasFiltered.map((c: any) => c.id)
      registrosFiltered = registrosFiltered.filter((r: any) => chamadasIds.includes(r.chamada_id))
    }

    sheets['Frequência'] = registrosFiltered.map((r: any) => {
      const aluno = alunos?.find((a: any) => a.id === r.aluno_id)
      const chamada = chamadasFiltered.find((c: any) => c.id === r.chamada_id)
      const aula = aulasFiltered.find((a: any) => a.id === chamada?.aula_id)

      return {
        'Aluno ID': r.aluno_id,
        'Aluno Nome': aluno?.nome_completo || '',
        Data: aula?.data || '',
        Status: r.status || 'falta',
        Observação: r.observacao || '',
        'Justificado': r.justificado ? 'Sim' : 'Não',
        'Criado em': r.created_at,
      }
    })

    // Criar workbook
    const wb = XLSX.utils.book_new()

    // Adicionar abas em ordem
    Object.keys(sheets).forEach(sheetName => {
      const ws = XLSX.utils.json_to_sheet(sheets[sheetName])

      // Auto-ajustar largura das colunas
      const colWidths = sheets[sheetName].length > 0
        ? Object.keys(sheets[sheetName][0]).map(key => ({
            wch: Math.min(Math.max(key.length, 12), 50)
          }))
        : []
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    // Gerar nome do arquivo
    const dataHoje = new Date().toISOString().split('T')[0]
    const hora = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-')
    const nomeArquivo = `dados_${tipo === 'dia' ? 'dia' : 'completo'}_${dataHoje}_${hora}.xlsx`

    // Fazer download
    XLSX.writeFile(wb, nomeArquivo)

    return { sucesso: true, mensagem: `Dados exportados como ${nomeArquivo}` }
  } catch (erro) {
    console.error('Erro ao exportar dados:', erro)
    return { sucesso: false, mensagem: (erro as Error).message }
  }
}
