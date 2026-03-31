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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl mb-4">
            <span className="text-2xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Chamada Escolar</h1>
          <p className="text-slate-500 mt-1 text-sm">Sistema digital de frequência escolar</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span>⚠</span> {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Usuário</label>
              <input
                type="text" value={usuario} onChange={e => setUsuario(e.target.value)}
                placeholder="seu.usuario" required autoComplete="username"
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">Senha</label>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Entrando...</>
              ) : 'Entrar'}
            </button>
          </form>

          <button
            onClick={() => setShowModalDiretor(true)}
            className="w-full mt-3 py-2.5 text-sm text-slate-600 hover:text-blue-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            + Criar Diretor (Provisório)
          </button>

        </div>

        <p className="text-center text-xs text-slate-400 mt-6">© 2026 Sistema de Chamada Escolar</p>
      </div>

      {/* Modal Criar Diretor */}
      {showModalDiretor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-slate-900 font-semibold mb-1 text-lg">Criar Diretor</h3>
            <p className="text-slate-500 text-xs mb-4">Use este formulário para criar o primeiro diretor do sistema.</p>

            {modalErro && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {modalErro}
              </div>
            )}

            {modalSucesso && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {modalSucesso}
              </div>
            )}

            <form onSubmit={criarDiretor} className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={modalForm.nome}
                  onChange={e => setModalForm({ ...modalForm, nome: e.target.value })}
                  placeholder="Diretora Escolar"
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Email *</label>
                <input
                  type="email"
                  value={modalForm.email}
                  onChange={e => setModalForm({ ...modalForm, email: e.target.value })}
                  placeholder="diretora@escola.com"
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Senha (mín. 8 caracteres) *</label>
                <input
                  type="password"
                  value={modalForm.senha}
                  onChange={e => setModalForm({ ...modalForm, senha: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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
                  className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
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
