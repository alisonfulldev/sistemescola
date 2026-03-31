'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEscola } from '@/hooks/useEscola'

export default function ResponsaveisPage() {
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [vinculando, setVinculando] = useState<any>(null)
  const [alunoSelecionado, setAlunoSelecionado] = useState('')
  const [salvandoVinculo, setSalvandoVinculo] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState('')
  const [editando, setEditando] = useState<any>(null)
  const [editForm, setEditForm] = useState({ nome: '', senha: '' })
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')
  const supabase = createClient()
  const { escolaId, ready } = useEscola()

  function abrirEdicao(resp: any) {
    setEditando(resp)
    setEditForm({ nome: resp.nome, senha: '' })
    setErroEdit('')
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvandoEdit(true)
    setErroEdit('')
    const res = await fetch('/api/admin/atualizar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: editando.id, nome: editForm.nome, senha: editForm.senha || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setErroEdit(data.error || 'Erro ao salvar'); setSalvandoEdit(false); return }
    setEditando(null)
    setSalvandoEdit(false)
    carregar()
  }

  function copiarLink(email: string) {
    const link = `${window.location.origin}/responsavel`
    const texto = `Olá! Acesse a frequência escolar pelo link:\n${link}\n\nE-mail: ${email}\nSenha: a que foi cadastrada pela escola`
    navigator.clipboard.writeText(texto)
    setLinkCopiado(email)
    setTimeout(() => setLinkCopiado(''), 2000)
  }

  async function carregar() {
    let qa = supabase.from('alunos').select('id, nome_completo, matricula, turmas(nome)').eq('ativo', true).order('nome_completo')
    if (escolaId) qa = qa.eq('turmas.escola_id', escolaId)
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase
        .from('usuarios')
        .select('id, nome, email, criado_em, responsaveis_alunos(aluno_id, alunos(nome_completo, matricula))')
        .eq('perfil', 'responsavel')
        .order('nome'),
      qa,
    ])
    setResponsaveis(r || [])
    setAlunos(a || [])
    setLoading(false)
  }

  useEffect(() => { if (ready) carregar() }, [ready])

  async function cadastrar() {
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) return
    setSalvando(true)
    setErroForm('')

    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, email: form.email, senha: form.senha, perfil: 'responsavel' }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErroForm(data.error || 'Erro ao cadastrar')
      setSalvando(false)
      return
    }

    setShowForm(false)
    setForm({ nome: '', email: '', senha: '' })
    setSalvando(false)
    carregar()
  }

  async function vincularAluno() {
    if (!vinculando || !alunoSelecionado) return
    setSalvandoVinculo(true)

    await supabase.from('responsaveis_alunos').insert({
      responsavel_id: vinculando.id,
      aluno_id: alunoSelecionado,
    })

    setSalvandoVinculo(false)
    setAlunoSelecionado('')
    setVinculando(null)
    carregar()
  }

  async function desvincularAluno(responsavelId: string, alunoId: string) {
    await supabase
      .from('responsaveis_alunos')
      .delete()
      .eq('responsavel_id', responsavelId)
      .eq('aluno_id', alunoId)
    carregar()
  }

  async function excluirResponsavel(resp: any) {
    if (!confirm(`Excluir ${resp.nome} (${resp.email})? Esta ação não pode ser desfeita.`)) return
    const res = await fetch('/api/admin/excluir-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: resp.id }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Erro ao excluir'); return }
    carregar()
  }

  async function reparar() {
    const res = await fetch('/api/admin/reparar-usuarios', { method: 'POST' })
    const data = await res.json()
    if (data.total > 0) {
      alert(`${data.total} usuário(s) reparado(s): ${data.inseridos.join(', ')}`)
      carregar()
    } else {
      alert('Nenhum usuário precisava de reparo.')
    }
  }

  // Alunos que o responsável ainda não tem vínculo
  function alunosDisponiveis(resp: any) {
    const vinculados = resp.responsaveis_alunos?.map((v: any) => v.aluno_id) || []
    return alunos.filter(a => !vinculados.includes(a.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Responsáveis</h1>
          <p className="text-slate-600 text-sm">{responsaveis.length} cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reparar}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg transition-colors"
            title="Sincroniza usuários que foram criados mas não apareceram na lista"
          >
            🔧 Reparar
          </button>
          <button
            onClick={() => { setShowForm(true); setErroForm('') }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Novo Responsável
          </button>
        </div>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 mb-6 animate-slide-up shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">Cadastrar Responsável</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Nome Completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">E-mail *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Senha *</label>
              <input
                type="password"
                value={form.senha}
                onChange={e => setForm(p => ({ ...p, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          {erroForm && <p className="text-red-600 text-xs mb-3">{erroForm}</p>}
          <div className="flex gap-3">
            <button
              onClick={cadastrar}
              disabled={salvando || !form.nome.trim() || !form.email.trim() || !form.senha.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {salvando ? 'Cadastrando...' : 'Cadastrar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando...</div>
      ) : responsaveis.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Nenhum responsável cadastrado</div>
      ) : (
        <div className="space-y-3">
          {responsaveis.map(resp => (
            <div key={resp.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700 flex-shrink-0">
                    {resp.nome?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{resp.nome}</p>
                    <p className="text-xs text-slate-400 truncate">{resp.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <button
                    onClick={() => copiarLink(resp.email)}
                    className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    {linkCopiado === resp.email ? '✓ Copiado!' : '🔗 Link'}
                  </button>
                  <button
                    onClick={() => abrirEdicao(resp)}
                    className="text-xs text-amber-700 border border-amber-200 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => excluirResponsavel(resp)}
                    className="text-xs text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    🗑 Excluir
                  </button>
                  <button
                    onClick={() => { setVinculando(resp); setAlunoSelecionado('') }}
                    className="text-xs text-green-700 border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    + Aluno
                  </button>
                </div>
              </div>

              {/* Alunos vinculados */}
              {resp.responsaveis_alunos?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Alunos vinculados:</p>
                  <div className="flex flex-wrap gap-2">
                    {resp.responsaveis_alunos.map((v: any) => (
                      <div key={v.aluno_id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                        <span className="text-xs text-slate-700">{v.alunos?.nome_completo}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400 font-mono">{v.alunos?.matricula}</span>
                        <button
                          onClick={() => desvincularAluno(resp.id, v.aluno_id)}
                          className="text-slate-300 hover:text-red-500 ml-1 transition-colors text-xs"
                          title="Desvincular"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resp.responsaveis_alunos?.length === 0 && (
                <p className="text-xs text-slate-300 mt-2">Nenhum aluno vinculado</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal editar responsável */}
      {editando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-slate-900 mb-1">Editar Responsável</h3>
            <p className="text-slate-400 text-xs mb-4">{editando.email}</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Nome</label>
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1.5">Nova senha <span className="text-slate-400">(deixe em branco para não alterar)</span></label>
                <input
                  type="password"
                  value={editForm.senha}
                  onChange={e => setEditForm(p => ({ ...p, senha: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {erroEdit && <p className="text-red-600 text-xs mb-3">{erroEdit}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setEditando(null)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdit || !editForm.nome.trim()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {salvandoEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal vincular aluno */}
      {vinculando && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm animate-slide-up shadow-xl">
            <h3 className="font-bold text-slate-900 mb-1">Vincular Aluno</h3>
            <p className="text-slate-500 text-sm mb-4">Responsável: <span className="text-slate-900">{vinculando.nome}</span></p>

            {alunosDisponiveis(vinculando).length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">Todos os alunos já estão vinculados</p>
            ) : (
              <div className="mb-4">
                <label className="block text-xs text-slate-600 mb-1.5">Selecionar aluno</label>
                <select
                  value={alunoSelecionado}
                  onChange={e => setAlunoSelecionado(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {alunosDisponiveis(vinculando).map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.nome_completo} · {a.matricula} · {a.turmas?.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setVinculando(null)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              {alunosDisponiveis(vinculando).length > 0 && (
                <button
                  onClick={vincularAluno}
                  disabled={!alunoSelecionado || salvandoVinculo}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {salvandoVinculo ? 'Salvando...' : 'Vincular'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
