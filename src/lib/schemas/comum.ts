import { z } from 'zod'

// Schema para criação de usuário
export const CreateUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  perfil: z.enum(['professor', 'admin', 'secretaria', 'diretor', 'responsavel', 'cozinha']),
  ativo: z.boolean().optional().default(true)
})

export type CreateUsuario = z.infer<typeof CreateUsuarioSchema>

// Schema para criar aluno
export const CreateAlunoSchema = z.object({
  nome_completo: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  numero_chamada: z.number().int().positive().optional(),
  foto_url: z.string().url().optional().nullable(),
  situacao: z.enum(['ativo', 'inativo', 'transferido']).default('ativo')
})

export type CreateAluno = z.infer<typeof CreateAlunoSchema>

// Schema para criar turma
export const CreateTurmaSchema = z.object({
  nome: z.string().min(2, 'Nome da turma deve ter no mínimo 2 caracteres'),
  ensino: z.string().min(1, 'Ensino é obrigatório'),
  turno: z.enum(['matutino', 'vespertino', 'noturno']),
  ativo: z.boolean().optional().default(true)
})

export type CreateTurma = z.infer<typeof CreateTurmaSchema>

// Schema para criar disciplina
export const CreateDisciplinaSchema = z.object({
  nome: z.string().min(3, 'Nome da disciplina deve ter no mínimo 3 caracteres'),
  codigo: z.string().min(1, 'Código é obrigatório').optional(),
  ativo: z.boolean().optional().default(true)
})

export type CreateDisciplina = z.infer<typeof CreateDisciplinaSchema>
