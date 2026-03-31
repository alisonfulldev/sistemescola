'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'

function KPI({ label, value, color, icon, sub }: { label: string; value: number | string; color: string; icon: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold ${color}`} style={{ fontFamily: 'DM Mono, monospace' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    concluida: 'bg-green-50 text-green-700',
    em_andamento: 'bg-blue-50 text-blue-700',
    pendente: 'bg-amber-50 text-amber-700',
  }
  const l: Record<string, string> = { concluida: '✓ Concluída', em_andamento: '⏳ Em andamento', pendente: '◷ Aguardando' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m[status] || 'bg-slate-100 text-slate-500'}`}>{l[status] || status}</span>
}

function calcDiasLetivos(inicio: string, fim: string, especiais: Record<string, string>): number {
  const start = new Date(inicio + 'T12:00:00')
  const end = new Date(fim + 'T12:00:00')
  let count = 0
  const d = new Date(start)
  while (d <= end) {
    const dw = d.getDay()
    if (dw !== 0 && dw !== 6) {
      const key = d.toISOString().split('T')[0]
      const tipo = especiais[key]
      if (!tipo || tipo === 'letivo' || tipo === 'evento_escolar') count++
    }
    d.setDate(d.getDate() + 1)
  }
  return count
}

export default function AdmDashboard() {
  const [kpis, setKpis] = useState({ matriculados: 0, presentes: 0, faltas: 0, pendentes: 0 })
  const [chamadas, setChamadas] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [selecionada, setSelecionada] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bimestres, setBimestres] = useState<any[]>([])
  const [diasEspeciais, setDiasEspeciais] = useState<Record<string, string>>({})
  const [relatorio, setRelatorio] = useState<any[]>([])
  const supabase = createClient()

  async function carregar() {
    const [res, relRes, { data: anoAtivo }] = await Promise.all([
      fetch('/api/adm/dashboard'),
      fetch('/api/adm/relatorio'),
      supabase.from('anos_letivos').select('id, bimestres(numero, data_inicio, data_fim)').eq('ativo', true).limit(1).single(),
    ])
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setKpis(data.kpis)
    setChamadas(data.chamadas)
    setAlertas(data.alertas)
    if (relRes.ok) { const rel = await relRes.json(); setRelatorio(rel.turmas || []) }

    if (anoAtivo?.id) {
      const bims = [...((anoAtivo as any).bimestres || [])].sort((a: any, b: any) => a.numero - b.numero)
      setBimestres(bims)
      const { data: cal } = await supabase.from('calendario_escolar').select('data, tipo_dia').eq('ano_letivo_id', anoAtivo.id)
      const map: Record<string, string> = {}
      for (const c of cal || []) map[c.data] = c.tipo_dia
      setDiasEspeciais(map)
    }
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
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Acesso Rápido</h1>
          <p className="text-slate-600 text-sm capitalize hidden sm:block">{formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full live-dot" />
          <span>Ao vivo</span>
        </div>
      </div>

      {/* Dias letivos por bimestre */}
      {bimestres.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {bimestres.map((b: any) => {
            const dl = calcDiasLetivos(b.data_inicio, b.data_fim, diasEspeciais)
            return (
              <div key={b.numero} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 font-semibold mb-1">{b.numero}º Bimestre</p>
                <p className="text-xl font-bold text-slate-900 font-mono">{dl}</p>
                <p className="text-xs text-slate-400">dias letivos</p>
              </div>
            )
          })}
          <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-green-700 font-semibold mb-1">Total</p>
            <p className="text-xl font-bold text-green-700 font-mono">
              {bimestres.reduce((acc: number, b: any) => acc + calcDiasLetivos(b.data_inicio, b.data_fim, diasEspeciais), 0)}
            </p>
            <p className="text-xs text-slate-400">no ano</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Matriculados" value={kpis.matriculados} color="text-slate-900" icon="👥" />
        <KPI label="Presentes Hoje" value={kpis.presentes} color="text-green-600" icon="✅" />
        <KPI label="Faltas Hoje" value={kpis.faltas} color="text-red-600" icon="❌" />
        <KPI label="Chamadas Pendentes" value={kpis.pendentes} color="text-amber-600" icon="⏳" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Chamadas */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center justify-between text-sm">
            📋 Chamadas de Hoje
            <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">{chamadas.length} total</span>
          </h2>
          {chamadas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
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
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${sel ? 'border-blue-200 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-medium text-sm">{c.aulas?.turmas?.nome}</span>
                        <span className="text-slate-500 text-xs">{c.aulas?.disciplinas?.nome}</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>👨‍🏫 {c.aulas?.usuarios?.nome}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatTime(c.aulas?.horario_inicio)} – {formatTime(c.aulas?.horario_fim)}</span>
                    </div>
                    {c.status === 'em_andamento' && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Progresso</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }} className="text-blue-600">{prog}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${prog}%` }} />
                        </div>
                      </div>
                    )}
                    {c.status === 'concluida' && (
                      <div className="flex gap-4 mt-2 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>
                        <span className="text-green-700">{p} presentes</span>
                        <span className="text-red-600">{f} faltas</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center justify-between text-sm">
            🔔 Alertas
            {alertas.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{alertas.length}</span>
            )}
          </h2>
          {alertas.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <div className="text-2xl mb-2">✅</div>
              <p>Sem alertas pendentes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a: any) => (
                <div key={a.id} className={`border rounded-lg p-3 ${a.tipo === 'falta_excessiva' || a.tipo === 'faltas_consecutivas' ? 'border-red-200 bg-red-50' :
                    a.tipo === 'chamada_nao_iniciada' ? 'border-amber-200 bg-amber-50' :
                      'border-slate-200 bg-slate-50'
                  }`}>
                  <p className="text-xs text-slate-700 leading-relaxed">{a.descricao}</p>
                  {a.alunos && <p className="text-xs text-slate-400 mt-1">👤 {a.alunos.nome_completo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Relatório por turma */}
      {relatorio.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 shadow-sm">
          <div className="px-5 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900 text-sm">📊 Situação por Turma</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="px-4 py-2.5 text-left font-medium">Turma</th>
                  <th className="px-3 py-2.5 text-center font-medium">Alunos</th>
                  <th className="px-3 py-2.5 text-center font-medium">Aulas</th>
                  <th className="px-3 py-2.5 text-center font-medium">Conteúdos</th>
                  <th className="px-3 py-2.5 text-center font-medium">Notas</th>
                  <th className="px-3 py-2.5 text-center font-medium">Freq.</th>
                  <th className="px-3 py-2.5 text-center font-medium">Recuperação</th>
                  <th className="px-3 py-2.5 text-center font-medium">Diário</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.map((t: any) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-slate-900 font-medium">{t.nome}</p>
                      {t.turno && <p className="text-slate-400 text-xs">{t.turno}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600 font-mono">{t.total_alunos}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-mono text-slate-600">{t.aulas_realizadas}</span>
                      {t.aulas_previstas > 0 && <span className="text-slate-400">/{t.aulas_previstas}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-600">{t.conteudos_registrados}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-600">{t.notas_lancadas}</td>
                    <td className="px-3 py-2.5 text-center">
                      {t.freq_geral !== null ? (
                        <span className={`font-mono font-bold ${t.freq_geral >= 75 ? 'text-green-700' : 'text-red-600'}`}>{t.freq_geral}%</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {t.alunos_recuperacao > 0
                        ? <span className="text-amber-700 font-mono font-bold">{t.alunos_recuperacao}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {t.pdf_pronto
                        ? <span className="text-green-700">✓ Pronto</span>
                        : <span className="text-slate-400">Pendente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {relatorio.map((t: any) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-slate-900 font-semibold text-sm">{t.nome}</p>
                    {t.turno && <p className="text-slate-400 text-xs capitalize">{t.turno}</p>}
                  </div>
                  <div className="text-right">
                    {t.freq_geral !== null ? (
                      <span className={`text-lg font-bold font-mono ${t.freq_geral >= 75 ? 'text-green-700' : 'text-red-600'}`}>{t.freq_geral}%</span>
                    ) : <span className="text-slate-400 text-lg">—</span>}
                    <p className="text-slate-400 text-xs">freq.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-slate-700 font-mono font-bold">{t.total_alunos}</p>
                    <p className="text-slate-400">alunos</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-slate-700 font-mono font-bold">
                      {t.aulas_realizadas}{t.aulas_previstas > 0 ? <span className="text-slate-400 font-normal">/{t.aulas_previstas}</span> : ''}
                    </p>
                    <p className="text-slate-400">aulas</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    {t.alunos_recuperacao > 0
                      ? <p className="text-amber-700 font-mono font-bold">{t.alunos_recuperacao}</p>
                      : <p className="text-slate-400 font-mono">—</p>}
                    <p className="text-slate-400">recup.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhe chamada selecionada */}
      {selecionada && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-md animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 text-sm">👁 Detalhe: {selecionada.aulas?.turmas?.nome}</h3>
            <button onClick={() => setSelecionada(null)} className="text-slate-400 hover:text-slate-900 transition-colors text-lg leading-none">×</button>
          </div>
          <div className="space-y-1.5">
            {(selecionada.registros_chamada || []).map((r: any) => (
              <div key={r.id} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs border ${r.status === 'presente' ? 'bg-green-50 text-green-700 border-green-200' :
                  r.status === 'falta' ? 'bg-red-50 text-red-600 border-red-200' :
                    r.status === 'justificada' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                <span className="font-medium flex-1">{r.alunos?.nome_completo}</span>
                {r.motivo_alteracao && (
                  <span className="text-slate-400 italic truncate max-w-[200px]">
                    {r.horario_evento ? `🕐 ${r.horario_evento.slice(0, 5)} · ` : ''}{r.motivo_alteracao}
                  </span>
                )}
              </div>
            ))}
            {(selecionada.registros_chamada || []).length === 0 && (
              <p className="text-slate-400 text-sm">Nenhum registro ainda</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
