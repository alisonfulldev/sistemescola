'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
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

return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="w-14 h-14 bg-blue-600 rounded-lg shadow-md flex items-center justify-center text-white font-bold text-xl">
              📚
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">Estudapp</h1>
          <p className="text-slate-600 text-sm">Plataforma educacional integrada</p>
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
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 mt-8"
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

        </div>

        <p className="text-center text-sm text-blue-200 mt-8">
          © 2026 Sistema Escolar — Todos os direitos reservados
        </p>
      </div>

    </div>
  )
}
