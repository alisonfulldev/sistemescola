'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'

function KPI({ label, value, color, icon, sub }: { label: string; value: number | string; color: string; icon: string; sub?: string }) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-400">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`} style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    concluida: 'bg-[#39d353]/15 text-[#39d353]',
    em_andamento: 'bg-[#58a6ff]/15 text-[#58a6ff]',
    pendente: 'bg-[#e3b341]/15 text-[#e3b341]',
  }
  const l: Record<string, string> = { concluida: '✓ Concluída', em_andamento: '⏳ Em andamento', pendente: '◷ Aguardando' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-gray-500/15 text-gray-400'}`}>{l[status] || status}</span>
}

export default function AdmDashboard() {
  const [kpis, setKpis] = useState({ matriculados: 0, presentes: 0, faltas: 0, pendentes: 0 })
  const [chamadas, setChamadas] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [selecionada, setSelecionada] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function carregar() {
    const res = await fetch('/api/adm/dashboard')
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setKpis(data.kpis)
    setChamadas(data.chamadas)
    setAlertas(data.alertas)
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    const ch = supabase.channel('adm-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chamadas' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_chamada' }, carregar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, carregar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entradas' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#58a6ff] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Visão Geral</h1>
          <p className="text-gray-400 text-sm capitalize">{formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#39d353]">
          <span className="w-2 h-2 bg-[#39d353] rounded-full live-dot" />
          <span>Ao vivo</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Matriculados" value={kpis.matriculados} color="text-white" icon="👥" />
        <KPI label="Presentes Hoje" value={kpis.presentes} color="text-[#39d353]" icon="✅" />
        <KPI label="Faltas Hoje" value={kpis.faltas} color="text-[#f85149]" icon="❌" />
        <KPI label="Chamadas Pendentes" value={kpis.pendentes} color="text-[#e3b341]" icon="⏳" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Chamadas */}
        <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center justify-between text-sm">
            📋 Chamadas de Hoje
            <span className="text-xs bg-[#21262d] text-gray-400 px-2.5 py-1 rounded-lg">{chamadas.length} total</span>
          </h2>
          {chamadas.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <div className="text-3xl mb-2">📭</div>
              <p>Nenhuma chamada iniciada hoje</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {chamadas.map((c: any) => {
                const regs = c.registros_chamada || []
                const p = regs.filter((r: any) => r.status === 'presente').length
                const f = regs.filter((r: any) => r.status === 'falta').length
                const total = regs.length
                const prog = total > 0 ? Math.round((regs.filter((r: any) => r.status).length / total) * 100) : 0
                const sel = selecionada?.id === c.id

                return (
                  <div key={c.id} onClick={() => setSelecionada(sel ? null : c)}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${sel ? 'border-[#58a6ff]/40 bg-[#58a6ff]/5' : 'border-[#30363d] hover:bg-[#21262d]'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{c.aulas?.turmas?.nome}</span>
                        <span className="text-gray-400 text-xs">{c.aulas?.disciplinas?.nome}</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>👨‍🏫 {c.aulas?.usuarios?.nome}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatTime(c.aulas?.horario_inicio)} – {formatTime(c.aulas?.horario_fim)}</span>
                    </div>
                    {c.status === 'em_andamento' && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Progresso</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }} className="text-[#58a6ff]">{prog}%</span>
                        </div>
                        <div className="w-full bg-[#0d1117] rounded-full h-1.5">
                          <div className="bg-[#58a6ff] h-1.5 rounded-full transition-all" style={{ width: `${prog}%` }} />
                        </div>
                      </div>
                    )}
                    {c.status === 'concluida' && (
                      <div className="flex gap-4 mt-2 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
                        <span className="text-[#39d353]">{p} presentes</span>
                        <span className="text-[#f85149]">{f} faltas</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center justify-between text-sm">
            🔔 Alertas
            {alertas.length > 0 && (
              <span className="bg-[#f85149] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{alertas.length}</span>
            )}
          </h2>
          {alertas.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              <div className="text-2xl mb-2">✅</div>
              <p>Sem alertas pendentes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a: any) => (
                <div key={a.id} className={`border rounded-lg p-3 ${
                  a.tipo === 'falta_excessiva' || a.tipo === 'faltas_consecutivas' ? 'border-[#f85149]/25 bg-[#f85149]/5' :
                  a.tipo === 'chamada_nao_iniciada' ? 'border-[#e3b341]/25 bg-[#e3b341]/5' :
                  'border-[#30363d] bg-[#21262d]'
                }`}>
                  <p className="text-xs text-gray-300 leading-relaxed">{a.descricao}</p>
                  {a.alunos && <p className="text-xs text-gray-500 mt-1">👤 {a.alunos.nome_completo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detalhe chamada selecionada */}
      {selecionada && (
        <div className="bg-[#161b22] border border-[#58a6ff]/30 rounded-xl p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">👁 Detalhe: {selecionada.aulas?.turmas?.nome}</h3>
            <button onClick={() => setSelecionada(null)} className="text-gray-400 hover:text-white transition-colors text-lg leading-none">×</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(selecionada.registros_chamada || []).map((r: any) => (
              <span key={r.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                r.status === 'presente' ? 'bg-[#39d353]/10 text-[#39d353] border-[#39d353]/25' :
                r.status === 'falta' ? 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/25' :
                r.status === 'justificada' ? 'bg-[#e3b341]/10 text-[#e3b341] border-[#e3b341]/25' :
                'bg-gray-500/10 text-gray-400 border-gray-500/25'
              }`}>
                {r.alunos?.nome_completo}
              </span>
            ))}
            {(selecionada.registros_chamada || []).length === 0 && (
              <p className="text-gray-500 text-sm">Nenhum registro ainda</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
