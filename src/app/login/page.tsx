'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [showModalDiretor, setShowModalDiretor] = useState(false)
  const [modalForm, setModalForm] = useState({ nome: '', email: '', senha: '' })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalErro, setModalErro] = useState('')
  const [modalSucesso, setModalSucesso] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const res = await fetch('/api/auth/buscar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuario.trim().toLowerCase() }),
    })

    if (!res.ok) {
      setErro('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }

    const { email } = await res.json()

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }

    const perfilRes = await fetch('/api/auth/perfil')
    const { perfil } = perfilRes.ok ? await perfilRes.json() : {}

    const rotas: Record<string, string> = {
      professor: '/professor',
      secretaria: '/adm',
      admin: '/admin',
      diretor: '/admin',
      responsavel: '/responsavel',
      cozinha: '/cozinha',
    }
    router.push(rotas[perfil || ''] || '/professor')
    router.refresh()
  }

  async function criarDiretor(e: React.FormEvent) {
    e.preventDefault()
    setModalLoading(true)
    setModalErro('')
    setModalSucesso('')

    if (!modalForm.nome.trim() || !modalForm.email.trim() || !modalForm.senha.trim()) {
      setModalErro('Todos os campos são obrigatórios')
      setModalLoading(false)
      return
    }

    if (modalForm.senha.length < 8) {
      setModalErro('Senha deve ter pelo menos 8 caracteres')
      setModalLoading(false)
      return
    }

    try {
      const res = await fetch('/api/setup/criar-diretor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: modalForm.email.trim(),
          senha: modalForm.senha,
          nome: modalForm.nome.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setModalErro(data.error || 'Erro ao criar diretor')
        setModalLoading(false)
        return
      }

      setModalSucesso(`✓ Diretor criado! Usuário: ${data.usuario}`)
      setModalForm({ nome: '', email: '', senha: '' })
      setTimeout(() => {
        setShowModalDiretor(false)
        setModalSucesso('')
      }, 2000)
    } catch (err) {
      setModalErro('Erro ao criar diretor: ' + String(err))
    }

    setModalLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4">
            <span className="text-xl font-bold text-white">SE</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Sistema Escolar</h1>
          <p className="text-slate-400 mt-2 text-sm">Gestão acadêmica integrada</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">

          {erro && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Usuário</label>
              <input
                type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
                placeholder="seu.usuario" required autoComplete="username"
                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Senha</label>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Entrando...</>
              ) : 'Entrar'}
            </button>
          </form>

          <button
            onClick={() => setShowModalDiretor(true)}
            className="w-full mt-4 py-2.5 text-sm text-slate-400 hover:text-blue-400 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors font-medium"
          >
            Criar novo diretor
          </button>

        </div>

        <p className="text-center text-xs text-slate-500 mt-8">© 2026 Sistema Escolar — Todos os direitos reservados</p>
      </div>

      {/* Modal Criar Diretor */}
      {showModalDiretor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold mb-1 text-xl">Criar novo diretor</h3>
            <p className="text-slate-400 text-sm mb-6">Configure o primeiro administrador do sistema.</p>

            {modalErro && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {modalErro}
              </div>
            )}

            {modalSucesso && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
                {modalSucesso}
              </div>
            )}

            <form onSubmit={criarDiretor} className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={modalForm.nome}
                  onChange={e => setModalForm({ ...modalForm, nome: e.target.value })}
                  placeholder="Diretora Escolar"
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={modalForm.email}
                  onChange={e => setModalForm({ ...modalForm, email: e.target.value })}
                  placeholder="diretora@escola.com"
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Senha (mín. 8 caracteres) *</label>
                <input
                  type="password"
                  value={modalForm.senha}
                  onChange={e => setModalForm({ ...modalForm, senha: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {modalLoading ? 'Criando...' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModalDiretor(false)
                    setModalErro('')
                    setModalSucesso('')
                  }}
                  className="flex-1 py-2.5 bg-slate-700 border border-slate-600 text-slate-300 text-sm rounded-lg hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
