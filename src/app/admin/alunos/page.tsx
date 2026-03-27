'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function AlunosAdminPage() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState({
    nome_completo: '', matricula: '', turma_id: '',
    nome_responsavel: '', contato_responsavel: '',
    numero_chamada: '', situacao: 'ativo',
    email_responsavel: '', data_matricula: '',
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState(false)
  const [buscaTexto, setBuscaTexto] = useState('')
  const [uploadFoto, setUploadFoto] = useState<File | null>(null)
  const [numerosUsados, setNumerosUsados] = useState<number[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function carregar() {
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('alunos').select('*, turmas(nome)').order('numero_chamada', { nullsFirst: false }).order('nome_completo'),
      supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
    ])
    setAlunos(a || [])
    setTurmas(t || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function carregarNumerosUsados(turmaId: string, alunoIdIgnorar?: string) {
    if (!turmaId) { setNumerosUsados([]); return }
    let q = supabase.from('alunos').select('numero_chamada').eq('turma_id', turmaId).not('numero_chamada', 'is', null)
    if (alunoIdIgnorar) q = q.neq('id', alunoIdIgnorar)
    const { data } = await q
    setNumerosUsados((data || []).map((x: any) => x.numero_chamada))
  }

  function iniciarNovo() {
    setEditando(null)
    setErro('')
    const turmaId = turmas[0]?.id || ''
    setForm({ nome_completo: '', matricula: '', turma_id: turmaId, nome_responsavel: '', contato_responsavel: '', numero_chamada: '', situacao: 'ativo', email_responsavel: '', data_matricula: '' })
    setUploadFoto(null)
    carregarNumerosUsados(turmaId)
    setShowForm(true)
  }

  function iniciarEditar(a: any) {
    setEditando(a)
    setErro('')
    setForm({
      nome_completo: a.nome_completo, matricula: a.matricula, turma_id: a.turma_id,
      nome_responsavel: a.nome_responsavel || '', contato_responsavel: a.contato_responsavel || '',
      numero_chamada: a.numero_chamada?.toString() || '', situacao: a.situacao || 'ativo',
      email_responsavel: a.email_responsavel || '', data_matricula: a.data_matricula || '',
    })
    setUploadFoto(null)
    carregarNumerosUsados(a.turma_id, a.id)
    setShowForm(true)
  }

  async function salvar() {
    setErro('')
    if (!form.nome_completo.trim() || !form.matricula.trim() || !form.turma_id) {
      setErro('Preencha os campos obrigatórios.'); return
    }
    if (!form.numero_chamada) {
      setErro('Número de chamada é obrigatório.'); return
    }
    const num = Number(form.numero_chamada)
    if (num < 1 || num > 55) {
      setErro('Número de chamada deve ser entre 1 e 55.'); return
    }
    if (numerosUsados.includes(num)) {
      setErro(`Número de chamada ${num} já está em uso nesta turma.`); return
    }

    setSalvando(true)
    let foto_url: string | undefined = editando?.foto_url

    if (uploadFoto) {
      const ext = uploadFoto.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: upData } = await supabase.storage.from('alunos-fotos').upload(path, uploadFoto, { upsert: true })
      if (upData) {
        const { data: urlData } = supabase.storage.from('alunos-fotos').getPublicUrl(upData.path)
        foto_url = urlData.publicUrl
      }
    }

    const payload = {
      ...form,
      numero_chamada: num,
      ...(foto_url !== undefined ? { foto_url } : {}),
    }

    if (editando) {
      await supabase.from('alunos').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('alunos').insert({ ...payload, ativo: true })
    }

    setShowForm(false)
    setEditando(null)
    setUploadFoto(null)
    setSalvando(false)
    carregar()
  }

  const filtrados = alunos.filter(a =>
    a.nome_completo.toLowerCase().includes(buscaTexto.toLowerCase()) || a.matricula.includes(buscaTexto)
  )

  const situacaoBadge = (s: string) => ({
    ativo: 'bg-[#39d353]/15 text-[#39d353]',
    transferido: 'bg-red-500/15 text-red-400',
    remanejado: 'bg-yellow-500/15 text-yellow-400',
  }[s] || 'bg-gray-500/15 text-gray-400')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Alunos</h1>
          <p className="text-gray-400 text-sm">{alunos.length} aluno(s)</p>
        </div>
        <button onClick={iniciarNovo} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Novo Aluno
        </button>
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-purple-500/30 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">{editando ? 'Editar Aluno' : 'Novo Aluno'}</h3>
          {erro && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{erro}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Nome Completo *</label>
              <input type="text" value={form.nome_completo} onChange={e => setForm(p => ({ ...p, nome_completo: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Matrícula *</label>
              <input type="text" value={form.matricula} onChange={e => setForm(p => ({ ...p, matricula: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Turma *</label>
              <select value={form.turma_id}
                onChange={e => { setForm(p => ({ ...p, turma_id: e.target.value })); carregarNumerosUsados(e.target.value, editando?.id) }}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="">Selecione...</option>
                {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Nº de Chamada * <span className="text-gray-600">(1–55, único na turma)</span>
              </label>
              <input type="number" min={1} max={55} value={form.numero_chamada}
                onChange={e => setForm(p => ({ ...p, numero_chamada: e.target.value }))}
                className={`w-full bg-[#0d1117] border text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 ${
                  form.numero_chamada && numerosUsados.includes(Number(form.numero_chamada)) ? 'border-red-500' : 'border-[#30363d]'
                }`}
                style={{ fontFamily: 'DM Mono, monospace' }} />
              {form.turma_id && numerosUsados.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">Em uso: {numerosUsados.sort((a,b) => a-b).join(', ')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Situação</label>
              <select value={form.situacao} onChange={e => setForm(p => ({ ...p, situacao: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="ativo">Ativo</option>
                <option value="transferido">Transferido</option>
                <option value="remanejado">Remanejado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome do Responsável</label>
              <input type="text" value={form.nome_responsavel} onChange={e => setForm(p => ({ ...p, nome_responsavel: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Contato (WhatsApp)</label>
              <input type="text" placeholder="5511987654321" value={form.contato_responsavel} onChange={e => setForm(p => ({ ...p, contato_responsavel: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">E-mail do Responsável</label>
              <input type="email" value={form.email_responsavel} onChange={e => setForm(p => ({ ...p, email_responsavel: e.target.value }))}
                placeholder="email@exemplo.com"
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Data de Matrícula</label>
              <input type="date" value={form.data_matricula} onChange={e => setForm(p => ({ ...p, data_matricula: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Foto do Aluno</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => setUploadFoto(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar Aluno'}</button>
            <button onClick={() => { setShowForm(false); setEditando(null); setErro('') }}
              className="px-4 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors"
            >Cancelar</button>
          </div>
        </div>
      )}

      <input type="text" placeholder="Buscar por nome ou matrícula..." value={buscaTexto} onChange={e => setBuscaTexto(e.target.value)}
        className="w-full mb-4 bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 placeholder-gray-500"
      />

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="p-4 text-gray-400 font-medium text-center w-12">Nº</th>
                <th className="p-4 text-gray-400 font-medium text-left">Aluno</th>
                <th className="p-4 text-gray-400 font-medium text-left hidden md:table-cell">Matrícula</th>
                <th className="p-4 text-gray-400 font-medium text-left hidden md:table-cell">Turma</th>
                <th className="p-4 text-gray-400 font-medium text-center">Situação</th>
                <th className="p-4 text-gray-400 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando...</td></tr>
              : filtrados.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum aluno encontrado</td></tr>
              : filtrados.map(a => (
                <tr key={a.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                  <td className="p-4 text-center">
                    <span className="text-xs font-bold text-gray-400" style={{ fontFamily: 'DM Mono, monospace' }}>
                      {a.numero_chamada?.toString().padStart(2, '0') || '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {a.foto_url ? (
                          <Image src={a.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">{a.nome_completo.split(' ').map((n: string) => n[0]).slice(0,2).join('')}</span>
                        )}
                      </div>
                      <span className="text-white">{a.nome_completo}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300 text-xs hidden md:table-cell" style={{ fontFamily: 'DM Mono, monospace' }}>{a.matricula}</td>
                  <td className="p-4 text-gray-300 hidden md:table-cell">{a.turmas?.nome}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${situacaoBadge(a.situacao || 'ativo')}`}>
                      {a.situacao || 'ativo'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => iniciarEditar(a)} className="text-xs text-[#58a6ff] border border-[#58a6ff]/30 hover:bg-[#58a6ff]/10 px-2 py-1 rounded-lg transition-all">Editar</button>
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
