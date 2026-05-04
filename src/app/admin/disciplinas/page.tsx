'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [professores, setProfessores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ nome: '', professor_id: '', curso: '', codigo_disciplina: '' })
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
    const payload = {
      nome: form.nome,
      professor_id: form.professor_id,
      curso: form.curso || null,
      codigo_disciplina: form.codigo_disciplina || null,
    }
    if (editando) await supabase.from('disciplinas').update(payload).eq('id', editando.id)
    else await supabase.from('disciplinas').insert(payload)
    setShowForm(false)
    setEditando(null)
    setForm({ nome: '', professor_id: '', curso: '', codigo_disciplina: '' })
    setSalvando(false)
    carregar()
  }

  function abrirEditar(d: any) {
    setEditando(d)
    setForm({ nome: d.nome, professor_id: d.professor_id, curso: d.curso || '', codigo_disciplina: d.codigo_disciplina || '' })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Disciplinas</h1>
          <p className="text-slate-600 text-sm">{disciplinas.length} disciplina(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditando(null); setForm({ nome: '', professor_id: professores[0]?.id || '', curso: '', codigo_disciplina: '' }) }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >+ Nova Disciplina</button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{editando ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Nome *</label>
              <input type="text" placeholder="Ex: Matemática" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Professor *</label>
              <select value={form.professor_id} onChange={e => setForm(p => ({ ...p, professor_id: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {professores.map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Curso</label>
              <input type="text" placeholder="Ex: Ensino Fundamental" value={form.curso} onChange={e => setForm(p => ({ ...p, curso: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Código da Disciplina <span className="text-slate-400">(opcional)</span></label>
              <input type="text" placeholder="Ex: MAT-01" value={form.codigo_disciplina} onChange={e => setForm(p => ({ ...p, codigo_disciplina: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando || !form.nome.trim() || !form.professor_id}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar'}</button>
            <button onClick={() => { setShowForm(false); setEditando(null) }} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-slate-500 font-medium text-left">Disciplina</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden md:table-cell">Curso</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden lg:table-cell">Código</th>
                <th className="p-4 text-slate-500 font-medium text-left">Professor</th>
                <th className="p-4 text-slate-500 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">Carregando...</td></tr>
              : disciplinas.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhuma disciplina</td></tr>
              : disciplinas.map(d => (
                <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-900 font-medium">{d.nome}</td>
                  <td className="p-4 text-slate-500 text-xs hidden md:table-cell">{d.curso || '—'}</td>
                  <td className="p-4 text-slate-500 text-xs hidden lg:table-cell" style={{ fontFamily: 'DM Mono, monospace' }}>{d.codigo_disciplina || '—'}</td>
                  <td className="p-4 text-slate-600">{d.usuarios?.nome}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => abrirEditar(d)}
                      className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
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
