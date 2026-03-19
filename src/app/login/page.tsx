'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    // Busca perfil via API (service_role bypassa RLS)
    const res = await fetch('/api/auth/perfil')
    const { perfil } = res.ok ? await res.json() : {}

    const rotas: Record<string, string> = {
      professor: '/professor',
      secretaria: '/adm',
      admin: '/admin',
      responsavel: '/responsavel',
    }
    router.push(rotas[perfil || ''] || '/professor')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#39d353]/10 border border-[#39d353]/30 rounded-2xl mb-4">
            <span className="text-2xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Chamada Escolar</h1>
          <p className="text-gray-500 mt-1 text-sm">Sistema digital de frequência escolar</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">

          {erro && (
            <div className="mb-4 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl text-[#f85149] text-sm flex items-center gap-2">
              <span>⚠</span> {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 placeholder-gray-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#39d353] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Senha</label>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 placeholder-gray-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#39d353] transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#39d353] hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Entrando...</>
              ) : 'Entrar'}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-gray-700 mt-6">© 2026 Sistema de Chamada Escolar</p>
      </div>
    </div>
  )
}
