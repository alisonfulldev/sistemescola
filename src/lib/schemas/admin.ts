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

// Schema para criar chamada
export const CreateChamadaSchema = z.object({
  aula_id: z.string().uuid('aula_id deve ser UUID válido'),
  data: z.string().date('data deve ser válida'),
  observacoes: z.string().optional().nullable()
})

export type CreateChamada = z.infer<typeof CreateChamadaSchema>
