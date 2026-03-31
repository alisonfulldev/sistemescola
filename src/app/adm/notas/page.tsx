'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NotasPage() {
  const supabase = createClient()
  const [turmas, setTurmas] = useState<any[]>([])
  const [disciplinas, setDisciplinas] = useState<any[]>([])
  const [anosLetivos, setAnosLetivos] = useState<any[]>([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinaId, setDisciplinaId] = useState('')
  const [anoLetivoId, setAnoLetivoId] = useState('')
  const [alunos, setAlunos] = useState<any[]>([])
  const [notas, setNotas] = useState<Record<string, any>>({})
  const [faltas, setFaltas] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('anos_letivos').select('id, ano, ativo').order('ano', { ascending: false })
      ])
      setTurmas(t || [])
      setAnosLetivos(a || [])
      const anoAtivo = (a || []).find((x: any) => x.ativo)
      if (anoAtivo) setAnoLetivoId(anoAtivo.id)
    }
    init()
  }, [])

  useEffect(() => {
    if (!turmaId) {
      setDisciplinas([])
      setDisciplinaId('')
      return
    }
    async function carregarDisciplinas() {
      const { data } = await supabase
        .from('disciplinas')
        .select('id, nome, usuarios(nome)')
        .order('nome')
      setDisciplinas(data || [])
      setDisciplinaId('')
    }
    carregarDisciplinas()
  }, [turmaId])

  const carregarNotas = useCallback(async () => {
    if (!turmaId || !disciplinaId || !anoLetivoId) return
    setLoading(true)
    const res = await fetch(`/api/adm/notas?turma_id=${turmaId}&disciplina_id=${disciplinaId}&ano_letivo_id=${anoLetivoId}`)
    const data = await res.json()
    setAlunos(data.alunos || [])
    setNotas(data.notas || {})
    setFaltas(data.faltas || {})
    setLoading(false)
  }, [turmaId, disciplinaId, anoLetivoId])

  useEffect(() => {
    carregarNotas()
  }, [carregarNotas])

  const calcularMedia = (alunoId: string) => {
    const vals = ['b1', 'b2', 'b3', 'b4']
      .map((c) => {
        const nota = notas[alunoId]?.[c]
        return nota !== null && nota !== undefined ? parseFloat(String(nota)) : null
      })
      .filter((v) => v !== null) as number[]
    if (vals.length === 0) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Notas — Diário</h1>
        <p className="text-slate-600 text-sm">Lançamento de notas por bimestre</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">Turma</label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">Disciplina</label>
          <select
            value={disciplinaId}
            onChange={(e) => setDisciplinaId(e.target.value)}
            disabled={!turmaId}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Selecione...</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1.5">Ano Letivo</label>
          <select
            value={anoLetivoId}
            onChange={(e) => setAnoLetivoId(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {anosLetivos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ano} {a.ativo ? '(ativo)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!turmaId || !disciplinaId || !anoLetivoId ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm shadow-sm">
          Selecione turma, disciplina e ano letivo para carregar as notas.
        </div>
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm shadow-sm">
          Carregando...
        </div>
      ) : alunos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm shadow-sm">
          Nenhum aluno ativo nesta turma.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-slate-500 font-medium text-center w-10">Nº</th>
                  <th className="p-3 text-slate-500 font-medium text-left">Aluno</th>
                  {['B1', 'B2', 'B3', 'B4'].map((b) => (
                    <th key={b} className="p-3 text-slate-500 font-medium text-center w-20">
                      {b}
                    </th>
                  ))}
                  <th className="p-3 text-slate-500 font-medium text-center w-20">Rec.</th>
                  <th className="p-3 text-slate-500 font-medium text-center w-16">Média</th>
                  <th className="p-3 text-slate-500 font-medium text-center w-16">Faltas</th>
                  <th className="p-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const med = calcularMedia(aluno.id)
                  const medNum = med ? parseFloat(med) : null
                  const totalFaltas = faltas[aluno.id] || 0
                  return (
                    <tr key={aluno.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                      <td className="p-3 text-center text-xs text-slate-400 font-mono">
                        {aluno.numero_chamada?.toString().padStart(2, '0') || '—'}
                      </td>
                      <td className="p-3 text-slate-900 text-sm">{aluno.nome_completo}</td>
                      {['B1', 'B2', 'B3', 'B4'].map((bim) => (
                        <td key={bim} className="p-3 text-center">
                          <span className="text-xs font-mono text-slate-400">—</span>
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <span className="text-xs font-mono text-slate-400">—</span>
                      </td>
                      <td className="p-3 text-center">
                        {med !== null ? (
                          <span
                            className={`text-xs font-bold font-mono ${
                              medNum && medNum >= 7
                                ? 'text-green-700'
                                : medNum && medNum >= 5
                                  ? 'text-amber-700'
                                  : 'text-red-600'
                            }`}
                          >
                            {med}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-xs font-mono font-bold ${
                            totalFaltas > 0 ? 'text-red-600' : 'text-slate-300'
                          }`}
                        >
                          {totalFaltas || '—'}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-200 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="text-green-700 font-bold">■</span> ≥ 7.0 Aprovado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-amber-700 font-bold">■</span> 5.0–6.9 Recuperação
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-red-600 font-bold">■</span> &lt; 5.0 Reprovado
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
