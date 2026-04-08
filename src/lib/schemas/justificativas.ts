import { z } from 'zod'

// Motivos válidos para justificativa
const MOTIVOS_VALIDOS = ['medico', 'dentista', 'falecimento', 'acompanhamento_responsavel', 'consulta_especialista', 'atividade_escolar', 'motivo_pessoal', 'outro'] as const

// Schema para criar justificativa
export const CreateJustificativaSchema = z.object({
  aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
  data_falta: z.string().date('data_falta deve ser válida'),
  motivo: z.enum(MOTIVOS_VALIDOS, { message: `Motivo deve ser um de: ${MOTIVOS_VALIDOS.join(', ')}` }),
  descricao_detalhada: z.string().optional().nullable(),
  documento_url: z.string().url('documento_url deve ser URL válida').optional().nullable(),
  tipo_documento: z.string().optional().nullable()
})

export type CreateJustificativa = z.infer<typeof CreateJustificativaSchema>

// Schema para responder justificativa
export const ResponderJustificativaSchema = z.object({
  justificativa_id: z.string().uuid('justificativa_id deve ser UUID válido'),
  status: z.enum(['aprovado', 'rejeitado', 'pendente']),
  observacao: z.string().optional().nullable()
})

export type ResponderJustificativa = z.infer<typeof ResponderJustificativaSchema>
