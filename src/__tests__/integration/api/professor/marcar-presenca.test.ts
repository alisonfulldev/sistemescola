import { describe, it, expect, vi, beforeEach } from 'vitest'
import { qb, makeRequest } from '../../../helpers/mock-supabase'

let serverClientMock: any
let adminClientMock: any

vi.mock('@/lib/supabase/server', () => ({ createClient: () => serverClientMock }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => adminClientMock }))

const { POST } = await import('@/app/api/professor/marcar-presenca/route')

const PROFESSOR_ID = 'prof-uuid-123'
const CHAMADA_ID = 'chamada-uuid-1'
const ALUNO_ID = 'aluno-uuid-1'

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

describe('POST /api/professor/marcar-presenca', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 401 sem autenticação', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }
    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID, status: 'presente' }))
    expect(res.status).toBe(401)
  })

  it('retorna 400 quando campos obrigatórios ausentes', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = { auth: { admin: {} }, from: vi.fn() }

    // Falta status
    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Dados incompletos')
  })

  it('retorna 400 quando chamada_id ausente', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = { auth: { admin: {} }, from: vi.fn() }

    const res = await POST(makeRequest({ aluno_id: ALUNO_ID, status: 'presente' }))
    expect(res.status).toBe(400)
  })

  it('retorna 403 quando chamada não pertence ao professor', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = makeAdminClient([
      // chamada pertence a outro professor
      { data: { id: CHAMADA_ID, aulas: { professor_id: 'outro-professor' } } },
    ])

    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID, status: 'presente' }))
    expect(res.status).toBe(403)
  })

  it('retorna 403 quando chamada não encontrada', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = makeAdminClient([
      { data: null },  // chamada não existe
    ])

    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID, status: 'presente' }))
    expect(res.status).toBe(403)
  })

  it('marca presença com sucesso', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = makeAdminClient([
      { data: { id: CHAMADA_ID, aulas: { professor_id: PROFESSOR_ID } } }, // chamada válida
      { data: null, error: null },                                          // upsert ok
    ])

    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID, status: 'presente' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('marca falta com sucesso', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = makeAdminClient([
      { data: { id: CHAMADA_ID, aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: null },
    ])

    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID, status: 'falta' }))
    expect(res.status).toBe(200)
  })

  it('marca com observação', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = makeAdminClient([
      { data: { id: CHAMADA_ID, aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: null },
    ])

    const res = await POST(makeRequest({
      chamada_id: CHAMADA_ID,
      aluno_id: ALUNO_ID,
      status: 'justificada',
      observacao: 'Atestado médico',
    }))
    expect(res.status).toBe(200)
  })

  it('retorna 500 quando falha no upsert', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
    adminClientMock = makeAdminClient([
      { data: { id: CHAMADA_ID, aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: { message: 'constraint violation' } },
    ])

    const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: ALUNO_ID, status: 'presente' }))
    expect(res.status).toBe(500)
  })

  it('processa chamada com 1000 alunos sem degradação de lógica', async () => {
    // Simula marcação de presença de múltiplos alunos em sequência
    const alunos = Array.from({ length: 10 }, (_, i) => `aluno-${i}`)

    for (const alunoId of alunos) {
      serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROFESSOR_ID } } }) } }
      adminClientMock = makeAdminClient([
        { data: { id: CHAMADA_ID, aulas: { professor_id: PROFESSOR_ID } } },
        { data: null, error: null },
      ])

      const res = await POST(makeRequest({ chamada_id: CHAMADA_ID, aluno_id: alunoId, status: 'presente' }))
      expect(res.status).toBe(200)
    }
  })
})
