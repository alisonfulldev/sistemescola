import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, BookOpen, CheckCircle2, BarChart3, LogOut } from 'lucide-react'

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
    { href: '/professor/notas', label: 'Notas', icon: BookOpen },
    { href: '/professor/avaliacoes', label: 'Avaliações', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-blue-100 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-8 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-base">SE</span>
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Professor</div>
              <div className="text-xs text-blue-600 font-medium">{usuario?.nome}</div>
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
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-6 border-t border-blue-100 bg-gradient-to-r from-blue-50 to-transparent">
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-blue-100 sticky top-0 z-10 shadow-sm">
          <div className="px-8 h-16 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-lg">Gestor Acadêmico</h2>
            <div className="text-sm text-slate-500">Sistema Escolar</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
