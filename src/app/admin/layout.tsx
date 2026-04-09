'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Settings, Calendar, Users, BookOpen, GraduationCap, ClipboardList, LogOut, Menu, X, FileText, Home } from 'lucide-react'

const navGroups = [
  {
    label: 'Configuração',
    items: [
      { href: '/admin/escola', label: 'Escola', icon: Settings },
      { href: '/admin/ano-letivo', label: 'Ano Letivo', icon: Calendar },
      { href: '/admin/calendario', label: 'Calendário', icon: ClipboardList },
      { href: '/admin/usuarios', label: 'Usuários', icon: Users },
    ]
  },
  {
    label: 'Acadêmico',
    items: [
      { href: '/admin/professores', label: 'Professores', icon: GraduationCap },
      { href: '/admin/turmas', label: 'Turmas', icon: BookOpen },
      { href: '/admin/disciplinas', label: 'Disciplinas', icon: BookOpen },
      { href: '/admin/alunos', label: 'Alunos', icon: Users },
      { href: '/admin/responsaveis', label: 'Responsáveis', icon: Users },
      { href: '/admin/aulas', label: 'Aulas', icon: Calendar },
    ]
  },
  {
    label: 'Relatórios',
    items: [
      { href: '/admin/diario', label: 'Diário Escolar', icon: FileText },
    ]
  },
]

const SESSION_TIMEOUT = 10 * 60 * 1000
const WARN_BEFORE = 1 * 60 * 1000

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [usuario, setUsuario] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const warnRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warnRef.current) clearTimeout(warnRef.current)
    setShowWarning(false)
    warnRef.current = setTimeout(() => setShowWarning(true), SESSION_TIMEOUT - WARN_BEFORE)
    timerRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }, SESSION_TIMEOUT)
  }, [router, supabase])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warnRef.current) clearTimeout(warnRef.current)
    }
  }, [resetTimer])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      if (user.user_metadata?.force_password_reset === true && pathname !== '/admin/trocar-senha') {
        return router.push('/admin/trocar-senha')
      }
      const { data } = await supabase.from('usuarios').select('nome, perfil').eq('id', user.id).single()
      if (!['admin', 'secretaria', 'diretor'].includes(data?.perfil)) return router.push('/login')
      setUsuario(data)
    }
    init()
  }, [router, supabase, pathname])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname.startsWith(href)

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="px-6 py-8 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-lg font-semibold">
            📚
          </div>
          <div>
            <h1 className="font-bold text-white text-base">Estudapp</h1>
            <p className="text-xs text-slate-400 font-medium">ADMINISTRAÇÃO</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Link
          href="/adm"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 border-b border-slate-700 pb-4 mb-4"
        >
          <Home className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>

        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-3">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
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
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">
            {usuario?.nome?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{usuario?.nome}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{usuario?.perfil || 'Admin'}</p>
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
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Sora, sans-serif' }}>

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-slate-900 font-semibold">Sessão expirando</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6">
              Sua sessão será encerrada em <strong>1 minuto</strong> por inatividade.
            </p>
            <button
              onClick={resetTimer}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Continuar conectado
            </button>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-72 z-20 border-r border-slate-200">
        <SidebarContent />
      </aside>

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
        <div className="w-8" />
      </header>

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
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="lg:ml-72 min-h-screen">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
