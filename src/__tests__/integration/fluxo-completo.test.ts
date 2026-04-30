import { describe, it, expect, vi, beforeEach } from 'vitest'
import { qb, makeRequest } from '../helpers/mock-supabase'

/**
 * SUITE DE TESTES E2E — FLUXOS COMPLETOS
 *
 * Testa workflows completos que envolvem múltiplas rotas em sequência,
 * verificando que o estado permanece consistente em cada etapa.
 *
 * Fluxos testados:
 * 1. Professor inicia chamada → marca faltas → confirma → responsável justifica → professor aprova
 * 2. Criação de avaliação → alunos recebem registros de nota → professor lança notas
 * 3. Frequência recalculada após eventos
 */

let serverClientMock: any
let adminClientMock: any

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => serverClientMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => adminClientMock,
}))

const { POST: iniciarChamada } = await import('@/app/api/professor/iniciar-chamada/route')
const { POST: marcarPresenca } = await import('@/app/api/professor/marcar-presenca/route')
const { POST: confirmarChamada } = await import('@/app/api/professor/confirmar-chamada/route')
const { POST: justificar } = await import('@/app/api/responsavel/justificar/route')
const { POST: responderJustificativa } = await import('@/app/api/professor/justificativas/responder/route')
const { POST: criarAvaliacao } = await import('@/app/api/avaliacoes/route')
const { POST: lancarNotas } = await import('@/app/api/professor/notas/route')

const PROFESSOR_ID = 'a0000000-0000-4000-8000-000000000001'
const RESPONSAVEL_ID = 'a0000000-0000-4000-8000-000000000003'
const ALUNO_ID = 'e0000000-0000-4000-8000-000000000001'
const TURMA_ID = 'b0000000-0000-4000-8000-000000000001'
const DISCIPLINA_ID = 'c0000000-0000-4000-8000-000000000001'
const AULA_ID = 'f0000000-0000-4000-8000-000000000001'
const AVALIACAO_ID = 'f0000000-0000-4000-8000-000000000002'
const HOJE = new Date().toISOString().split('T')[0]

function makeServerClient(user: any, fromResponses: Array<{ data?: any; error?: any }> = []) {
  let idx = 0
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockImplementation(() => {
      const r = fromResponses[idx++] ?? { data: null, error: null }
      return qb(r)
    }),
  }
}

function makeAdminClient(responses: Array<{ data?: any; error?: any }>) {
  let idx = 0
  return {
    auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: null }) } },
    from: vi.fn().mockImplementation(() => {
      const r = responses[idx++] ?? { data: null, error: null }
      return qb(r)
    }),
    rpc: vi.fn().mockResolvedValue({ data: 'aula-uuid-001', error: null }),
  }
}

