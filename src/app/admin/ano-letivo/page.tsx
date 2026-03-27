'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AnoLetivoPage() {
  const supabase = createClient()
  const [anos, setAnos] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [anoForm, setAnoForm] = useState({ ano: new Date().getFullYear(), data_inicio: '', data_fim: '', recesso_inicio: '', recesso_fim: '' })
  const [bimestresForm, setBimestresForm] = useState([
    { numero: 1, data_inicio: '', data_fim: '' },
    { numero: 2, data_inicio: '', data_fim: '' },
    { numero: 3, data_inicio: '', data_fim: '' },
    { numero: 4, data_inicio: '', data_fim: '' },
  ])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

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
    setAnoForm({ ano: new Date().getFullYear(), data_inicio: '', data_fim: '', recesso_inicio: '', recesso_fim: '' })
    setBimestresForm([
      { numero: 1, data_inicio: '', data_fim: '' },
      { numero: 2, data_inicio: '', data_fim: '' },
      { numero: 3, data_inicio: '', data_fim: '' },
      { numero: 4, data_inicio: '', data_fim: '' },
    ])
    setSalvando(false)
  }

  async function toggleAtivo(ano: any) {
    await supabase.from('anos_letivos').update({ ativo: false }).neq('id', ano.id)
    await supabase.from('anos_letivos').update({ ativo: !ano.ativo }).eq('id', ano.id)
    await carregar()
  }

  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
  const fmtShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Ano Letivo</h1>
          <p className="text-gray-400 text-sm">Calendário letivo e datas dos bimestres</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Novo Ano
        </button>
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-purple-500/30 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">Novo Ano Letivo</h3>
          {erro && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{erro}</div>}

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Ano *</label>
              <input type="number" value={anoForm.ano} onChange={e => setAnoForm(p => ({ ...p, ano: Number(e.target.value) }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Início *</label>
              <input type="date" value={anoForm.data_inicio} onChange={e => setAnoForm(p => ({ ...p, data_inicio: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fim *</label>
              <input type="date" value={anoForm.data_fim} onChange={e => setAnoForm(p => ({ ...p, data_fim: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          {/* Recesso */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Recesso — Início</label>
              <input type="date" value={anoForm.recesso_inicio} onChange={e => setAnoForm(p => ({ ...p, recesso_inicio: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Recesso — Fim</label>
              <input type="date" value={anoForm.recesso_fim} onChange={e => setAnoForm(p => ({ ...p, recesso_fim: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Datas dos bimestres</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {bimestresForm.map((b, i) => (
              <div key={b.numero} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3">
                <p className="text-xs font-semibold text-purple-400 mb-2">{b.numero}º Bimestre</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Início</label>
                    <input type="date" value={b.data_inicio}
                      onChange={e => setBimestresForm(prev => prev.map((x, j) => j === i ? { ...x, data_inicio: e.target.value } : x))}
                      className="w-full bg-[#161b22] border border-[#30363d] text-gray-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fim</label>
                    <input type="date" value={b.data_fim}
                      onChange={e => setBimestresForm(prev => prev.map((x, j) => j === i ? { ...x, data_fim: e.target.value } : x))}
                      className="w-full bg-[#161b22] border border-[#30363d] text-gray-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {salvando ? 'Salvando...' : 'Salvar Ano Letivo'}
            </button>
            <button onClick={() => { setShowForm(false); setErro('') }}
              className="px-4 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {anos.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 text-center text-gray-500 text-sm">
          Nenhum ano letivo cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {anos.map((a: any) => {
            const bims = [...(a.bimestres || [])].sort((x: any, y: any) => x.numero - y.numero)
            return (
              <div key={a.id} className={`border rounded-xl p-4 ${a.ativo ? 'border-[#39d353]/40 bg-[#39d353]/5' : 'border-[#30363d] bg-[#161b22]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold text-lg">{a.ano}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.ativo ? 'bg-[#39d353]/15 text-[#39d353]' : 'bg-[#30363d] text-gray-500'}`}>
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <button onClick={() => toggleAtivo(a)}
                    className={`text-xs px-3 py-1 rounded-lg border transition-all ${a.ativo ? 'text-red-400 border-red-400/30 hover:bg-red-400/10' : 'text-[#39d353] border-[#39d353]/30 hover:bg-[#39d353]/10'}`}>
                    {a.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-1">{fmt(a.data_inicio)} até {fmt(a.data_fim)}</p>
                {a.recesso_inicio && a.recesso_fim && (
                  <p className="text-xs text-blue-400/70 mb-3">🏖 Recesso: {fmt(a.recesso_inicio)} – {fmt(a.recesso_fim)}</p>
                )}
                {bims.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {bims.map((b: any) => (
                      <div key={b.id} className="bg-[#0d1117] rounded-lg p-2 text-center">
                        <p className="text-xs font-semibold text-purple-400 mb-1">{b.numero}º Bim</p>
                        <p className="text-xs text-gray-400">{fmtShort(b.data_inicio)} – {fmtShort(b.data_fim)}</p>
                      </div>
                    ))}
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
