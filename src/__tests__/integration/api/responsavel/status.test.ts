import { describe, it, expect, vi, beforeEach } from 'vitest'
import { qb, makeGetRequest } from '../../../helpers/mock-supabase'

let serverClientMock: any
let adminClientMock: any

vi.mock('@/lib/supabase/server', () => ({ createClient: () => serverClientMock }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => adminClientMock }))

const { GET } = await import('@/app/api/responsavel/status/route')

const RESPONSAVEL_ID = 'resp-uuid-1'
const HOJE = new Date().toISOString().split('T')[0]

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

describe('GET /api/responsavel/status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna 401 sem autenticação', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('retorna array vazio quando responsável não tem alunos vinculados', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: RESPONSAVEL_ID } } }) } }
    adminClientMock = makeAdminClient([
      { data: [] },  // sem vínculos
    ])

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alunos).toEqual([])
  })

  it('retorna alunos sem registro quando não há chamada hoje', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: RESPONSAVEL_ID } } }) } }
    adminClientMock = makeAdminClient([
      // vínculos com dados do aluno
      {
        data: [{
          aluno_id: 'aluno-1',
          alunos: { id: 'aluno-1', nome_completo: 'Pedro Silva', foto_url: null, matricula: '001', turmas: { nome: '5A' } },
        }],
      },
      // sem registros de chamada hoje
      { data: [] },
    ])

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alunos).toHaveLength(1)
    expect(body.alunos[0].nome_completo).toBe('Pedro Silva')
    expect(body.alunos[0].registro).toBeNull()
  })

  it('retorna aluno com registro de presença de hoje', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: RESPONSAVEL_ID } } }) } }
    adminClientMock = makeAdminClient([
      {
        data: [{
          aluno_id: 'aluno-1',
          alunos: { id: 'aluno-1', nome_completo: 'Ana Lima', foto_url: null, matricula: '002', turmas: { nome: '6B' } },
        }],
      },
      {
        data: [{
          aluno_id: 'aluno-1',
          status: 'presente',
          registrado_em: `${HOJE}T08:30:00.000Z`,
          observacao: null,
          chamadas: { aulas: { data: HOJE } },
        }],
      },
    ])

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alunos[0].registro.status).toBe('presente')
  })

  it('retorna múltiplos alunos vinculados', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: RESPONSAVEL_ID } } }) } }
    adminClientMock = makeAdminClient([
      {
        data: [
          { aluno_id: 'aluno-1', alunos: { id: 'aluno-1', nome_completo: 'Filho 1', foto_url: null, matricula: '001', turmas: { nome: '5A' } } },
          { aluno_id: 'aluno-2', alunos: { id: 'aluno-2', nome_completo: 'Filho 2', foto_url: null, matricula: '002', turmas: { nome: '6B' } } },
        ],
      },
      // registros: apenas aluno-1 presente
      {
        data: [{
          aluno_id: 'aluno-1',
          status: 'presente',
          registrado_em: `${HOJE}T08:30:00.000Z`,
          observacao: null,
          chamadas: { aulas: { data: HOJE } },
        }],
      },
    ])

    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alunos).toHaveLength(2)

    const filho1 = body.alunos.find((a: any) => a.id === 'aluno-1')
    const filho2 = body.alunos.find((a: any) => a.id === 'aluno-2')
    expect(filho1.registro?.status).toBe('presente')
    expect(filho2.registro).toBeNull()
  })

  it('ignora registros de dias anteriores', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: RESPONSAVEL_ID } } }) } }
    const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    adminClientMock = makeAdminClient([
      {
        data: [{
          aluno_id: 'aluno-1',
          alunos: { id: 'aluno-1', nome_completo: 'Lucas', foto_url: null, matricula: '003', turmas: { nome: '7C' } },
        }],
      },
      {
        data: [{
          aluno_id: 'aluno-1',
          status: 'presente',
          registrado_em: `${ontem}T08:30:00.000Z`,
          observacao: null,
          chamadas: { aulas: { data: ontem } }, // data é ontem
        }],
      },
    ])

    const res = await GET(makeGetRequest())
    const body = await res.json()
    // Registro de ontem não deve aparecer como registro de hoje
    expect(body.alunos[0].registro).toBeNull()
  })

  it('retorna apenas o registro mais recente quando há múltiplos no mesmo dia', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: RESPONSAVEL_ID } } }) } }
    adminClientMock = makeAdminClient([
      {
        data: [{
          aluno_id: 'aluno-1',
          alunos: { id: 'aluno-1', nome_completo: 'Carla', foto_url: null, matricula: '004', turmas: { nome: '8D' } },
        }],
      },
      {
        // Ordenado por registrado_em DESC — o primeiro é o mais recente
        data: [
          {
            aluno_id: 'aluno-1',
            status: 'presente',  // mais recente
            registrado_em: `${HOJE}T10:00:00.000Z`,
            observacao: null,
            chamadas: { aulas: { data: HOJE } },
          },
          {
            aluno_id: 'aluno-1',
            status: 'falta',  // mais antigo
            registrado_em: `${HOJE}T08:00:00.000Z`,
            observacao: null,
            chamadas: { aulas: { data: HOJE } },
          },
        ],
      },
    ])

    const res = await GET(makeGetRequest())
    const body = await res.json()
    // Deve retornar o mais recente (presente), não o mais antigo (falta)
    expect(body.alunos[0].registro.status).toBe('presente')
  })
})
