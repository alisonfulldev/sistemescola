import { z } from 'zod'

// Schema para atualizar aluno
export const UpdateAlunoSchema = z.object({
  nome_completo: z.string().min(3).optional(),
  matricula: z.string().min(1).optional(),
  numero_chamada: z.number().int().positive().optional(),
  foto_url: z.string().url().optional().nullable(),
  situacao: z.enum(['ativo', 'inativo', 'transferido']).optional()
})

export type UpdateAluno = z.infer<typeof UpdateAlunoSchema>

// Schema para criar usuário (admin)
export const CreateAdminUsuarioSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  perfil: z.enum(['professor', 'admin', 'secretaria', 'diretor', 'responsavel', 'cozinha']),
  turma_id: z.string().uuid().optional().nullable(),
  ativo: z.boolean().optional().default(true)
})

export type CreateAdminUsuario = z.infer<typeof CreateAdminUsuarioSchema>

// Schema para criar usuário com senha
export const CreateUsuarioComSenhaSchema = z.object({
  email: z.string().email('Email inválido'),
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(200),
  senha: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
  perfil: z.enum(['professor', 'admin', 'secretaria', 'diretor', 'responsavel', 'cozinha']),
  turma_id: z.string().uuid().optional().nullable()
})

export type CreateUsuarioComSenha = z.infer<typeof CreateUsuarioComSenhaSchema>

// Schema para atualizar usuário
export const UpdateUsuarioSchema = z.object({
  user_id: z.string().uuid('user_id deve ser UUID válido'),
  nome: z.string().min(3).optional(),
  email: z.string().email().optional(),
  perfil: z.enum(['professor', 'admin', 'secretaria', 'diretor', 'responsavel', 'cozinha']).optional(),
  senha: z.string().min(8).max(128).optional(),
  turma_id: z.string().uuid().optional().nullable()
})

export type UpdateUsuario = z.infer<typeof UpdateUsuarioSchema>

// Schema para excluir usuário
export const DeleteUsuarioSchema = z.object({
  user_id: z.string().uuid('user_id deve ser UUID válido')
})

export type DeleteUsuario = z.infer<typeof DeleteUsuarioSchema>

// Schema para criar chamada
export const CreateChamadaSchema = z.object({
  aula_id: z.string().uuid('aula_id deve ser UUID válido'),
  data: z.string().date('data deve ser válida'),
  observacoes: z.string().optional().nullable()
})

export type CreateChamada = z.infer<typeof CreateChamadaSchema>
