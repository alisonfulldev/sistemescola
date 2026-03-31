'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useEscola } from '@/hooks/useEscola'

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
  const [buscaTexto, setBuscaTexto] = useState('')
  const [uploadFoto, setUploadFoto] = useState<File | null>(null)
  const [numerosUsados, setNumerosUsados] = useState<number[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { escolaId, ready } = useEscola()

  async function carregar() {
    let qt = supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome')
    if (escolaId) qt = qt.eq('escola_id', escolaId)
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('alunos').select('*, turmas(nome)').order('numero_chamada', { nullsFirst: false }).order('nome_completo'),
      qt,
    ])
    setAlunos(a || [])
    setTurmas(t || [])
    setLoading(false)
  }

  useEffect(() => { if (ready) carregar() }, [ready])

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
    ativo: 'bg-green-50 text-green-700',
    transferido: 'bg-red-50 text-red-600',
    remanejado: 'bg-amber-50 text-amber-700',
  }[s] || 'bg-slate-100 text-slate-500')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alunos</h1>
          <p className="text-slate-600 text-sm">{alunos.length} aluno(s)</p>
        </div>
        <button onClick={iniciarNovo} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Novo Aluno
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{editando ? 'Editar Aluno' : 'Novo Aluno'}</h3>
          {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{erro}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-600 mb-1.5">Nome Completo *</label>
              <input type="text" value={form.nome_completo} onChange={e => setForm(p => ({ ...p, nome_completo: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Matrícula *</label>
              <input type="text" value={form.matricula} onChange={e => setForm(p => ({ ...p, matricula: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Turma *</label>
              <select value={form.turma_id}
                onChange={e => { setForm(p => ({ ...p, turma_id: e.target.value })); carregarNumerosUsados(e.target.value, editando?.id) }}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">
                Nº de Chamada * <span className="text-slate-400">(1–55, único na turma)</span>
              </label>
              <input type="number" min={1} max={55} value={form.numero_chamada}
                onChange={e => setForm(p => ({ ...p, numero_chamada: e.target.value }))}
                className={`w-full bg-white border text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${form.numero_chamada && numerosUsados.includes(Number(form.numero_chamada)) ? 'border-red-400' : 'border-slate-300'
                  }`}
                style={{ fontFamily: 'DM Mono, monospace' }} />
              {form.turma_id && numerosUsados.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">Em uso: {numerosUsados.sort((a, b) => a - b).join(', ')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Situação</label>
              <select value={form.situacao} onChange={e => setForm(p => ({ ...p, situacao: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ativo">Ativo</option>
                <option value="transferido">Transferido</option>
                <option value="remanejado">Remanejado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Nome do Responsável</label>
              <input type="text" value={form.nome_responsavel} onChange={e => setForm(p => ({ ...p, nome_responsavel: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Contato (WhatsApp)</label>
              <input type="text" placeholder="5511987654321" value={form.contato_responsavel} onChange={e => setForm(p => ({ ...p, contato_responsavel: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: 'DM Mono, monospace' }} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">E-mail do Responsável</label>
              <input type="email" value={form.email_responsavel} onChange={e => setForm(p => ({ ...p, email_responsavel: e.target.value }))}
                placeholder="email@exemplo.com"
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Data de Matrícula</label>
              <input type="date" value={form.data_matricula} onChange={e => setForm(p => ({ ...p, data_matricula: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Foto do Aluno</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => setUploadFoto(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar Aluno'}</button>
            <button onClick={() => { setShowForm(false); setEditando(null); setErro('') }}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >Cancelar</button>
          </div>
        </div>
      )}

      <input type="text" placeholder="Buscar por nome ou matrícula..." value={buscaTexto} onChange={e => setBuscaTexto(e.target.value)}
        className="w-full mb-4 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
      />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-slate-500 font-medium text-center w-12">Nº</th>
                <th className="p-4 text-slate-500 font-medium text-left">Aluno</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden md:table-cell">Matrícula</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden md:table-cell">Turma</th>
                <th className="p-4 text-slate-500 font-medium text-center">Situação</th>
                <th className="p-4 text-slate-500 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">Carregando...</td></tr>
                : filtrados.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum aluno encontrado</td></tr>
                  : filtrados.map(a => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-center">
                        <span className="text-xs font-bold text-slate-500" style={{ fontFamily: 'DM Mono, monospace' }}>
                          {a.numero_chamada?.toString().padStart(2, '0') || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {a.foto_url ? (
                              <Image src={a.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                            ) : (
                              <span className="text-xs font-bold text-slate-500">{a.nome_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>
                            )}
                          </div>
                          <span className="text-slate-900">{a.nome_completo}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 text-xs hidden md:table-cell" style={{ fontFamily: 'DM Mono, monospace' }}>{a.matricula}</td>
                      <td className="p-4 text-slate-600 hidden md:table-cell">{a.turmas?.nome}</td>
                      <td className="p-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${situacaoBadge(a.situacao || 'ativo')}`}>
                          {a.situacao || 'ativo'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => iniciarEditar(a)} className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all">Editar</button>
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
