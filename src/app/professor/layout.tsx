'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Home, BookOpen, CheckCircle2, BarChart3, LogOut, Menu, X } from 'lucide-react'

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { href: '/professor', label: 'Dashboard', icon: Home },
    { href: '/professor/chamada', label: 'Chamada', icon: CheckCircle2 },
    { href: '/professor/notas', label: 'Notas', icon: BookOpen },
    { href: '/professor/avaliacoes', label: 'Avaliações', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static w-64 md:w-72 h-screen md:h-auto bg-slate-900 border-r border-slate-700 flex flex-col z-40 transition-transform md:translate-x-0 text-white ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="px-4 md:px-6 py-6 md:py-8 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-lg font-semibold">
                📚
              </div>
              <div>
                <div className="font-bold text-white text-xs md:text-sm">Estudapp</div>
                <div className="text-xs text-slate-400 font-medium">PROFESSOR</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden hover:bg-slate-800 p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-3 md:px-4 py-4 md:py-6 space-y-1">
          {menuItems.map(item => {
            const Icon = item.icon
            const isActive = false // Você pode adicionar lógica de rota ativa aqui
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 md:px-4 py-4 md:py-6 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2.5 md:py-2 rounded-lg text-xs md:text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
          <div className="px-4 md:px-8 h-14 md:h-16 flex items-center justify-between gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-slate-900 text-sm md:text-lg">Gestor Acadêmico</h2>
            <div className="text-xs md:text-sm text-slate-500 hidden sm:block">Sistema Escolar</div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
