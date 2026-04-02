import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Book, CheckCircle2, Home, LogOut } from 'lucide-react'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

  if (usuario?.perfil !== 'professor') redirect('/login')

  async function logout() {
    'use server'
    const sb = createClient()
    await sb.auth.signOut()
    redirect('/login')
  }

  const menuItems = [
    { href: '/professor', label: 'Dashboard', icon: Home },
    { href: '/professor/chamada', label: 'Chamada', icon: CheckCircle2 },
    { href: '/professor/notas', label: 'Notas', icon: Book },
    { href: '/professor/avaliacoes', label: 'Avaliações', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SE</span>
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Professor</div>
              <div className="text-xs text-slate-400">{usuario?.nome}</div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-slate-800">
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-8 h-16 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-lg">Gestor Acadêmico</h2>
            <div className="text-sm text-slate-500">Sistema Escolar</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
