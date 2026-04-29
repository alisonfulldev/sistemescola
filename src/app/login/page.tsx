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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('perfil')
      .eq('id', data.user.id)
      .single()

    const rotas: Record<string, string> = {
      professor: '/professor',
      secretaria: '/adm',
      admin: '/admin',
      responsavel: '/responsavel',
    }
    router.push(rotas[usuario?.perfil || ''] || '/professor')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Chamada Escolar
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Sistema digital de frequência com QR Code</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar no sistema</h2>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <span>⚠</span> {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all text-sm"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Entrando...</>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contas de demonstração</p>
            <div className="space-y-1.5 text-xs text-slate-600 font-mono">
              <div className="flex items-center gap-2"><span>👨‍💼</span><span>admin@escola.com</span><span className="text-slate-400">/ Admin@123456</span></div>
              <div className="flex items-center gap-2"><span>👩‍💼</span><span>secretaria@escola.com</span><span className="text-slate-400">/ Secr@123456</span></div>
              <div className="flex items-center gap-2"><span>👨‍🏫</span><span>prof.carlos@escola.com</span><span className="text-slate-400">/ Prof@123456</span></div>
              <div className="flex items-center gap-2"><span>👨‍👩‍👦</span><span>resp.roberto@escola.com</span><span className="text-slate-400">/ Resp@123456</span></div>
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">© 2026 Sistema de Chamada Escolar</p>
      </div>
    </div>
  )
}
