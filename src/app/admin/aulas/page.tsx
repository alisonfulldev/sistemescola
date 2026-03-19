'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AulasPage() {
  const [aulas, setAulas] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState({ turma_id: '', disciplina_id: '', professor_id: '', data: new Date().toISOString().split('T')[0], horario_inicio: '07:30', horario_fim: '08:20' })
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  async function carregar() {
    const [{ data: a }, { data: t }, { data: d }] = await Promise.all([
      supabase.from('aulas').select(`id, data, horario_inicio, horario_fim, turmas(nome), disciplinas(nome), usuarios(nome)`).eq('data', filtroData).order('horario_inicio'),
      supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('disciplinas').select('id, nome, professor_id').order('nome'),
    ])
    setAulas(a || [])
    setTurmas(t || [])
    setDisciplinas(d || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [filtroData])

  function handleDisciplina(id: string) {
    const d = disciplinas.find((x: any) => x.id === id) as any
    setForm(p => ({ ...p, disciplina_id: id, professor_id: d?.professor_id || '' }))
  }

  async function salvar() {
    if (!form.turma_id || !form.disciplina_id) return
    setSalvando(true)
    await supabase.from('aulas').insert(form)
    setShowForm(false)
    setForm({ turma_id: '', disciplina_id: '', professor_id: '', data: filtroData, horario_inicio: '07:30', horario_fim: '08:20' })
    setSalvando(false)
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Aulas</h1>
          <p className="text-gray-400 text-sm">{aulas.length} aula(s) no dia</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
            className="bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
            style={{ fontFamily: 'DM Mono, monospace' }}
          />
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Agendar
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-purple-500/30 rounded-xl p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">Agendar Nova Aula</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Turma *</label>
              <select value={form.turma_id} onChange={e => setForm(p => ({ ...p, turma_id: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              ><option value="">Selecione...</option>{turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Disciplina *</label>
              <select value={form.disciplina_id} onChange={e => handleDisciplina(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              ><option value="">Selecione...</option>{disciplinas.map((d: any) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Início</label>
              <input type="time" value={form.horario_inicio} onChange={e => setForm(p => ({ ...p, horario_inicio: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fim</label>
              <input type="time" value={form.horario_fim} onChange={e => setForm(p => ({ ...p, horario_fim: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando || !form.turma_id || !form.disciplina_id}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Agendando...' : 'Agendar Aula'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-[#30363d]">
              <th className="p-4 text-gray-400 font-medium text-left">Horário</th>
              <th className="p-4 text-gray-400 font-medium text-left">Turma</th>
              <th className="p-4 text-gray-400 font-medium text-left">Disciplina</th>
              <th className="p-4 text-gray-400 font-medium text-left hidden md:table-cell">Professor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            : aulas.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">Nenhuma aula nesta data</td></tr>
            : aulas.map((a: any) => (
              <tr key={a.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                <td className="p-4 text-gray-300 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>{a.horario_inicio?.slice(0,5)} – {a.horario_fim?.slice(0,5)}</td>
                <td className="p-4 text-white font-medium">{a.turmas?.nome}</td>
                <td className="p-4 text-gray-300">{a.disciplinas?.nome}</td>
                <td className="p-4 text-gray-300 hidden md:table-cell">{a.usuarios?.nome}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
