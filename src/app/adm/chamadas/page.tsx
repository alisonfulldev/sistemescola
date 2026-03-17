'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils'

export default function ChamadasPage() {
  const [chamadas, setChamadas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0])
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase
        .from('chamadas')
        .select(`id, status, iniciada_em, concluida_em,
          aulas!inner(id, data, horario_inicio, horario_fim,
            turmas(nome, turno), disciplinas(nome), usuarios(nome)
          ),
          registros_chamada(id, status)
        `)
        .order('iniciada_em', { ascending: false })

      const filtradas = (data || []).filter((c: any) => c.aulas?.data === filtroData)
      setChamadas(filtradas)
      setLoading(false)
    }
    carregar()
  }, [filtroData])

  const statusStyle = (s: string) => {
    if (s === 'concluida') return 'bg-[#39d353]/15 text-[#39d353]'
    if (s === 'em_andamento') return 'bg-[#58a6ff]/15 text-[#58a6ff]'
    return 'bg-[#e3b341]/15 text-[#e3b341]'
  }
  const statusLabel = (s: string) => s === 'concluida' ? 'Concluída' : s === 'em_andamento' ? 'Em curso' : 'Pendente'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Chamadas</h1>
        <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
          style={{ fontFamily: 'DM Mono, monospace' }}
        />
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#30363d] text-left">
              {['Turma', 'Disciplina', 'Professor', 'Horário', 'P / F / J', 'Status'].map(h => (
                <th key={h} className={`p-4 text-gray-400 font-medium ${h === 'Disciplina' ? 'hidden md:table-cell' : ''} ${h === 'Professor' ? 'hidden lg:table-cell' : ''} ${['P / F / J', 'Status'].includes(h) ? 'text-center' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            ) : chamadas.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-500">
                <div className="text-3xl mb-2">📭</div>
                <p>Nenhuma chamada nesta data</p>
              </td></tr>
            ) : chamadas.map((c: any) => {
              const regs = c.registros_chamada || []
              const p = regs.filter((r: any) => r.status === 'presente').length
              const f = regs.filter((r: any) => r.status === 'falta').length
              const j = regs.filter((r: any) => r.status === 'justificada').length
              return (
                <tr key={c.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                  <td className="p-4 text-white font-medium">{c.aulas?.turmas?.nome}</td>
                  <td className="p-4 text-gray-300 hidden md:table-cell">{c.aulas?.disciplinas?.nome}</td>
                  <td className="p-4 text-gray-300 hidden lg:table-cell">{c.aulas?.usuarios?.nome}</td>
                  <td className="p-4 text-gray-300 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
                    {formatTime(c.aulas?.horario_inicio)} – {formatTime(c.aulas?.horario_fim)}
                  </td>
                  <td className="p-4 text-center text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
                    <span className="text-[#39d353]">{p}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-[#f85149]">{f}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-[#e3b341]">{j}</span>
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
    </div>
  )
}
