'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  paginaAtual: number
  totalPaginas: number
  totalItems: number
  itemsPorPagina: number
  carregando: boolean
  onMudarPagina: (pagina: number) => void
  labelItems?: string
}

export function Pagination({
  paginaAtual,
  totalPaginas,
  totalItems,
  itemsPorPagina,
  carregando,
  onMudarPagina,
  labelItems = 'itens'
}: PaginationProps) {
  if (totalPaginas <= 1) return null

  const inicio = (paginaAtual - 1) * itemsPorPagina + 1
  const fim = Math.min(paginaAtual * itemsPorPagina, totalItems)

  return (
    <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
      <div className="text-xs text-slate-600">
        Mostrando <span className="font-medium">{inicio}</span> a <span className="font-medium">{fim}</span> de <span className="font-medium">{totalItems}</span> {labelItems}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onMudarPagina(paginaAtual - 1)}
          disabled={paginaAtual === 1 || carregando}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
            const pagina = i + Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4))
            return (
              <button
                key={pagina}
                onClick={() => onMudarPagina(pagina)}
                disabled={carregando}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  paginaAtual === pagina
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                } disabled:cursor-not-allowed`}
              >
                {pagina}
              </button>
            )
          })}
          {totalPaginas > 5 && (
            <span className="text-slate-400 text-sm">...</span>
          )}
        </div>

        <button
          onClick={() => onMudarPagina(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas || carregando}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <span className="hidden sm:inline">Próximo</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
