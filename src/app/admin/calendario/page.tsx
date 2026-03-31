'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'


const TIPOS: Record<string, { label: string; cor: string; bg: string; conta: boolean }> = {
  letivo:             { label: 'Letivo',              cor: 'text-green-700',  bg: 'bg-green-500',  conta: true  },
  feriado_nacional:   { label: 'Feriado Nacional',    cor: 'text-red-600',    bg: 'bg-red-500',    conta: false },
  feriado_municipal:  { label: 'Feriado Municipal',   cor: 'text-orange-600', bg: 'bg-orange-500', conta: false },
  ponto_facultativo:  { label: 'Ponto Facultativo',   cor: 'text-amber-700',  bg: 'bg-amber-500',  conta: false },
  recesso:            { label: 'Recesso',              cor: 'text-blue-700',   bg: 'bg-blue-500',   conta: false },
  evento_escolar:     { label: 'Evento Escolar',       cor: 'text-blue-700',   bg: 'bg-blue-500',   conta: true  },
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function isWeekend(date: Date) {
  return date.getDay() === 0 || date.getDay() === 6
}

function toKey(date: Date) {
  return date.toISOString().split('T')[0]
}

export default function CalendarioPage() {
  const supabase = createClient()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [anosLetivos, setAnosLetivos] = useState<any[]>([])
  const [anoLetivoId, setAnoLetivoId] = useState('')
  const [bimestres, setBimestres] = useState<any[]>([])
  const [diasEspeciais, setDiasEspeciais] = useState<Record<string, any>>({})
  const [modal, setModal] = useState<{ data: string; tipo: string; descricao: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')
  useEffect(() => {
    async function init() {
      const { data, error } = await supabase
        .from('anos_letivos')
        .select('id, ano, ativo, data_inicio, data_fim, bimestres(*)')
        .order('ano', { ascending: false })
      if (error) console.error('anos_letivos:', error)
      setAnosLetivos(data || [])
      const ativo = (data || []).find((a: any) => a.ativo) || (data || [])[0]
      if (ativo) {
        setAnoLetivoId(ativo.id)
        setBimestres(ativo.bimestres || [])
        const anoNum = ativo.ano || hoje.getFullYear()
        setAno(anoNum)
        setMes(new Date().getMonth())
      }
    }
    init()
  }, [])

  const carregarDias = useCallback(async () => {
    if (!anoLetivoId) return
    const { data } = await supabase
      .from('calendario_escolar')
      .select('*')
      .eq('ano_letivo_id', anoLetivoId)
    const map: Record<string, any> = {}
    for (const d of data || []) map[d.data] = d
    setDiasEspeciais(map)
  }, [anoLetivoId, supabase])

  useEffect(() => { carregarDias() }, [carregarDias])

  useEffect(() => {
    if (!anoLetivoId) return
    const al = anosLetivos.find((a: any) => a.id === anoLetivoId)
    if (al) setBimestres(al.bimestres || [])
  }, [anoLetivoId, anosLetivos])

  function getDiasDoMes() {
    const primeiro = new Date(ano, mes, 1)
    const ultimo = new Date(ano, mes + 1, 0)
    const dias: (Date | null)[] = []
    for (let i = 0; i < primeiro.getDay(); i++) dias.push(null)
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(new Date(ano, mes, d))
    return dias
  }

  function getTipoDia(date: Date): string | null {
    const key = toKey(date)
    if (diasEspeciais[key]) return diasEspeciais[key].tipo_dia
    return null
  }

  function corDia(date: Date) {
    if (isWeekend(date)) return 'text-slate-300 bg-slate-50'
    const tipo = getTipoDia(date)
    if (!tipo || tipo === 'letivo') return 'text-slate-700 bg-white hover:bg-slate-50 cursor-pointer'
    const t = TIPOS[tipo]
    return `${t.cor} bg-white hover:bg-slate-50 cursor-pointer`
  }

  function pontoDia(date: Date) {
    const tipo = getTipoDia(date)
    if (!tipo || isWeekend(date)) return null
    return TIPOS[tipo]?.bg || null
  }

  function calcularDiasLetivos(dataInicio?: string, dataFim?: string): number {
    const inicio = dataInicio ? new Date(dataInicio + 'T12:00:00') : new Date(ano, 0, 1)
    const fim = dataFim ? new Date(dataFim + 'T12:00:00') : new Date(ano, 11, 31)
    let count = 0
    const d = new Date(inicio)
    while (d <= fim) {
      if (!isWeekend(d)) {
        const key = toKey(d)
        const tipo = diasEspeciais[key]?.tipo_dia
        if (!tipo || TIPOS[tipo]?.conta) count++
      }
      d.setDate(d.getDate() + 1)
    }
    return count
  }

  function clicarDia(date: Date) {
    if (isWeekend(date)) return
    const key = toKey(date)
    const existente = diasEspeciais[key]
    setModal({
      data: key,
      tipo: existente?.tipo_dia || 'letivo',
      descricao: existente?.descricao || '',
    })
  }

  async function salvarModal() {
    if (!modal) return
    if (!anoLetivoId) { setErroModal('Selecione um ano letivo antes de salvar.'); return }
    setSalvando(true)
    setErroModal('')
    if (modal.tipo === 'letivo') {
      if (diasEspeciais[modal.data]) {
        const { error } = await supabase.from('calendario_escolar').delete().eq('id', diasEspeciais[modal.data].id)
        if (error) { setErroModal(error.message); setSalvando(false); return }
      }
    } else {
      const { error } = await supabase.from('calendario_escolar').upsert({
        ...(diasEspeciais[modal.data]?.id ? { id: diasEspeciais[modal.data].id } : {}),
        ano_letivo_id: anoLetivoId,
        data: modal.data,
        tipo_dia: modal.tipo,
        descricao: modal.descricao || null,
      }, { onConflict: 'ano_letivo_id,data' })
      if (error) { setErroModal(error.message); setSalvando(false); return }
    }
    await carregarDias()
    setModal(null)
    setSalvando(false)
  }

  const diasMes = getDiasDoMes()
  const bimsSorted = [...bimestres].sort((a: any, b: any) => a.numero - b.numero)
  const totalAno = bimsSorted.length > 0
    ? calcularDiasLetivos(bimsSorted[0]?.data_inicio, bimsSorted[bimsSorted.length - 1]?.data_fim)
    : calcularDiasLetivos()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calendário Escolar</h1>
          <p className="text-slate-600 text-sm">Marque feriados, recessos e eventos — dias letivos calculados automaticamente</p>
        </div>
        <select value={anoLetivoId} onChange={e => setAnoLetivoId(e.target.value)}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
          {anosLetivos.map((a: any) => (
            <option key={a.id} value={a.id}>{a.ano}{a.ativo ? ' (ativo)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Dias letivos por bimestre */}
      {bimsSorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {bimsSorted.map((b: any) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 text-center shadow-sm">
              <p className="text-xs text-blue-600 font-semibold mb-1">{b.numero}º Bimestre</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{calcularDiasLetivos(b.data_inicio, b.data_fim)}</p>
              <p className="text-xs text-slate-400 mt-0.5">dias letivos</p>
            </div>
          ))}
          <div className="bg-white border border-green-200 rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-green-700 font-semibold mb-1">Total no Ano</p>
            <p className="text-2xl font-bold text-green-700 font-mono">{totalAno}</p>
            <p className="text-xs text-slate-400 mt-0.5">dias letivos</p>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(TIPOS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-full ${v.bg}`} />
            {v.label}
            {!v.conta && <span className="text-slate-400">(não conta)</span>}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          Fim de semana
        </span>
      </div>

      {/* Navegação do mês */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => { if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1) }}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm">
          ‹
        </button>
        <h2 className="text-slate-900 font-semibold text-base min-w-[160px] text-center">
          {MESES[mes]} {ano}
        </h2>
        <button onClick={() => { if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1) }}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm">
          ›
        </button>
      </div>

      {/* Grade do calendário */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {DIAS_SEMANA.map(d => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${d === 'Dom' || d === 'Sáb' ? 'text-slate-300' : 'text-slate-500'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {diasMes.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="h-12 border-b border-r border-slate-100" />
            const ponto = pontoDia(date)
            const descricao = diasEspeciais[toKey(date)]?.descricao
            return (
              <div
                key={toKey(date)}
                onClick={() => clicarDia(date)}
                title={descricao || undefined}
                className={`h-12 border-b border-r border-slate-100 flex flex-col items-center justify-center gap-0.5 transition-all ${corDia(date)}`}
              >
                <span className="text-xs font-medium">{date.getDate()}</span>
                {ponto && <span className={`w-1.5 h-1.5 rounded-full ${ponto}`} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de edição do dia */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-slate-900 font-semibold mb-1">
              {new Date(modal.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Clique em Letivo para voltar ao padrão</p>
            {erroModal && <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">{erroModal}</div>}

            <div className="space-y-2 mb-4">
              {Object.entries(TIPOS).map(([k, v]) => (
                <button key={k} onClick={() => setModal(p => p ? { ...p, tipo: k } : null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-sm ${
                    modal.tipo === k
                      ? `border-blue-200 ${v.cor} bg-blue-50`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${v.bg}`} />
                  <span>{v.label}</span>
                  {!v.conta && <span className="ml-auto text-xs text-slate-400">não conta</span>}
                </button>
              ))}
            </div>

            {modal.tipo !== 'letivo' && (
              <div className="mb-4">
                <label className="block text-xs text-slate-600 mb-1.5">Descrição (opcional)</label>
                <input type="text" value={modal.descricao}
                  onChange={e => setModal(p => p ? { ...p, descricao: e.target.value } : null)}
                  placeholder="Ex: Aniversário de Narandiba"
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={salvarModal} disabled={salvando}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
