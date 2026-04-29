'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  disciplinas: { id: string; nome: string }[]
  turmas: { id: string; nome: string; turno: string }[]
}

export default function NovaChamadaButton({ disciplinas, turmas }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ disciplina_id: '', turma_id: '' })
  const [iniciando, setIniciando] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()

  async function iniciar() {
    if (!form.disciplina_id || !form.turma_id) return
    setIniciando(true)
    setErro('')
    try {
      const res = await fetch('/api/professor/iniciar-chamada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.aula_id) {
        router.push(`/professor/chamada/${data.aula_id}`)
      } else {
        setErro(data.error || 'Erro ao iniciar chamada')
        setIniciando(false)
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setIniciando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-sm shadow-indigo-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Iniciar Nova Chamada
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Nova Chamada</h3>
            <p className="text-gray-500 text-sm mb-5">Selecione a disciplina e a turma.</p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Disciplina</label>
                <select
                  value={form.disciplina_id}
                  onChange={e => setForm(p => ({ ...p, disciplina_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Selecione a disciplina...</option>
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Turma</label>
                <select
                  value={form.turma_id}
                  onChange={e => setForm(p => ({ ...p, turma_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome} — {t.turno}</option>
                  ))}
                </select>
              </div>
            </div>

            {erro && (
              <p className="text-red-500 text-sm mb-3 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setErro(''); setForm({ disciplina_id: '', turma_id: '' }) }}
                className="flex-1 py-3 bg-slate-100 text-gray-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={iniciar}
                disabled={iniciando || !form.disciplina_id || !form.turma_id}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {iniciando && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {iniciando ? 'Iniciando...' : 'Iniciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
