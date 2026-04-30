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
    case 'presente': return 'bg-green-500/20 text-green-400 border-green-500/30'
    case 'falta': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'justificada': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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
    case 'matutino': return 'bg-yellow-500/20 text-yellow-400'
    case 'vespertino': return 'bg-orange-500/20 text-orange-400'
    case 'noturno': return 'bg-purple-500/20 text-purple-400'
    default: return 'bg-gray-500/20 text-gray-400'
  }
}

export function gerarQRCodeData(alunoId: string): string {
  return `escola_aluno_${alunoId}`
}

export function extrairAlunoIdDoQR(qrData: string): string | null {
  const match = qrData.match(/^escola_aluno_(.+)$/)
  return match ? match[1] : null
}
