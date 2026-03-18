import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rotas públicas e API — deixa passar sem redirect
  if (pathname.startsWith('/api/') || pathname.startsWith('/portaria')) {
    return supabaseResponse
  }

  if (pathname === '/login' || pathname === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('id', user.id)
        .single()

      const redirectMap: Record<string, string> = {
        professor: '/professor',
        secretaria: '/adm',
        admin: '/admin',
        responsavel: '/responsavel',
      }
      // Só redireciona se encontrar um perfil válido — evita loop se usuário não existe na tabela
      const dest = redirectMap[profile?.perfil || '']
      if (dest) return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  // Requer autenticação
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/portaria|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
