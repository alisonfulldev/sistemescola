import { z } from 'zod'

// Schema para notas simples bimestrais - com campo nota único (usado por notas_bimestral)
// Este é o formato que o endpoint /api/professor/notas_bimestral espera
export const SaveNotasSimpleSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  ano_letivo_id: z.string().uuid('ano_letivo_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      nota: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable()
    })
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

export type SaveNotasSimple = z.infer<typeof SaveNotasSimpleSchema>

// Schema para notas bimestrais - com campos b1, b2, b3, b4, recuperacao
export const SaveNotasBimestraisSchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
  disciplina_id: z.string().uuid('disciplina_id deve ser UUID válido'),
  ano_letivo_id: z.string().uuid('ano_letivo_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      b1: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable(),
      b2: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable(),
      b3: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable(),
      b4: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable(),
      recuperacao: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable()
    })
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

export type SaveNotasBimestrais = z.infer<typeof SaveNotasBimestraisSchema>

// Schema para notas de prova
export const SaveNotasProvaSchema = z.object({
  prova_id: z.string().uuid('prova_id deve ser UUID válido'),
  notas: z.array(
    z.object({
      aluno_id: z.string().uuid('aluno_id deve ser UUID válido'),
      nota: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable()
    })
  ).min(1, 'Deve haver pelo menos uma nota para salvar')
})

export type SaveNotasProva = z.infer<typeof SaveNotasProvaSchema>

// Schema genérico que aceita ambos - tenta simple primeiro (mais comum)
// Usa z.or() para tentativa sequencial de schemas
export const SaveNotasSchema = SaveNotasSimpleSchema
  .or(SaveNotasBimestraisSchema)
  .or(SaveNotasProvaSchema)

export type SaveNotas = z.infer<typeof SaveNotasSchema>

// Schema para carregar notas bimestrais (GET)
export const LoadNotasSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid(),
  ano_letivo_id: z.string().uuid()
})

export type LoadNotas = z.infer<typeof LoadNotasSchema>
