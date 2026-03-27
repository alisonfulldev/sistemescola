'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export default function PerfilAlunoPage() {
  const { alunoId } = useParams<{ alunoId: string }>()
  const router = useRouter()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/adm/alunos/${alunoId}`)
      .then(r => r.json())
      .then(d => { setDados(d); setLoading(false) })
  }, [alunoId])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-[#58a6ff] border-t-transparent rounded-full" />
    </div>
  )

  if (!dados?.aluno) return (
    <div className="text-center py-20 text-gray-500">Aluno não encontrado.</div>
  )

  const { aluno, responsaveis, frequencia, historico, alertas } = dados

  const statusCor = (s: string) =>
    s === 'presente' ? 'text-[#39d353] bg-[#39d353]/10 border-[#39d353]/30' :
    s === 'falta' ? 'text-[#f85149] bg-[#f85149]/10 border-[#f85149]/30' :
    'text-[#e3b341] bg-[#e3b341]/10 border-[#e3b341]/30'

  const statusLabel = (s: string) =>
    s === 'presente' ? 'Presente' : s === 'falta' ? 'Falta' : 'Justificada'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Voltar */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Voltar
        </button>
        <a
          href={`/api/adm/exportar?tipo=aluno&aluno_id=${alunoId}`}
          download
          className="flex items-center gap-2 px-3 py-1.5 bg-[#39d353]/10 border border-[#39d353]/30 text-[#39d353] text-xs font-medium rounded-lg hover:bg-[#39d353]/20 transition-colors"
        >
          ⬇ Exportar Excel
        </a>
      </div>

      {/* Cabeçalho do aluno */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center">
          {aluno.foto_url ? (
            <Image src={aluno.foto_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xl font-bold text-gray-400">
              {aluno.nome_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white">{aluno.nome_completo}</h1>
          <p className="text-sm text-gray-400">{aluno.turma_nome} · {aluno.turma_turno}</p>
          <p className="text-xs text-gray-600 mt-0.5" style={{ fontFamily: 'DM Mono, monospace' }}>
            Matrícula: {aluno.matricula}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${aluno.ativo ? 'bg-[#39d353]/15 text-[#39d353]' : 'bg-red-500/15 text-red-400'}`}>
          {aluno.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Frequência */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { n: frequencia.total, label: 'Registros', cor: 'border-[#30363d] text-white' },
          { n: frequencia.presentes, label: 'Presenças', cor: 'border-[#39d353]/30 text-[#39d353]' },
          { n: frequencia.faltas, label: 'Faltas', cor: 'border-[#f85149]/30 text-[#f85149]' },
          { n: frequencia.justificadas, label: 'Justificadas', cor: 'border-[#e3b341]/30 text-[#e3b341]' },
        ].map(k => (
          <div key={k.label} className={`bg-[#161b22] border rounded-xl p-3 text-center ${k.cor}`}>
            <div className="text-2xl font-bold">{k.n}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {frequencia.pct !== null && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Frequência geral</span>
            <span className={`text-lg font-bold ${frequencia.pct >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>
              {frequencia.pct}%
            </span>
          </div>
          <div className="w-full bg-[#0d1117] rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${frequencia.pct >= 75 ? 'bg-[#39d353]' : 'bg-[#f85149]'}`}
              style={{ width: `${frequencia.pct}%` }}
            />
          </div>
          {frequencia.pct < 75 && (
            <p className="text-xs text-[#f85149] mt-2">⚠ Frequência abaixo do mínimo (75%)</p>
          )}
        </div>
      )}

      {/* Responsáveis */}
      {responsaveis.length > 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Responsáveis</h3>
          <div className="space-y-2">
            {responsaveis.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-200 font-medium">{r.nome}</p>
                  <p className="text-xs text-gray-500">{r.email}</p>
                </div>
                {aluno.contato_responsavel && (
                  <a
                    href={`https://wa.me/55${aluno.contato_responsavel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Referente ao aluno(a) ${aluno.nome_completo}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#39d353] border border-[#39d353]/30 px-2 py-1 rounded-lg hover:bg-[#39d353]/10 transition-colors flex-shrink-0"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-[#161b22] border border-[#f85149]/30 rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-[#f85149] uppercase tracking-widest mb-3">⚠ Alertas ({alertas.length})</h3>
          <div className="space-y-2">
            {alertas.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2">
                <span className={`text-xs mt-0.5 ${a.lido ? 'text-gray-600' : 'text-[#f85149]'}`}>•</span>
                <div>
                  <p className="text-xs text-gray-300">{a.mensagem}</p>
                  <p className="text-xs text-gray-600">{new Date(a.criado_em).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de presenças */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-[#30363d]">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Histórico completo ({historico.length} registros)
          </h3>
        </div>
        {historico.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-8">Nenhum registro de chamada.</p>
        ) : (
          <div className="divide-y divide-[#30363d]/50">
            {historico.map((h: any) => (
              <div key={h.id}>
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#21262d] transition-colors"
                  onClick={() => setExpandido(expandido === h.id ? null : h.id)}
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${statusCor(h.status)}`}>
                    {statusLabel(h.status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200">
                      {h.data ? new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {h.turma}{h.disciplina ? ` · ${h.disciplina}` : ''}{h.professor ? ` · Prof. ${h.professor}` : ''}
                    </p>
                  </div>
                  {(h.justificativa || h.motivo_alteracao || h.observacao) && (
                    <span className="text-gray-600 text-xs">{expandido === h.id ? '▲' : '▼'}</span>
                  )}
                </button>

                {expandido === h.id && (
                  <div className="px-4 pb-3 space-y-2">
                    {h.justificativa && (
                      <div className="bg-[#0d1117] rounded-lg px-3 py-2">
                        <p className="text-xs text-[#e3b341] font-medium mb-0.5">Justificativa do responsável</p>
                        <p className="text-xs text-gray-300 italic">"{h.justificativa.motivo}"</p>
                        <p className="text-xs text-gray-600 mt-1">
                          por {h.justificativa.responsavel} · {new Date(h.justificativa.criada_em).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {h.motivo_alteracao && (
                      <div className="bg-[#0d1117] rounded-lg px-3 py-2">
                        <p className="text-xs text-[#58a6ff] font-medium mb-0.5">Alteração pelo professor</p>
                        <p className="text-xs text-gray-300">"{h.motivo_alteracao}"</p>
                        {h.horario_evento && <p className="text-xs text-gray-600 mt-1">🕐 {h.horario_evento.slice(0, 5)}</p>}
                      </div>
                    )}
                    {h.observacao && (
                      <div className="bg-[#0d1117] rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Observação</p>
                        <p className="text-xs text-gray-300">"{h.observacao}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
