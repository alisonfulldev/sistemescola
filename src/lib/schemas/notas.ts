import { z } from 'zod'

// Schema para notas bimestrais - com campos b1, b2, b3, b4, recuperacao
export const SaveNotasBimestraisSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  ano_letivo_id: z.string().uuid('ano_letivo_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      b1: z.union([z.string(), z.number(), z.null()]).optional(),
      b2: z.union([z.string(), z.number(), z.null()]).optional(),
      b3: z.union([z.string(), z.number(), z.null()]).optional(),
      b4: z.union([z.string(), z.number(), z.null()]).optional(),
      recuperacao: z.union([z.string(), z.number(), z.null()]).optional()
    })
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

// Schema para notas simples bimestrais - com campo nota único (usado por notas_bimestral)
export const SaveNotasSimpleSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  ano_letivo_id: z.string().uuid('ano_letivo_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      nota: z.union([z.string(), z.number(), z.null()]).optional()
    })
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

// Schema para notas de prova
export const SaveNotasProvaSchema = z.object({
  prova_id: z.string().uuid('prova_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      nota: z.union([z.string(), z.number(), z.null()]).optional()
    })
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

// Schema genérico que aceita ambos (para compatibilidade)
export const SaveNotasSchema = z.union([
  SaveNotasBimestraisSchema,
  SaveNotasSimpleSchema,
  SaveNotasProvaSchema
])

export type SaveNotas = z.infer<typeof SaveNotasSchema>
export type SaveNotasBimestrais = z.infer<typeof SaveNotasBimestraisSchema>
export type SaveNotasSimple = z.infer<typeof SaveNotasSimpleSchema>
export type SaveNotasProva = z.infer<typeof SaveNotasProvaSchema>

// Schema para carregar notas bimestrais (GET)
export const LoadNotasSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  ano_letivo_id: z.string().uuid()
})

export type LoadNotas = z.infer<typeof LoadNotasSchema>
