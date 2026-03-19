import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export default async function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: usuario } = await admin
    .from('usuarios')
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

  if (usuario?.perfil !== 'responsavel') redirect('/login')

  async function logout() {
    'use server'
    const sb = createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0d1117]" style={{ fontFamily: 'Sora, sans-serif' }}>
      <header className="bg-[#161b22] border-b border-[#30363d] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏫</span>
            <span className="font-semibold text-white text-sm">Frequência Escolar</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">{usuario?.nome}</span>
            <form action={logout}>
              <button type="submit" className="text-xs text-gray-500 hover:text-[#f85149] transition-colors px-2 py-1 rounded">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
