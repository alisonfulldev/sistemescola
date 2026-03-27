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
  const [editando, setEditando] = useState<Record<string, any>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: t }, { data: a }] = await Promise.all([
        supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('anos_letivos').select('id, ano, ativo').order('ano', { ascending: false }),
      ])
      setTurmas(t || [])
      setAnosLetivos(a || [])
      const anoAtivo = (a || []).find((x: any) => x.ativo)
      if (anoAtivo) setAnoLetivoId(anoAtivo.id)
    }
    init()
  }, [])

  useEffect(() => {
    if (!turmaId) { setDisciplinas([]); setDisciplinaId(''); return }
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
    setEditando({})
    setLoading(false)
  }, [turmaId, disciplinaId, anoLetivoId])

  useEffect(() => { carregarNotas() }, [carregarNotas])

  function getVal(alunoId: string, campo: string) {
    if (editando[alunoId]?.[campo] !== undefined) return editando[alunoId][campo]
    const v = notas[alunoId]?.[campo]
    return v !== null && v !== undefined ? String(v) : ''
  }

  function setVal(alunoId: string, campo: string, valor: string) {
    setEditando(p => ({ ...p, [alunoId]: { ...(p[alunoId] || {}), [campo]: valor } }))
  }

  async function salvarAluno(alunoId: string) {
    setSalvando(p => ({ ...p, [alunoId]: true }))
    const atual = notas[alunoId] || {}
    const ed = editando[alunoId] || {}
    const payload = {
      aluno_id: alunoId,
      disciplina_id: disciplinaId,
      ano_letivo_id: anoLetivoId,
      b1: ed.b1 !== undefined ? ed.b1 : atual.b1,
      b2: ed.b2 !== undefined ? ed.b2 : atual.b2,
      b3: ed.b3 !== undefined ? ed.b3 : atual.b3,
      b4: ed.b4 !== undefined ? ed.b4 : atual.b4,
      recuperacao: ed.recuperacao !== undefined ? ed.recuperacao : atual.recuperacao,
    }
    const res = await fetch('/api/adm/notas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      setNotas(p => ({ ...p, [alunoId]: { ...atual, ...payload } }))
      setEditando(p => { const n = { ...p }; delete n[alunoId]; return n })
    }
    setSalvando(p => ({ ...p, [alunoId]: false }))
  }

  function media(alunoId: string) {
    const vals = ['b1', 'b2', 'b3', 'b4'].map(c => {
      const v = getVal(alunoId, c)
      return v !== '' ? parseFloat(v) : null
    }).filter(v => v !== null) as number[]
    if (vals.length === 0) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  const camposAlterados = (alunoId: string) => Object.keys(editando[alunoId] || {}).length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Notas — Diário</h1>
        <p className="text-gray-400 text-sm">Lançamento de notas por bimestre</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Turma</label>
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
            className="w-full bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff]">
            <option value="">Selecione...</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Disciplina</label>
          <select value={disciplinaId} onChange={e => setDisciplinaId(e.target.value)} disabled={!turmaId}
            className="w-full bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff] disabled:opacity-50">
            <option value="">Selecione...</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Ano Letivo</label>
          <select value={anoLetivoId} onChange={e => setAnoLetivoId(e.target.value)}
            className="w-full bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff]">
            <option value="">Selecione...</option>
            {anosLetivos.map(a => <option key={a.id} value={a.id}>{a.ano}{a.ativo ? ' (ativo)' : ''}</option>)}
          </select>
        </div>
      </div>

      {!turmaId || !disciplinaId || !anoLetivoId ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 text-center text-gray-500 text-sm">
          Selecione turma, disciplina e ano letivo para carregar as notas.
        </div>
      ) : loading ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 text-center text-gray-500 text-sm">Carregando...</div>
      ) : alunos.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-10 text-center text-gray-500 text-sm">Nenhum aluno ativo nesta turma.</div>
      ) : (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="p-3 text-gray-400 font-medium text-center w-10">Nº</th>
                  <th className="p-3 text-gray-400 font-medium text-left">Aluno</th>
                  {['B1', 'B2', 'B3', 'B4'].map(b => (
                    <th key={b} className="p-3 text-gray-400 font-medium text-center w-20">{b}</th>
                  ))}
                  <th className="p-3 text-gray-400 font-medium text-center w-20">Rec.</th>
                  <th className="p-3 text-gray-400 font-medium text-center w-16">Média</th>
                  <th className="p-3 text-gray-400 font-medium text-center w-16">Faltas</th>
                  <th className="p-3 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {alunos.map(aluno => {
                  const med = media(aluno.id)
                  const medNum = med ? parseFloat(med) : null
                  const alterado = camposAlterados(aluno.id)
                  const totalFaltas = faltas[aluno.id] || 0
                  return (
                    <tr key={aluno.id} className={`border-b border-[#30363d]/50 transition-colors ${alterado ? 'bg-[#58a6ff]/5' : 'hover:bg-[#21262d]'}`}>
                      <td className="p-3 text-center text-xs text-gray-500 font-mono">
                        {aluno.numero_chamada?.toString().padStart(2, '0') || '—'}
                      </td>
                      <td className="p-3 text-white text-sm">{aluno.nome_completo}</td>
                      {['b1', 'b2', 'b3', 'b4'].map(campo => (
                        <td key={campo} className="p-2 text-center">
                          <input
                            type="number" min={0} max={10} step={0.1}
                            value={getVal(aluno.id, campo)}
                            onChange={e => setVal(aluno.id, campo, e.target.value)}
                            placeholder="—"
                            className="w-16 bg-[#0d1117] border border-[#30363d] text-gray-200 text-xs text-center rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#58a6ff] placeholder-gray-600"
                            style={{ fontFamily: 'DM Mono, monospace' }}
                          />
                        </td>
                      ))}
                      <td className="p-2 text-center">
                        <input
                          type="number" min={0} max={10} step={0.1}
                          value={getVal(aluno.id, 'recuperacao')}
                          onChange={e => setVal(aluno.id, 'recuperacao', e.target.value)}
                          placeholder="—"
                          className="w-16 bg-[#0d1117] border border-[#30363d] text-yellow-300/80 text-xs text-center rounded-lg px-2 py-1.5 focus:outline-none focus:border-yellow-500 placeholder-gray-600"
                          style={{ fontFamily: 'DM Mono, monospace' }}
                        />
                      </td>
                      <td className="p-3 text-center">
                        {med !== null ? (
                          <span className={`text-xs font-bold font-mono ${medNum! >= 7 ? 'text-[#39d353]' : medNum! >= 5 ? 'text-yellow-400' : 'text-[#f85149]'}`}>
                            {med}
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-mono font-bold ${totalFaltas > 0 ? 'text-[#f85149]' : 'text-gray-600'}`}>
                          {totalFaltas || '—'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {alterado && (
                          <button onClick={() => salvarAluno(aluno.id)} disabled={salvando[aluno.id]}
                            className="text-xs bg-[#58a6ff]/20 text-[#58a6ff] hover:bg-[#58a6ff]/30 disabled:opacity-50 px-2 py-1 rounded-lg transition-all whitespace-nowrap">
                            {salvando[aluno.id] ? '...' : 'Salvar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-[#30363d] flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="text-[#39d353] font-bold">■</span> ≥ 7.0 Aprovado</span>
            <span className="flex items-center gap-1.5"><span className="text-yellow-400 font-bold">■</span> 5.0–6.9 Recuperação</span>
            <span className="flex items-center gap-1.5"><span className="text-[#f85149] font-bold">■</span> &lt; 5.0 Reprovado</span>
          </div>
        </div>
      )}
    </div>
  )
}
