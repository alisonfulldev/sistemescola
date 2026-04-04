'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download } from 'lucide-react'

export default function DiarioPage() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [anosLetivos, setAnosLetivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState('')

  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('')
  const [anoSelecionado, setAnoSelecionado] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const [{ data: turmasData }, { data: disciplinasData }, { data: anosData }] = await Promise.all([
        supabase.from('turmas').select('id, nome, serie, turma_letra').eq('ativo', true).order('nome'),
        supabase.from('disciplinas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('anos_letivos').select('id, ano').order('ano', { ascending: false }),
      ])

      setTurmas(turmasData || [])
      setDisciplinas(disciplinasData || [])
      setAnosLetivos(anosData || [])

      // Selecionar ano atual por padrão
      if (anosData && anosData.length > 0) {
        setAnoSelecionado(anosData[0].id)
      }

      setLoading(false)
    }

    carregar()
  }, [])

  async function gerarPDF() {
    if (!turmaSelecionada || !disciplinaSelecionada || !anoSelecionado) {
      setErro('Selecione turma, disciplina e ano letivo')
      return
    }

    setGerando(true)
    setErro('')

    try {
      const params = new URLSearchParams({
        turma_id: turmaSelecionada,
        disciplina_id: disciplinaSelecionada,
        ano_letivo_id: anoSelecionado,
      })

      // Abrir o PDF em nova aba
      window.open(`/api/export/diario-pdf?${params.toString()}`, '_blank')
    } catch (err) {
      setErro((err as Error).message || 'Erro ao gerar PDF')
    } finally {
      setGerando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const turmaAtual = turmas.find((t) => t.id === turmaSelecionada)
  const anoAtual = anosLetivos.find((a) => a.id === anoSelecionado)

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">Gerar Diário Escolar</h1>
        </div>
        <p className="text-slate-600 text-sm">Gere o diário em PDF com frequência, notas e conteúdo programático</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Seletor de Turma */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Turma *</label>
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione uma turma...</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.serie}º {turma.turma_letra || 'A'} — {turma.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Disciplina */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Disciplina *</label>
            <select
              value={disciplinaSelecionada}
              onChange={(e) => setDisciplinaSelecionada(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione uma disciplina...</option>
              {disciplinas.map((disciplina) => (
                <option key={disciplina.id} value={disciplina.id}>
                  {disciplina.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Ano Letivo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Ano Letivo *</label>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecione um ano...</option>
              {anosLetivos.map((ano) => (
                <option key={ano.id} value={ano.id}>
                  {ano.ano}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <div className="text-red-600 font-semibold">Erro:</div>
            <p className="text-red-700 text-sm">{erro}</p>
          </div>
        )}

        {/* Resumo */}
        {turmaSelecionada && disciplinaSelecionada && anoAtual && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-slate-700">
              <strong>Você está gerando:</strong> {turmaAtual?.nome} — {disciplinas.find((d) => d.id === disciplinaSelecionada)?.nome}{' '}
              ({anoAtual.ano})
            </p>
          </div>
        )}

        {/* Botão Gerar */}
        <button
          onClick={gerarPDF}
          disabled={gerando || !turmaSelecionada || !disciplinaSelecionada || !anoSelecionado}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          {gerando ? 'Gerando PDF...' : 'Gerar Diário em PDF'}
        </button>
      </div>

      {/* Informações */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Informações sobre o Diário</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>✓ O PDF contém a lista completa de alunos da turma</li>
          <li>✓ Inclui frequência (presença/falta) organizada por bimestre</li>
          <li>✓ Mostra o conteúdo programático de cada aula</li>
          <li>✓ Registra as notas dos 4 bimestres</li>
          <li>✓ Pronto para assinatura do professor e arquivo</li>
        </ul>
      </div>
    </div>
  )
}
