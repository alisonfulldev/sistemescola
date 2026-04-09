'use client'

import { useState, useEffect } from 'react'
import { formatTime } from '@/lib/utils'
import { Pagination } from '@/components/Pagination'

export default function ChamadasPage() {
  const [chamadas, setChamadas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0])
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalChamadas, setTotalChamadas] = useState(0)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setPaginaAtual(1)
      const res = await fetch(`/api/adm/chamadas?data=${filtroData}&page=1`)
      if (res.ok) {
        const { chamadas: data, total, total_paginas } = await res.json()
        setChamadas(data || [])
        setTotalChamadas(total || 0)
        setTotalPaginas(total_paginas || 1)
      }
      setLoading(false)
    }
    carregar()
  }, [filtroData])

  async function mudarPagina(novaPagina: number) {
    setLoading(true)
    const res = await fetch(`/api/adm/chamadas?data=${filtroData}&page=${novaPagina}`)
    if (res.ok) {
      const { chamadas: data } = await res.json()
      setChamadas(data || [])
      setPaginaAtual(novaPagina)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setLoading(false)
  }

  const statusStyle = (s: string) => {
    if (s === 'concluida') return 'bg-green-50 text-green-700'
    if (s === 'em_andamento') return 'bg-blue-50 text-blue-700'
    return 'bg-amber-50 text-amber-700'
  }
  const statusLabel = (s: string) => s === 'concluida' ? 'Concluída' : s === 'em_andamento' ? 'Em curso' : 'Pendente'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Chamadas</h1>
        <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          style={{ fontFamily: 'DM Mono, monospace' }}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                {['Turma', 'Disciplina', 'Professor', 'Horário', 'P / F / J', 'Status'].map(h => (
                  <th key={h} className={`p-4 text-slate-500 font-medium ${h === 'Disciplina' ? 'hidden md:table-cell' : ''} ${h === 'Professor' ? 'hidden lg:table-cell' : ''} ${['P / F / J', 'Status'].includes(h) ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Carregando...</td></tr>
              ) : chamadas.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">
                  <div className="text-3xl mb-2">📭</div>
                  <p>Nenhuma chamada nesta data</p>
                </td></tr>
              ) : chamadas.map((c: any) => {
                const regs = c.registros_chamada || []
                const p = regs.filter((r: any) => r.status === 'presente').length
                const f = regs.filter((r: any) => r.status === 'falta').length
                const j = regs.filter((r: any) => r.status === 'justificada').length
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-900 font-medium">{c.aulas?.turmas?.nome}</td>
                    <td className="p-4 text-slate-600 hidden md:table-cell">{c.aulas?.disciplinas?.nome}</td>
                    <td className="p-4 text-slate-600 hidden lg:table-cell">{c.aulas?.usuarios?.nome}</td>
                    <td className="p-4 text-slate-600 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
                      {formatTime(c.aulas?.horario_inicio)} – {formatTime(c.aulas?.horario_fim)}
                    </td>
                    <td className="p-4 text-center text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
                      <span className="text-green-700">{p}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-red-600">{f}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-amber-700">{j}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle(c.status)}`}>{statusLabel(c.status)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          totalItems={totalChamadas}
          itemsPorPagina={15}
          carregando={loading}
          onMudarPagina={mudarPagina}
          labelItems="chamadas"
        />
      </div>
    </div>
  )
}