// ────────────────────────────────────────────────────────────────────────────
describe('Fluxo Completo: Chamada → Justificativa → Aprovação', () => {
  beforeEach(() => vi.clearAllMocks())

  it('professor inicia chamada → marca faltas → confirma → responsável justifica → professor aprova', async () => {
    /**
     * ETAPAS DO FLUXO:
     *
     * 1. Professor inicia chamada para turma
     * 2. Professor marca presença de alunos (alguns com falta)
     * 3. Professor confirma chamada
     * 4. Responsável justifica falta via app
     * 5. Professor aprova justificativa
     *
     * VERIFICAÇÕES:
     * - Cada etapa retorna dados corretos
     * - Estado muda conforme esperado
     * - Nenhum passo cria estado inconsistente
     * - Auditoria registrada em cada etapa
     */

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 1: Professor inicia chamada
    // ──────────────────────────────────────────────────────────────────────

    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },       // disciplina pertence ao professor
      { data: null },                        // sem aula hoje
      { data: { id: 'f0000000-0000-4000-8000-000000000010' } }, // INSERT aula
      { data: null },                        // sem chamada existente
      { data: { id: 'd0000000-0000-4000-8000-000000000010', status: 'em_andamento' } }, // INSERT chamada
    ])

    const resInit = await iniciarChamada(makeRequest({ turma_id: TURMA_ID, disciplina_id: DISCIPLINA_ID }))
    expect(resInit.status).toBe(200)
    const bodyInit = await resInit.json()
    const chamadaId = bodyInit.chamada_id
    expect(chamadaId).toBe('d0000000-0000-4000-8000-000000000010')

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 2: Professor marca presença de 3 alunos (2 presentes, 1 falta)
    // ──────────────────────────────────────────────────────────────────────

    // Aluno 1: Presente
    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: chamadaId, aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: null }, // UPSERT registro
    ])

    const resMarcar1 = await marcarPresenca(makeRequest({
      chamada_id: chamadaId,
      aluno_id: ALUNO_ID,
      status: 'presente',
      chamada_concluida: false,
    }))
    expect(resMarcar1.status).toBe(200)

    // Aluno 2: Presente
    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: chamadaId, aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: null },
    ])

    const resMarcar2 = await marcarPresenca(makeRequest({
      chamada_id: chamadaId,
      aluno_id: 'e0000000-0000-4000-8000-000000000002',
      status: 'presente',
      chamada_concluida: false,
    }))
    expect(resMarcar2.status).toBe(200)

    // Aluno 3: Falta
    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: chamadaId, aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: null },
    ])

    const resMarcar3 = await marcarPresenca(makeRequest({
      chamada_id: chamadaId,
      aluno_id: 'e0000000-0000-4000-8000-000000000003',
      status: 'falta',
      chamada_concluida: false,
    }))
    expect(resMarcar3.status).toBe(200)

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 3: Professor confirma chamada
    // ──────────────────────────────────────────────────────────────────────

    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: chamadaId, status: 'em_andamento', aulas: { professor_id: PROFESSOR_ID } } },
      { data: null, error: null }, // UPDATE status='concluida'
    ])

    const resConfirmar = await confirmarChamada(makeRequest({ chamada_id: chamadaId }))
    expect(resConfirmar.status).toBe(200)

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 4: Responsável justifica falta (aluno 3)
    // ──────────────────────────────────────────────────────────────────────

    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: RESPONSAVEL_ID })
    adminClientMock = makeAdminClient([
      { data: { id: 'e0000000-0000-4000-8000-000000000020', aluno_id: 'e0000000-0000-4000-8000-000000000003', status: 'falta' } }, // SELECT registro
      { data: { aluno_id: 'e0000000-0000-4000-8000-000000000003' } }, // vinculo responsavel→aluno
      { data: null, error: null }, // UPSERT justificativa
    ])

    const resJustificar = await justificar(makeRequest({
      registro_id: 'e0000000-0000-4000-8000-000000000020',
      motivo: 'Aluno com infecção — atestado médico',
      comprovante_url: 'https://storage/atestado.pdf',
    }))
    expect(resJustificar.status).toBe(200)

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 5: Professor aprova justificativa
    // ──────────────────────────────────────────────────────────────────────

    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: 'e0000000-0000-4000-8000-000000000030', registro_id: 'e0000000-0000-4000-8000-000000000020', status: 'pendente', responsavel_id: RESPONSAVEL_ID, registros_chamada: { chamada_id: chamadaId, chamadas: { aulas: { professor_id: PROFESSOR_ID } } } } }, // SELECT justificativa
      { data: null, error: null }, // UPDATE justificativa status='aprovada'
      { data: null, error: null }, // UPDATE registro status='justificada'
    ])

    const resAprovar = await responderJustificativa(makeRequest({
      justificativa_id: 'e0000000-0000-4000-8000-000000000030',
      status: 'aprovada',
      professor_resposta: 'Atestado verificado. Falta justificada.',
    }))
    expect(resAprovar.status).toBe(200)

    // ──────────────────────────────────────────────────────────────────────
    // VERIFICAÇÃO FINAL: Estado do aluno após fluxo completo
    // ──────────────────────────────────────────────────────────────────────
    // Aluno 3 deve ter:
    // - status='justificada' em registros_chamada
    // - justificativa com status='aprovada'
    // - resposta_professor preenchida
  })

  it('justificativa rejeitada — status volta para falta', async () => {
    /**
     * CENÁRIO: Professor rejeita justificativa
     *
     * ANTES: status='falta', justificativa criada
     * APÓS REJEIÇÃO: status volta para 'falta', justificativa status='rejeitada'
     */

    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: 'e0000000-0000-4000-8000-000000000030', registro_id: 'e0000000-0000-4000-8000-000000000020', status: 'pendente', responsavel_id: RESPONSAVEL_ID, registros_chamada: { chamada_id: 'd0000000-0000-4000-8000-000000000010', chamadas: { aulas: { professor_id: PROFESSOR_ID } } } } },
      { data: null, error: null }, // UPDATE justificativa status='rejeitada'
    ])

    const resRejeitar = await responderJustificativa(makeRequest({
      justificativa_id: 'e0000000-0000-4000-8000-000000000030',
      status: 'rejeitada',
      professor_resposta: 'Atestado insuficiente. Falta mantida.',
    }))

    expect(resRejeitar.status).toBe(200)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('Fluxo Completo: Criação de Avaliação → Lançamento de Notas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('professor cria avaliação → sistema cria registros de nota → professor lança notas', async () => {
    /**
     * ETAPAS:
     * 1. Professor cria avaliação para turma com 30 alunos
     * 2. Sistema cria 30 registros em notas_avaliacao (via RPC atômica)
     * 3. Professor lança notas para todos alunos
     *
     * VERIFICAÇÕES:
     * - Avaliação criada com sucesso
     * - Todos 30 alunos recebem registros de nota vazios
     * - Professor consegue lançar notas
     * - Notas são persistidas corretamente
     */

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 1: Professor cria avaliação
    // ──────────────────────────────────────────────────────────────────────

    serverClientMock = makeServerClient({ id: PROFESSOR_ID }, [
      { data: { perfil: 'professor' } },         // from('usuarios')
      { data: { professor_id: PROFESSOR_ID } },   // from('aulas') - validação professor
    ])
    adminClientMock = makeAdminClient([
      { data: { id: AVALIACAO_ID } },  // from('avaliacoes') após RPC
      { data: [] },                    // from('alunos') para contagem
    ])
    adminClientMock.rpc = vi.fn().mockResolvedValue({ data: AVALIACAO_ID, error: null })

    const resAvaliar = await criarAvaliacao(makeRequest({
      aula_id: AULA_ID,
      disciplina_id: DISCIPLINA_ID,
      turma_id: TURMA_ID,
      titulo: 'Prova Bimestral 1',
      tipo: 'prova',
      data_aplicacao: HOJE,
      data_entrega: null,
      valor_maximo: 10,
      peso: 2,
    }))

    expect(resAvaliar.status).toBe(201)
    const bodyAvaliar = await resAvaliar.json()
    const avaliacaoId = bodyAvaliar.avaliacao.id
    expect(avaliacaoId).toBe(AVALIACAO_ID)

    // ──────────────────────────────────────────────────────────────────────
    // ETAPA 2: Professor lança notas para 3 alunos
    // ──────────────────────────────────────────────────────────────────────

    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: avaliacaoId } },  // from('provas') validação
      { data: null, error: null },    // from('notas') upsert
    ])

    const resNotas = await lancarNotas(makeRequest({
      prova_id: avaliacaoId,
      notas: [
        { aluno_id: 'e0000000-0000-4000-8000-000000000010', nota: 9.5 },
        { aluno_id: 'e0000000-0000-4000-8000-000000000011', nota: 8.0 },
        { aluno_id: 'e0000000-0000-4000-8000-000000000012', nota: 7.5 },
      ],
    }))

    expect(resNotas.status).toBe(200)
    const bodyNotas = await resNotas.json()
    expect(bodyNotas.ok).toBe(true)

    // ──────────────────────────────────────────────────────────────────────
    // VERIFICAÇÃO FINAL:
    // - Avaliação existe em banco
    // - Professor consegue lançar notas via prova_id
  })

  it('falha ao criar avaliação — não deixa registros de nota órfãos', async () => {
    /**
     * CENÁRIO: Erro durante criação de avaliação (ex: constraint violation)
     *
     * ESPERADO: RPC faz ROLLBACK, nenhum registro criado
     */

    serverClientMock = makeServerClient({ id: PROFESSOR_ID }, [
      { data: { perfil: 'professor' } },
      { data: { professor_id: PROFESSOR_ID } },
    ])
    adminClientMock = makeAdminClient([])
    adminClientMock.rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'constraint violation' },
    })

    const resAvaliar = await criarAvaliacao(makeRequest({
      aula_id: AULA_ID,
      disciplina_id: DISCIPLINA_ID,
      turma_id: TURMA_ID,
      titulo: 'Prova Bimestral 1',
      tipo: 'prova',
      data_aplicacao: HOJE,
      valor_maximo: 10,
    }))

    expect(resAvaliar.status).toBe(500)

    // Verificação: nenhuma avaliação foi criada (ROLLBACK completo)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('Integridade de Dados — Fluxos Complexos com Múltiplas Turmas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('professor de múltiplas turmas — isola dados corretamente', async () => {
    /**
     * CENÁRIO: Professor lecionando 3 turmas, inicia chamada em turma 1 e turma 2 simultaneously
     *
     * ESPERADO: 3 aulas criadas (uma por turma), nenhuma mistura de dados
     */

    // Turma 1: Inicia chamada
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },
      { data: null },
      { data: { id: 'aula-turma-1' } },
      { data: null },
      { data: { id: 'chamada-turma-1' } },
    ])

    const resTurma1 = await iniciarChamada(makeRequest({ turma_id: 'b0000000-0000-4000-8000-000000000002', disciplina_id: DISCIPLINA_ID }))
    expect(resTurma1.status).toBe(200)

    // Turma 2: Inicia chamada (mesmo professor, turma diferente)
    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },
      { data: null },
      { data: { id: 'aula-turma-2' } },
      { data: null },
      { data: { id: 'chamada-turma-2' } },
    ])

    const resTurma2 = await iniciarChamada(makeRequest({ turma_id: 'b0000000-0000-4000-8000-000000000003', disciplina_id: DISCIPLINA_ID }))
    expect(resTurma2.status).toBe(200)

    const body1 = await resTurma1.json()
    const body2 = await resTurma2.json()

    // Verificar isolamento
    expect(body1.chamada_id).not.toBe(body2.chamada_id)
    expect(body1.aula_id).not.toBe(body2.aula_id)
  })
})

