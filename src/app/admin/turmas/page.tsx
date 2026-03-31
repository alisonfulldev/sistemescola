'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({ nome: '', turno: 'matutino', ano_letivo: new Date().getFullYear().toString(), serie: '', turma_letra: '', grau: '', aulas_previstas: '' })
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  async function carregar() {
    const { data } = await supabase.from('turmas').select('*').order('nome')
    setTurmas(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function novaForm() {
    setEditando(null)
    setForm({ nome: '', turno: 'matutino', ano_letivo: new Date().getFullYear().toString(), serie: '', turma_letra: '', grau: '', aulas_previstas: '' })
    setShowForm(true)
  }

  function editarForm(t: any) {
    setEditando(t)
    setForm({ nome: t.nome, turno: t.turno, ano_letivo: t.ano_letivo, serie: t.serie?.toString() || '', turma_letra: t.turma_letra || '', grau: t.grau || '', aulas_previstas: t.aulas_previstas?.toString() || '' })
    setShowForm(true)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    const payload = {
      nome: form.nome,
      turno: form.turno,
      ano_letivo: form.ano_letivo,
      serie: form.serie ? Number(form.serie) : null,
      turma_letra: form.turma_letra || null,
      grau: form.grau || null,
      aulas_previstas: form.aulas_previstas ? Number(form.aulas_previstas) : null,
    }
    if (editando) {
      await supabase.from('turmas').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('turmas').insert(payload)
    }
    setShowForm(false)
    setEditando(null)
    setSalvando(false)
    carregar()
  }

  async function toggleAtivo(t: any) {
    await supabase.from('turmas').update({ ativo: !t.ativo }).eq('id', t.id)
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Turmas</h1>
          <p className="text-slate-600 text-sm">{turmas.length} turma(s) cadastrada(s)</p>
        </div>
        <button onClick={novaForm} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Nova Turma
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 animate-slide-up shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{editando ? 'Editar Turma' : 'Nova Turma'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600 mb-1.5">Nome da Turma *</label>
              <input type="text" placeholder="Ex: 9º Ano A" value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Turno</label>
              <select value={form.turno} onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="matutino">Matutino</option>
                <option value="vespertino">Vespertino</option>
                <option value="noturno">Noturno</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Grau</label>
              <select value={form.grau} onChange={e => setForm(p => ({ ...p, grau: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione</option>
                <option value="EF">Ensino Fundamental (EF)</option>
                <option value="EM">Ensino Médio (EM)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Série</label>
              <input type="number" min={1} max={9} placeholder="Ex: 9" value={form.serie}
                onChange={e => setForm(p => ({ ...p, serie: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Turma (letra)</label>
              <input type="text" maxLength={1} placeholder="Ex: A" value={form.turma_letra}
                onChange={e => setForm(p => ({ ...p, turma_letra: e.target.value.toUpperCase() }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Aulas previstas no ano</label>
              <input type="number" min={1} placeholder="Ex: 200" value={form.aulas_previstas}
                onChange={e => setForm(p => ({ ...p, aulas_previstas: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Ano Letivo</label>
              <input type="text" value={form.ano_letivo}
                onChange={e => setForm(p => ({ ...p, ano_letivo: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: 'DM Mono, monospace' }}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando || !form.nome.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Criar Turma'}</button>
            <button onClick={() => { setShowForm(false); setEditando(null) }}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Nome', 'Grau / Série', 'Turno', 'Aulas prev.', 'Status', 'Ações'].map(h => (
                <th key={h} className={`p-4 text-slate-500 font-medium text-left ${['Status','Ações','Aulas prev.'].includes(h) ? 'text-center' : ''} ${['Grau / Série','Aulas prev.'].includes(h) ? 'hidden md:table-cell' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">Carregando...</td></tr>
            : turmas.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhuma turma cadastrada</td></tr>
            : turmas.map(t => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4 text-slate-900 font-medium">{t.nome}</td>
                <td className="p-4 hidden md:table-cell text-slate-600 text-xs">
                  {t.grau && <span className="mr-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{t.grau}</span>}
                  {t.serie && `${t.serie}º`}{t.turma_letra && ` ${t.turma_letra}`}
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    t.turno === 'matutino' ? 'bg-amber-50 text-amber-700' :
                    t.turno === 'vespertino' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                  }`}>{t.turno}</span>
                </td>
                <td className="p-4 text-center text-slate-500 text-xs hidden md:table-cell">{t.aulas_previstas || '—'}</td>
                <td className="p-4 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {t.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => editarForm(t)} className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all">Editar</button>
                    <button onClick={() => toggleAtivo(t)} className={`text-xs px-2 py-1 rounded-lg border transition-all ${t.ativo ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                      {t.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
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
