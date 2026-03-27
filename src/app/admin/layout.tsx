'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navGroups = [
  {
    label: 'Configuração inicial',
    items: [
      { href: '/admin/escola', label: 'Escola', icon: '🏛' },
      { href: '/admin/ano-letivo', label: 'Ano Letivo', icon: '📅' },
      { href: '/admin/calendario', label: 'Calendário Escolar', icon: '📆' },
      { href: '/admin/usuarios', label: 'Usuários', icon: '🔑' },
    ]
  },
  {
    label: 'Cadastros',
    items: [
      { href: '/admin/professores', label: 'Professores', icon: '👨‍🏫' },
      { href: '/admin/turmas', label: 'Turmas', icon: '🏫' },
      { href: '/admin/disciplinas', label: 'Disciplinas', icon: '📚' },
      { href: '/admin/alunos', label: 'Alunos', icon: '👥' },
      { href: '/admin/responsaveis', label: 'Responsáveis', icon: '👨‍👩‍👧' },
      { href: '/admin/aulas', label: 'Aulas', icon: '🗓' },
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
      if (data?.perfil !== 'admin' && data?.perfil !== 'diretor') return router.push('/login')
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
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-500 rounded-xl flex items-center justify-center text-white text-lg">⚙</div>
          <div>
            <div className="font-bold text-white text-sm">Gestão do Sistema</div>
            <div className="text-xs text-gray-400">Administração</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    isActive(item.href)
                      ? 'bg-purple-500/15 text-purple-300 font-medium'
                      : 'text-gray-400 hover:bg-[#21262d] hover:text-gray-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-[#30363d]">
          <Link href="/adm" onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm text-gray-500 hover:bg-[#21262d] hover:text-[#58a6ff]">
            <span>📊</span>
            <span>Acesso Rápido</span>
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-300">
            {usuario?.nome?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{usuario?.nome}</p>
            <p className="text-xs text-purple-400">Administrador</p>
          </div>
          <button onClick={logout} title="Sair" className="text-gray-500 hover:text-[#f85149] transition-colors p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="dark min-h-screen bg-[#0d1117] text-gray-100" style={{ fontFamily: 'Sora, sans-serif' }}>

      {/* ── Aviso de sessão expirando ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#161b22] border border-yellow-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⏱</span>
              <h3 className="text-white font-semibold">Sessão expirando</h3>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Sua sessão será encerrada em <strong className="text-yellow-400">1 minuto</strong> por inatividade.
              Clique em continuar para permanecer conectado.
            </p>
            <button onClick={resetTimer}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
              Continuar conectado
            </button>
          </div>
        </div>
      )}

      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#161b22] border-r border-[#30363d] z-20">
        <SidebarContent />
      </aside>

      <header className="lg:hidden sticky top-0 z-10 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 h-14">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold text-sm text-white">Gestão do Sistema</span>
        <div className="w-8" />
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-[#161b22] border-r border-[#30363d]">
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