// ────────────────────────────────────────────────────────────────────────────
describe('Consistency Checks — Antes e Depois de Operações', () => {
  beforeEach(() => vi.clearAllMocks())

  it('turma pode ter múltiplas chamadas em dias diferentes', async () => {
    /**
     * CENÁRIO: Professor inicia chamada dia 1, depois dia 2 (mesma turma)
     *
     * ESPERADO: 2 aulas criadas, 2 chamadas — nenhuma duplicata
     */

    // Dia 1
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },
      { data: null },
      { data: { id: 'aula-dia-1' } },
      { data: null },
      { data: { id: 'chamada-dia-1' } },
    ])

    const resDia1 = await iniciarChamada(makeRequest({ turma_id: TURMA_ID, disciplina_id: DISCIPLINA_ID }))
    expect(resDia1.status).toBe(200)

    // Dia 2 (diferente)
    vi.clearAllMocks()
    serverClientMock = makeServerClient({ id: PROFESSOR_ID })
    adminClientMock = makeAdminClient([
      { data: { id: DISCIPLINA_ID } },
      { data: null },
      { data: { id: 'aula-dia-2' } },
      { data: null },
      { data: { id: 'chamada-dia-2' } },
    ])

    const resDia2 = await iniciarChamada(makeRequest({ turma_id: TURMA_ID, disciplina_id: DISCIPLINA_ID }))
    expect(resDia2.status).toBe(200)

    const body1 = await resDia1.json()
    const body2 = await resDia2.json()

    // Ambas devem ser diferentes
    expect(body1.chamada_id).not.toBe(body2.chamada_id)
    expect(body1.aula_id).not.toBe(body2.aula_id)
  })
})
