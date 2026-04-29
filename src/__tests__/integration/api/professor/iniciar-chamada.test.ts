import { describe, it, expect, vi, beforeEach } from 'vitest'
import { qb, makeRequest } from '../../../helpers/mock-supabase'

// ── Mocks dos módulos Supabase ────────────────────────────────────────────
let serverClientMock: any
let adminClientMock: any

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => serverClientMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => adminClientMock,
}))

// Importa o handler DEPOIS dos mocks
const { POST } = await import('@/app/api/professor/iniciar-chamada/route')

// ── Helpers ───────────────────────────────────────────────────────────────
const PROFESSOR_ID = 'prof-uuid-123'
const TURMA_ID = 'turma-uuid-456'
const DISCIPLINA_ID = 'disc-uuid-789'

function makeServerClient(user: any) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn(),
  }
}

function makeAdminClient(responses: Array<{ data?: any; error?: any }>) {
  let idx = 0
  return {
    auth: { admin: {} },
    from: vi.fn().mockImplementation(() => {
      const r = responses[idx++] ?? { data: null, error: null }
      return qb(r)
    }),
  }
}

const BASE_BODY = { turma_id: TURMA_ID, disciplina_id: DISCIPLINA_ID }

// ── Testes ────────────────────────────────────────────────────────────────
describe('POST /api/professor/iniciar-chamada', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 401 quando não autenticado', async () => {
    serverClientMock = makeServerClient(null)
    const res = await POST(makeRequest(BASE_BODY))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('retorna 400 quando turma_id ausente', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    const res = await POST(makeRequest({ disciplina_id: DISCIPLINA_ID }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando disciplina_id ausente', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    const res = await POST(makeRequest({ turma_id: TURMA_ID }))
    expect(res.status).toBe(400)
  })

  it('retorna 403 quando disciplina não pertence ao professor', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: null }, // disciplina não encontrada para este professor
    ])

    const res = await POST(makeRequest(BASE_BODY))
    expect(res.status).toBe(403)
  })

  it('retorna chamada_id quando aula já existe hoje', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },              // disciplina válida
      { data: { id: 'aula-existente' } },            // aula existente hoje
      { data: { id: 'chamada-existente' } },         // chamada existente
    ])

    const res = await POST(makeRequest(BASE_BODY))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.chamada_id).toBe('chamada-existente')
    expect(body.aula_id).toBe('aula-existente')
  })

  it('cria aula e chamada quando não existem', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },     // disciplina válida
      { data: null },                       // sem aula hoje
      { data: { id: 'nova-aula' } },        // insert aula
      { data: null },                       // sem chamada existente
      { data: { id: 'nova-chamada' } },     // insert chamada
    ])

    const res = await POST(makeRequest(BASE_BODY))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.chamada_id).toBe('nova-chamada')
    expect(body.aula_id).toBe('nova-aula')
  })

  it('retorna 500 quando falha ao criar aula', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },                              // disciplina válida
      { data: null },                                               // sem aula hoje
      { data: null, error: { message: 'DB error' } },               // falha no insert
    ])

    const res = await POST(makeRequest(BASE_BODY))
    expect(res.status).toBe(500)
  })

  it('retorna chamada existente sem criar duplicata', async () => {
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },                                          // disciplina válida
      { data: { id: 'aula-1' } },                                               // aula hoje
      { data: { id: 'chamada-duplicada', status: 'em_andamento' } },            // chamada já existe
    ])

    const res = await POST(makeRequest(BASE_BODY))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.chamada_id).toBe('chamada-duplicada')
    expect(body.aula_id).toBe('aula-1')
    expect(adminClientMock.from).toHaveBeenCalledTimes(3)
  })
})
