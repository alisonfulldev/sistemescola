'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton({ email }: { email?: string }) {
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    if (email) {
      localStorage.setItem('responsavel_email', email)
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-gray-500 hover:text-[#f85149] transition-colors px-2 py-1 rounded"
    >
      Sair
    </button>
  )
}
