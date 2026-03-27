'use client'

import { useState, useEffect, useCallback } from 'react'

const TURNOS: Record<string, string> = {
  matutino: 'Matutino',
  vespertino: 'Vespertino',
  noturno: 'Noturno',
}

export default function CozinhaPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setAtualizando(true)
    const res = await fetch('/api/cozinha/presenca')
    if (res.ok) setDados(await res.json())
    setLoading(false)
    setAtualizando(false)
  }, [])

  useEffect(() => {
    carregar()
    const interval = setInterval(() => carregar(true), 60000)
    return () => clearInterval(interval)
  }, [carregar])

  const hora = dados?.atualizadoEm
    ? new Date(dados.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Presença Hoje</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => carregar(true)}
          disabled={atualizando}
          className="p-2.5 bg-[#161b22] border border-[#30363d] rounded-xl hover:border-[#39d353]/50 transition-colors disabled:opacity-50"
          title="Atualizar"
        >
          <svg className={`w-4 h-4 text-gray-400 ${atualizando ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Card principal */}
      <div className="bg-[#39d353]/10 border border-[#39d353]/30 rounded-2xl p-6 mb-5 text-center">
        <p className="text-gray-400 text-sm mb-1">Total de alunos presentes</p>
        <p className="text-6xl font-bold text-[#39d353] leading-none">{dados?.totalPresentes ?? 0}</p>
        <p className="text-gray-500 text-xs mt-2">de {dados?.totalAlunos ?? 0} alunos matriculados</p>
        {hora && <p className="text-gray-600 text-xs mt-1">Atualizado às {hora}</p>}
      </div>

      {/* Por turno */}
      {dados?.porTurno && Object.keys(dados.porTurno).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(dados.porTurno).map(([turno, info]: [string, any]) => (
            <div key={turno} className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{turno === 'matutino' ? '🌅' : turno === 'vespertino' ? '☀️' : '🌙'}</span>
                  <span className="font-semibold text-white text-sm">{TURNOS[turno] || turno}</span>
                </div>
                <span className="text-lg font-bold text-[#39d353]">{info.total}</span>
              </div>
              <div className="divide-y divide-[#30363d]/50">
                {Object.entries(info.turmas).map(([turma, qtd]: [string, any]) => (
                  <div key={turma} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-300">{turma}</span>
                    <span className="text-sm font-semibold text-white">{qtd} aluno{qtd !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-400 text-sm">Nenhuma chamada concluída hoje.</p>
          <p className="text-gray-600 text-xs mt-1">Os dados aparecem após o professor concluir a chamada.</p>
        </div>
      )}

      <p className="text-center text-xs text-gray-700 mt-6">Atualiza automaticamente a cada minuto</p>
    </div>
  )
}
