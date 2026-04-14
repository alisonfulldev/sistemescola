'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const POR_PAGINA = 20

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [escola, setEscola] = useState<any>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'professor' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [pagina, setPagina] = useState(1)

  // Edição
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Edição
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nome: '', email: '', perfil: '' })
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  // Link reset
  const [linkAberto, setLinkAberto] = useState<string | null>(null)
  const [linkGerado, setLinkGerado] = useState('')
  const [gerandoLink, setGerandoLink] = useState(false)
  const [erroLink, setErroLink] = useState('')
  const [copiado, setCopiado] = useState(false)

  // Delete
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [deletando, setDeletando] = useState(false)
  const [erroDelete, setErroDelete] = useState('')

  const supabase = createClient()

  async function carregar() {
    const [{ data: u }, { data: eData }] = await Promise.all([
      supabase.from('usuarios').select('*').order('nome'),
      supabase.from('escola').select('id, codigo, nome_oficial').limit(1).single(),
    ])
    setUsuarios(u || [])
    if (eData) setEscola(eData)
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
      body: JSON.stringify({ ...form }),
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

  function abrirEdicao(u: any) {
    setEditando(u.id)
    setEditForm({ nome: u.nome, email: u.email, perfil: u.perfil })
    setErroEdit('')
    setLinkAberto(null)
  }

  async function salvarEdicao() {
    setSalvandoEdit(true)
    setErroEdit('')
    const res = await fetch('/api/admin/atualizar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: editando, ...editForm }),
    })
    if (!res.ok) {
      const d = await res.json()
      setErroEdit(d.error || 'Erro ao salvar')
    } else {
      setEditando(null)
      carregar()
    }
    setSalvandoEdit(false)
  }

  async function gerarLink(userId: string, email: string) {
    setLinkAberto(userId)
    setLinkGerado('')
    setErroLink('')
    setCopiado(false)
    setGerandoLink(true)
    setEditando(null)
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
    await fetch('/api/admin/toggle-ativo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, ativo: !u.ativo }),
    })
    carregar()
  }

  async function deletarUsuario() {
    if (!deletandoId) return
    setDeletando(true)
    setErroDelete('')
    const res = await fetch('/api/admin/excluir-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: deletandoId }),
    })
    if (!res.ok) {
      const d = await res.json()
      setErroDelete(d.error || 'Erro ao deletar usuário')
    } else {
      setDeletandoId(null)
      carregar()
    }
    setDeletando(false)
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const termo = busca.toLowerCase()
    const matchBusca = !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
    const matchPerfil = !filtroPerfil || u.perfil === filtroPerfil
    const matchStatus = !filtroStatus || (filtroStatus === 'ativo' ? u.ativo : !u.ativo)
    return matchBusca && matchPerfil && matchStatus
  })

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const usuariosPaginados = usuariosFiltrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function handleFiltro(fn: () => void) { fn(); setPagina(1) }

  const perfilBadge = (p: string) => ({
    admin:      'bg-blue-50 text-blue-700',
    diretor:    'bg-blue-50 text-blue-700',
    secretaria: 'bg-blue-50 text-blue-700',
    professor:  'bg-slate-100 text-slate-600',
    responsavel:'bg-green-50 text-green-700',
    cozinha:    'bg-orange-50 text-orange-700',
  }[p] || 'bg-slate-100 text-slate-500')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
          <p className="text-slate-600 text-sm">{usuariosFiltrados.length} de {usuarios.length} usuário(s)</p>

        </div>
        <button
          onClick={() => { setShowForm(true); setErro('') }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Novo Usuário
        </button>
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={busca}
            onChange={e => handleFiltro(() => setBusca(e.target.value))}
            placeholder="Buscar por nome ou email..."
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filtroPerfil}
          onChange={e => handleFiltro(() => setFiltroPerfil(e.target.value))}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos os perfis</option>
          <option value="professor">Professor</option>
          <option value="secretaria">Secretaria</option>
          <option value="diretor">Diretor</option>
          <option value="responsavel">Responsável</option>
          <option value="cozinha">Cozinha</option>
          <option value="admin">Administrador</option>
        </select>
        <select
          value={filtroStatus}
          onChange={e => handleFiltro(() => setFiltroStatus(e.target.value))}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        {(busca || filtroPerfil || filtroStatus) && (
          <button
            onClick={() => { setBusca(''); setFiltroPerfil(''); setFiltroStatus(''); setPagina(1) }}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-500 text-xs rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Limpar
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Novo Usuário</h3>
          {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{erro}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Nome Completo *</label>
              <input type="text" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Senha inicial (mín. 8 caracteres) *</label>
              <input type="password" value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Perfil *</label>
              <select value={form.perfil} onChange={e => {
                const perfil = e.target.value
                const novoForm: typeof form = { ...form, perfil }
                if (perfil === 'diretor' && escola?.codigo) {
                  novoForm.email = `${escola.codigo}@narandiba.sp.gov.br`
                  novoForm.nome = novoForm.nome || escola.nome_oficial || ''
                }
                setForm(novoForm)
              }}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="professor">Professor</option>
                <option value="secretaria">Secretaria</option>
                <option value="diretor">Diretor</option>
                <option value="responsavel">Responsável</option>
                <option value="cozinha">Cozinha</option>
                <option value="admin">Administrador</option>
              </select>
              {form.perfil === 'diretor' && escola?.codigo && (
                <p className="text-xs text-blue-600 mt-1">🏫 Login gerado pelo INEP: <span className="font-mono">{escola.codigo}</span></p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={criarUsuario} disabled={salvando || !form.nome.trim() || !form.email.trim() || !form.senha.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >{salvando ? 'Criando...' : 'Criar Usuário'}</button>
            <button onClick={() => { setShowForm(false); setErro('') }} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚠️</span>
              </div>
              <h3 className="text-slate-900 font-semibold">Deletar usuário?</h3>
            </div>
            {erroDelete && <p className="text-sm text-red-600 mb-4 bg-red-50 p-2 rounded">{erroDelete}</p>}
            <p className="text-slate-600 text-sm mb-6">
              Tem certeza que deseja deletar <strong>{usuarios.find(u => u.id === deletandoId)?.nome}</strong>? Esta ação é irreversível.
            </p>
            <div className="flex gap-3">
              <button
                onClick={deletarUsuario}
                disabled={deletando}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {deletando ? 'Deletando...' : 'Sim, deletar'}
              </button>
              <button
                onClick={() => setDeletandoId(null)}
                disabled={deletando}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-slate-500 font-medium text-left">Nome</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden md:table-cell">Email</th>
                <th className="p-4 text-slate-500 font-medium text-center">Perfil</th>
                <th className="p-4 text-slate-500 font-medium text-center">Status</th>
                <th className="p-4 text-slate-500 font-medium text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Carregando...</td></tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">Nenhum usuário encontrado.</td></tr>
              ) : usuariosPaginados.map(u => (
                <>
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="text-slate-900">{u.nome}</p>
                      {u.usuario && <p className="text-xs text-blue-600 font-mono mt-0.5">@{u.usuario}</p>}
                    </td>
                    <td className="p-4 text-slate-600 text-xs hidden md:table-cell" style={{ fontFamily: 'DM Mono, monospace' }}>{u.email}</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${perfilBadge(u.perfil)}`}>{u.perfil}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => editando === u.id ? setEditando(null) : abrirEdicao(u)}
                          className="text-xs px-2 py-1 rounded-lg border text-blue-600 border-blue-200 hover:bg-blue-50 transition-all"
                        >
                          {editando === u.id ? 'Fechar' : 'Editar'}
                        </button>
                        <button
                          onClick={() => linkAberto === u.id ? setLinkAberto(null) : gerarLink(u.id, u.email)}
                          className="text-xs px-2 py-1 rounded-lg border text-amber-700 border-amber-200 hover:bg-amber-50 transition-all"
                        >
                          {linkAberto === u.id ? 'Fechar' : '🔑 Senha'}
                        </button>
                        <button
                          onClick={() => toggleAtivo(u)}
                          disabled={['admin', 'diretor', 'secretaria'].includes(u.perfil)}
                          title={['admin', 'diretor', 'secretaria'].includes(u.perfil) ? 'Este perfil não pode ser desativado' : undefined}
                          className={`text-xs px-2 py-1 rounded-lg border transition-all ${['admin', 'diretor', 'secretaria'].includes(u.perfil) ? 'opacity-30 cursor-not-allowed text-slate-400 border-slate-200' : u.ativo ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-700 border-green-200 hover:bg-green-50'}`}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => setDeletandoId(u.id)}
                          disabled={['admin', 'diretor', 'secretaria'].includes(u.perfil)}
                          title={['admin', 'diretor', 'secretaria'].includes(u.perfil) ? 'Este perfil não pode ser deletado' : undefined}
                          className={`text-xs px-2 py-1 rounded-lg border transition-all ${['admin', 'diretor', 'secretaria'].includes(u.perfil) ? 'opacity-30 cursor-not-allowed text-slate-400 border-slate-200' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                        >
                          🗑 Deletar
                        </button>
                      </div>
                    </td>
                  </tr>

                  {editando === u.id && (
                    <tr key={`${u.id}-edit`} className="border-b border-slate-100 bg-blue-50">
                      <td colSpan={5} className="px-4 py-4">
                        {erroEdit && <p className="text-xs text-red-600 mb-3">{erroEdit}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Nome</label>
                            <input
                              type="text"
                              value={editForm.nome}
                              onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))}
                              className="w-full bg-white border border-blue-200 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Email</label>
                            <input
                              type="email"
                              value={editForm.email}
                              onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                              className="w-full bg-white border border-blue-200 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Perfil</label>
                            <select
                              value={editForm.perfil}
                              onChange={e => setEditForm(p => ({ ...p, perfil: e.target.value }))}
                              className="w-full bg-white border border-blue-200 text-slate-900 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                            >
                              <option value="professor">Professor</option>
                              <option value="secretaria">Secretaria</option>
                              <option value="responsavel">Responsável</option>
                              <option value="cozinha">Cozinha</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={salvarEdicao}
                            disabled={salvandoEdit}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            {salvandoEdit ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button
                            onClick={() => setEditando(null)}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {linkAberto === u.id && (
                    <tr key={`${u.id}-link`} className="border-b border-slate-100 bg-amber-50">
                      <td colSpan={5} className="px-4 py-4">
                        {gerandoLink ? (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <div className="animate-spin w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full" />
                            Gerando link...
                          </div>
                        ) : erroLink ? (
                          <p className="text-sm text-red-600">{erroLink}</p>
                        ) : linkGerado ? (
                          <div>
                            <p className="text-xs text-slate-500 mb-2">
                              Link de redefinição para <span className="text-slate-900 font-medium">{u.nome}</span> — válido por 1 hora:
                            </p>
                            <div className="flex gap-2 items-center">
                              <input
                                readOnly
                                value={linkGerado}
                                className="flex-1 bg-white border border-amber-200 text-slate-700 text-xs rounded-lg px-3 py-2 font-mono truncate focus:outline-none"
                              />
                              <button
                                onClick={copiarLink}
                                className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex-shrink-0 ${copiado ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white'}`}
                              >
                                {copiado ? '✓ Copiado!' : 'Copiar'}
                              </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Envie este link para o usuário. Ao acessar, ele poderá definir uma nova senha.</p>
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
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-400">
              {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, usuariosFiltrados.length)} de {usuariosFiltrados.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPagina(1)} disabled={paginaAtual === 1} className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual === 1} className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const start = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4))
                const p = start + i
                return (
                  <button key={p} onClick={() => setPagina(p)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${p === paginaAtual ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  >{p}</button>
                )
              })}
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas} className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
              <button onClick={() => setPagina(totalPaginas)} disabled={paginaAtual === totalPaginas} className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
