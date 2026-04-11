'use client'

import { useState } from 'react'
import Image from 'next/image'
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="mb-8 flex justify-center">
            <Image
              src="/logo-estudapp-login.png"
              alt="EstudApp"
              width={280}
              height={140}
              className="h-40 w-auto"
              priority
            />
          </div>
          <p className="text-slate-400 text-sm">Plataforma educacional integrada</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-xl p-8 shadow-2xl border border-slate-700">

          {erro && (
            <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm font-medium">{erro}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Usuário</label>
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="seu.usuario"
                required
                autoComplete="username"
                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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

        <p className="text-center text-sm text-slate-500 mt-8">
          © 2026 Sistema Escolar — Todos os direitos reservados
        </p>
      </div>

    </div>
  )
}
