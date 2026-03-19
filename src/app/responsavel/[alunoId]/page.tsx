'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function HistoricoAlunoPage() {
  const { alunoId } = useParams<{ alunoId: string }>()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/responsavel/historico?aluno_id=${alunoId}`)
      .then(r => r.json())
      .then(data => { setDados(data); setLoading(false) })
  }, [alunoId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  const { aluno, historico, stats } = dados || {}

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    presente:    { label: 'Presente',   color: 'text-[#39d353]',  icon: '✅' },
    falta:       { label: 'Falta',      color: 'text-[#f85149]',  icon: '❌' },
    justificada: { label: 'Justificada', color: 'text-[#e3b341]', icon: '📝' },
  }

  const freq = stats?.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : null

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/responsavel" className="text-gray-500 hover:text-gray-300 transition-colors">
          ← Voltar
        </Link>
      </div>

      {/* Header do aluno */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-300">
            {aluno?.nome_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <h1 className="font-bold text-white">{aluno?.nome_completo}</h1>
            <p className="text-sm text-gray-500">{aluno?.turmas?.nome}</p>
            <p className="text-xs text-gray-600 font-mono">Matrícula: {aluno?.matricula}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total</p>
          </div>
          <div className="bg-[#161b22] border border-[#39d353]/30 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#39d353]">{stats.presentes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Presentes</p>
          </div>
          <div className="bg-[#161b22] border border-[#f85149]/30 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#f85149]">{stats.faltas}</p>
            <p className="text-xs text-gray-500 mt-0.5">Faltas</p>
          </div>
          <div className="bg-[#161b22] border border-[#e3b341]/30 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-[#e3b341]">{freq ?? '--'}{freq !== null ? '%' : ''}</p>
            <p className="text-xs text-gray-500 mt-0.5">Frequência</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {!historico?.length ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 text-center">
          <p className="text-gray-500">Nenhum registro de chamada ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {historico.map((r: any, i: number) => {
            const cfg = statusConfig[r.status] || { label: r.status, color: 'text-gray-400', icon: '📋' }
            return (
              <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-lg">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                  {r.disciplina && <p className="text-xs text-gray-500 truncate">{r.disciplina}</p>}
                  {r.observacao && <p className="text-xs text-gray-600 italic truncate">{r.observacao}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 font-mono">
                    {r.data ? new Date(r.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
