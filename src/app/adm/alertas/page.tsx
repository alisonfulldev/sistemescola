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
    falta_excessiva: 'border-[#f85149]/25 bg-[#f85149]/5',
    faltas_consecutivas: 'border-[#f85149]/25 bg-[#f85149]/5',
    chamada_nao_iniciada: 'border-[#e3b341]/25 bg-[#e3b341]/5',
    justificativa: 'border-[#58a6ff]/25 bg-[#58a6ff]/5',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Alertas</h1>
          <p className="text-gray-400 text-sm">{alertas.length} alerta(s)</p>
        </div>
        <button onClick={marcarTodosLidos} className="text-sm text-[#58a6ff] hover:text-blue-300 transition-colors">
          Marcar todos como lidos
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {TIPOS.map(t => (
          <button key={t.v} onClick={() => setFiltro(t.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filtro === t.v ? 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/30' : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:border-[#58a6ff]/25'
            }`}
          >{t.l}</button>
        ))}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <input type="checkbox" checked={apenasNaoLidos} onChange={e => setApenasNaoLidos(e.target.checked)} className="w-4 h-4 accent-[#58a6ff]" />
          <span className="text-xs text-gray-400">Apenas não lidos</span>
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-4 border-[#58a6ff] border-t-transparent rounded-full" /></div>
      ) : alertas.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-[#161b22] border border-[#30363d] rounded-xl">
          <div className="text-4xl mb-3">✅</div><p>Nenhum alerta encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a: any) => (
            <div key={a.id} className={`border rounded-xl p-4 flex items-start gap-4 ${alertaCor[a.tipo] || 'border-[#30363d] bg-[#21262d]'}`}>
              <span className="text-xl flex-shrink-0">{alertaIcon[a.tipo] || 'ℹ️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-sm">{a.descricao}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                  {a.alunos && <span>👤 {a.alunos.nome_completo}</span>}
                  {a.turmas && <span>🏫 {a.turmas.nome}</span>}
                  <span>{formatDate(a.criado_em, "dd/MM 'às' HH:mm")}</span>
                </div>
              </div>
              {!a.lido && (
                <button onClick={() => marcarLido(a.id)}
                  className="flex-shrink-0 text-xs text-[#58a6ff] border border-[#58a6ff]/30 hover:bg-[#58a6ff]/10 px-3 py-1.5 rounded-lg transition-all"
                >✓ Lido</button>
              )}
              {a.lido && <span className="flex-shrink-0 text-xs text-gray-500 bg-[#30363d] px-2 py-1 rounded-lg">Lido</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
