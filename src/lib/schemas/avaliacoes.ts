import { z } from 'zod'

// Schema para criar avaliação
export const CreateAvaliacaoSchema = z.object({
  aula_id: z.string().uuid('aula_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  titulo: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  tipo: z.enum(['prova', 'trabalho', 'projeto', 'participacao', 'seminario', 'lista_exercicios', 'outra']),
  data_aplicacao: z.string().date('data_aplicacao deve ser uma data válida'),
  data_entrega: z.string().date().optional().nullable(),
  valor_maximo: z.number().min(1).default(10),
  peso: z.number().min(0).optional().default(1),
  descricao: z.string().optional().nullable()
})

export type CreateAvaliacao = z.infer<typeof CreateAvaliacaoSchema>

// Schema para salvar notas de avaliação
export const SaveAvaliacaoNotasSchema = z.object({
  id: z.string().uuid('ID da avaliação deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      nota: z.union([
        z.number().min(0).max(99.9),
        z.string().transform((v) => (v === '' || v === null ? null : parseFloat(v))),
        z.null()
      ]).optional()
    }),
    { message: 'notas deve ser um array de objetos com aluno_id e nota' }
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

export type SaveAvaliacaoNotas = z.infer<typeof SaveAvaliacaoNotasSchema>
