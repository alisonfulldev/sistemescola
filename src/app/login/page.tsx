'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">SE</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sistema Escolar</h1>
          <p className="text-blue-200">Gestão acadêmica integrada</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl p-8 shadow-2xl">

          {erro && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm font-medium">{erro}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Usuário</label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="seu.usuario"
                required
                autoComplete="username"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 mt-8"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">ou</span>
            </div>
          </div>

          <button
            onClick={() => setShowModalDiretor(true)}
            className="w-full py-2.5 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Configurar novo diretor
          </button>
        </div>

        <p className="text-center text-sm text-blue-200 mt-8">
          © 2026 Sistema Escolar — Todos os direitos reservados
        </p>
      </div>

      {/* Modal Criar Diretor */}
      {showModalDiretor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Configurar novo diretor</h3>
            <p className="text-slate-600 text-sm mb-6">Complete os dados do primeiro administrador do sistema.</p>

            {modalErro && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {modalErro}
              </div>
            )}

            {modalSucesso && (
              <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {modalSucesso}
              </div>
            )}

            <form onSubmit={criarDiretor} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo *</label>
                <input
                  type="text"
                  value={modalForm.nome}
                  onChange={e => setModalForm({ ...modalForm, nome: e.target.value })}
                  placeholder="Diretora Escolar"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={modalForm.email}
                  onChange={e => setModalForm({ ...modalForm, email: e.target.value })}
                  placeholder="diretora@escola.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Senha (mín. 8 caracteres) *</label>
                <input
                  type="password"
                  value={modalForm.senha}
                  onChange={e => setModalForm({ ...modalForm, senha: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-500 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors font-medium"
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
