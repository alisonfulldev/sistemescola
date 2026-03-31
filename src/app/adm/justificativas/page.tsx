'use client'

import { useState, useEffect } from 'react'

export default function JustificativasPage() {
  const [justificativas, setJustificativas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'pendente' | 'aprovada' | 'rejeitada' | ''>('')
  const [expandida, setExpandida] = useState<string | null>(null)
  const [processando, setProcessando] = useState<string | null>(null)

  useEffect(() => {
    carregarJustificativas()
  }, [])

  async function carregarJustificativas() {
    setLoading(true)
    try {
      const res = await fetch('/api/justificativas')
      if (res.ok) {
        const { justificativas: justs } = await res.json()
        setJustificativas(justs || [])
      }
    } catch (e) {
      console.error('Erro ao carregar:', e)
    }
    setLoading(false)
  }

  async function aprovarRejeitar(id: string, status: 'aprovada' | 'rejeitada', observacao: string) {
    setProcessando(id)
    try {
      const res = await fetch(`/api/justificativas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, observacao_aprovacao: observacao })
      })

      if (res.ok) {
        carregarJustificativas()
        setExpandida(null)
      }
    } catch (e) {
      console.error('Erro:', e)
    }
    setProcessando(null)
  }

  const filtradas = justificativas.filter(j => {
    const termo = busca.toLowerCase()
    const passaBusca = !termo ||
      j.alunos?.nome_completo?.toLowerCase().includes(termo) ||
      j.usuarios?.nome?.toLowerCase().includes(termo) ||
      j.motivo?.toLowerCase().includes(termo)

    const passaStatus = !filtroStatus || j.status === filtroStatus

    return passaBusca && passaStatus
  })

  const pendentes = justificativas.filter(j => j.status === 'pendente').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'aprovada':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'rejeitada':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return '⏳'
      case 'aprovada':
        return '✓'
      case 'rejeitada':
        return '✗'
      default:
        return '•'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Justificativas de Falta</h1>
          <p className="text-slate-600 text-sm mt-1">
            {filtradas.length} registro(s) {pendentes > 0 && `· ${pendentes} pendente(s)`}
          </p>
        </div>
      </div>

      {/* Buscas e filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por aluno, responsável ou motivo..."
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { valor: '', label: 'Todas' },
            { valor: 'pendente', label: '⏳ Pendente' },
            { valor: 'aprovada', label: '✓ Aprovada' },
            { valor: 'rejeitada', label: '✗ Rejeitada' }
          ].map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltroStatus(f.valor as any)}
              className={`text-xs font-medium py-2 px-3 rounded-lg transition-colors ${
                filtroStatus === f.valor
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm shadow-sm">
          Nenhuma justificativa encontrada.
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(j => (
            <div
              key={j.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
            >
              <button
                className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                onClick={() => setExpandida(expandida === j.id ? null : j.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">
                      {j.alunos?.nome_completo}
                    </span>
                    <span className="text-xs text-slate-400">
                      Falta em {new Date(j.data_falta + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    por <span className="text-slate-600 font-medium">{j.usuarios?.nome}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(j.status)}`}>
                    {getStatusIcon(j.status)} {j.status}
                  </span>
                  <span className="text-slate-400 text-xs">{expandida === j.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {expandida === j.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mt-3 mb-1 uppercase tracking-wider">Motivo</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
                    {j.motivo.charAt(0).toUpperCase() + j.motivo.slice(1)}
                    {j.descricao_detalhada && (
                      <span className="block mt-2 text-slate-600">{j.descricao_detalhada}</span>
                    )}
                  </p>

                  <p className="text-xs text-slate-400 mt-3">
                    Enviado em {new Date(j.enviado_em).toLocaleString('pt-BR')}
                  </p>

                  {j.status === 'pendente' && (
                    <div className="mt-4 space-y-2 pt-3 border-t border-slate-100">
                      <div className="flex gap-2">
                        <button
                          onClick={() => aprovarRejeitar(j.id, 'aprovada', '')}
                          disabled={processando === j.id}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          {processando === j.id ? (
                            <>
                              <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                              Processando...
                            </>
                          ) : (
                            '✓ Aprovar'
                          )}
                        </button>
                        <button
                          onClick={() => aprovarRejeitar(j.id, 'rejeitada', '')}
                          disabled={processando === j.id}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          {processando === j.id ? (
                            <>
                              <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                              Processando...
                            </>
                          ) : (
                            '✗ Rejeitar'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {j.status !== 'pendente' && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-1">Decisão</p>
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold capitalize">
                          {j.status === 'aprovada' ? '✓ Aprovada' : '✗ Rejeitada'}
                        </span>
                        {j.aprovado_por && (
                          <span className="text-slate-500"> por {j.usuarios?.nome}</span>
                        )}
                      </p>
                      {j.observacao_aprovacao && (
                        <p className="text-xs text-slate-600 mt-2 italic">
                          Observação: {j.observacao_aprovacao}
                        </p>
                      )}
                      {j.aprovado_em && (
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(j.aprovado_em).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
