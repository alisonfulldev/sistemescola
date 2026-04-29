import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'

// Rate limiting simples em memória por IP
// Protege contra burst de requisições na mesma instância serverless
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS: Record<string, number> = {
  '/api/auth/': 20,           // auth: 20 req/min
  '/api/admin/criar-usuario': 5,  // criar usuário: 5/min
  '/api/responsavel/justificar': 10, // justificar: 10/min
  '/api/push/subscribe': 10,      // push sub: 10/min
  default: 120,                   // demais APIs: 120 req/min
}

function getRateLimit(pathname: string): number {
  for (const [prefix, limit] of Object.entries(RATE_LIMIT_MAX_REQUESTS)) {
    if (prefix !== 'default' && pathname.startsWith(prefix)) return limit
  }
  return RATE_LIMIT_MAX_REQUESTS.default
}

function checkRateLimit(ip: string, pathname: string): boolean {
  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`
  const now = Date.now()
  const limit = getRateLimit(pathname)
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

// Limpa entradas expiradas periodicamente
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    rateLimitMap.forEach((entry, key) => {
      if (now > entry.resetAt) rateLimitMap.delete(key)
    })
  }, 5 * 60_000)
}

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
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
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

  // Rate limiting em rotas de API
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'

    if (!checkRateLimit(ip, pathname)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em instantes.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // Bloqueia payloads acima de 1MB em APIs (exceto upload de fotos)
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 1_000_000 && !pathname.includes('/storage/')) {
      return NextResponse.json({ error: 'Payload muito grande' }, { status: 413 })
    }

    return supabaseResponse
  }

  // Rotas públicas — deixa passar
  if (pathname === '/redefinir-senha' || pathname.startsWith('/auth/')) {
    return supabaseResponse
  }

  if (pathname === '/login' || pathname === '/') {
    if (user) {
      const adminClient = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: profile } = await adminClient
        .from('usuarios')
        .select('perfil')
        .eq('id', user.id)
        .single()

      const redirectMap: Record<string, string> = {
        professor: '/professor',
        secretaria: '/adm',
        admin: '/admin',
        diretor: '/admin',
        responsavel: '/responsavel',
        cozinha: '/cozinha',
      }
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
    '/((?!_next/static|_next/image|favicon.ico|api/portaria|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}
