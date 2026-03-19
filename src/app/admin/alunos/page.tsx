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
  const [form, setForm] = useState({ nome_completo: '', matricula: '', turma_id: '', nome_responsavel: '', contato_responsavel: '' })
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [uploadFoto, setUploadFoto] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function carregar() {
    const [{ data: a }, { data: t }] = await Promise.all([
      supabase.from('alunos').select('*, turmas(nome)').eq('ativo', true).order('nome_completo'),
      supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
    ])
    setAlunos(a || [])
    setTurmas(t || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function iniciarNovo() {
    setEditando(null)
    setForm({ nome_completo: '', matricula: '', turma_id: turmas[0]?.id || '', nome_responsavel: '', contato_responsavel: '' })
    setUploadFoto(null)
    setShowForm(true)
  }

  function iniciarEditar(a: any) {
    setEditando(a)
    setForm({ nome_completo: a.nome_completo, matricula: a.matricula, turma_id: a.turma_id, nome_responsavel: a.nome_responsavel || '', contato_responsavel: a.contato_responsavel || '' })
    setUploadFoto(null)
    setShowForm(true)
  }

  async function salvar() {
    if (!form.nome_completo.trim() || !form.matricula.trim() || !form.turma_id) return
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

    const payload = { ...form, ...(foto_url !== undefined ? { foto_url } : {}) }

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
    a.nome_completo.toLowerCase().includes(busca.toLowerCase()) || a.matricula.includes(busca)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Alunos</h1>
          <p className="text-gray-400 text-sm">{alunos.length} ativo(s)</p>
        </div>
        <button onClick={iniciarNovo} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Novo Aluno
        </button>
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-purple-500/30 rounded-xl p-5 mb-6 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">{editando ? 'Editar Aluno' : 'Novo Aluno'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
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
              <select value={form.turma_id} onChange={e => setForm(p => ({ ...p, turma_id: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="">Selecione...</option>
                {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
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
              <label className="block text-xs text-gray-400 mb-1.5">Foto do Aluno</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={e => setUploadFoto(e.target.files?.[0] || null)}
                className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando || !form.nome_completo.trim() || !form.matricula.trim() || !form.turma_id}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Salvando...' : editando ? 'Atualizar' : 'Cadastrar Aluno'}</button>
            <button onClick={() => { setShowForm(false); setEditando(null) }}
              className="px-4 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors"
            >Cancelar</button>
          </div>
        </div>
      )}

      <input type="text" placeholder="Buscar por nome ou matrícula..." value={busca} onChange={e => setBusca(e.target.value)}
        className="w-full mb-4 bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 placeholder-gray-500"
      />

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-[#30363d]">
              <th className="p-4 text-gray-400 font-medium text-left">Aluno</th>
              <th className="p-4 text-gray-400 font-medium text-left">Matrícula</th>
              <th className="p-4 text-gray-400 font-medium text-left hidden md:table-cell">Turma</th>
              <th className="p-4 text-gray-400 font-medium text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            : filtrados.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">Nenhum aluno encontrado</td></tr>
            : filtrados.map(a => (
              <tr key={a.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
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
                <td className="p-4 text-gray-300 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>{a.matricula}</td>
                <td className="p-4 text-gray-300 hidden md:table-cell">{a.turmas?.nome}</td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => iniciarEditar(a)} className="text-xs text-[#58a6ff] border border-[#58a6ff]/30 hover:bg-[#58a6ff]/10 px-2 py-1 rounded-lg transition-all">Editar</button>
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
