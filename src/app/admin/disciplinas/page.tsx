'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [professores, setProfessores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ nome: '', professor_id: '' })
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  async function carregar() {
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('disciplinas').select('*, usuarios(nome)').order('nome'),
      supabase.from('usuarios').select('id, nome').eq('perfil', 'professor').eq('ativo', true).order('nome'),
    ])
    setDisciplinas(d || [])
    setProfessores(p || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.nome.trim() || !form.professor_id) return
    setSalvando(true)
    if (editando) await supabase.from('disciplinas').update(form).eq('id', editando.id)
    else await supabase.from('disciplinas').insert(form)
    setShowForm(false)
    setEditando(null)
    setForm({ nome: '', professor_id: '' })
    setSalvando(false)
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Disciplinas</h1>
          <p className="text-gray-400 text-sm">{disciplinas.length} disciplina(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditando(null); setForm({ nome: '', professor_id: professores[0]?.id || '' }) }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >+ Nova Disciplina</button>
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-purple-500/30 rounded-xl p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">{editando ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome *</label>
              <input type="text" placeholder="Ex: Matemática" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Professor *</label>
              <select value={form.professor_id} onChange={e => setForm(p => ({ ...p, professor_id: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="">Selecione...</option>
                {professores.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando || !form.nome.trim() || !form.professor_id}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar'}</button>
            <button onClick={() => { setShowForm(false); setEditando(null) }} className="px-4 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-[#30363d]">
              <th className="p-4 text-gray-400 font-medium text-left">Disciplina</th>
              <th className="p-4 text-gray-400 font-medium text-left">Professor</th>
              <th className="p-4 text-gray-400 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={3} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            : disciplinas.length === 0 ? <tr><td colSpan={3} className="text-center py-8 text-gray-500">Nenhuma disciplina</td></tr>
            : disciplinas.map(d => (
              <tr key={d.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                <td className="p-4 text-white font-medium">{d.nome}</td>
                <td className="p-4 text-gray-300">{d.usuarios?.nome}</td>
                <td className="p-4 text-center">
                  <button onClick={() => { setEditando(d); setForm({ nome: d.nome, professor_id: d.professor_id }); setShowForm(true) }}
                    className="text-xs text-[#58a6ff] border border-[#58a6ff]/30 hover:bg-[#58a6ff]/10 px-2 py-1 rounded-lg transition-all"
                  >Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
