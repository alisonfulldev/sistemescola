'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

const TIPOS = [
  { v: 'all', l: 'Todos' },
  { v: 'falta_excessiva', l: 'Falta Excessiva' },
  { v: 'faltas_consecutivas', l: 'Faltas Consecutivas' },
  { v: 'chamada_nao_iniciada', l: 'Chamada Não Iniciada' },
  { v: 'justificativa', l: 'Justificativa' },
]

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<any[]>([])
  const [filtro, setFiltro] = useState('all')
  const [apenasNaoLidos, setApenasNaoLidos] = useState(true)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function carregar() {
    let q = supabase.from('alertas').select('*, alunos(nome_completo), turmas(nome)').order('criado_em', { ascending: false }).limit(50)
    if (filtro !== 'all') q = q.eq('tipo', filtro)
    if (apenasNaoLidos) q = q.eq('lido', false)
    const { data } = await q
    setAlertas(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [filtro, apenasNaoLidos])

  useEffect(() => {
    const ch = supabase.channel('alertas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function marcarLido(id: string) {
    await supabase.from('alertas').update({ lido: true }).eq('id', id)
    carregar()
  }

  async function marcarTodosLidos() {
    await supabase.from('alertas').update({ lido: true }).eq('lido', false)
    carregar()
  }

  const alertaIcon: Record<string, string> = {
    falta_excessiva: '⚠️', faltas_consecutivas: '🔴', chamada_nao_iniciada: '⏰', justificativa: '📝', chamada_atrasada: '🔔'
  }
  const alertaCor: Record<string, string> = {
    falta_excessiva: 'border-red-200 bg-red-50',
    faltas_consecutivas: 'border-red-200 bg-red-50',
    chamada_nao_iniciada: 'border-amber-200 bg-amber-50',
    justificativa: 'border-blue-200 bg-blue-50',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alertas</h1>
          <p className="text-slate-600 text-sm">{alertas.length} alerta(s)</p>
        </div>
        <button onClick={marcarTodosLidos} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
          Marcar todos como lidos
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {TIPOS.map(t => (
          <button key={t.v} onClick={() => setFiltro(t.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${filtro === t.v ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-200'
              }`}
          >{t.l}</button>
        ))}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input type="checkbox" checked={apenasNaoLidos} onChange={e => setApenasNaoLidos(e.target.checked)} className="w-4 h-4 accent-blue-600" />
          <span className="text-xs text-slate-600">Apenas não lidos</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-4xl mb-3">✅</div><p>Nenhum alerta encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a: any) => (
            <div key={a.id} className={`border rounded-xl p-4 flex items-start gap-4 ${alertaCor[a.tipo] || 'border-slate-200 bg-white'}`}>
              <span className="text-xl flex-shrink-0">{alertaIcon[a.tipo] || 'ℹ️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 text-sm">{a.descricao}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                  {a.alunos && <span>👤 {a.alunos.nome_completo}</span>}
                  {a.turmas && <span>🏫 {a.turmas.nome}</span>}
                  <span>{formatDate(a.criado_em, "dd/MM 'às' HH:mm")}</span>
                </div>
              </div>
              {!a.lido && (
                <button onClick={() => marcarLido(a.id)}
                  className="flex-shrink-0 text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                >✓ Lido</button>
              )}
              {a.lido && <span className="flex-shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Lido</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
