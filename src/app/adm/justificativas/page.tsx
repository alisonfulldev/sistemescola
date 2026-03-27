'use client'

import { useState, useEffect } from 'react'

export default function JustificativasPage() {
  const [justificativas, setJustificativas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [expandida, setExpandida] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/adm/justificativas')
      .then(r => r.json())
      .then(d => { setJustificativas(d.justificativas || []); setLoading(false) })
  }, [])

  const filtradas = justificativas.filter(j => {
    const termo = busca.toLowerCase()
    return !termo ||
      j.aluno_nome?.toLowerCase().includes(termo) ||
      j.responsavel_nome?.toLowerCase().includes(termo) ||
      j.turma?.toLowerCase().includes(termo) ||
      j.motivo?.toLowerCase().includes(termo)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Justificativas</h1>
          <p className="text-gray-400 text-sm">{filtradas.length} registro(s) — auditoria completa</p>
        </div>
      </div>

      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por aluno, responsável, turma ou motivo..."
          className="w-full bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-[#58a6ff]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-[#58a6ff] border-t-transparent rounded-full" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 text-center text-gray-500 text-sm">
          Nenhuma justificativa encontrada.
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(j => (
            <div
              key={j.id}
              className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden"
            >
              <button
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-[#21262d] transition-colors"
                onClick={() => setExpandida(expandida === j.id ? null : j.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{j.aluno_nome}</span>
                    <span className="text-xs text-gray-500">{j.turma}</span>
                    {j.data_aula && (
                      <span className="text-xs text-gray-600" style={{ fontFamily: 'DM Mono, monospace' }}>
                        {new Date(j.data_aula + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    por <span className="text-gray-400">{j.responsavel_nome}</span>
                    {j.professor && <> · Prof. {j.professor}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#e3b341]/15 text-[#e3b341]">
                    justificada
                  </span>
                  <span className="text-gray-600 text-xs">{expandida === j.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandida === j.id && (
                <div className="px-4 pb-4 border-t border-[#30363d]/50">
                  <p className="text-xs text-gray-500 mt-3 mb-1 uppercase tracking-wider">Motivo</p>
                  <p className="text-sm text-gray-200 bg-[#0d1117] rounded-lg px-3 py-2.5 leading-relaxed">
                    "{j.motivo}"
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Enviado em {new Date(j.criada_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
