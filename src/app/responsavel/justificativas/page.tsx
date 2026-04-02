'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function JustificativasResponsavel() {
  const [justificativas, setJustificativas] = useState<any[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    aluno_id: '',
    data_falta: '',
    motivo: 'medico' as const,
    descricao_detalhada: ''
  })

  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Carregar filhos do responsável
      const { data: familias } = await supabase
        .from('responsaveis_alunos')
        .select('alunos(id, nome_completo, turmas(nome))')
        .eq('responsavel_id', user.id)

      const alunosList = (familias || []).map(f => f.alunos).filter(a => a) as any[]
      setAlunos(alunosList)

      if (alunosList.length > 0) {
        setForm({ ...form, aluno_id: alunosList[0]?.id })
        carregarJustificativas()
      }

      setLoading(false)
    }
    carregar()
  }, [])

  async function carregarJustificativas() {
    try {
      const res = await fetch('/api/justificativas')
      if (res.ok) {
        const { justificativas: justs } = await res.json()
        setJustificativas(justs || [])
      }
    } catch (e) {
      console.error('Erro ao carregar justificativas')
    }
  }

  async function salvarJustificativa() {
    if (!form.aluno_id || !form.data_falta || !form.motivo) {
      setErro('Preencha os campos obrigatórios')
      return
    }

    setSalvando(true)
    setErro('')

    try {
      const res = await fetch('/api/justificativas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Erro ao enviar justificativa')
      }

      setShowModal(false)
      setForm({
        aluno_id: alunos.length > 0 ? alunos[0].id : '',
        data_falta: '',
        motivo: 'medico',
        descricao_detalhada: ''
      })
      carregarJustificativas()
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

  const statusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'aprovada':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'rejeitada':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return '⏳ Pendente'
      case 'aprovada':
        return '✓ Aprovada'
      case 'rejeitada':
        return '✗ Rejeitada'
      default:
        return status
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Justificativas</h1>
        <p className="text-slate-600 text-sm">Justifique as faltas de seus filhos</p>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          ⚠ {erro}
        </div>
      )}

      {alunos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhum filho vinculado.</p>
        </div>
      ) : (
        <>
          <button
            onClick={() => setShowModal(true)}
            className="w-full mb-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
          >
            + Enviar Justificativa
          </button>

          {justificativas.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">Nenhuma justificativa enviada ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {justificativas.map(j => (
                <div key={j.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {alunos.find(a => a.id === j.aluno_id)?.nome_completo}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Falta em {new Date(j.data_falta + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusColor(j.status)}`}>
                      {statusLabel(j.status)}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-700 mt-2">
                    <p className="font-medium mb-1">Motivo: {j.motivo}</p>
                    {j.descricao_detalhada && (
                      <p className="text-slate-600">{j.descricao_detalhada}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Enviado em {new Date(j.enviado_em).toLocaleString('pt-BR')}
                  </p>
                  {j.observacao_aprovacao && (
                    <p className="text-xs text-slate-600 mt-1 italic">
                      Observação: {j.observacao_aprovacao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Enviar Justificativa</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alunos.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Aluno</label>
                  <select
                    value={form.aluno_id}
                    onChange={e => setForm({ ...form, aluno_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {alunos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome_completo}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data da Falta</label>
                <input
                  type="date"
                  value={form.data_falta}
                  onChange={e => setForm({ ...form, data_falta: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo</label>
                <select
                  value={form.motivo}
                  onChange={e => setForm({ ...form, motivo: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="medico">Consulta Médica</option>
                  <option value="dentista">Consulta Odontológica</option>
                  <option value="falecimento">Falecimento na Família</option>
                  <option value="acompanhamento_responsavel">Acompanhamento do Responsável</option>
                  <option value="consulta_especialista">Consulta com Especialista</option>
                  <option value="atividade_escolar">Atividade Escolar</option>
                  <option value="motivo_pessoal">Motivo Pessoal</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição (opcional)</label>
                <textarea
                  value={form.descricao_detalhada}
                  onChange={e => setForm({ ...form, descricao_detalhada: e.target.value })}
                  placeholder="Descreva o motivo com mais detalhes"
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
                onClick={salvarJustificativa}
                disabled={salvando}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Enviando...
                  </>
                ) : (
                  'Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
