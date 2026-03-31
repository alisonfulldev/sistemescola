'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function RedefinirSenhaPage() {
  const [pronto, setPronto] = useState(false)
  const [verificando, setVerificando] = useState(true)
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function processarToken() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Tenta hash fragment (#access_token=...&type=recovery)
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (!error) {
          setPronto(true)
          setVerificando(false)
          return
        }
      }

      // Tenta PKCE code (?code=...)
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          setPronto(true)
          setVerificando(false)
          return
        }
      }

      setVerificando(false)
    }

    processarToken()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.auth.updateUser({ password: senha })

    if (error) {
      setErro(error.message || 'Erro ao redefinir senha.')
      setLoading(false)
      return
    }

    setOk(true)
    await supabase.auth.signOut()
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 border border-blue-200 rounded-2xl mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Nova Senha</h1>
          <p className="text-slate-500 mt-1 text-sm">Digite e confirme sua nova senha</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

          {verificando && (
            <div className="flex items-center justify-center gap-3 py-6 text-slate-500 text-sm">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              Verificando link...
            </div>
          )}

          {!verificando && !pronto && (
            <div className="text-center py-4">
              <p className="text-red-600 font-medium">Link inválido ou expirado.</p>
              <p className="text-slate-500 text-sm mt-1">Solicite um novo link ao administrador.</p>
            </div>
          )}

          {ok && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-green-600 font-bold">Senha redefinida!</p>
              <p className="text-slate-500 text-sm mt-1">Redirecionando para o login...</p>
            </div>
          )}

          {pronto && !ok && (
            <>
              {erro && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <span>⚠</span> {erro}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Nova senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="mín. 6 caracteres"
                    required
                    autoFocus
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    placeholder="repita a senha"
                    required
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Salvando...</>
                  ) : 'Salvar nova senha'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
