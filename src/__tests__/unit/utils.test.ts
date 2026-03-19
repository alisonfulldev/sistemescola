import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cn,
  formatDate,
  formatTime,
  formatDateTime,
  calcularFrequencia,
  getCorStatusPresenca,
  getLabelPresenca,
  getTurnoLabel,
  getTurnoBadge,
} from '@/lib/utils'

// ---------------------------------------------------------------------------
// cn (class name merger)
// ---------------------------------------------------------------------------
describe('cn', () => {
  it('combina classes simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('remove classes falsy', () => {
    expect(cn('foo', false && 'bar', undefined, null as any, '')).toBe('foo')
  })

  it('resolve conflitos do Tailwind (última vence)', () => {
    // tailwind-merge: p-4 e p-2 — p-2 deve vencer
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('aceita objetos condicionais', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formata string ISO para dd/MM/yyyy', () => {
    expect(formatDate('2026-01-15')).toBe('15/01/2026')
  })

  it('formata objeto Date', () => {
    expect(formatDate(new Date(2026, 0, 15))).toBe('15/01/2026')
  })

  it('aceita formato customizado', () => {
    expect(formatDate('2026-03-19', 'MM/yyyy')).toBe('03/2026')
  })

  it('formata mês com zero à esquerda', () => {
    expect(formatDate('2026-09-05')).toBe('05/09/2026')
  })
})

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------
describe('formatTime', () => {
  it('retorna HH:MM de uma string HH:MM:SS', () => {
    expect(formatTime('14:30:00')).toBe('14:30')
  })

  it('retorna string vazia para entrada vazia', () => {
    expect(formatTime('')).toBe('')
  })

  it('retorna primeiros 5 caracteres de qualquer string', () => {
    expect(formatTime('08:05:00')).toBe('08:05')
  })
})

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------
describe('formatDateTime', () => {
  it('formata ISO datetime em pt-BR', () => {
    const result = formatDateTime('2026-01-15T14:30:00.000Z')
    // O horário pode variar por timezone, mas a data deve estar correta
    expect(result).toMatch(/15\/01\/2026 às \d{2}:\d{2}/)
  })
})

// ---------------------------------------------------------------------------
// calcularFrequencia
// ---------------------------------------------------------------------------
describe('calcularFrequencia', () => {
  it('calcula percentual correto', () => {
    expect(calcularFrequencia(90, 100)).toBe(90)
  })

  it('retorna 100 quando total é zero (evita divisão por zero)', () => {
    expect(calcularFrequencia(0, 0)).toBe(100)
  })

  it('retorna 0 quando não há presenças', () => {
    expect(calcularFrequencia(0, 10)).toBe(0)
  })

  it('arredonda para inteiro', () => {
    expect(calcularFrequencia(1, 3)).toBe(33) // 33.33... → 33
  })

  it('retorna 100 quando todos presentes', () => {
    expect(calcularFrequencia(30, 30)).toBe(100)
  })

  it('funciona com turma grande (1000 alunos)', () => {
    expect(calcularFrequencia(950, 1000)).toBe(95)
  })
})

// ---------------------------------------------------------------------------
// getCorStatusPresenca
// ---------------------------------------------------------------------------
describe('getCorStatusPresenca', () => {
  it('retorna classes verdes para presente', () => {
    const cor = getCorStatusPresenca('presente')
    expect(cor).toContain('green')
  })

  it('retorna classes vermelhas para falta', () => {
    const cor = getCorStatusPresenca('falta')
    expect(cor).toContain('red')
  })

  it('retorna classes amarelas para justificada', () => {
    const cor = getCorStatusPresenca('justificada')
    expect(cor).toContain('yellow')
  })

  it('retorna classes cinzas para status desconhecido', () => {
    const cor = getCorStatusPresenca('outro')
    expect(cor).toContain('gray')
  })

  it('retorna string não vazia para todos os status válidos', () => {
    const statuses = ['presente', 'falta', 'justificada']
    statuses.forEach(s => expect(getCorStatusPresenca(s).length).toBeGreaterThan(0))
  })
})

// ---------------------------------------------------------------------------
// getLabelPresenca
// ---------------------------------------------------------------------------
describe('getLabelPresenca', () => {
  it('retorna "Presente" para presente', () => {
    expect(getLabelPresenca('presente')).toBe('Presente')
  })

  it('retorna "Falta" para falta', () => {
    expect(getLabelPresenca('falta')).toBe('Falta')
  })

  it('retorna "Justificada" para justificada', () => {
    expect(getLabelPresenca('justificada')).toBe('Justificada')
  })

  it('retorna "—" para status desconhecido', () => {
    expect(getLabelPresenca('')).toBe('—')
    expect(getLabelPresenca('indefinido')).toBe('—')
  })
})

// ---------------------------------------------------------------------------
// getTurnoLabel
// ---------------------------------------------------------------------------
describe('getTurnoLabel', () => {
  it('retorna "Matutino" para matutino', () => {
    expect(getTurnoLabel('matutino')).toBe('Matutino')
  })

  it('retorna "Vespertino" para vespertino', () => {
    expect(getTurnoLabel('vespertino')).toBe('Vespertino')
  })

  it('retorna "Noturno" para noturno', () => {
    expect(getTurnoLabel('noturno')).toBe('Noturno')
  })

  it('retorna o próprio valor para turno desconhecido', () => {
    expect(getTurnoLabel('integral')).toBe('integral')
  })
})

// ---------------------------------------------------------------------------
// getTurnoBadge
// ---------------------------------------------------------------------------
describe('getTurnoBadge', () => {
  it('retorna classes amarelas para matutino', () => {
    expect(getTurnoBadge('matutino')).toContain('yellow')
  })

  it('retorna classes laranjas para vespertino', () => {
    expect(getTurnoBadge('vespertino')).toContain('orange')
  })

  it('retorna classes roxas para noturno', () => {
    expect(getTurnoBadge('noturno')).toContain('purple')
  })

  it('retorna classes cinzas para turno desconhecido', () => {
    expect(getTurnoBadge('outro')).toContain('gray')
  })
})
