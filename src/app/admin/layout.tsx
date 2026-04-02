'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navGroups = [
  {
    label: 'Setup',
    items: [
      { href: '/admin/escola', label: 'Escola', icon: 'S' },
      { href: '/admin/ano-letivo', label: 'Ano Letivo', icon: 'A' },
      { href: '/admin/calendario', label: 'Calendário', icon: 'C' },
      { href: '/admin/usuarios', label: 'Usuários', icon: 'U' },
    ]
  },
  {
    label: 'Dados Acadêmicos',
    items: [
      { href: '/admin/professores', label: 'Professores', icon: 'P' },
      { href: '/admin/turmas', label: 'Turmas', icon: 'T' },
      { href: '/admin/disciplinas', label: 'Disciplinas', icon: 'D' },
      { href: '/admin/alunos', label: 'Alunos', icon: 'L' },
      { href: '/admin/responsaveis', label: 'Responsáveis', icon: 'R' },
      { href: '/admin/aulas', label: 'Aulas', icon: 'O' },
    ]
  },
]

const SESSION_TIMEOUT = 10 * 60 * 1000   // 10 min
const WARN_BEFORE    =  1 * 60 * 1000   //  1 min antes

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [usuario, setUsuario]         = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const timerRef  = useRef<NodeJS.Timeout | null>(null)
  const warnRef   = useRef<NodeJS.Timeout | null>(null)

  // ── Session timeout ───────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (timerRef.current)  clearTimeout(timerRef.current)
    if (warnRef.current)   clearTimeout(warnRef.current)
    setShowWarning(false)
    warnRef.current  = setTimeout(() => setShowWarning(true), SESSION_TIMEOUT - WARN_BEFORE)
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
      if (warnRef.current)  clearTimeout(warnRef.current)
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
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">SE</div>
          <div>
            <div className="font-bold text-white text-sm">Administração</div>
            <div className="text-xs text-slate-400">Sistema Escolar</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-4 mb-2">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold ${
                    isActive(item.href) ? 'bg-blue-500' : 'bg-slate-800'
                  }`}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-slate-800">
          <Link href="/adm" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm text-slate-400 hover:text-white hover:bg-slate-800">
            <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-semibold bg-slate-800">D</div>
            <span>Dashboard</span>
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">
            {usuario?.nome?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{usuario?.nome}</p>
            <p className="text-xs text-slate-500">Diretor</p>
          </div>
          <button onClick={logout} title="Sair" className="text-slate-500 hover:text-red-400 transition-colors p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>

      {/* ── Aviso de sessão expirando ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 border border-amber-500/30 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <h3 className="text-white font-semibold">Sessão expirando</h3>
            </div>
            <p className="text-slate-300 text-sm mb-5">
              Sua sessão será encerrada em <strong className="text-amber-400">1 minuto</strong> por inatividade.
            </p>
            <button onClick={resetTimer}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Continuar conectado
            </button>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 z-20">
        <SidebarContent />
      </aside>

      <header className="lg:hidden sticky top-0 z-10 bg-white border-b border-slate-200 flex items-center justify-between px-4 h-16">
        <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-900 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold text-slate-900">Administração</span>
        <div className="w-8" />
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full">
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
