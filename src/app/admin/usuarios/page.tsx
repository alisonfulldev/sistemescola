'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'professor' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [linkAberto, setLinkAberto] = useState<string | null>(null)
  const [linkGerado, setLinkGerado] = useState('')
  const [gerandoLink, setGerandoLink] = useState(false)
  const [erroLink, setErroLink] = useState('')
  const [copiado, setCopiado] = useState(false)
  const supabase = createClient()

  async function carregar() {
    const { data } = await supabase.from('usuarios').select('*').order('nome')
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function criarUsuario() {
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) return
    setSalvando(true)
    setErro('')
    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const d = await res.json()
      setErro(d.error || 'Erro ao criar usuário')
    } else {
      setShowForm(false)
      setForm({ nome: '', email: '', senha: '', perfil: 'professor' })
      carregar()
    }
    setSalvando(false)
  }

  async function gerarLink(userId: string, email: string) {
    setLinkAberto(userId)
    setLinkGerado('')
    setErroLink('')
    setCopiado(false)
    setGerandoLink(true)
    const res = await fetch('/api/admin/gerar-link-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setErroLink(data.error || 'Erro ao gerar link')
    } else {
      setLinkGerado(data.link)
    }
    setGerandoLink(false)
  }

  function copiarLink() {
    navigator.clipboard.writeText(linkGerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function toggleAtivo(u: any) {
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    carregar()
  }

  const perfilBadge = (p: string) => ({
    admin: 'bg-purple-500/20 text-purple-300',
    secretaria: 'bg-blue-500/20 text-blue-300',
    professor: 'bg-gray-500/20 text-gray-300',
    responsavel: 'bg-green-500/20 text-green-300',
  }[p] || 'bg-gray-500/20 text-gray-400')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Usuários</h1>
          <p className="text-gray-400 text-sm">{usuarios.length} usuário(s)</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setErro('') }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="bg-[#161b22] border border-purple-500/30 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">Novo Usuário</h3>
          {erro && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{erro}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome Completo *</label>
              <input type="text" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Senha inicial (mín. 8 caracteres) *</label>
              <input type="password" value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Perfil *</label>
              <select value={form.perfil} onChange={e => setForm(p => ({ ...p, perfil: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="professor">Professor</option>
                <option value="secretaria">Secretaria</option>
                <option value="responsavel">Responsável</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={criarUsuario} disabled={salvando || !form.nome.trim() || !form.email.trim() || !form.senha.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Criando...' : 'Criar Usuário'}</button>
            <button onClick={() => { setShowForm(false); setErro('') }} className="px-4 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="p-4 text-gray-400 font-medium text-left">Nome</th>
                <th className="p-4 text-gray-400 font-medium text-left hidden md:table-cell">Email</th>
                <th className="p-4 text-gray-400 font-medium text-center">Perfil</th>
                <th className="p-4 text-gray-400 font-medium text-center">Status</th>
                <th className="p-4 text-gray-400 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Carregando...</td></tr>
              ) : usuarios.map(u => (
                <>
                  <tr key={u.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                    <td className="p-4 text-white">{u.nome}</td>
                    <td className="p-4 text-gray-300 text-xs hidden md:table-cell" style={{ fontFamily: 'DM Mono, monospace' }}>{u.email}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${perfilBadge(u.perfil)}`}>{u.perfil}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-[#39d353]/15 text-[#39d353]' : 'bg-red-500/15 text-red-400'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => linkAberto === u.id ? setLinkAberto(null) : gerarLink(u.id, u.email)}
                          className="text-xs px-2 py-1 rounded-lg border text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10 transition-all"
                        >
                          {linkAberto === u.id ? 'Fechar' : '🔑 Redefinir Senha'}
                        </button>
                        <button
                          onClick={() => toggleAtivo(u)}
                          className={`text-xs px-2 py-1 rounded-lg border transition-all ${u.ativo ? 'text-red-400 border-red-400/30 hover:bg-red-400/10' : 'text-[#39d353] border-[#39d353]/30 hover:bg-[#39d353]/10'}`}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {linkAberto === u.id && (
                    <tr key={`${u.id}-link`} className="border-b border-[#30363d]/50 bg-yellow-500/5">
                      <td colSpan={5} className="px-4 py-4">
                        {gerandoLink ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="animate-spin w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full" />
                            Gerando link...
                          </div>
                        ) : erroLink ? (
                          <p className="text-sm text-red-400">{erroLink}</p>
                        ) : linkGerado ? (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">
                              Link de redefinição para <span className="text-white font-medium">{u.nome}</span> — válido por 1 hora:
                            </p>
                            <div className="flex gap-2 items-center">
                              <input
                                readOnly
                                value={linkGerado}
                                className="flex-1 bg-[#0d1117] border border-yellow-400/30 text-gray-300 text-xs rounded-lg px-3 py-2 font-mono truncate focus:outline-none"
                              />
                              <button
                                onClick={copiarLink}
                                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex-shrink-0 ${copiado ? 'bg-[#39d353] text-black' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}
                              >
                                {copiado ? '✓ Copiado!' : 'Copiar'}
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">Envie este link para o usuário. Ao acessar, ele poderá definir uma nova senha.</p>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
