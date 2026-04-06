import { z } from 'zod'

// Schema para criar justificativa
export const CreateJustificativaSchema = z.object({
  aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
  data: z.string().date('data deve ser válida'),
  motivo: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
  documento: z.string().url().optional().nullable(),
  data_retorno: z.string().date().optional().nullable()
})

export type CreateJustificativa = z.infer<typeof CreateJustificativaSchema>

// Schema para responder justificativa
export const ResponderJustificativaSchema = z.object({
  justificativa_id: z.string().uuid('justificativa_id deve ser UUID válido'),
  status: z.enum(['aprovado', 'rejeitado', 'pendente']),
  observacao: z.string().optional().nullable()
})

export type ResponderJustificativa = z.infer<typeof ResponderJustificativaSchema>
