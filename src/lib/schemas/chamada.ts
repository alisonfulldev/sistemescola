import { z } from 'zod'

// Schema para marcar presença
export const MarcarPresencaSchema = z.object({
  chamada_id: z.string().uuid('chamada_id deve ser UUID válido'),
  aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
  status: z.enum(['presente', 'falta', 'justificada']),
  observacao: z.string().optional().nullable(),
  motivo_alteracao: z.string().optional().nullable(),
  horario_evento: z.string().time().optional().nullable(),
  status_anterior: z.enum(['presente', 'falta', 'justificada']).optional().nullable(),
  chamada_concluida: z.boolean().optional()
})

export type MarcarPresenca = z.infer<typeof MarcarPresencaSchema>

// Schema para confirmar chamada
export const ConfirmarChamadaSchema = z.object({
  chamada_id: z.string().uuid('chamada_id deve ser UUID válido')
})

export type ConfirmarChamada = z.infer<typeof ConfirmarChamadaSchema>
