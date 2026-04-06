import { z } from 'zod'

// Schema para salvar notas bimestrais
export const SaveNotasSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  ano_letivo_id: z.string().uuid('ano_letivo_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      nota: z.union([
        z.number().min(0).max(10),
        z.string().transform((v) => (v === '' || v === null ? null : parseFloat(v))),
        z.null()
      ]).optional()
    }),
    { message: 'notas deve ser um array de objetos com aluno_id e nota' }
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

export type SaveNotas = z.infer<typeof SaveNotasSchema>

// Schema para carregar notas bimestrais (GET)
export const LoadNotasSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  ano_letivo_id: z.string().uuid()
})

export type LoadNotas = z.infer<typeof LoadNotasSchema>
