'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const EMPTY = {
  nome_oficial: '', municipio: '', uf: 'SP', codigo: '',
  diretor: '', cep: '', logradouro: '', numero: '', bairro: '',
  telefone: '', email: '',
}

export default function EscolaPage() {
  const supabase = createClient()
  const [escola, setEscola]   = useState<any>(null)
  const [form, setForm]       = useState(EMPTY)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]       = useState('')
  const [ok, setOk]           = useState(false)
  const [cepLoading, setCepLoading] = useState(false)
  const [cepModal, setCepModal]     = useState(false)
  const [cepInput, setCepInput]     = useState('')
  const [cepErro, setCepErro]       = useState('')

  async function carregar() {
    const { data } = await supabase.from('escola').select('*').limit(1).single()
    if (data) {
      setEscola(data)
      setForm({
        nome_oficial: data.nome_oficial || data.nome || '',
        municipio:    data.municipio || '',
        uf:           data.uf || 'SP',
        codigo:       data.codigo || '',
        diretor:      data.diretor || '',
        cep:          data.cep || '',
        logradouro:   data.logradouro || '',
        numero:       data.numero || '',
        bairro:       data.bairro || '',
        telefone:     data.telefone || '',
        email:        data.email || '',
      })
    }
  }

  useEffect(() => { carregar() }, [])

  async function buscarCep() {
    const cep = cepInput.replace(/\D/g, '')
    if (cep.length !== 8) { setCepErro('CEP inválido'); return }
    setCepLoading(true)
    setCepErro('')
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) { setCepErro('CEP não encontrado'); return }
      setForm(p => ({
        ...p,
        cep:       cep,
        logradouro: data.logradouro || '',
        bairro:    data.bairro || '',
        municipio: data.localidade || p.municipio,
        uf:        data.uf || p.uf,
      }))
      setCepModal(false)
      setCepInput('')
    } catch {
      setCepErro('Erro ao buscar CEP')
    } finally {
      setCepLoading(false)
    }
  }

  async function salvar() {
    if (!form.nome_oficial.trim() || !form.municipio.trim()) return
    setSalvando(true); setErro(''); setOk(false)
    const payload = {
      nome_oficial: form.nome_oficial,
      municipio:    form.municipio,
      uf:           form.uf,
      codigo:       form.codigo || null,
      diretor:      form.diretor || null,
      cep:          form.cep || null,
      logradouro:   form.logradouro || null,
      numero:       form.numero || null,
      bairro:       form.bairro || null,
      telefone:     form.telefone || null,
      email:        form.email || null,
    }
    const { error } = escola
      ? await supabase.from('escola').update(payload).eq('id', escola.id)
      : await supabase.from('escola').insert(payload)
    if (error) { setErro(error.message); setSalvando(false); return }
    await carregar()
    setOk(true)
    setTimeout(() => setOk(false), 2500)
    setSalvando(false)
  }

  const inp = 'w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Escola</h1>
        <p className="text-gray-400 text-sm">Dados oficiais da instituição — usado na capa do diário</p>
      </div>

      {/* Modal CEP */}
      {cepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-white font-semibold mb-4">Buscar endereço por CEP</h3>
            {cepErro && <p className="text-red-400 text-sm mb-3">{cepErro}</p>}
            <input
              type="text" value={cepInput}
              onChange={e => setCepInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && buscarCep()}
              placeholder="00000000"
              className={`${inp} mb-4 font-mono text-center tracking-widest`}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={buscarCep} disabled={cepLoading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {cepLoading ? 'Buscando...' : 'Buscar'}
              </button>
              <button onClick={() => { setCepModal(false); setCepInput(''); setCepErro('') }}
                className="flex-1 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 max-w-2xl">
        {erro && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{erro}</div>}
        {ok   && <div className="mb-4 p-3 bg-[#39d353]/10 border border-[#39d353]/30 rounded-lg text-[#39d353] text-sm">Salvo com sucesso!</div>}

        {/* Identificação */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Identificação</p>
        <div className="grid gap-4 mb-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nome oficial da escola *</label>
            <input type="text" value={form.nome_oficial} onChange={e => setForm(p => ({ ...p, nome_oficial: e.target.value }))}
              placeholder="Ex: EMEF Edson de Oliveira Garcia Vereador"
              className={inp} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Diretor(a)</label>
            <input type="text" value={form.diretor} onChange={e => setForm(p => ({ ...p, diretor: e.target.value }))}
              placeholder="Nome completo — assina o diário"
              className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Código INEP</label>
              <input type="text" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))}
                placeholder="Ex: 35470070"
                className={`${inp} font-mono`} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">UF *</label>
              <select value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value }))} className={inp}>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Endereço */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Endereço</p>
        <div className="grid gap-4 mb-5">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">CEP</label>
            <div className="flex gap-2">
              <input type="text" value={form.cep ? form.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : ''}
                readOnly placeholder="00000-000"
                className={`${inp} font-mono flex-1 cursor-pointer`}
                onClick={() => setCepModal(true)} />
              <button onClick={() => setCepModal(true)}
                className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-sm rounded-lg border border-[#30363d] transition-colors whitespace-nowrap">
                Buscar CEP
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Logradouro</label>
              <input type="text" value={form.logradouro} onChange={e => setForm(p => ({ ...p, logradouro: e.target.value }))}
                placeholder="Rua, Av., etc." className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Número</label>
              <input type="text" value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))}
                placeholder="S/N" className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Bairro</label>
              <input type="text" value={form.bairro} onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))}
                placeholder="Bairro" className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Município *</label>
              <input type="text" value={form.municipio} onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))}
                placeholder="Ex: Narandiba" className={inp} />
            </div>
          </div>
        </div>

        {/* Contato */}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contato</p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Telefone</label>
            <input type="text" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
              placeholder="(18) 3992-1196" className={inp} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">E-mail</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="escola@narandiba.sp.gov.br" className={inp} />
          </div>
        </div>

        <button onClick={salvar} disabled={salvando || !form.nome_oficial.trim() || !form.municipio.trim()}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
          {salvando ? 'Salvando...' : escola ? 'Atualizar' : 'Salvar escola'}
        </button>

        {escola && (
          <div className="mt-6 pt-5 border-t border-[#30363d] text-sm space-y-0.5">
            <p className="text-white font-medium">{escola.nome_oficial || escola.nome}</p>
            {escola.diretor && <p className="text-gray-400">Dir. {escola.diretor}</p>}
            {escola.logradouro && (
              <p className="text-gray-500 text-xs">{escola.logradouro}{escola.numero ? `, ${escola.numero}` : ''}{escola.bairro ? ` — ${escola.bairro}` : ''}</p>
            )}
            <p className="text-gray-500 text-xs">{escola.municipio} — {escola.uf}{escola.cep ? ` · CEP ${escola.cep.replace(/(\d{5})(\d{3})/, '$1-$2')}` : ''}</p>
            {escola.codigo && <p className="text-gray-600 text-xs font-mono">INEP: {escola.codigo}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
