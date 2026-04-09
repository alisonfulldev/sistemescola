'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatTime } from '@/lib/utils'
import { Users, CheckCircle2, XCircle, Clock, FileText, Inbox, User, Bell, BarChart3, Eye, Settings } from 'lucide-react'

function KPI({ label, value, color, Icon, sub }: { label: string; value: number | string; color: string; Icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-600">{label}</p>
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          {Icon}
        </div>
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
  const l: Record<string, string> = {
    concluida: 'Concluída',
    em_andamento: 'Em andamento',
    pendente: 'Aguardando'
  }
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
  const [kpis, setKpis] = useState({ matriculados: 0, presentes: 0, faltas: 0, pendentes: 0 }) // v2
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-6 py-8 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-blue-200 text-sm">{formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <Settings className="w-4 h-4" />
              <span>Cadastros</span>
            </Link>
            <div className="flex items-center gap-2 text-sm text-green-100 bg-green-900 bg-opacity-50 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full live-dot" />
              <span className="font-medium">Ao vivo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-in max-w-7xl mx-auto px-6 pb-12">

      {/* Dias letivos por bimestre */}
      {bimestres.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {bimestres.map((b: any) => {
            const dl = calcDiasLetivos(b.data_inicio, b.data_fim, diasEspeciais)
            return (
              <div key={b.numero} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600 font-semibold mb-2">{b.numero}º Bimestre</p>
                <p className="text-2xl font-bold text-slate-900 font-mono">{dl}</p>
                <p className="text-xs text-slate-400 mt-1">dias letivos</p>
              </div>
            )
          })}
          <div className="bg-white border border-green-200 rounded-xl p-4 text-center">
            <p className="text-xs text-green-700 font-semibold mb-2">Total</p>
            <p className="text-2xl font-bold text-green-700 font-mono">
              {bimestres.reduce((acc: number, b: any) => acc + calcDiasLetivos(b.data_inicio, b.data_fim, diasEspeciais), 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">no ano</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label="Matriculados" value={kpis.matriculados} color="text-slate-900" Icon={<Users className="w-5 h-5 text-blue-600" />} />
        <KPI label="Presentes Hoje" value={kpis.presentes} color="text-green-600" Icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} />
        <KPI label="Faltas Hoje" value={kpis.faltas} color="text-red-600" Icon={<XCircle className="w-5 h-5 text-red-600" />} />
        <KPI label="Pendentes" value={kpis.pendentes} color="text-amber-600" Icon={<Clock className="w-5 h-5 text-amber-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Chamadas */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Chamadas de Hoje
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-medium">{chamadas.length} total</span>
          </div>
          {chamadas.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm">Nenhuma chamada iniciada hoje</p>
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-semibold text-sm">{c.aulas?.turmas?.nome}</span>
                        <span className="text-slate-500 text-xs">{c.aulas?.disciplinas?.nome}</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>{c.aulas?.usuarios?.nome}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace' }}>{formatTime(c.aulas?.horario_inicio)} – {formatTime(c.aulas?.horario_fim)}</span>
                    </div>
                    {c.status === 'em_andamento' && (
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-400">Progresso</span>
                          <span style={{ fontFamily: 'DM Mono, monospace' }} className="text-blue-600 font-medium">{prog}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${prog}%` }} />
                        </div>
                      </div>
                    )}
                    {c.status === 'concluida' && (
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-700 font-medium">{p} presentes</span>
                        <span className="text-red-600 font-medium">{f} faltas</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Alertas
            </h2>
            {alertas.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2.5 py-1">{alertas.length}</span>
            )}
          </div>
          {alertas.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm">Sem alertas pendentes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a: any) => (
                <div key={a.id} className={`border rounded-lg p-3 ${a.tipo === 'falta_excessiva' || a.tipo === 'faltas_consecutivas' ? 'border-red-200 bg-red-50' :
                    a.tipo === 'chamada_nao_iniciada' ? 'border-amber-200 bg-amber-50' :
                      'border-slate-200 bg-slate-50'
                  }`}>
                  <p className="text-xs text-slate-700 leading-relaxed">{a.descricao}</p>
                  {a.alunos && <p className="text-xs text-slate-500 mt-1">{a.alunos.nome_completo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Relatório por turma */}
      {relatorio.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">Situação por Turma</h2>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="px-6 py-3 text-left font-semibold">Turma</th>
                  <th className="px-3 py-3 text-center font-semibold">Alunos</th>
                  <th className="px-3 py-3 text-center font-semibold">Aulas</th>
                  <th className="px-3 py-3 text-center font-semibold">Conteúdos</th>
                  <th className="px-3 py-3 text-center font-semibold">Notas</th>
                  <th className="px-3 py-3 text-center font-semibold">Freq.</th>
                  <th className="px-3 py-3 text-center font-semibold">Recuperação</th>
                  <th className="px-3 py-3 text-center font-semibold">Diário</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.map((t: any) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-slate-900 font-medium">{t.nome}</p>
                      {t.turno && <p className="text-slate-500 text-xs capitalize">{t.turno}</p>}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-700 font-mono">{t.total_alunos}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-mono text-slate-700">{t.aulas_realizadas}</span>
                      {t.aulas_previstas > 0 && <span className="text-slate-500">/{t.aulas_previstas}</span>}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-700">{t.conteudos_registrados}</td>
                    <td className="px-3 py-3 text-center font-mono text-slate-700">{t.notas_lancadas}</td>
                    <td className="px-3 py-3 text-center">
                      {t.freq_geral !== null ? (
                        <span className={`font-mono font-bold ${t.freq_geral >= 75 ? 'text-green-700' : 'text-red-600'}`}>{t.freq_geral}%</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {t.alunos_recuperacao > 0
                        ? <span className="text-amber-700 font-mono font-bold">{t.alunos_recuperacao}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {t.pdf_pronto
                        ? <span className="text-green-700 font-medium">Pronto</span>
                        : <span className="text-slate-500">Pendente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {relatorio.map((t: any) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-slate-900 font-semibold">{t.nome}</p>
                    {t.turno && <p className="text-slate-500 text-xs capitalize">{t.turno}</p>}
                  </div>
                  <div className="text-right">
                    {t.freq_geral !== null ? (
                      <span className={`text-xl font-bold font-mono ${t.freq_geral >= 75 ? 'text-green-700' : 'text-red-600'}`}>{t.freq_geral}%</span>
                    ) : <span className="text-slate-500 text-xl">—</span>}
                    <p className="text-slate-500 text-xs">freq.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-slate-800 font-mono font-bold">{t.total_alunos}</p>
                    <p className="text-slate-500 text-xs mt-0.5">alunos</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-slate-800 font-mono font-bold">
                      {t.aulas_realizadas}{t.aulas_previstas > 0 ? <span className="text-slate-500 font-normal">/{t.aulas_previstas}</span> : ''}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">aulas</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    {t.alunos_recuperacao > 0
                      ? <p className="text-amber-700 font-mono font-bold">{t.alunos_recuperacao}</p>
                      : <p className="text-slate-500 font-mono">—</p>}
                    <p className="text-slate-500 text-xs mt-0.5">recup.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detalhe chamada selecionada */}
      {selecionada && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-md mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              Detalhe: {selecionada.aulas?.turmas?.nome}
            </h3>
            <button onClick={() => setSelecionada(null)} className="text-slate-400 hover:text-slate-900 transition-colors font-semibold">✕</button>
          </div>
          <div className="space-y-1.5">
            {(selecionada.registros_chamada || []).map((r: any) => (
              <div key={r.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-xs border ${r.status === 'presente' ? 'bg-green-50 text-green-700 border-green-200' :
                  r.status === 'falta' ? 'bg-red-50 text-red-600 border-red-200' :
                    r.status === 'justificada' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                <span className="font-medium flex-1">{r.alunos?.nome_completo}</span>
                {r.motivo_alteracao && (
                  <span className="text-slate-500 italic truncate max-w-[200px]">
                    {r.horario_evento ? `${r.horario_evento.slice(0, 5)} · ` : ''}{r.motivo_alteracao}
                  </span>
                )}
              </div>
            ))}
            {(selecionada.registros_chamada || []).length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">Nenhum registro ainda</p>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
