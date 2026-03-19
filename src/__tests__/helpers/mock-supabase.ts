import { vi } from 'vitest'

/**
 * Cria um query builder encadeável que simula o cliente Supabase.
 * Cada método retorna o próprio builder (para encadeamento).
 * O builder é "thenable" — pode ser aguardado diretamente (await from(...).delete().eq(...)).
 * .single() e .maybeSingle() também retornam o resultado configurado.
 */
export function qb(result: { data?: any; error?: any } = {}) {
  const resolved = {
    data: result.data !== undefined ? result.data : null,
    error: result.error !== undefined ? result.error : null,
  }

  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    // Torna o builder awaitable para padrões como: await client.from('x').delete().eq(...)
    then: (resolve: any, reject: any) => Promise.resolve(resolved).then(resolve, reject),
  }

  return builder
}

/**
 * Cria o mock do cliente Supabase do servidor (createClient de @/lib/supabase/server).
 * Recebe um map de respostas por ordem de chamada ao .from():
 *   fromResponses: [{ data, error }, ...] — cada item é retornado na sequência de from() calls
 */
export function mockServerClient(options: {
  user?: any
  fromResponses?: Array<{ data?: any; error?: any }>
} = {}) {
  const user = options.user ?? null
  const responses = options.fromResponses ?? []
  let callIndex = 0

  const fromFn = vi.fn().mockImplementation(() => {
    const result = responses[callIndex] ?? { data: null, error: null }
    callIndex++
    return qb(result)
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
    from: fromFn,
  }
}

/**
 * Cria o mock do cliente admin Supabase (createClient de @supabase/supabase-js com service_role).
 * fromResponses: respostas em sequência para chamadas .from()
 * authAdmin: mock para auth.admin.*
 */
export function mockAdminClient(options: {
  fromResponses?: Array<{ data?: any; error?: any }>
  authAdmin?: {
    createUser?: { data?: any; error?: any }
    deleteUser?: { data?: any; error?: any }
    updateUserById?: { data?: any; error?: any }
    listUsers?: { data?: any; error?: any }
  }
} = {}) {
  const responses = options.fromResponses ?? []
  const aa = options.authAdmin ?? {}
  let callIndex = 0

  const fromFn = vi.fn().mockImplementation(() => {
    const result = responses[callIndex] ?? { data: null, error: null }
    callIndex++
    return qb(result)
  })

  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(aa.createUser ?? { data: null, error: null }),
        deleteUser: vi.fn().mockResolvedValue(aa.deleteUser ?? { data: null, error: null }),
        updateUserById: vi.fn().mockResolvedValue(aa.updateUserById ?? { data: null, error: null }),
        listUsers: vi.fn().mockResolvedValue(aa.listUsers ?? { data: { users: [] }, error: null }),
      },
    },
    from: fromFn,
  }
}

/** Cria um NextRequest simulado */
export function makeRequest(
  body: object | null,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  url = 'http://localhost/api/test',
) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }) as any
}

export function makeGetRequest(url = 'http://localhost/api/test') {
  return new Request(url, { method: 'GET' }) as any
}
