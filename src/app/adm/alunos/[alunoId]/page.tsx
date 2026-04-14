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
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  if (!dados?.aluno) return (
    <div className="text-center py-20 text-slate-400">Aluno não encontrado.</div>
  )

  const { aluno, responsaveis, frequencia, historico, alertas } = dados

  const statusCor = (s: string) =>
    s === 'presente' ? 'text-green-700 bg-green-50 border-green-200' :
    s === 'falta' ? 'text-red-600 bg-red-50 border-red-200' :
    'text-amber-700 bg-amber-50 border-amber-200'

  const statusLabel = (s: string) =>
    s === 'presente' ? 'Presente' : s === 'falta' ? 'Falta' : 'Justificada'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Voltar */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Voltar
        </button>
      </div>

      {/* Cabeçalho do aluno */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {aluno.foto_url ? (
            <Image src={aluno.foto_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xl font-bold text-slate-500">
              {aluno.nome_completo?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900">{aluno.nome_completo}</h1>
          <p className="text-sm text-slate-600">{aluno.turma_nome} · {aluno.turma_turno}</p>
          <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: 'DM Mono, monospace' }}>
            Matrícula: {aluno.matricula}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${aluno.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {aluno.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Frequência */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { n: frequencia.total, label: 'Registros', cor: 'border-slate-200 text-slate-900' },
          { n: frequencia.presentes, label: 'Presenças', cor: 'border-green-200 text-green-700' },
          { n: frequencia.faltas, label: 'Faltas', cor: 'border-red-200 text-red-600' },
          { n: frequencia.justificadas, label: 'Justificadas', cor: 'border-amber-200 text-amber-700' },
        ].map(k => (
          <div key={k.label} className={`bg-white border rounded-xl p-3 text-center shadow-sm ${k.cor}`}>
            <div className="text-2xl font-bold">{k.n}</div>
            <div className="text-xs text-slate-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {frequencia.pct !== null && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">Frequência geral</span>
            <span className={`text-lg font-bold ${frequencia.pct >= 75 ? 'text-green-700' : 'text-red-600'}`}>
              {frequencia.pct}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${frequencia.pct >= 75 ? 'bg-blue-500' : 'bg-red-500'}`}
              style={{ width: `${frequencia.pct}%` }}
            />
          </div>
          {frequencia.pct < 75 && (
            <p className="text-xs text-red-600 mt-2">⚠ Frequência abaixo do mínimo (75%)</p>
          )}
        </div>
      )}

      {/* Responsáveis */}
      {responsaveis.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Responsáveis</h3>
          <div className="space-y-2">
            {responsaveis.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-900 font-medium">{r.nome}</p>
                  <p className="text-xs text-slate-400">{r.email}</p>
                </div>
                {aluno.contato_responsavel && (
                  <a
                    href={`https://wa.me/55${aluno.contato_responsavel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Referente ao aluno(a) ${aluno.nome_completo}.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-700 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors flex-shrink-0"
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
        <div className="bg-white border border-red-200 rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">⚠ Alertas ({alertas.length})</h3>
          <div className="space-y-2">
            {alertas.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2">
                <span className={`text-xs mt-0.5 ${a.lido ? 'text-slate-300' : 'text-red-600'}`}>•</span>
                <div>
                  <p className="text-xs text-slate-700">{a.mensagem}</p>
                  <p className="text-xs text-slate-400">{new Date(a.criado_em).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de presenças */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Histórico completo ({historico.length} registros)
          </h3>
        </div>
        {historico.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">Nenhum registro de chamada.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {historico.map((h: any) => (
              <div key={h.id}>
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandido(expandido === h.id ? null : h.id)}
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${statusCor(h.status)}`}>
                    {statusLabel(h.status)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">
                      {h.data ? new Date(h.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {h.turma}{h.disciplina ? ` · ${h.disciplina}` : ''}{h.professor ? ` · Prof. ${h.professor}` : ''}
                    </p>
                  </div>
                  {(h.justificativa || h.motivo_alteracao || h.observacao) && (
                    <span className="text-slate-400 text-xs">{expandido === h.id ? '▲' : '▼'}</span>
                  )}
                </button>

                {expandido === h.id && (
                  <div className="px-4 pb-3 space-y-2">
                    {h.justificativa && (
                      <div className="bg-amber-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700 font-medium mb-0.5">Justificativa do responsável</p>
                        <p className="text-xs text-slate-600 italic">"{h.justificativa.motivo}"</p>
                        <p className="text-xs text-slate-400 mt-1">
                          por {h.justificativa.responsavel} · {new Date(h.justificativa.criada_em).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {h.motivo_alteracao && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-blue-700 font-medium mb-0.5">Alteração pelo professor</p>
                        <p className="text-xs text-slate-600">"{h.motivo_alteracao}"</p>
                        {h.horario_evento && <p className="text-xs text-slate-400 mt-1">🕐 {h.horario_evento.slice(0, 5)}</p>}
                      </div>
                    )}
                    {h.observacao && (
                      <div className="bg-slate-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Observação</p>
                        <p className="text-xs text-slate-600">"{h.observacao}"</p>
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
