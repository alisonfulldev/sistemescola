import { describe, it, expect, vi, beforeEach } from 'vitest'
import { qb, makeRequest } from '../../../helpers/mock-supabase'

let serverClientMock: any
let adminClientMock: any

vi.mock('@/lib/supabase/server', () => ({ createClient: () => serverClientMock }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => adminClientMock }))

const { POST } = await import('@/app/api/admin/criar-usuario/route')

const ADMIN_ID = 'admin-uuid-1'
const NEW_USER_ID = 'new-user-uuid-1'

function makeServerClientWithPerfil(perfil: string | null, userId = ADMIN_ID) {
  let fromCallCount = 0
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
    from: vi.fn().mockImplementation(() => {
      fromCallCount++
      if (fromCallCount === 1) {
        return qb({ data: { perfil }, error: null })
      }
      return qb({ data: null, error: null })
    }),
  }
}

function makeAdminClientForCreate(options: {
  createUserResult?: { data?: any; error?: any }
  upsertResult?: { data?: any; error?: any }
} = {}) {
  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(
          options.createUserResult ?? { data: { user: { id: NEW_USER_ID, email: 'novo@email.com' } }, error: null }
        ),
        deleteUser: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    },
    from: vi.fn().mockImplementation(() =>
      qb(options.upsertResult ?? { data: null, error: null })
    ),
  }
}

describe('POST /api/admin/criar-usuario', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Autenticação e autorização ─────────────────────────────────────────
  it('retorna 401 sem usuário autenticado', async () => {
    serverClientMock = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } }
    const res = await POST(makeRequest({ nome: 'Teste', email: 'a@b.com', senha: '12345678', perfil: 'responsavel' }))
    expect(res.status).toBe(401)
  })

  it('retorna 403 quando perfil não é admin', async () => {
    serverClientMock = makeServerClientWithPerfil('professor')
    const res = await POST(makeRequest({ nome: 'Teste', email: 'a@b.com', senha: '12345678', perfil: 'responsavel' }))
    expect(res.status).toBe(403)
  })

  it('retorna 403 quando perfil é secretaria', async () => {
    serverClientMock = makeServerClientWithPerfil('secretaria')
    const res = await POST(makeRequest({ nome: 'Teste', email: 'a@b.com', senha: '12345678', perfil: 'responsavel' }))
    expect(res.status).toBe(403)
  })

  // ── Validação de campos ────────────────────────────────────────────────
  it('retorna 400 quando nome ausente', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate()
    const res = await POST(makeRequest({ email: 'a@b.com', senha: '12345678', perfil: 'responsavel' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando email ausente', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate()
    const res = await POST(makeRequest({ nome: 'Teste', senha: '12345678', perfil: 'responsavel' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando senha tem menos de 8 caracteres', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate()
    const res = await POST(makeRequest({ nome: 'Teste', email: 'a@b.com', senha: '123', perfil: 'responsavel' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('8 caracteres')
  })

  it('retorna 400 para perfil inválido', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate()
    const res = await POST(makeRequest({ nome: 'Teste', email: 'a@b.com', senha: '12345678', perfil: 'hacker' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Perfil inválido')
  })

  // ── Happy path ─────────────────────────────────────────────────────────
  it('cria usuário responsável com sucesso', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate()

    const res = await POST(makeRequest({
      nome: 'João Responsável',
      email: 'joao@escola.com',
      senha: 'senha1234',
      perfil: 'responsavel',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(NEW_USER_ID)
  })

  it('cria usuário professor com sucesso', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate()

    const res = await POST(makeRequest({
      nome: 'Maria Professora',
      email: 'maria@escola.com',
      senha: 'senha5678',
      perfil: 'professor',
    }))
    expect(res.status).toBe(201)
  })

  // ── Email duplicado ────────────────────────────────────────────────────
  it('retorna 409 quando email já cadastrado', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    adminClientMock = makeAdminClientForCreate({
      createUserResult: { data: null, error: { message: 'User already registered' } },
    })

    const res = await POST(makeRequest({
      nome: 'Teste',
      email: 'existente@escola.com',
      senha: 'senha1234',
      perfil: 'responsavel',
    }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('já está cadastrado')
  })

  // ── Rollback ───────────────────────────────────────────────────────────
  it('faz rollback no Auth quando falha insert em public.usuarios', async () => {
    serverClientMock = makeServerClientWithPerfil('admin')
    const deleteUser = vi.fn().mockResolvedValue({ data: null, error: null })

    adminClientMock = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: NEW_USER_ID, email: 'novo@email.com' } },
            error: null,
          }),
          deleteUser,
        },
      },
      from: vi.fn().mockImplementation(() =>
        qb({ data: null, error: { message: 'FK violation' } })
      ),
    }

    const res = await POST(makeRequest({
      nome: 'Teste',
      email: 'teste@escola.com',
      senha: 'senha1234',
      perfil: 'responsavel',
    }))
    expect(res.status).toBe(500)
    // Garante que o usuário foi deletado do Auth para não ficar órfão
    expect(deleteUser).toHaveBeenCalledWith(NEW_USER_ID)
  })

  // ── Todos os perfis válidos ────────────────────────────────────────────
  it.each(['professor', 'secretaria', 'responsavel', 'admin'])(
    'aceita perfil válido: %s',
    async (perfil) => {
      serverClientMock = makeServerClientWithPerfil('admin')
      adminClientMock = makeAdminClientForCreate()

      const res = await POST(makeRequest({
        nome: 'Teste',
        email: `teste-${perfil}@escola.com`,
        senha: 'senha1234',
        perfil,
      }))
      expect(res.status).toBe(201)
    }
  )
})
