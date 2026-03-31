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
          <h1 className="text-xl font-bold text-slate-900">Frequência</h1>
          <p className="text-slate-600 text-sm">Resumo mensal por turma</p>
        </div>
        <input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          style={{ fontFamily: 'DM Mono, monospace' }}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Turma', 'Aulas', 'Presentes', 'Faltas', 'Justif.', 'Frequência'].map(h => (
                <th key={h} className={`p-4 text-slate-500 font-medium text-left ${['Aulas','Presentes','Faltas','Justif.','Frequência'].includes(h) ? 'text-center' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="text-center py-8 text-slate-400">Carregando...</td></tr>
            : dados.map(d => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <span className="text-slate-900 font-medium">{d.nome}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    d.turno === 'matutino' ? 'bg-amber-50 text-amber-700' :
                    d.turno === 'vespertino' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                  }`}>{d.turno}</span>
                </td>
                <td className="p-4 text-center text-slate-600" style={{ fontFamily: 'DM Mono, monospace' }}>{d.aulas_realizadas}</td>
                <td className="p-4 text-center text-green-700" style={{ fontFamily: 'DM Mono, monospace' }}>{d.presentes}</td>
                <td className="p-4 text-center text-red-600" style={{ fontFamily: 'DM Mono, monospace' }}>{d.faltas}</td>
                <td className="p-4 text-center text-amber-700" style={{ fontFamily: 'DM Mono, monospace' }}>{d.justificadas}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-16 bg-slate-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${d.freq >= 75 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${d.freq}%` }} />
                    </div>
                    <span className={`font-bold text-sm ${d.freq >= 75 ? 'text-green-700' : 'text-red-600'}`} style={{ fontFamily: 'DM Mono, monospace' }}>{d.freq}%</span>
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
