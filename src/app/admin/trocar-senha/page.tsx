'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TrocarSenhaPage() {
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (senha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: senha,
      data: { force_password_reset: false },
    })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4" style={{ fontFamily: 'Sora, sans-serif' }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Trocar senha</h1>
          <p className="text-gray-500 mt-1 text-sm">Defina uma nova senha para continuar</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">

          {erro && (
            <div className="mb-4 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl text-[#f85149] text-sm flex items-center gap-2">
              <span>⚠</span> {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nova senha</label>
              <input
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres" required
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 placeholder-gray-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Confirmar senha</label>
              <input
                type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                placeholder="Repita a nova senha" required
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 placeholder-gray-600 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 transition-colors"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors text-sm"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
