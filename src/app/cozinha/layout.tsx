import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

  if (!usuario || !['cozinha', 'secretaria', 'admin'].includes(usuario.perfil)) {
    redirect('/login')
  }

  async function logout() {
    'use server'
    const sb = createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            <span className="font-semibold text-slate-900 text-sm">Cozinha Piloto</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{usuario?.nome}</span>
            <form action={logout}>
              <button type="submit" className="text-xs text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
