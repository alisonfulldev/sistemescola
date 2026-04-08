import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Tipos de permisos para diferentes rotas
 */
export const ROLES = {
  ADMIN: ['admin'],
  SECRETARIA: ['admin', 'secretaria'],
  DIRETOR: ['admin', 'diretor'],
  PROFESSOR: ['admin', 'professor'],
  RESPONSAVEL: ['responsavel'],
  COZINHA: ['admin', 'cozinha'],
  ANY: ['admin', 'secretaria', 'diretor', 'professor', 'responsavel', 'cozinha']
}

export type AllowedRoles = typeof ROLES[keyof typeof ROLES]

/**
 * Middleware para validar autenticação e autorização
 * @param req Request object
 * @param allowedRoles Array de roles permitidas
 * @returns { user, usuario } ou NextResponse com erro
 */
export async function requireAuth(req: NextRequest, allowedRoles?: AllowedRoles) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        error: NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        )
      }
    }

    // Se não há roles específicas, apenas verifica autenticação
    if (!allowedRoles) {
      return { user }
    }

    // Buscar perfil do usuário
    const { data: usuario, error: profileError } = await supabase
      .from('usuarios')
      .select('id, perfil, ativo')
      .eq('id', user.id)
      .single()

    if (profileError || !usuario) {
      return {
        error: NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }
    }

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      return {
        error: NextResponse.json(
          { error: 'Usuário inativo' },
          { status: 403 }
        )
      }
    }

    // Verificar role
    if (!allowedRoles.includes(usuario.perfil)) {
      return {
        error: NextResponse.json(
          { error: 'Sem permissão para acessar este recurso' },
          { status: 403 }
        )
      }
    }

    return { user, usuario }
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: 'Erro ao validar autenticação' },
        { status: 500 }
      )
    }
  }
}

/**
 * Extrai ID da rota (para validações)
 */
export function extractId(searchParams: URLSearchParams, paramName: string = 'id'): string | null {
  const id = searchParams.get(paramName)
  if (!id) return null

  // Validar UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return null
  }

  return id
}
