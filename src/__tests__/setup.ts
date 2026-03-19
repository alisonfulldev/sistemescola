import { vi } from 'vitest'

// Variáveis de ambiente necessárias para os testes
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.RECOVERY_SECRET = 'test-recovery-secret'
process.env.VAPID_PUBLIC_KEY = 'test-vapid-public'
process.env.VAPID_PRIVATE_KEY = 'test-vapid-private'

// Mock next/headers (não disponível fora do contexto de request do Next.js)
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockReturnValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    get: vi.fn(),
  }),
}))
