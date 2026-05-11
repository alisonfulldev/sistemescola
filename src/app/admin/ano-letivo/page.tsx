'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const anoVazio = () => ({ ano: new Date().getFullYear(), data_inicio: '', data_fim: '', recesso_inicio: '', recesso_fim: '' })
const bimsVazios = () => [
  { numero: 1, data_inicio: '', data_fim: '' },
  { numero: 2, data_inicio: '', data_fim: '' },
  { numero: 3, data_inicio: '', data_fim: '' },
  { numero: 4, data_inicio: '', data_fim: '' },
]

export default function AnoLetivoPage() {
  const supabase = createClient()
  const [anos, setAnos] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [anoForm, setAnoForm] = useState(anoVazio())
  const [bimestresForm, setBimestresForm] = useState(bimsVazios())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)
  const [erroDelete, setErroDelete] = useState('')

  // Edição
  const [anoEditando, setAnoEditando] = useState<string | null>(null)
  const [editAnoForm, setEditAnoForm] = useState(anoVazio())
  const [editBimsForm, setEditBimsForm] = useState(bimsVazios())
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  async function carregar() {
    const { data } = await supabase.from('anos_letivos').select('*, bimestres(*)').order('ano', { ascending: false })
    setAnos(data || [])
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!anoForm.data_inicio || !anoForm.data_fim) { setErro('Preencha as datas do ano letivo'); return }
    for (const b of bimestresForm) {
      if (!b.data_inicio || !b.data_fim) { setErro(`Preencha as datas do ${b.numero}º bimestre`); return }
    }
    setSalvando(true)
    setErro('')

    const { data: novoAno, error: errAno } = await supabase
      .from('anos_letivos')
      .insert({
        ano: anoForm.ano,
        data_inicio: anoForm.data_inicio,
        data_fim: anoForm.data_fim,
        recesso_inicio: anoForm.recesso_inicio || null,
        recesso_fim: anoForm.recesso_fim || null,
        ativo: false,
      })
      .select().single()

    if (errAno) { setErro(errAno.message); setSalvando(false); return }

    const { error: errBim } = await supabase.from('bimestres').insert(
      bimestresForm.map(b => ({ ...b, ano_letivo_id: novoAno.id }))
    )
    if (errBim) { setErro(errBim.message); setSalvando(false); return }

    await carregar()
    setShowForm(false)
    setAnoForm(anoVazio())
    setBimestresForm(bimsVazios())
    setSalvando(false)
  }

  async function excluir(id: string) {
    setDeletando(true)
    setErroDelete('')
    const res = await fetch(`/api/admin/anos-letivos/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      setErroDelete(d.error || 'Erro ao excluir')
      setDeletando(false)
      return
    }
    setConfirmDelete(null)
    setDeletando(false)
    setErroDelete('')
    await carregar()
  }

  async function toggleAtivo(ano: any) {
    await supabase.from('anos_letivos').update({ ativo: false }).neq('id', ano.id)
    await supabase.from('anos_letivos').update({ ativo: !ano.ativo }).eq('id', ano.id)
    await carregar()
  }

  function abrirEdicao(a: any) {
    const bims = [...(a.bimestres || [])].sort((x: any, y: any) => x.numero - y.numero)
    setAnoEditando(a.id)
    setEditAnoForm({
      ano: a.ano,
      data_inicio: a.data_inicio || '',
      data_fim: a.data_fim || '',
      recesso_inicio: a.recesso_inicio || '',
      recesso_fim: a.recesso_fim || '',
    })
    setEditBimsForm(
      bims.length === 4
        ? bims.map((b: any) => ({ numero: b.numero, data_inicio: b.data_inicio || '', data_fim: b.data_fim || '' }))
        : bimsVazios()
    )
    setErroEdit('')
  }

  async function salvarEdicao(a: any) {
    if (!editAnoForm.data_inicio || !editAnoForm.data_fim) { setErroEdit('Preencha as datas do ano letivo'); return }
    for (const b of editBimsForm) {
      if (!b.data_inicio || !b.data_fim) { setErroEdit(`Preencha as datas do ${b.numero}º bimestre`); return }
    }
    setSalvandoEdit(true)
    setErroEdit('')

    const res = await fetch(`/api/admin/anos-letivos/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ano: editAnoForm.ano,
        data_inicio: editAnoForm.data_inicio,
        data_fim: editAnoForm.data_fim,
        recesso_inicio: editAnoForm.recesso_inicio || null,
        recesso_fim: editAnoForm.recesso_fim || null,
      }),
    })

    if (!res.ok) {
      const d = await res.json()
      setErroEdit(d.error || 'Erro ao salvar')
      setSalvandoEdit(false)
      return
    }

    // Atualiza bimestres
    const bims = [...(a.bimestres || [])].sort((x: any, y: any) => x.numero - y.numero)
    for (let i = 0; i < editBimsForm.length; i++) {
      const fb = editBimsForm[i]
      const dbBim = bims[i]
      if (dbBim) {
        await supabase.from('bimestres').update({ data_inicio: fb.data_inicio, data_fim: fb.data_fim }).eq('id', dbBim.id)
      }
    }

    setAnoEditando(null)
    setSalvandoEdit(false)
    await carregar()
  }

  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
  const fmtShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ano Letivo</h1>
          <p className="text-slate-600 text-sm">Calendário letivo e datas dos bimestres</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Novo Ano
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Novo Ano Letivo</h3>
          {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{erro}</div>}

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Ano *</label>
              <input type="number" value={anoForm.ano} onChange={e => setAnoForm(p => ({ ...p, ano: Number(e.target.value) }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Início *</label>
              <input type="date" value={anoForm.data_inicio} onChange={e => setAnoForm(p => ({ ...p, data_inicio: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Fim *</label>
              <input type="date" value={anoForm.data_fim} onChange={e => setAnoForm(p => ({ ...p, data_fim: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Recesso — Início</label>
              <input type="date" value={anoForm.recesso_inicio} onChange={e => setAnoForm(p => ({ ...p, recesso_inicio: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Recesso — Fim</label>
              <input type="date" value={anoForm.recesso_fim} onChange={e => setAnoForm(p => ({ ...p, recesso_fim: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-3 font-medium uppercase tracking-wider">Datas dos bimestres</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {bimestresForm.map((b, i) => (
              <div key={b.numero} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-600 mb-2">{b.numero}º Bimestre</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Início</label>
                    <input type="date" value={b.data_inicio}
                      onChange={e => setBimestresForm(prev => prev.map((x, j) => j === i ? { ...x, data_inicio: e.target.value } : x))}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Fim</label>
                    <input type="date" value={b.data_fim}
                      onChange={e => setBimestresForm(prev => prev.map((x, j) => j === i ? { ...x, data_fim: e.target.value } : x))}
                      className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {salvando ? 'Salvando...' : 'Salvar Ano Letivo'}
            </button>
            <button onClick={() => { setShowForm(false); setErro('') }}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {anos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm shadow-sm">
          Nenhum ano letivo cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {anos.map((a: any) => {
            const bims = [...(a.bimestres || [])].sort((x: any, y: any) => x.numero - y.numero)
            const editandoEste = anoEditando === a.id
            return (
              <div key={a.id} className={`border rounded-xl p-4 ${a.ativo ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-900 font-bold text-lg">{a.ano}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.ativo ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500'}`}>
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAtivo(a)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all ${a.ativo ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}>
                      {a.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => editandoEste ? setAnoEditando(null) : abrirEdicao(a)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all ${editandoEste ? 'text-slate-600 border-slate-300 bg-slate-100' : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}>
                      {editandoEste ? 'Fechar' : 'Editar'}
                    </button>
                    {confirmDelete === a.id ? (
                      <div className="flex items-center gap-1.5">
                        {erroDelete && <span className="text-xs text-red-600">{erroDelete}</span>}
                        <span className="text-xs text-red-600">Confirmar exclusão?</span>
                        <button onClick={() => excluir(a.id)} disabled={deletando}
                          className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                          {deletando ? '...' : 'Sim'}
                        </button>
                        <button onClick={() => { setConfirmDelete(null); setErroDelete('') }}
                          className="text-xs px-2 py-1 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
                          Não
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(a.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
                        Excluir
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-1">{fmt(a.data_inicio)} até {fmt(a.data_fim)}</p>
                {a.recesso_inicio && a.recesso_fim && (
                  <p className="text-xs text-blue-700 mb-3">🏖 Recesso: {fmt(a.recesso_inicio)} – {fmt(a.recesso_fim)}</p>
                )}
                {bims.length > 0 && !editandoEste && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {bims.map((b: any) => (
                      <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-2 text-center">
                        <p className="text-xs font-semibold text-blue-600 mb-1">{b.numero}º Bim</p>
                        <p className="text-xs text-slate-500">{fmtShort(b.data_inicio)} – {fmtShort(b.data_fim)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulário de edição inline */}
                {editandoEste && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    {erroEdit && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{erroEdit}</div>}
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Editar Ano Letivo</p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Ano *</label>
                        <input type="number" value={editAnoForm.ano} onChange={e => setEditAnoForm(p => ({ ...p, ano: Number(e.target.value) }))}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Início *</label>
                        <input type="date" value={editAnoForm.data_inicio} onChange={e => setEditAnoForm(p => ({ ...p, data_inicio: e.target.value }))}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Fim *</label>
                        <input type="date" value={editAnoForm.data_fim} onChange={e => setEditAnoForm(p => ({ ...p, data_fim: e.target.value }))}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Recesso — Início</label>
                        <input type="date" value={editAnoForm.recesso_inicio} onChange={e => setEditAnoForm(p => ({ ...p, recesso_inicio: e.target.value }))}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Recesso — Fim</label>
                        <input type="date" value={editAnoForm.recesso_fim} onChange={e => setEditAnoForm(p => ({ ...p, recesso_fim: e.target.value }))}
                          className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Bimestres</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {editBimsForm.map((b, i) => (
                        <div key={b.numero} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <p className="text-xs font-semibold text-blue-600 mb-2">{b.numero}º Bimestre</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Início</label>
                              <input type="date" value={b.data_inicio}
                                onChange={e => setEditBimsForm(prev => prev.map((x, j) => j === i ? { ...x, data_inicio: e.target.value } : x))}
                                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Fim</label>
                              <input type="date" value={b.data_fim}
                                onChange={e => setEditBimsForm(prev => prev.map((x, j) => j === i ? { ...x, data_fim: e.target.value } : x))}
                                className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => salvarEdicao(a)} disabled={salvandoEdit}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                        {salvandoEdit ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                      <button onClick={() => setAnoEditando(null)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
