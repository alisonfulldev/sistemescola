'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AvaliacoesProfessor() {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Form
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'prova' as const,
    data_aplicacao: '',
    data_entrega: '',
    valor_maximo: 10,
    descricao: ''
  })

  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      setTurmas(turmasData || [])
      if (turmasData?.length) {
        setTurmaSelecionada(turmasData[0].id)
        carregarAvaliacoes(turmasData[0].id)
      }
      setLoading(false)
    }
    carregar()
  }, [supabase])

  async function carregarAvaliacoes(turmaId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/avaliacoes?turma_id=${turmaId}`)
      if (res.ok) {
        const { avaliacoes: avs } = await res.json()
        setAvaliacoes(avs || [])
      }
    } catch (e) {
      setErro('Erro ao carregar avaliações')
    }
    setLoading(false)
  }

  async function salvarAvaliacao() {
    if (!form.titulo || !form.data_aplicacao || !turmaSelecionada) {
      setErro('Preencha os campos obrigatórios')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Primeiro, pegar a aula do dia
      const { data: aulas } = await supabase
        .from('aulas')
        .select('id')
        .eq('turma_id', turmaSelecionada)
        .eq('data', form.data_aplicacao)
        .eq('professor_id', user.id)
        .single()

      if (!aulas) {
        setErro('Nenhuma aula encontrada nesta data para esta turma')
        setSalvando(false)
        return
      }

      // Pegar disciplina da aula
      const { data: aulaComDisciplina } = await supabase
        .from('aulas')
        .select('disciplina_id')
        .eq('id', aulas.id)
        .single()

      const res = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aula_id: aulas.id,
          disciplina_id: aulaComDisciplina?.disciplina_id,
          turma_id: turmaSelecionada,
          titulo: form.titulo,
          tipo: form.tipo,
          data_aplicacao: form.data_aplicacao,
          data_entrega: form.data_entrega || null,
          valor_maximo: form.valor_maximo,
          descricao: form.descricao || null
        })
      })

      if (!res.ok) throw new Error('Erro ao salvar avaliação')

      setShowModal(false)
      setForm({
        titulo: '',
        tipo: 'prova',
        data_aplicacao: '',
        data_entrega: '',
        valor_maximo: 10,
        descricao: ''
      })
      carregarAvaliacoes(turmaSelecionada)
    } catch (e) {
      setErro(String(e))
    }
    setSalvando(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Avaliações</h1>
        <p className="text-slate-600 text-sm">Crie e acompanhe provas, trabalhos e outras avaliações</p>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          ⚠ {erro}
        </div>
      )}

      {/* Seletor de turma */}
      {turmas.length > 0 && (
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Turma
          </label>
          <select
            value={turmaSelecionada}
            onChange={e => {
              setTurmaSelecionada(e.target.value)
              carregarAvaliacoes(e.target.value)
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Botão criar */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full mb-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
      >
        + Nova Avaliação
      </button>

      {/* Lista de avaliações */}
      {avaliacoes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhuma avaliação criada nesta turma.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {avaliacoes.map(av => (
            <Link
              key={av.id}
              href={`/professor/avaliacoes/${av.id}/notas`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{av.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {av.tipo} • {av.disciplinas?.nome} • Valor: {av.valor_maximo}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(av.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                    Lançar notas →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal criar avaliação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nova Avaliação</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Título</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Prova de Matemática"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="prova">Prova</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="projeto">Projeto</option>
                  <option value="seminario">Seminário</option>
                  <option value="participacao">Participação</option>
                  <option value="lista_exercicios">Lista de Exercícios</option>
                  <option value="outra">Outra</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Aplicação</label>
                <input
                  type="date"
                  value={form.data_aplicacao}
                  onChange={e => setForm({ ...form, data_aplicacao: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Entrega (opcional)</label>
                <input
                  type="date"
                  value={form.data_entrega}
                  onChange={e => setForm({ ...form, data_entrega: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Máximo</label>
                <input
                  type="number"
                  value={form.valor_maximo}
                  onChange={e => setForm({ ...form, valor_maximo: parseFloat(e.target.value) })}
                  min="0"
                  step="0.5"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição (opcional)</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Adicione detalhes da avaliação"
                  rows={3}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-slate-300 text-slate-900 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAvaliacao}
                disabled={salvando}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
