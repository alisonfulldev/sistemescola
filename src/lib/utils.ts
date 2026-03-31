import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isWithinInterval, subMinutes, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ptBR })
}

export function formatTime(time: string) {
  if (!time) return ''
  return time.slice(0, 5)
}

export function formatDateTime(dt: string) {
  return format(parseISO(dt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function podeIniciarChamada(horarioInicio: string, data: string): boolean {
  const now = new Date()
  const [h, m] = horarioInicio.split(':').map(Number)
  const aulaDate = parseISO(data)
  aulaDate.setHours(h, m, 0, 0)
  const inicio = subMinutes(aulaDate, 30)
  const fim = addMinutes(aulaDate, 45)
  return isWithinInterval(now, { start: inicio, end: fim })
}

export function calcularFrequencia(presencas: number, total: number): number {
  if (total === 0) return 100
  return Math.round((presencas / total) * 100)
}

export function getCorStatusPresenca(status: string): string {
  switch (status) {
    case 'presente': return 'bg-green-50 text-green-600 border-green-200'
    case 'falta': return 'bg-red-50 text-red-600 border-red-200'
    case 'justificada': return 'bg-amber-50 text-amber-600 border-amber-200'
    default: return 'bg-slate-50 text-slate-500 border-slate-200'
  }
}

export function getLabelPresenca(status: string): string {
  switch (status) {
    case 'presente': return 'Presente'
    case 'falta': return 'Falta'
    case 'justificada': return 'Justificada'
    default: return '—'
  }
}

export function getTurnoLabel(turno: string): string {
  switch (turno) {
    case 'matutino': return 'Matutino'
    case 'vespertino': return 'Vespertino'
    case 'noturno': return 'Noturno'
    default: return turno
  }
}

export function getTurnoBadge(turno: string): string {
  switch (turno) {
    case 'matutino': return 'bg-amber-50 text-amber-600'
    case 'vespertino': return 'bg-orange-50 text-orange-600'
    case 'noturno': return 'bg-blue-50 text-blue-600'
    default: return 'bg-slate-50 text-slate-500'
  }
}

