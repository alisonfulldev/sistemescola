'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { StatusPresenca } from '@/types'

interface AlunoRow {
  id: string
  nome_completo: string
  foto_url?: string
  status: StatusPresenca | null
  observacao: string
  motivo_alteracao?: string
  horario_evento?: string
  entrada?: { hora: string } | null
}

interface ModalAlteracao {
  alunoId: string
  alunoNome: string
  statusAtual: StatusPresenca | null
  novoStatus: StatusPresenca
}

// Rota: /professor/chamada/[aulaId] onde aulaId é na verdade o chamadaId
export default function ChamadaPage({ params }: { params: { aulaId: string } }) {
  const chamadaId = params.aulaId

  const [alunos, setAlunos] = useState<AlunoRow[]>([])
  const [aula, setAula] = useState<any>(null)
  const [turmaId, setTurmaId] = useState<string | null>(null)
  const [jaConcluida, setJaConcluida] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [expandObs, setExpandObs] = useState<string | null>(null)
  const [conteudo, setConteudo] = useState('')
  const [atividades, setAtividades] = useState('')
  const [salvandoConteudo, setSalvandoConteudo] = useState(false)

  // Modal de alteração (edição de chamada concluída)
  const [modalAlteracao, setModalAlteracao] = useState<ModalAlteracao | null>(null)
  const [motivoAlteracao, setMotivoAlteracao] = useState('')
  const [horarioEvento, setHorarioEvento] = useState('')
  const [salvandoAlteracao, setSalvandoAlteracao] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const res = await fetch(`/api/professor/carregar-chamada?chamada_id=${chamadaId}`)
    if (!res.ok) {
      const data = await res.json()
      setErro(data.error || 'Erro ao carregar chamada')
      setLoading(false)
      return
    }

    const { chamada, alunos: alunosData, registros, entradas } = await res.json()

    setAula(chamada.aulas)
    setTurmaId(chamada.aulas?.turma_id)
    setJaConcluida(chamada.status === 'concluida')
    setConteudo(chamada.aulas?.conteudo_programatico || '')
    setAtividades(chamada.aulas?.atividades_desenvolvidas || '')

    const registroMap = new Map(registros.map((r: any) => [r.aluno_id, r]))
    const entradaMap = new Map(entradas.map((e: any) => [e.aluno_id, e]))

    setAlunos(alunosData.map((a: any) => {
      const reg = registroMap.get(a.id) as any
      return {
        ...a,
        status: reg?.status || null,
        observacao: reg?.observacao || '',
        motivo_alteracao: reg?.motivo_alteracao || '',
        horario_evento: reg?.horario_evento || '',
        entrada: entradaMap.get(a.id) || null,
      }
    }))
    setLoading(false)
  }, [chamadaId])

  useEffect(() => { load() }, [load])

  // Realtime: atualizar entradas
  useEffect(() => {
    if (!turmaId) return
    const hoje = new Date().toISOString().split('T')[0]
    const channel = supabase
      .channel('entradas-chamada')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'entradas',
        filter: `data=eq.${hoje}`
      }, (payload) => {
        setAlunos(prev => prev.map(a =>
          a.id === payload.new.aluno_id
            ? { ...a, entrada: { hora: payload.new.hora } }
            : a
        ))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [turmaId, supabase])

  // Ao clicar num status: se chamada concluída, abre modal de motivo; senão, marca direto
  function handleClickStatus(aluno: AlunoRow, novoStatus: StatusPresenca) {
    if (aluno.status === novoStatus) return // Sem mudança
    if (jaConcluida) {
      const agora = new Date()
      const hh = String(agora.getHours()).padStart(2, '0')
      const mm = String(agora.getMinutes()).padStart(2, '0')
      setHorarioEvento(`${hh}:${mm}`)
      setMotivoAlteracao('')
      setModalAlteracao({ alunoId: aluno.id, alunoNome: aluno.nome_completo, statusAtual: aluno.status, novoStatus })
    } else {
      marcar(aluno.id, novoStatus)
    }
  }

  async function marcar(alunoId: string, status: StatusPresenca, motivo?: string, horario?: string) {
    const aluno = alunos.find(a => a.id === alunoId)
    setAlunos(prev => prev.map(a => a.id === alunoId ? {
      ...a, status,
      motivo_alteracao: motivo ?? a.motivo_alteracao,
      horario_evento: horario ?? a.horario_evento,
    } : a))
    setSalvando(true)
    const res = await fetch('/api/professor/marcar-presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chamada_id: chamadaId,
        aluno_id: alunoId,
        status,
        observacao: aluno?.observacao || null,
        motivo_alteracao: motivo || null,
        horario_evento: horario || null,
        status_anterior: aluno?.status || null,
        chamada_concluida: jaConcluida,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setErro(`Erro ao salvar: ${err.error || res.status}`)
    }
    setSalvando(false)
  }

  async function confirmarAlteracao() {
    if (!modalAlteracao || !motivoAlteracao.trim()) return
    setSalvandoAlteracao(true)
    setErro('')
    const aluno = alunos.find(a => a.id === modalAlteracao.alunoId)
    const statusAnterior = aluno?.status || null
    setAlunos(prev => prev.map(a => a.id === modalAlteracao.alunoId ? {
      ...a,
      status: modalAlteracao.novoStatus,
      motivo_alteracao: motivoAlteracao.trim(),
      horario_evento: horarioEvento,
    } : a))
    const res = await fetch('/api/professor/marcar-presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chamada_id: chamadaId,
        aluno_id: modalAlteracao.alunoId,
        status: modalAlteracao.novoStatus,
        observacao: aluno?.observacao || null,
        motivo_alteracao: motivoAlteracao.trim(),
        horario_evento: horarioEvento || null,
        status_anterior: statusAnterior,
        chamada_concluida: true,
      }),
    })
    setSalvandoAlteracao(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setErro(`Erro ao salvar: ${err.error || res.status}`)
      // Reverte a alteração visual
      setAlunos(prev => prev.map(a => a.id === modalAlteracao.alunoId ? { ...a, status: statusAnterior } : a))
      return
    }
    setModalAlteracao(null)
    router.push(`/professor/resumo/${chamadaId}`)
  }

  async function salvarObs(alunoId: string, obs: string) {
    setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, observacao: obs } : a))
    const aluno = alunos.find(a => a.id === alunoId)
    if (!aluno?.status) return
    await fetch('/api/professor/marcar-presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chamada_id: chamadaId,
        aluno_id: alunoId,
        status: aluno.status,
        observacao: obs,
      }),
    })
  }

  async function salvarConteudo() {
    if (!aula?.id) return
    setSalvandoConteudo(true)
    await supabase.from('aulas').update({
      conteudo_programatico: conteudo || null,
      atividades_desenvolvidas: atividades || null,
    }).eq('id', aula.id)
    setSalvandoConteudo(false)
  }

  async function confirmar() {
    setConfirmando(true)
    const res = await fetch('/api/professor/confirmar-chamada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chamada_id: chamadaId }),
    })
    if (res.ok) {
      router.push(`/professor/resumo/${chamadaId}`)
    } else {
      setConfirmando(false)
    }
  }

  const marcados = alunos.filter(a => a.status !== null).length
  const total = alunos.length
  const progresso = total > 0 ? Math.round((marcados / total) * 100) : 0
  const presentes = alunos.filter(a => a.status === 'presente').length
  const faltas = alunos.filter(a => a.status === 'falta').length
  const justificadas = alunos.filter(a => a.status === 'justificada').length

  const labelStatus = (s: StatusPresenca) =>
    s === 'presente' ? '✅ Presente' : s === 'falta' ? '❌ Falta' : '📝 Justif.'

  const corStatus = (s: StatusPresenca) =>
    s === 'presente' ? 'text-[#39d353]' : s === 'falta' ? 'text-[#f85149]' : 'text-[#e3b341]'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  if (erro) return (
    <div className="bg-[#f85149]/10 border border-[#f85149]/30 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-[#f85149] font-medium">{erro}</p>
      <button onClick={() => router.push('/professor')} className="mt-4 text-sm text-[#39d353] hover:underline">
        ← Voltar
      </button>
    </div>
  )

  return (
    <div>
      {/* Info aula */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white">{aula?.turmas?.nome}</h1>
            <p className="text-gray-400 text-sm">{aula?.disciplinas?.nome}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-600" style={{ fontFamily: 'DM Mono, monospace' }}>
              {aula?.horario_inicio?.slice(0, 5)} – {aula?.horario_fim?.slice(0, 5)}
            </span>
            {jaConcluida && (
              <p className="text-xs text-[#e3b341] mt-0.5">✏ Modo edição</p>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo programático + Atividades */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-medium">📋 Conteúdo programático</label>
          <textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            onBlur={salvarConteudo}
            placeholder="Ex: Números naturais — revisão e ordenação"
            rows={2}
            className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#39d353] resize-none placeholder-gray-600"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-medium">✏️ Atividades desenvolvidas</label>
          <textarea
            value={atividades}
            onChange={e => setAtividades(e.target.value)}
            onBlur={salvarConteudo}
            placeholder="Ex: Exercícios em sala e resolução de problemas"
            rows={2}
            className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#39d353] resize-none placeholder-gray-600"
          />
        </div>
        {salvandoConteudo && <p className="text-xs text-gray-600 italic">Salvando...</p>}
      </div>

      {/* Progresso */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">Progresso</span>
          <span className="text-sm font-bold text-[#39d353]">{marcados}/{total} alunos</span>
        </div>
        <div className="w-full bg-[#0d1117] rounded-full h-2.5">
          <div className="bg-[#39d353] h-2.5 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex gap-5 mt-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#39d353] rounded-full" />
            <span className="text-[#39d353]">{presentes}</span>
            <span className="text-gray-500">presentes</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#f85149] rounded-full" />
            <span className="text-[#f85149]">{faltas}</span>
            <span className="text-gray-500">faltas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#e3b341] rounded-full" />
            <span className="text-[#e3b341]">{justificadas}</span>
            <span className="text-gray-500">justificadas</span>
          </span>
          {salvando && <span className="ml-auto text-gray-600 italic text-xs">Salvando...</span>}
        </div>
      </div>

      {/* Lista de alunos */}
      <div className="space-y-2 mb-6">
        {alunos.map((aluno, idx) => (
          <div key={aluno.id} className={`bg-[#161b22] rounded-2xl border overflow-hidden transition-all ${
            aluno.status === 'presente' ? 'border-[#39d353]/40' :
            aluno.status === 'falta' ? 'border-[#f85149]/40' :
            aluno.status === 'justificada' ? 'border-[#e3b341]/40' : 'border-[#30363d]'
          }`}>
            <div className="p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {aluno.foto_url ? (
                    <Image src={aluno.foto_url} alt={aluno.nome_completo} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">
                      {aluno.nome_completo.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{aluno.nome_completo}</p>
                  {aluno.entrada ? (
                    <p className="text-xs text-[#39d353]">✓ Entrada às {aluno.entrada.hora.slice(0, 5)}</p>
                  ) : (
                    <p className="text-xs text-gray-600">Entrada não registrada</p>
                  )}
                </div>
                <span className="text-xs text-gray-700 flex-shrink-0">{idx + 1}</span>
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                {(['presente', 'falta', 'justificada'] as StatusPresenca[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleClickStatus(aluno, s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      aluno.status === s
                        ? s === 'presente' ? 'bg-[#39d353] text-black'
                          : s === 'falta' ? 'bg-[#f85149] text-white'
                          : 'bg-[#e3b341] text-black'
                        : 'bg-[#0d1117] text-gray-500 hover:bg-[#30363d] border border-[#30363d]'
                    }`}
                  >
                    {s === 'presente' ? '✅ Presente' : s === 'falta' ? '❌ Falta' : '📝 Justif.'}
                  </button>
                ))}
              </div>

              {/* Motivo de alteração (edição pós-conclusão) */}
              {jaConcluida && aluno.motivo_alteracao && (
                <div className="mt-2 px-3 py-2 bg-[#e3b341]/10 border border-[#e3b341]/20 rounded-xl">
                  <p className="text-xs text-[#e3b341] font-medium">Alteração registrada</p>
                  <p className="text-xs text-gray-400 mt-0.5">"{aluno.motivo_alteracao}"</p>
                  {aluno.horario_evento && (
                    <p className="text-xs text-gray-600 mt-0.5">🕐 {aluno.horario_evento.slice(0, 5)}</p>
                  )}
                </div>
              )}

              {/* Observação */}
              {(aluno.status === 'falta' || aluno.status === 'justificada') && (
                <div className="mt-2">
                  <button onClick={() => setExpandObs(expandObs === aluno.id ? null : aluno.id)}
                    className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1"
                  >
                    💬 {expandObs === aluno.id ? 'Fechar' : aluno.observacao ? 'Ver observação' : 'Adicionar observação'}
                  </button>
                  {expandObs === aluno.id && (
                    <textarea
                      value={aluno.observacao}
                      onChange={e => setAlunos(prev => prev.map(a => a.id === aluno.id ? { ...a, observacao: e.target.value } : a))}
                      onBlur={e => salvarObs(aluno.id, e.target.value)}
                      placeholder="Motivo da falta..."
                      rows={2}
                      className="w-full mt-1.5 px-3 py-2 text-xs bg-[#0d1117] border border-[#30363d] text-gray-300 placeholder-gray-700 rounded-xl resize-none focus:outline-none focus:border-[#39d353]"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botão confirmar / salvar */}
      <div className="sticky bottom-4 flex gap-3">
        {jaConcluida && (
          <button
            onClick={() => router.push(`/professor/resumo/${chamadaId}`)}
            className="py-4 px-5 bg-[#161b22] border border-[#30363d] text-gray-400 rounded-2xl font-medium hover:bg-[#30363d] transition-colors text-sm"
          >
            Ver resumo
          </button>
        )}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={marcados < total || total === 0}
          className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all ${
            marcados === total && total > 0
              ? 'bg-[#39d353] text-black hover:bg-green-400 active:scale-[0.99]'
              : 'bg-[#161b22] border border-[#30363d] text-gray-600 cursor-not-allowed'
          }`}
        >
          {marcados === total && total > 0
            ? jaConcluida ? '💾 Salvar alterações' : '✓ Confirmar Chamada'
            : `Marque todos os alunos (${total - marcados} restantes)`}
        </button>
      </div>

      {/* Modal de motivo de alteração */}
      {modalAlteracao && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-bold text-white mb-1">Alterar presença</h3>
            <p className="text-sm text-gray-400 mb-4">
              <span className="font-medium text-gray-200">{modalAlteracao.alunoNome}</span>
              {modalAlteracao.statusAtual && (
                <> · <span className={corStatus(modalAlteracao.statusAtual)}>{labelStatus(modalAlteracao.statusAtual)}</span></>
              )}
              {' → '}
              <span className={corStatus(modalAlteracao.novoStatus)}>{labelStatus(modalAlteracao.novoStatus)}</span>
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Motivo da alteração *</label>
                <input
                  type="text"
                  value={motivoAlteracao}
                  onChange={e => setMotivoAlteracao(e.target.value)}
                  placeholder={
                    modalAlteracao.novoStatus === 'falta'
                      ? 'Ex: Aluno precisou ir embora às 10h'
                      : 'Ex: Aluno chegou atrasado'
                  }
                  className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#e3b341]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horário do evento</label>
                <input
                  type="time"
                  value={horarioEvento}
                  onChange={e => setHorarioEvento(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#e3b341]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setModalAlteracao(null)}
                className="flex-1 py-2.5 bg-[#0d1117] border border-[#30363d] text-gray-400 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAlteracao}
                disabled={!motivoAlteracao.trim() || salvandoAlteracao}
                className="flex-1 py-2.5 bg-[#e3b341] text-black font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {salvandoAlteracao ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-white text-lg mb-2">{jaConcluida ? 'Salvar alterações?' : 'Confirmar chamada?'}</h3>
            <p className="text-gray-500 text-sm mb-5">{jaConcluida ? 'Os registros serão atualizados.' : 'Os responsáveis receberão notificação de presença dos alunos.'}</p>
            <div className="grid grid-cols-3 gap-3 mb-5 text-center">
              {[
                { n: presentes, label: 'Presentes', cls: 'bg-[#39d353]/10 border-[#39d353]/30 text-[#39d353]' },
                { n: faltas, label: 'Faltas', cls: 'bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]' },
                { n: justificadas, label: 'Justif.', cls: 'bg-[#e3b341]/10 border-[#e3b341]/30 text-[#e3b341]' },
              ].map(k => (
                <div key={k.label} className={`rounded-xl p-3 border ${k.cls}`}>
                  <div className="text-2xl font-bold">{k.n}</div>
                  <div className="text-xs mt-0.5 opacity-80">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-[#0d1117] border border-[#30363d] text-gray-400 rounded-xl font-medium hover:bg-[#30363d] transition-colors"
              >Cancelar</button>
              <button onClick={confirmar} disabled={confirmando}
                className="flex-1 py-3 bg-[#39d353] text-black rounded-xl font-bold hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
              >
                {confirmando
                  ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
