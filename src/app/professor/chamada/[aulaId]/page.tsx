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
  entrada?: { hora: string } | null
}

// Rota: /professor/chamada/[aulaId] onde aulaId é na verdade o chamadaId
export default function ChamadaPage({ params }: { params: { aulaId: string } }) {
  const chamadaId = params.aulaId // renomeado na rota futuramente; por ora reutiliza o param

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

    const registroMap = new Map(registros.map((r: any) => [r.aluno_id, r]))
    const entradaMap = new Map(entradas.map((e: any) => [e.aluno_id, e]))

    setAlunos(alunosData.map((a: any) => {
      const reg = registroMap.get(a.id) as any
      return {
        ...a,
        status: reg?.status || null,
        observacao: reg?.observacao || '',
        entrada: entradaMap.get(a.id) || null,
      }
    }))
    setLoading(false)
  }, [chamadaId, router])

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

  async function marcar(alunoId: string, status: StatusPresenca) {
    setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, status } : a))
    setSalvando(true)
    const aluno = alunos.find(a => a.id === alunoId)
    await supabase.from('registros_chamada').upsert({
      chamada_id: chamadaId,
      aluno_id: alunoId,
      status,
      observacao: aluno?.observacao || null,
      registrado_em: new Date().toISOString(),
    }, { onConflict: 'chamada_id,aluno_id' })
    setSalvando(false)
  }

  async function salvarObs(alunoId: string, obs: string) {
    setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, observacao: obs } : a))
    const aluno = alunos.find(a => a.id === alunoId)
    if (!aluno?.status) return
    await supabase.from('registros_chamada').upsert({
      chamada_id: chamadaId, aluno_id: alunoId, status: aluno.status, observacao: obs,
    }, { onConflict: 'chamada_id,aluno_id' })
  }

  async function confirmar() {
    setConfirmando(true)
    await supabase.from('chamadas').update({
      status: 'concluida', concluida_em: new Date().toISOString()
    }).eq('id', chamadaId)

    // Notifica responsáveis dos alunos presentes (sem bloquear)
    fetch('/api/professor/notificar-presenca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chamada_id: chamadaId }),
    }).catch(() => {})

    router.push(`/professor/resumo/${chamadaId}`)
  }

  const marcados = alunos.filter(a => a.status !== null).length
  const total = alunos.length
  const progresso = total > 0 ? Math.round((marcados / total) * 100) : 0
  const presentes = alunos.filter(a => a.status === 'presente').length
  const faltas = alunos.filter(a => a.status === 'falta').length
  const justificadas = alunos.filter(a => a.status === 'justificada').length

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
          <span className="text-xs text-gray-600" style={{ fontFamily: 'DM Mono, monospace' }}>
            {aula?.horario_inicio?.slice(0, 5)} – {aula?.horario_fim?.slice(0, 5)}
          </span>
        </div>
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
                    onClick={() => marcar(aluno.id, s)}
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
