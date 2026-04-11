import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default async function CozinhaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
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
    const sb = await createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
      <header className="bg-white border-b border-blue-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-32">
              <Image
                src="/logo-estudapp-sidebar.png"
                alt="EstudApp"
                width={200}
                height={80}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-sm text-slate-600 hidden sm:block">{usuario?.nome}</span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
