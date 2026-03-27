'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type Aba = 'geral' | 'nova'

export default function ProfessorDashboard() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [alunos, setAlunos] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [visaoGeral, setVisaoGeral] = useState<any>(null)
  const [justificativas, setJustificativas] = useState<any[]>([])
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<Aba>('geral')
  const [erro, setErro] = useState('')

  // Justificativas
  const [showJustificativas, setShowJustificativas] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const hoje = new Date().toISOString().split('T')[0]

  async function carregarJustificativas() {
    const res = await fetch('/api/professor/justificativas')
    if (res.ok) { const { justificativas: j } = await res.json(); setJustificativas(j || []) }
  }

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const [{ data: turmasData }, histRes, geralRes, justRes] = await Promise.all([
        supabase.from('turmas').select('id, nome, turno').eq('ativo', true).order('nome'),
        fetch('/api/professor/historico'),
        fetch('/api/professor/visao-geral'),
        fetch('/api/professor/justificativas'),
      ])

      setTurmas(turmasData || [])
      if (histRes.ok) { const { chamadas } = await histRes.json(); setHistorico(chamadas || []) }
      if (geralRes.ok) setVisaoGeral(await geralRes.json())
      if (justRes.ok) { const { justificativas: j } = await justRes.json(); setJustificativas(j || []) }
      setLoading(false)
    }
    carregar()

    // Atualiza justificativas a cada 20s e via realtime
    const interval = setInterval(carregarJustificativas, 20000)
    const ch = supabase.channel('just-prof')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'justificativas_falta' }, carregarJustificativas)
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(ch) }
  }, [])

  async function selecionarTurma(turmaId: string) {
    setTurmaSelecionada(turmaId)
    setAlunos([])
    if (!turmaId) return
    setCarregandoAlunos(true)
    const { data } = await supabase.from('alunos').select('id, nome_completo, foto_url, matricula').eq('turma_id', turmaId).eq('ativo', true).order('nome_completo')
    setAlunos(data || [])
    setCarregandoAlunos(false)
  }

  async function iniciarChamada() {
    if (!turmaSelecionada) return
    setIniciando(true)
    setErro('')
    try {
      const res = await fetch('/api/professor/iniciar-chamada', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ turma_id: turmaSelecionada }) })
      const data = await res.json()
      if (data.chamada_id) { router.push(`/professor/chamada/${data.chamada_id}`) }
      else { setErro(data.error || 'Erro ao iniciar chamada'); setIniciando(false) }
    } catch { setErro('Erro de conexão'); setIniciando(false) }
  }


  const turmaSel = turmas.find(t => t.id === turmaSelecionada)
  const pendentes = justificativas.filter(j => j.status === 'pendente').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Chamada Escolar</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{formatDate(new Date(), "EEEE, dd 'de' MMMM")}</p>
        </div>
        <button onClick={() => setShowJustificativas(true)} className="relative p-2.5 bg-[#161b22] border border-[#30363d] rounded-xl hover:border-[#39d353]/50 transition-colors">
          <span className="text-xl">🔔</span>
          {pendentes > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#f85149] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
              {pendentes > 9 ? '9+' : pendentes}
            </span>
          )}
        </button>
      </div>

      {/* Abas */}
      <div className="grid grid-cols-2 gap-1 bg-[#161b22] border border-[#30363d] rounded-xl p-1 mb-5">
        {([
          { id: 'geral', label: 'Geral' },
          { id: 'nova', label: 'Chamada' },
        ] as { id: Aba; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`relative py-2 text-xs font-medium rounded-lg transition-all ${aba === t.id ? 'bg-[#39d353] text-black' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ABA: Visão Geral */}
      {aba === 'geral' && (
        <div>
          {visaoGeral && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{visaoGeral.totalChamadas}</div>
                <div className="text-xs text-gray-500 mt-0.5">Chamadas</div>
              </div>
              <div className={`rounded-xl p-4 text-center border ${visaoGeral.mediaFrequencia >= 75 ? 'bg-[#39d353]/10 border-[#39d353]/30' : 'bg-[#f85149]/10 border-[#f85149]/30'}`}>
                <div className={`text-2xl font-bold ${visaoGeral.mediaFrequencia >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>{visaoGeral.mediaFrequencia}%</div>
                <div className="text-xs text-gray-500 mt-0.5">Freq. Média</div>
              </div>
              <div className={`rounded-xl p-4 text-center border ${visaoGeral.alunosEmRisco?.length > 0 ? 'bg-[#f85149]/10 border-[#f85149]/30' : 'bg-[#161b22] border-[#30363d]'}`}>
                <div className={`text-2xl font-bold ${visaoGeral.alunosEmRisco?.length > 0 ? 'text-[#f85149]' : 'text-white'}`}>{visaoGeral.alunosEmRisco?.length ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">Em Risco</div>
              </div>
            </div>
          )}

          {visaoGeral?.turmas?.length > 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Frequência por turma</h3>
              <div className="space-y-3">
                {visaoGeral.turmas.map((t: any) => (
                  <div key={t.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 font-medium">{t.nome}</span>
                      <span className={`font-bold ${t.frequencia >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>{t.frequencia}% · {t.chamadas} chamada(s)</span>
                    </div>
                    <div className="w-full bg-[#0d1117] rounded-full h-2">
                      <div className={`h-2 rounded-full ${t.frequencia >= 75 ? 'bg-[#39d353]' : 'bg-[#f85149]'}`} style={{ width: `${t.frequencia}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visaoGeral?.alunosEmRisco?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Alunos em risco (freq. {'<'} 75%)</h3>
              <div className="space-y-2">
                {visaoGeral.alunosEmRisco.map((a: any, i: number) => (
                  <div key={i} className="bg-[#161b22] border border-[#f85149]/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{a.nome}</p>
                      <p className="text-xs text-gray-500">{a.turma} · {a.faltas} falta(s)</p>
                    </div>
                    <span className="text-sm font-bold text-[#f85149]">{a.frequencia}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historico.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Histórico de chamadas</h3>
              <div className="space-y-2">
                {historico.map(c => {
                  const freq = c.total > 0 ? Math.round(((c.presentes + c.justificadas) / c.total) * 100) : 0
                  return (
                    <Link key={c.id} href={`/professor/resumo/${c.id}`}
                      className="block bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 hover:border-[#39d353]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 font-medium truncate">{c.turma}{c.data === hoje && <span className="ml-2 text-xs text-[#39d353]">hoje</span>}</p>
                          <p className="text-xs text-gray-600 mb-1">{formatDate(c.data, 'dd/MM/yyyy')}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-[#39d353] font-medium">{c.presentes} presentes</span>
                            <span className="text-[#f85149] font-medium">{c.faltas} faltas</span>
                            {c.justificadas > 0 && <span className="text-[#e3b341]">{c.justificadas} justif.</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold ${freq >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>{freq}%</p>
                          <p className="text-xs text-gray-600">{c.total} alunos</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {visaoGeral?.totalChamadas === 0 && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Nenhuma chamada realizada ainda.</p>
              <button onClick={() => setAba('nova')} className="mt-3 text-[#39d353] text-sm hover:underline">Iniciar primeira chamada →</button>
            </div>
          )}
        </div>
      )}

      {/* ABA: Nova Chamada */}
      {aba === 'nova' && (
        <div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 mb-4">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Selecione a turma</label>
            {turmas.length === 0 ? (
              <p className="text-gray-600 text-sm py-2">Nenhuma turma ativa.</p>
            ) : (
              <select value={turmaSelecionada} onChange={e => selecionarTurma(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#39d353] transition-colors"
              >
                <option value="">-- Selecione uma turma --</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome} · {t.turno}</option>)}
              </select>
            )}
          </div>

          {turmaSelecionada && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden mb-4">
              <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{turmaSel?.nome}</p>
                  <p className="text-gray-500 text-xs">{alunos.length} aluno(s)</p>
                </div>
                <span className="text-xs text-gray-500 capitalize">{turmaSel?.turno}</span>
              </div>
              {carregandoAlunos ? (
                <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-2 border-[#39d353] border-t-transparent rounded-full" /></div>
              ) : alunos.length === 0 ? (
                <div className="py-8 text-center text-gray-600 text-sm">Nenhum aluno matriculado</div>
              ) : (
                <div className="divide-y divide-[#30363d]">
                  {alunos.map((aluno, idx) => (
                    <div key={aluno.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {aluno.foto_url ? <Image src={aluno.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" /> : <span className="text-xs font-bold text-gray-400">{aluno.nome_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{aluno.nome_completo}</p>
                        <p className="text-xs text-gray-600 font-mono">{aluno.matricula}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {erro && <div className="mb-4 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl text-[#f85149] text-sm">⚠ {erro}</div>}

          {turmaSelecionada && alunos.length > 0 && (
            <button onClick={iniciarChamada} disabled={iniciando}
              className="w-full py-4 bg-[#39d353] hover:bg-green-400 disabled:opacity-60 text-black font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {iniciando ? <><div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />Iniciando...</> : '📋 Iniciar Chamada'}
            </button>
          )}
        </div>
      )}

      {/* Painel de Justificativas (abre ao clicar no sininho) */}
      {showJustificativas && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
              <h3 className="font-bold text-white">🔔 Justificativas</h3>
              <button onClick={() => setShowJustificativas(false)} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {justificativas.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">Nenhuma justificativa recebida.</p>
              ) : (
                justificativas.map(j => (
                  <div key={j.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-semibold text-white">{j.aluno_nome}</p>
                        <p className="text-xs text-gray-500">{j.turma} · {j.data ? new Date(j.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-[#e3b341]/15 text-[#e3b341]">
                        {formatDate(j.criada_em, 'dd/MM')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2 italic">"{j.motivo}"</p>
                    <p className="text-xs text-gray-600 mt-1">por {j.responsavel_nome}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
