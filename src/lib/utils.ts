// Utility functions for common operations

export function formatDate(date: string | Date, format: string = 'pt-BR'): string {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  
  if (format === 'pt-BR') {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }
  
  // Simple format string processor for dd/MM 'às' HH:mm style
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('dd', d)
    .replace('MM', m)
    .replace('yyyy', String(y))
    .replace('yy', String(y).slice(-2))
    .replace('HH', h)
    .replace('mm', min)
    .replace('ss', s)
}

export function formatTime(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
