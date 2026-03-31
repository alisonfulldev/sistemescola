'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AvaliacoesDashboard() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [avaliacoes, setAvaliacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      setTurmas(turmasData || [])
      if (turmasData?.length) {
        setTurmaSelecionada(turmasData[0].id)
        carregarAvaliacoes(turmasData[0].id)
      }
      setLoading(false)
    }
    carregar()
  }, [supabase])

  async function carregarAvaliacoes(turmaId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/avaliacoes?turma_id=${turmaId}`)
      if (res.ok) {
        const { avaliacoes: avs } = await res.json()
        setAvaliacoes(avs || [])
      }
    } catch (e) {
      console.error('Erro ao carregar avaliações')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Avaliações</h1>
        <p className="text-slate-600 text-sm mt-1">Acompanhe todas as provas e trabalhos registrados</p>
      </div>

      {/* Seletor de turma */}
      {turmas.length > 0 && (
        <div className="mb-5 bg-white border border-slate-200 rounded-xl p-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">
            Filtrar por turma
          </label>
          <select
            value={turmaSelecionada}
            onChange={e => {
              setTurmaSelecionada(e.target.value)
              carregarAvaliacoes(e.target.value)
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {turmas.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista de avaliações */}
      {avaliacoes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhuma avaliação registrada nesta turma.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map(av => (
            <div key={av.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-base">{av.titulo}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {av.tipo.charAt(0).toUpperCase() + av.tipo.slice(1)} • {av.disciplinas?.nome}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(av.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                    Valor: {av.valor_maximo}
                  </p>
                </div>
              </div>

              {av.descricao && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2 mb-3">
                  {av.descricao}
                </p>
              )}

              <Link
                href={`/adm/avaliacoes/${av.id}/notas`}
                className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                Ver notas →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
