import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

export default async function ResponsavelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
      <header className="bg-white border-b border-blue-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-32">
              <Image
                src="/logo-estudapp-sidebar.png"
                alt="EstudApp"
                width={280}
                height={140}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-sm text-slate-600 hidden sm:block">{usuario?.nome}</span>
            <LogoutButton email={user.email} />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
