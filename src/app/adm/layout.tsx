'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, ClipboardList, BarChart3, BookOpen, Users, AlertCircle, FileText, Settings, Menu, X, LogOut, Bell } from 'lucide-react'

const nav = [
  { href: '/adm', label: 'Dashboard', icon: Home, exact: true },
  { href: '/adm/chamadas', label: 'Chamadas', icon: ClipboardList },
  { href: '/adm/frequencia', label: 'Frequência', icon: BarChart3 },
  { href: '/adm/notas', label: 'Notas', icon: BookOpen },
  { href: '/adm/alunos', label: 'Alunos', icon: Users },
  { href: '/adm/alertas', label: 'Alertas', icon: AlertCircle },
  { href: '/adm/justificativas', label: 'Justificativas', icon: FileText },
]

export default function AdmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [usuario, setUsuario] = useState<any>(null)
  const [badgeAlertas, setBadgeAlertas] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('usuarios').select('nome, perfil').eq('id', user.id).single()
      if (!['secretaria', 'admin', 'diretor'].includes(data?.perfil || '')) return router.push('/login')
      setUsuario(data)
      const { count } = await supabase.from('alertas').select('*', { count: 'exact', head: true }).eq('lido', false)
      setBadgeAlertas(count || 0)
    }
    init()

    const ch = supabase.channel('badge-alertas')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, () => setBadgeAlertas(p => p + 1))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [router, supabase])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string, exact = false) => exact ? pathname === href : pathname.startsWith(href)

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-lg font-semibold">
            📚
          </div>
          <div>
            <h1 className="font-bold text-white text-base">Estudapp</h1>
            <p className="text-xs text-slate-400">{usuario?.perfil ? usuario.perfil.toUpperCase() : 'SISTEMA'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {nav.map(item => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.href === '/adm/alertas' && badgeAlertas > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold rounded-full min-w-[22px] h-5 flex items-center justify-center px-1.5">
                  {badgeAlertas > 9 ? '9+' : badgeAlertas}
                </span>
              )}
            </Link>
          )
        })}

        {/* Bottom Links */}
        <div className="pt-4 mt-auto space-y-1 border-t border-slate-700">
          {['admin', 'diretor'].includes(usuario?.perfil || '') && (
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <Settings className="w-4 h-4" />
              <span>Cadastros</span>
            </Link>
          )}
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">
            {usuario?.nome?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{usuario?.nome}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{usuario?.perfil || 'Usuário'}</p>
          </div>
          <button
            onClick={logout}
            title="Sair"
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-800 rounded-lg flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-72 z-20 border-r border-slate-200">
        <Sidebar />
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-16 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-slate-600 hover:text-slate-900 p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">SE</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">Sistema Escolar</span>
        </div>
        <Link href="/adm/alertas" className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
          {badgeAlertas > 0 && (
            <span className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {badgeAlertas > 9 ? '9' : badgeAlertas}
            </span>
          )}
        </Link>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 h-full overflow-y-auto">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <Sidebar />
          </aside>
        </div>
      )}

      <main className="lg:ml-72 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
