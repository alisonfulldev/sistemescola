import { createClient } from '@/lib/supabase/server'

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface LogEntry {
  level: LogLevel
  message: string
  endpoint: string
  userId?: string
  action?: string
  details?: Record<string, any>
  error?: string
  timestamp: string
}

/**
 * Sistema centralizado de logging com auditoria
 */
export class Logger {
  private static instance: Logger

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * Log de auditoria (ações do usuário)
   */
  async logAudit(
    userId: string,
    action: string,
    endpoint: string,
    details?: Record<string, any>,
    success: boolean = true
  ) {
    try {
      const supabase = await createClient()
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action,
        endpoint,
        details: details || {},
        success,
        ip: 'unknown', // TODO: extrair do request
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error)
      // Não throw - logging não deve quebrar a aplicação
    }
  }

  /**
   * Log de erro estruturado
   */
  async logError(
    endpoint: string,
    error: Error | string,
    userId?: string,
    context?: Record<string, any>
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(`[${endpoint}]`, errorMessage, context)

    try {
      const supabase = await createClient()
      await supabase.from('error_logs').insert({
        endpoint,
        error_message: errorMessage,
        error_stack: errorStack,
        user_id: userId,
        context: context || {},
        timestamp: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Erro ao registrar log de erro:', logError)
    }
  }

  /**
   * Log simples de info
   */
  async logInfo(endpoint: string, message: string, userId?: string, details?: Record<string, any>) {
    console.log(`[${endpoint}]`, message, details)

    try {
      const supabase = await createClient()
      await supabase.from('info_logs').insert({
        endpoint,
        message,
        user_id: userId,
        details: details || {},
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Erro ao registrar log de info:', error)
    }
  }
}

export const logger = Logger.getInstance()
