'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

type Aba = 'geral' | 'nova' | 'justificativas' | 'provas'

export default function ProfessorDashboard() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [alunos, setAlunos] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [visaoGeral, setVisaoGeral] = useState<any>(null)
  const [justificativas, setJustificativas] = useState<any[]>([])
  const [provas, setProvas] = useState<any[]>([])
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<Aba>('geral')
  const [erro, setErro] = useState('')

  // Provas
  const [provaAtiva, setProvaAtiva] = useState<any>(null)
  const [alunosProva, setAlunosProva] = useState<any[]>([])
  const [notasForm, setNotasForm] = useState<Record<string, string>>({})
  const [salvandoNotas, setSalvandoNotas] = useState(false)
  const [showNovaProva, setShowNovaProva] = useState(false)
  const [novaProvaForm, setNovaProvaForm] = useState({ titulo: '', turma_id: '', data: '', nota_maxima: '10' })
  const [criandoProva, setCriandoProva] = useState(false)

  // Justificativas
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [respostaText, setRespostaText] = useState('')

  const supabase = createClient()
  const router = useRouter()

  const hoje = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const [{ data: turmasData }, histRes, geralRes, justRes, provasRes] = await Promise.all([
        supabase.from('turmas').select('id, nome, turno').eq('ativo', true).order('nome'),
        fetch('/api/professor/historico'),
        fetch('/api/professor/visao-geral'),
        fetch('/api/professor/justificativas'),
        fetch('/api/professor/provas'),
      ])

      setTurmas(turmasData || [])
      if (histRes.ok) { const { chamadas } = await histRes.json(); setHistorico(chamadas || []) }
      if (geralRes.ok) setVisaoGeral(await geralRes.json())
      if (justRes.ok) { const { justificativas: j } = await justRes.json(); setJustificativas(j || []) }
      if (provasRes.ok) { const { provas: p } = await provasRes.json(); setProvas(p || []) }
      setLoading(false)
    }
    carregar()
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

  async function responderJustificativa(id: string, status: 'aprovada' | 'rejeitada') {
    await fetch('/api/professor/justificativas/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justificativa_id: id, status, professor_resposta: respostaText }),
    })
    setRespondendo(null)
    setRespostaText('')
    const res = await fetch('/api/professor/justificativas')
    if (res.ok) { const { justificativas: j } = await res.json(); setJustificativas(j || []) }
  }

  async function abrirProva(prova: any) {
    setProvaAtiva(prova)
    setNotasForm({})
    const { data } = await supabase.from('alunos').select('id, nome_completo').eq('turma_id', prova.turma_id).eq('ativo', true).order('nome_completo')
    const alns = data || []
    setAlunosProva(alns)
    // Carrega notas existentes
    const res = await fetch(`/api/professor/provas?prova_id=${prova.id}`)
    if (res.ok) {
      const { notas } = await res.json()
      const m: Record<string, string> = {}
      for (const n of notas || []) m[n.aluno_id] = n.nota !== null ? String(n.nota) : ''
      setNotasForm(m)
    }
  }

  async function salvarNotas(publicar: boolean) {
    if (!provaAtiva) return
    setSalvandoNotas(true)
    const notas = alunosProva.map(a => ({ aluno_id: a.id, nota: notasForm[a.id] ?? null }))
    const res = await fetch('/api/professor/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prova_id: provaAtiva.id, notas, publicar }),
    })
    if (res.ok) {
      const provasRes = await fetch('/api/professor/provas')
      if (provasRes.ok) { const { provas: p } = await provasRes.json(); setProvas(p || []) }
      if (publicar) setProvaAtiva(null)
    }
    setSalvandoNotas(false)
  }

  async function criarProva() {
    if (!novaProvaForm.titulo.trim() || !novaProvaForm.turma_id || !novaProvaForm.data) return
    setCriandoProva(true)
    const res = await fetch('/api/professor/provas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...novaProvaForm, nota_maxima: parseFloat(novaProvaForm.nota_maxima) || 10 }),
    })
    if (res.ok) {
      setShowNovaProva(false)
      setNovaProvaForm({ titulo: '', turma_id: '', data: '', nota_maxima: '10' })
      const provasRes = await fetch('/api/professor/provas')
      if (provasRes.ok) { const { provas: p } = await provasRes.json(); setProvas(p || []) }
    }
    setCriandoProva(false)
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
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Chamada Escolar</h1>
        <p className="text-gray-500 text-sm mt-0.5 capitalize">{formatDate(new Date(), "EEEE, dd 'de' MMMM")}</p>
      </div>

      {/* Abas */}
      <div className="grid grid-cols-4 gap-1 bg-[#161b22] border border-[#30363d] rounded-xl p-1 mb-5">
        {([
          { id: 'geral', label: 'Geral' },
          { id: 'nova', label: 'Chamada' },
          { id: 'justificativas', label: 'Justif.', badge: pendentes },
          { id: 'provas', label: 'Provas' },
        ] as { id: Aba; label: string; badge?: number }[]).map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`relative py-2 text-xs font-medium rounded-lg transition-all ${aba === t.id ? 'bg-[#39d353] text-black' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t.label}
            {t.badge ? (
              <span className="absolute -top-1 -right-1 bg-[#f85149] text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {t.badge > 9 ? '9+' : t.badge}
              </span>
            ) : null}
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

      {/* ABA: Justificativas */}
      {aba === 'justificativas' && (
        <div>
          {justificativas.length === 0 ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Nenhuma justificativa recebida.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {justificativas.map(j => (
                <div key={j.id} className={`bg-[#161b22] border rounded-xl p-4 ${j.status === 'pendente' ? 'border-yellow-500/30' : j.status === 'aprovada' ? 'border-[#39d353]/30' : 'border-[#f85149]/30'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{j.aluno_nome}</p>
                      <p className="text-xs text-gray-500">{j.turma} · {j.data ? new Date(j.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${j.status === 'pendente' ? 'bg-yellow-500/15 text-yellow-400' : j.status === 'aprovada' ? 'bg-[#39d353]/15 text-[#39d353]' : 'bg-[#f85149]/15 text-[#f85149]'}`}>
                      {j.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-1">"{j.motivo}"</p>
                  <p className="text-xs text-gray-600">Responsável: {j.responsavel_nome}</p>

                  {j.professor_resposta && <p className="text-xs text-gray-500 mt-1 italic">Resposta: {j.professor_resposta}</p>}

                  {j.status === 'pendente' && (
                    <div className="mt-3">
                      {respondendo === j.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={respostaText}
                            onChange={e => setRespostaText(e.target.value)}
                            placeholder="Observação (opcional)"
                            className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => responderJustificativa(j.id, 'aprovada')} className="flex-1 py-1.5 bg-[#39d353] text-black text-xs font-bold rounded-lg">Aprovar</button>
                            <button onClick={() => responderJustificativa(j.id, 'rejeitada')} className="flex-1 py-1.5 bg-[#f85149] text-white text-xs font-bold rounded-lg">Rejeitar</button>
                            <button onClick={() => setRespondendo(null)} className="px-3 py-1.5 bg-[#30363d] text-gray-300 text-xs rounded-lg">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setRespondendo(j.id); setRespostaText('') }} className="text-xs px-3 py-1.5 border border-yellow-400/30 text-yellow-400 rounded-lg hover:bg-yellow-400/10 transition-all">
                          Responder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: Provas */}
      {aba === 'provas' && (
        <div>
          {provaAtiva ? (
            // Lançar notas
            <div>
              <button onClick={() => setProvaAtiva(null)} className="text-gray-500 hover:text-gray-300 text-sm mb-4 transition-colors">← Voltar</button>
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4">
                <h2 className="font-bold text-white">{provaAtiva.titulo}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{(provaAtiva as any).turmas?.nome} · {provaAtiva.data ? new Date(provaAtiva.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''} · Máx: {provaAtiva.nota_maxima}</p>
              </div>

              <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden mb-4">
                {alunosProva.map((aluno, idx) => (
                  <div key={aluno.id} className={`flex items-center gap-3 px-4 py-3 ${idx < alunosProva.length - 1 ? 'border-b border-[#30363d]/50' : ''}`}>
                    <p className="flex-1 text-sm text-gray-200 truncate">{aluno.nome_completo}</p>
                    <input
                      type="number"
                      min="0"
                      max={provaAtiva.nota_maxima}
                      step="0.1"
                      value={notasForm[aluno.id] ?? ''}
                      onChange={e => setNotasForm(p => ({ ...p, [aluno.id]: e.target.value }))}
                      placeholder="—"
                      className="w-20 bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-1.5 text-center focus:outline-none focus:border-[#39d353]"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => salvarNotas(false)} disabled={salvandoNotas}
                  className="flex-1 py-3 bg-[#161b22] border border-[#30363d] text-gray-300 font-medium rounded-xl text-sm hover:bg-[#21262d] disabled:opacity-50 transition-colors"
                >
                  {salvandoNotas ? 'Salvando...' : 'Salvar rascunho'}
                </button>
                <button onClick={() => salvarNotas(true)} disabled={salvandoNotas || provaAtiva.publicada}
                  className="flex-1 py-3 bg-[#39d353] hover:bg-green-400 disabled:opacity-50 text-black font-bold rounded-xl text-sm transition-colors"
                >
                  {provaAtiva.publicada ? 'Publicada' : '📤 Publicar'}
                </button>
              </div>
              {provaAtiva.publicada && <p className="text-xs text-[#39d353] text-center mt-2">Notas já publicadas — responsáveis foram notificados.</p>}
            </div>
          ) : (
            // Lista de provas
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-gray-300">{provas.length} prova(s)</h2>
                <button onClick={() => setShowNovaProva(true)} className="px-3 py-1.5 bg-[#39d353] text-black text-xs font-bold rounded-lg">+ Nova Prova</button>
              </div>

              {showNovaProva && (
                <div className="bg-[#161b22] border border-[#39d353]/30 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-white mb-3 text-sm">Nova Prova</h3>
                  <div className="space-y-3">
                    <input type="text" placeholder="Título da prova *" value={novaProvaForm.titulo} onChange={e => setNovaProvaForm(p => ({ ...p, titulo: e.target.value }))}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#39d353]" />
                    <select value={novaProvaForm.turma_id} onChange={e => setNovaProvaForm(p => ({ ...p, turma_id: e.target.value }))}
                      className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#39d353]"
                    >
                      <option value="">Selecione a turma *</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Data *</label>
                        <input type="date" value={novaProvaForm.data} onChange={e => setNovaProvaForm(p => ({ ...p, data: e.target.value }))}
                          className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#39d353]" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nota máxima</label>
                        <input type="number" value={novaProvaForm.nota_maxima} onChange={e => setNovaProvaForm(p => ({ ...p, nota_maxima: e.target.value }))}
                          className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#39d353]" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={criarProva} disabled={criandoProva || !novaProvaForm.titulo.trim() || !novaProvaForm.turma_id || !novaProvaForm.data}
                        className="flex-1 py-2 bg-[#39d353] text-black text-sm font-bold rounded-lg disabled:opacity-50"
                      >{criandoProva ? 'Criando...' : 'Criar'}</button>
                      <button onClick={() => setShowNovaProva(false)} className="px-3 py-2 bg-[#30363d] text-gray-300 text-sm rounded-lg">Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {provas.length === 0 ? (
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
                  <p className="text-gray-500 text-sm">Nenhuma prova cadastrada ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {provas.map(p => (
                    <div key={p.id} className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.titulo}</p>
                        <p className="text-xs text-gray-500">{(p as any).turmas?.nome} · {p.data ? new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.publicada ? 'bg-[#39d353]/15 text-[#39d353]' : 'bg-gray-500/15 text-gray-400'}`}>
                          {p.publicada ? 'Publicada' : 'Rascunho'}
                        </span>
                        <button onClick={() => abrirProva(p)} className="text-xs px-2 py-1 border border-[#30363d] text-gray-400 rounded-lg hover:bg-[#21262d] transition-all">
                          {p.publicada ? 'Ver' : 'Lançar Notas'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
