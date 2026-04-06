import { NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

/**
 * Helper para validar dados com Zod e retornar erro estruturado
 * @param schema - Schema Zod para validação
 * @param data - Dados a validar
 * @returns { success: true, data } ou { success: false, error, status }
 */
export function validateData<T>(schema: ZodSchema, data: unknown): { success: true; data: T } | { success: false; error: any; status: number } {
  const validation = schema.safeParse(data)

  if (!validation.success) {
    return {
      success: false,
      error: {
        message: 'Dados inválidos',
        fields: validation.error.flatten().fieldErrors
      },
      status: 400
    }
  }

  return {
    success: true,
    data: validation.data as T
  }
}

/**
 * Helper para retornar erro JSON padronizado
 */
export function errorResponse(message: string, details?: any, status: number = 400) {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details })
    },
    { status }
  )
}

/**
 * Helper para retornar sucesso JSON padronizado
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}
