'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const TIPOS: Record<string, { label: string; cor: string; bg: string; conta: boolean }> = {
  letivo:             { label: 'Letivo',              cor: 'text-[#39d353]',  bg: 'bg-[#39d353]',  conta: true  },
  feriado_nacional:   { label: 'Feriado Nacional',    cor: 'text-red-400',    bg: 'bg-red-500',    conta: false },
  feriado_municipal:  { label: 'Feriado Municipal',   cor: 'text-orange-400', bg: 'bg-orange-500', conta: false },
  ponto_facultativo:  { label: 'Ponto Facultativo',   cor: 'text-yellow-400', bg: 'bg-yellow-500', conta: false },
  recesso:            { label: 'Recesso',              cor: 'text-blue-400',   bg: 'bg-blue-500',   conta: false },
  evento_escolar:     { label: 'Evento Escolar',       cor: 'text-purple-400', bg: 'bg-purple-500', conta: true  },
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

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('anos_letivos')
        .select('id, ano, ativo, data_inicio, data_fim, bimestres(*)')
        .order('ano', { ascending: false })
      setAnosLetivos(data || [])
      const ativo = (data || []).find((a: any) => a.ativo)
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
    if (isWeekend(date)) return 'text-gray-600 bg-[#0d1117]'
    const tipo = getTipoDia(date)
    if (!tipo || tipo === 'letivo') return 'text-gray-300 bg-[#161b22] hover:bg-[#21262d] cursor-pointer'
    const t = TIPOS[tipo]
    return `${t.cor} bg-[#0d1117] hover:bg-[#21262d] cursor-pointer`
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
    if (!modal || !anoLetivoId) return
    setSalvando(true)
    if (modal.tipo === 'letivo') {
      // Remove a entrada (volta ao padrão letivo)
      if (diasEspeciais[modal.data]) {
        await supabase.from('calendario_escolar').delete().eq('id', diasEspeciais[modal.data].id)
      }
    } else {
      await supabase.from('calendario_escolar').upsert({
        ...(diasEspeciais[modal.data]?.id ? { id: diasEspeciais[modal.data].id } : {}),
        ano_letivo_id: anoLetivoId,
        data: modal.data,
        tipo_dia: modal.tipo,
        descricao: modal.descricao || null,
      }, { onConflict: 'ano_letivo_id,data' })
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
          <h1 className="text-xl font-bold text-white">Calendário Escolar</h1>
          <p className="text-gray-400 text-sm">Marque feriados, recessos e eventos — dias letivos calculados automaticamente</p>
        </div>
        <select value={anoLetivoId} onChange={e => setAnoLetivoId(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500">
          {anosLetivos.map((a: any) => (
            <option key={a.id} value={a.id}>{a.ano}{a.ativo ? ' (ativo)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Dias letivos por bimestre */}
      {bimsSorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {bimsSorted.map((b: any) => (
            <div key={b.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center">
              <p className="text-xs text-purple-400 font-semibold mb-1">{b.numero}º Bimestre</p>
              <p className="text-2xl font-bold text-white font-mono">{calcularDiasLetivos(b.data_inicio, b.data_fim)}</p>
              <p className="text-xs text-gray-600 mt-0.5">dias letivos</p>
            </div>
          ))}
          <div className="bg-[#161b22] border border-[#39d353]/30 rounded-xl p-3 text-center">
            <p className="text-xs text-[#39d353] font-semibold mb-1">Total no Ano</p>
            <p className="text-2xl font-bold text-[#39d353] font-mono">{totalAno}</p>
            <p className="text-xs text-gray-600 mt-0.5">dias letivos</p>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(TIPOS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${v.bg}`} />
            {v.label}
            {!v.conta && <span className="text-gray-600">(não conta)</span>}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          Fim de semana
        </span>
      </div>

      {/* Navegação do mês */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => { if (mes === 0) { setMes(11); setAno(a => a - 1) } else setMes(m => m - 1) }}
          className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-gray-400 hover:text-white hover:bg-[#21262d] transition-all">
          ‹
        </button>
        <h2 className="text-white font-semibold text-base min-w-[160px] text-center">
          {MESES[mes]} {ano}
        </h2>
        <button onClick={() => { if (mes === 11) { setMes(0); setAno(a => a + 1) } else setMes(m => m + 1) }}
          className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-gray-400 hover:text-white hover:bg-[#21262d] transition-all">
          ›
        </button>
      </div>

      {/* Grade do calendário */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#30363d]">
          {DIAS_SEMANA.map(d => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${d === 'Dom' || d === 'Sáb' ? 'text-gray-600' : 'text-gray-400'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {diasMes.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="h-12 border-b border-r border-[#30363d]/30" />
            const ponto = pontoDia(date)
            const descricao = diasEspeciais[toKey(date)]?.descricao
            return (
              <div
                key={toKey(date)}
                onClick={() => clicarDia(date)}
                title={descricao || undefined}
                className={`h-12 border-b border-r border-[#30363d]/30 flex flex-col items-center justify-center gap-0.5 transition-all ${corDia(date)}`}
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
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-white font-semibold mb-1">
              {new Date(modal.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h3>
            <p className="text-xs text-gray-500 mb-4">Clique em Letivo para voltar ao padrão</p>

            <div className="space-y-2 mb-4">
              {Object.entries(TIPOS).map(([k, v]) => (
                <button key={k} onClick={() => setModal(p => p ? { ...p, tipo: k } : null)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-sm ${
                    modal.tipo === k
                      ? `border-current ${v.cor} bg-[#0d1117]`
                      : 'border-[#30363d] text-gray-400 hover:bg-[#21262d]'
                  }`}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${v.bg}`} />
                  <span>{v.label}</span>
                  {!v.conta && <span className="ml-auto text-xs text-gray-600">não conta</span>}
                </button>
              ))}
            </div>

            {modal.tipo !== 'letivo' && (
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1.5">Descrição (opcional)</label>
                <input type="text" value={modal.descricao}
                  onChange={e => setModal(p => p ? { ...p, descricao: e.target.value } : null)}
                  placeholder="Ex: Aniversário de Narandiba"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500" />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={salvarModal} disabled={salvando}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-[#30363d] text-gray-300 text-sm rounded-lg hover:bg-[#21262d] transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
