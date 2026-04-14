'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfessorNotasPage() {
  const supabase = createClient()
  const [turmas, setTurmas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [anosLetivos, setAnosLetivos] = useState<any[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [anoLetivoId, setAnoLetivoId] = useState('')
  const [alunos, setAlunos] = useState<any[]>([])
  const [notas, setNotas] = useState<Record<string, any>>({})
  const [editando, setEditando] = useState<Record<string, {b1?: string, b2?: string, b3?: string, b4?: string}>>({})
  const [salvando, setSalvando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar turmas onde o professor tem aulas
      const { data: aulasData } = await supabase
        .from('aulas')
        .select('turma_id, disciplina_id, disciplinas(id, nome)')
        .eq('professor_id', user.id)

      // Extrair turmas e disciplinas únicas
      const turmasUnicas = Array.from(new Map(
        (aulasData || []).map((a: any) => [a.turma_id, a.turma_id])
      ).values())

      const disciplinasUnicas = Array.from(new Map(
        (aulasData || [])
          .filter((a: any) => a.disciplinas && typeof a.disciplinas === 'object' && 'id' in a.disciplinas)
          .map((a: any) => [(a.disciplinas as any).id, a.disciplinas])
      ).values())

      // Buscar dados de turmas e anos letivos
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('turmas').select('id, nome').in('id', turmasUnicas.length > 0 ? turmasUnicas : ['']).order('nome'),
        supabase.from('anos_letivos').select('id, ano, ativo').order('ano', { ascending: false }),
      ])

      setTurmas(t || [])
      setDisciplinas(disciplinasUnicas)
      setAnosLetivos(a || [])

      // Selecionar turma, disciplina e ano letivo automaticamente
      if (t && t.length > 0) setTurmaId(t[0].id)
      if (disciplinasUnicas.length > 0) setDisciplinaId(disciplinasUnicas[0].id)
      const anoAtivo = (a || []).find((x: any) => x.ativo)
      if (anoAtivo) setAnoLetivoId(anoAtivo.id)
    }
    init()
  }, [])

  const carregarAlunos = useCallback(async () => {
    if (!turmaId) return
    setLoading(true)
    const { data } = await supabase
      .from('alunos')
      .select('id, nome_completo, matricula, numero_chamada')
      .eq('turma_id', turmaId)
      .eq('situacao', 'ativo')
      .order('numero_chamada')
      .order('nome_completo')
    setAlunos(data || [])
    setLoading(false)
  }, [turmaId])


  const carregarNotas = useCallback(async () => {
    if (!turmaId || !disciplinaId || !anoLetivoId) return
    setLoading(true)
    const res = await fetch(`/api/professor/notas_bimestral?turma_id=${turmaId}&disciplina_id=${disciplinaId}&ano_letivo_id=${anoLetivoId}`)
    const data = await res.json()
    setNotas(data.notas || {})
    setLoading(false)
  }, [turmaId, disciplinaId, anoLetivoId])


  useEffect(() => { carregarAlunos() }, [carregarAlunos])
  useEffect(() => { carregarNotas() }, [carregarNotas])

  const handleNotaChange = (alunoId: string, bimestre: 'b1' | 'b2' | 'b3' | 'b4', valor: string) => {
    setEditando(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        [bimestre]: valor
      }
    }))
  }

  const salvarNotas = async () => {
    setSalvando(true)
    setErro(null)
    const payload = {
      turma_id: turmaId,
      disciplina_id: disciplinaId,
      ano_letivo_id: anoLetivoId,
      notas: Object.entries(editando).map(([alunoId, valores]) => ({
        aluno_id: alunoId,
        b1: valores.b1 || notas[alunoId]?.b1 || null,
        b2: valores.b2 || notas[alunoId]?.b2 || null,
        b3: valores.b3 || notas[alunoId]?.b3 || null,
        b4: valores.b4 || notas[alunoId]?.b4 || null,
      }))
    }
    try {
      const res = await fetch('/api/professor/notas_bimestral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setEditando({})
        carregarNotas()
      } else {
        const data = await res.json()
        setErro(data.error || 'Erro ao salvar notas')
      }
    } catch (err) {
      setErro((err as Error).message || 'Erro ao salvar notas')
    }
    setSalvando(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">Lançar Notas</h1>
          <p className="text-slate-500 text-xs md:text-sm">Notas finais</p>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-semibold">❌ Erro ao salvar</p>
          <p className="text-sm text-red-600 mt-1">{erro}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-2">Turma</label>
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">Selecione...</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-2">Disciplina</label>
          <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">Selecione...</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-2">Ano Letivo</label>
          <select value={anoLetivoId} onChange={e => setAnoLetivoId(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">Selecione...</option>
            {anosLetivos.map(a => <option key={a.id} value={a.id}>{a.ano}</option>)}
          </select>
        </div>
      </div>

      {alunos.length > 0 && disciplinaId && anoLetivoId && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg md:rounded-xl overflow-hidden shadow-sm mb-6">
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm md:text-lg font-bold text-slate-900">{alunos.length} alunos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-2 md:p-4 text-left text-xs md:text-sm font-medium text-slate-500">Aluno</th>
                    <th className="p-2 md:p-4 text-center text-xs md:text-sm font-medium text-slate-500 w-20 md:w-24">B1</th>
                    <th className="p-2 md:p-4 text-center text-xs md:text-sm font-medium text-slate-500 w-20 md:w-24">B2</th>
                    <th className="p-2 md:p-4 text-center text-xs md:text-sm font-medium text-slate-500 w-20 md:w-24">B3</th>
                    <th className="p-2 md:p-4 text-center text-xs md:text-sm font-medium text-slate-500 w-20 md:w-24">B4</th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.map(aluno => (
                    <tr key={aluno.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="p-2 md:p-4">
                        <div className="font-medium text-xs md:text-sm text-slate-900 truncate">{aluno.nome_completo}</div>
                        <div className="text-xs text-slate-500 hidden md:block">{aluno.matricula}</div>
                      </td>
                      {(['b1', 'b2', 'b3', 'b4'] as const).map(bimestre => (
                        <td key={bimestre} className="p-2 md:p-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            placeholder="—"
                            value={editando[aluno.id]?.[bimestre] ?? notas[aluno.id]?.[bimestre] ?? ''}
                            onChange={e => handleNotaChange(aluno.id, bimestre, e.target.value)}
                            className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-2 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={salvarNotas}
                disabled={salvando || Object.keys(editando).length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando...' : 'Salvar todas notas'}
              </button>
            </div>
          </div>

          {/* Resumo/Histórico de Notas */}
          <div className="bg-white border border-slate-200 rounded-lg md:rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm md:text-lg font-bold text-slate-900">Resumo das Notas Lançadas</h3>
            </div>
            <div className="p-4 md:p-6">
              {(() => {
                const totalAlunos = alunos.length
                const alunosComNotas = Object.keys(notas).length
                const percentual = totalAlunos > 0 ? Math.round((alunosComNotas / totalAlunos) * 100) : 0

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm md:text-base font-medium text-slate-700">
                        Alunos com notas lançadas
                      </p>
                      <p className="text-lg md:text-xl font-bold text-slate-900">
                        {alunosComNotas}/{totalAlunos}
                      </p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentual >= 75 ? 'bg-green-500' : percentual >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 text-center">
                      {percentual}% completo
                    </p>
                  </div>
                )
              })()}
            </div>
          </div>
        </>
      )}

      <Link href="/professor" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mt-6">
        ← Voltar ao dashboard
      </Link>
    </div>
  )
}
