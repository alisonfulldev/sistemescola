import { z } from 'zod'

// ─── TURMAS ───────────────────────────────────────────────────────────────
export const CreateTurmaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(100),
  serie: z.string().min(1, 'Série obrigatória').max(20),
  turno: z.enum(['matutino', 'vespertino', 'noturno']),
  turma_letra: z.string().min(1, 'Letra obrigatória').max(5),
  escola_id: z.string().uuid('escola_id deve ser UUID válido'),
  ativo: z.boolean().default(true),
})

export const UpdateTurmaSchema = CreateTurmaSchema.partial()

// ─── ALUNOS ───────────────────────────────────────────────────────────────
export const CreateAlunoSchema = z.object({
  nome_completo: z.string().min(3, 'Nome deve ter 3+ caracteres').max(200),
  data_nascimento: z.string().date('Data inválida').optional(),
  matricula: z.string().min(1, 'Matrícula obrigatória').max(50),
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  contato_responsavel: z.string().max(100).optional(),
  situacao: z.enum(['ativo', 'inativo', 'transferido']).default('ativo'),
  foto_url: z.string().url().optional(),
})

export const UpdateAlunoSchema = CreateAlunoSchema.partial()

// ─── PROFESSORES ──────────────────────────────────────────────────────────
export const CreateProfessorSchema = z.object({
  usuario_id: z.string().uuid('usuario_id deve ser UUID válido'),
  especialidade: z.string().max(100).optional(),
  escola_id: z.string().uuid('escola_id deve ser UUID válido'),
  ativo: z.boolean().default(true),
})

export const UpdateProfessorSchema = CreateProfessorSchema.partial()

// ─── DISCIPLINAS ──────────────────────────────────────────────────────────
export const CreateDisciplinaSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório').max(100),
  codigo: z.string().min(1, 'Código obrigatório').max(20),
  descricao: z.string().max(500).optional(),
  carga_horaria: z.number().int().positive().optional(),
  ativo: z.boolean().default(true),
})

export const UpdateDisciplinaSchema = CreateDisciplinaSchema.partial()

// ─── ANOS LETIVOS ─────────────────────────────────────────────────────────
export const CreateAnoLetivoSchema = z.object({
  ano: z.number().int().min(2000).max(2100),
  data_inicio: z.string().date('Data inválida'),
  data_fim: z.string().date('Data inválida'),
  ativo: z.boolean().default(true),
  nome: z.string().min(1, 'Nome obrigatório').max(100).optional(),
})

export const UpdateAnoLetivoSchema = CreateAnoLetivoSchema.partial()

// ─── AULAS (Professor → Disciplina → Turma) ───────────────────────────────
export const CreateAulaSchema = z.object({
  professor_id: z.string().uuid('professor_id deve ser UUID válido'),
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  data: z.string().date('Data inválida'),
  horario_inicio: z.string().time('Horário inválido'),
  horario_fim: z.string().time('Horário inválido'),
  conteudo_programatico: z.string().max(2000).optional(),
  atividades_desenvolvidas: z.string().max(2000).optional(),
  ativo: z.boolean().default(true),
})

export const UpdateAulaSchema = CreateAulaSchema.partial()
