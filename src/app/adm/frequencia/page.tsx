'use client'

import { useState, useEffect } from 'react'

export default function FrequenciaPage() {
  const [dados, setDados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mesAno, setMesAno] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const res = await fetch(`/api/adm/frequencia?mes=${mesAno}`)
      if (res.ok) {
        const { dados } = await res.json()
        setDados(dados || [])
      }
      setLoading(false)
    }
    carregar()
  }, [mesAno])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Frequência</h1>
          <p className="text-gray-400 text-sm">Resumo mensal por turma</p>
        </div>
        <input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
          style={{ fontFamily: 'DM Mono, monospace' }}
        />
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-[#30363d]">
              {['Turma', 'Aulas', 'Presentes', 'Faltas', 'Justif.', 'Frequência'].map(h => (
                <th key={h} className={`p-4 text-gray-400 font-medium text-left ${['Aulas','Presentes','Faltas','Justif.','Frequência'].includes(h) ? 'text-center' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            : dados.map(d => (
              <tr key={d.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                <td className="p-4">
                  <span className="text-white font-medium">{d.nome}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    d.turno === 'matutino' ? 'bg-yellow-500/15 text-yellow-400' :
                    d.turno === 'vespertino' ? 'bg-orange-500/15 text-orange-400' : 'bg-purple-500/15 text-purple-400'
                  }`}>{d.turno}</span>
                </td>
                <td className="p-4 text-center text-gray-300" style={{ fontFamily: 'DM Mono, monospace' }}>{d.aulas_realizadas}</td>
                <td className="p-4 text-center text-[#39d353]" style={{ fontFamily: 'DM Mono, monospace' }}>{d.presentes}</td>
                <td className="p-4 text-center text-[#f85149]" style={{ fontFamily: 'DM Mono, monospace' }}>{d.faltas}</td>
                <td className="p-4 text-center text-[#e3b341]" style={{ fontFamily: 'DM Mono, monospace' }}>{d.justificadas}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-16 bg-[#0d1117] rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${d.freq >= 75 ? 'bg-[#39d353]' : 'bg-[#f85149]'}`} style={{ width: `${d.freq}%` }} />
                    </div>
                    <span className={`font-bold text-sm ${d.freq >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`} style={{ fontFamily: 'DM Mono, monospace' }}>{d.freq}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
