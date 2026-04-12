import { SupabaseClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function exportarDados(supabase: SupabaseClient, tipo: 'dia' | 'completo') {
  try {
    console.log(`🔄 Exportando dados (tipo: ${tipo})...`)

    // Buscar todas as tabelas
    const [
      escolaRes,
      anosRes,
      bimestresRes,
      turmasRes,
      disciplinasRes,
      alunosRes,
      responsaveisRes,
      usuariosRes,
      aulasRes,
      notasRes,
      chamaddasRes,
      registrosRes,
      justificativasRes,
      avaliacoesRes,
      alertasRes,
      notasAvaliacaoRes,
      fotosRes,
      responsaveisAlunosRes,
      calendarioRes,
      provasRes,
      justificativasFaltaRes,
      entradasRes,
      pushRes,
    ] = await Promise.all([
      supabase.from('escola').select('*'),
      supabase.from('anos_letivos').select('*'),
      supabase.from('bimestres').select('*'),
      supabase.from('turmas').select('*'),
      supabase.from('disciplinas').select('*'),
      supabase.from('alunos').select('*'),
      supabase.from('responsaveis').select('*'),
      supabase.from('usuarios').select('*'),
      supabase.from('aulas').select('*'),
      supabase.from('notas').select('*'),
      supabase.from('chamadas').select('*'),
      supabase.from('registros_chamada').select('*'),
      supabase.from('justificativas').select('*'),
      supabase.from('avaliacoes').select('*'),
      supabase.from('alertas').select('*'),
      supabase.from('notas_avaliacao').select('*'),
      supabase.from('alunos-fotos').select('*'),
      supabase.from('responsaveis_alunos').select('*'),
      supabase.from('calendario_escolar').select('*'),
      supabase.from('provas').select('*'),
      supabase.from('justificativas_falta').select('*'),
      supabase.from('entradas').select('*'),
      supabase.from('push_subscriptions').select('*'),
    ])

    // Extrair dados
    const escola = escolaRes.data || []
    const anos = anosRes.data || []
    const bimestres = bimestresRes.data || []
    const turmas = turmasRes.data || []
    const disciplinas = disciplinasRes.data || []
    const alunos = alunosRes.data || []
    const responsaveis = responsaveisRes.data || []
    const usuarios = usuariosRes.data || []
    const aulas = aulasRes.data || []
    const notas = notasRes.data || []
    const chamadas = chamaddasRes.data || []
    const registros = registrosRes.data || []
    const justificativas = justificativasRes.data || []
    const avaliacoes = avaliacoesRes.data || []
    const alertas = alertasRes.data || []
    const notasAvaliacao = notasAvaliacaoRes.data || []
    const fotos = fotosRes.data || []
    const responsaveisAlunos = responsaveisAlunosRes.data || []
    const calendario = calendarioRes.data || []
    const provas = provasRes.data || []
    const justificativasFalta = justificativasFaltaRes.data || []
    const entradas = entradasRes.data || []
    const push = pushRes.data || []

    console.log('Dados carregados:', {
      escola: escola.length,
      anos: anos.length,
      bimestres: bimestres.length,
      turmas: turmas.length,
      disciplinas: disciplinas.length,
      alunos: alunos.length,
      responsaveis: responsaveis.length,
      usuarios: usuarios.length,
      aulas: aulas.length,
      notas: notas.length,
      chamadas: chamadas.length,
      registros: registros.length,
      justificativas: justificativas.length,
      avaliacoes: avaliacoes.length,
      alertas: alertas.length,
      notasAvaliacao: notasAvaliacao.length,
      fotos: fotos.length,
      responsaveisAlunos: responsaveisAlunos.length,
      calendario: calendario.length,
      provas: provas.length,
      justificativasFalta: justificativasFalta.length,
      entradas: entradas.length,
      push: push.length,
    })

    // Criar workbook e adicionar abas
    const wb = XLSX.utils.book_new()

    // ABA 1: Escola
    if (escola.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(escola)
      XLSX.utils.book_append_sheet(wb, ws1, 'Escola')
      console.log('✓ Aba Escola adicionada')
    }

    // ABA 2: Anos Letivos
    if (anos.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(anos)
      XLSX.utils.book_append_sheet(wb, ws2, 'Anos Letivos')
      console.log('✓ Aba Anos Letivos adicionada')
    }

    // ABA 3: Bimestres
    if (bimestres.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(bimestres)
      XLSX.utils.book_append_sheet(wb, ws3, 'Bimestres')
      console.log('✓ Aba Bimestres adicionada')
    }

    // ABA 4: Turmas
    if (turmas.length > 0) {
      const ws4 = XLSX.utils.json_to_sheet(turmas)
      XLSX.utils.book_append_sheet(wb, ws4, 'Turmas')
      console.log('✓ Aba Turmas adicionada')
    }

    // ABA 5: Disciplinas
    if (disciplinas.length > 0) {
      const ws5 = XLSX.utils.json_to_sheet(disciplinas)
      XLSX.utils.book_append_sheet(wb, ws5, 'Disciplinas')
      console.log('✓ Aba Disciplinas adicionada')
    }

    // ABA 6: Alunos
    if (alunos.length > 0) {
      const ws6 = XLSX.utils.json_to_sheet(alunos)
      XLSX.utils.book_append_sheet(wb, ws6, 'Alunos')
      console.log('✓ Aba Alunos adicionada')
    }

    // ABA 7: Fotos
    if (fotos.length > 0) {
      const ws7 = XLSX.utils.json_to_sheet(fotos)
      XLSX.utils.book_append_sheet(wb, ws7, 'Fotos Alunos')
      console.log('✓ Aba Fotos adicionada')
    }

    // ABA 8: Responsáveis
    if (responsaveis.length > 0) {
      const ws8 = XLSX.utils.json_to_sheet(responsaveis)
      XLSX.utils.book_append_sheet(wb, ws8, 'Responsáveis')
      console.log('✓ Aba Responsáveis adicionada')
    }

    // ABA 9: Responsáveis-Alunos
    if (responsaveisAlunos.length > 0) {
      const ws9 = XLSX.utils.json_to_sheet(responsaveisAlunos)
      XLSX.utils.book_append_sheet(wb, ws9, 'Responsáveis-Alunos')
      console.log('✓ Aba Responsáveis-Alunos adicionada')
    }

    // ABA 10: Usuários
    if (usuarios.length > 0) {
      const ws10 = XLSX.utils.json_to_sheet(usuarios)
      XLSX.utils.book_append_sheet(wb, ws10, 'Usuários')
      console.log('✓ Aba Usuários adicionada')
    }

    // ABA 11: Aulas
    if (aulas.length > 0) {
      const ws11 = XLSX.utils.json_to_sheet(aulas)
      XLSX.utils.book_append_sheet(wb, ws11, 'Aulas')
      console.log('✓ Aba Aulas adicionada')
    }

    // ABA 12: Calendário
    if (calendario.length > 0) {
      const ws12 = XLSX.utils.json_to_sheet(calendario)
      XLSX.utils.book_append_sheet(wb, ws12, 'Calendário')
      console.log('✓ Aba Calendário adicionada')
    }

    // ABA 13: Notas
    if (notas.length > 0) {
      const ws13 = XLSX.utils.json_to_sheet(notas)
      XLSX.utils.book_append_sheet(wb, ws13, 'Notas')
      console.log('✓ Aba Notas adicionada')
    }

    // ABA 14: Notas Avaliação
    if (notasAvaliacao.length > 0) {
      const ws14 = XLSX.utils.json_to_sheet(notasAvaliacao)
      XLSX.utils.book_append_sheet(wb, ws14, 'Notas Avaliação')
      console.log('✓ Aba Notas Avaliação adicionada')
    }

    // ABA 15: Avaliações
    if (avaliacoes.length > 0) {
      const ws15 = XLSX.utils.json_to_sheet(avaliacoes)
      XLSX.utils.book_append_sheet(wb, ws15, 'Avaliações')
      console.log('✓ Aba Avaliações adicionada')
    }

    // ABA 16: Provas
    if (provas.length > 0) {
      const ws16 = XLSX.utils.json_to_sheet(provas)
      XLSX.utils.book_append_sheet(wb, ws16, 'Provas')
      console.log('✓ Aba Provas adicionada')
    }

    // ABA 17: Chamadas
    if (chamadas.length > 0) {
      const ws17 = XLSX.utils.json_to_sheet(chamadas)
      XLSX.utils.book_append_sheet(wb, ws17, 'Chamadas')
      console.log('✓ Aba Chamadas adicionada')
    }

    // ABA 18: Registros de Chamada
    if (registros.length > 0) {
      const ws18 = XLSX.utils.json_to_sheet(registros)
      XLSX.utils.book_append_sheet(wb, ws18, 'Frequência')
      console.log('✓ Aba Frequência adicionada')
    }

    // ABA 19: Justificativas
    if (justificativas.length > 0) {
      const ws19 = XLSX.utils.json_to_sheet(justificativas)
      XLSX.utils.book_append_sheet(wb, ws19, 'Justificativas')
      console.log('✓ Aba Justificativas adicionada')
    }

    // ABA 20: Justificativas Falta
    if (justificativasFalta.length > 0) {
      const ws20 = XLSX.utils.json_to_sheet(justificativasFalta)
      XLSX.utils.book_append_sheet(wb, ws20, 'Justificativas Falta')
      console.log('✓ Aba Justificativas Falta adicionada')
    }

    // ABA 21: Alertas
    if (alertas.length > 0) {
      const ws21 = XLSX.utils.json_to_sheet(alertas)
      XLSX.utils.book_append_sheet(wb, ws21, 'Alertas')
      console.log('✓ Aba Alertas adicionada')
    }

    // ABA 22: Entradas
    if (entradas.length > 0) {
      const ws22 = XLSX.utils.json_to_sheet(entradas)
      XLSX.utils.book_append_sheet(wb, ws22, 'Entradas')
      console.log('✓ Aba Entradas adicionada')
    }

    // ABA 23: Push Subscriptions
    if (push.length > 0) {
      const ws23 = XLSX.utils.json_to_sheet(push)
      XLSX.utils.book_append_sheet(wb, ws23, 'Push Subscriptions')
      console.log('✓ Aba Push Subscriptions adicionada')
    }

    // Gerar arquivo
    const dataHoje = new Date().toISOString().split('T')[0]
    const hora = new Date().toLocaleTimeString('pt-BR').replace(/:/g, '-')
    const nomeArquivo = `dados_${tipo === 'dia' ? 'dia' : 'completo'}_${dataHoje}_${hora}.xlsx`

    XLSX.writeFile(wb, nomeArquivo)

    console.log(`✅ Arquivo ${nomeArquivo} gerado com sucesso!`)
    return { sucesso: true, mensagem: `✅ Dados exportados como ${nomeArquivo}` }
  } catch (erro) {
    console.error('❌ Erro:', erro)
    return { sucesso: false, mensagem: `❌ Erro: ${(erro as Error).message}` }
  }
}
