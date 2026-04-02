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
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👨‍🏫</span>
            <div>
              <div className="font-semibold text-slate-900 text-sm">Professor</div>
              <div className="text-xs text-slate-500">{usuario?.nome}</div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-slate-200">
          <form action={logout} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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
          <div className="px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span className="font-semibold text-slate-900">Sistema Escolar</span>
            </div>
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
