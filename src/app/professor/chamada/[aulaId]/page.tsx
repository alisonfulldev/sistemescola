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

export default function ChamadaPage({ params }: { params: { aulaId: string } }) {
  const [alunos, setAlunos] = useState<AlunoRow[]>([])
  const [aula, setAula] = useState<any>(null)
  const [chamadaId, setChamadaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState('')
  const [expandObs, setExpandObs] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: aulaData } = await supabase
      .from('aulas')
      .select(`
        id, data, horario_inicio, horario_fim,
        turmas (id, nome, turno),
        disciplinas (nome),
        chamadas (id, status)
      `)
      .eq('id', params.aulaId)
      .eq('professor_id', user.id)
      .single()

    if (!aulaData) {
      setErro('Aula não encontrada ou sem permissão.')
      setLoading(false)
      return
    }
    setAula(aulaData)

    const chamadaExistente = (aulaData as any).chamadas?.[0]
    if (chamadaExistente?.status === 'concluida') {
      return router.push(`/professor/resumo/${chamadaExistente.id}`)
    }

    let chamadaAtual = chamadaExistente
    if (!chamadaAtual) {
      const { data: nova, error } = await supabase
        .from('chamadas')
        .insert({ aula_id: params.aulaId, status: 'em_andamento' })
        .select().single()

      if (error) {
        setErro('Erro ao iniciar chamada. Verifique se está no horário permitido.')
        setLoading(false)
        return
      }
      chamadaAtual = nova
    }
    setChamadaId(chamadaAtual.id)

    const { data: alunosData } = await supabase
      .from('alunos')
      .select('id, nome_completo, foto_url')
      .eq('turma_id', (aulaData as any).turmas.id)
      .eq('ativo', true)
      .order('nome_completo')

    const { data: registros } = await supabase
      .from('registros_chamada')
      .select('aluno_id, status, observacao')
      .eq('chamada_id', chamadaAtual.id)

    const hoje = new Date().toISOString().split('T')[0]
    const { data: entradas } = await supabase
      .from('entradas')
      .select('aluno_id, hora')
      .in('aluno_id', (alunosData || []).map((a: any) => a.id))
      .eq('data', hoje)

    const registroMap = new Map((registros || []).map((r: any) => [r.aluno_id, r]))
    const entradaMap = new Map((entradas || []).map((e: any) => [e.aluno_id, e]))

    setAlunos((alunosData || []).map((a: any) => {
      const reg = registroMap.get(a.id) as any
      return {
        ...a,
        status: reg?.status || null,
        observacao: reg?.observacao || '',
        entrada: entradaMap.get(a.id) || null,
      }
    }))
    setLoading(false)
  }, [params.aulaId, router, supabase])

  useEffect(() => { load() }, [load])

  // Realtime: atualizar entradas
  useEffect(() => {
    if (!aula?.turmas?.id) return
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
  }, [aula, supabase])

  async function marcar(alunoId: string, status: StatusPresenca) {
    setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, status } : a))
    if (!chamadaId) return
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
    if (!chamadaId) return
    const aluno = alunos.find(a => a.id === alunoId)
    if (!aluno?.status) return
    await supabase.from('registros_chamada').upsert({
      chamada_id: chamadaId, aluno_id: alunoId, status: aluno.status, observacao: obs,
    }, { onConflict: 'chamada_id,aluno_id' })
  }

  async function confirmar() {
    if (!chamadaId) return
    setConfirmando(true)
    await supabase.from('chamadas').update({
      status: 'concluida', concluida_em: new Date().toISOString()
    }).eq('id', chamadaId)
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
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  )

  if (erro) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-red-700 font-medium">{erro}</p>
      <button onClick={() => router.push('/professor')} className="mt-4 text-sm text-indigo-600 hover:underline">
        ← Voltar
      </button>
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Info aula */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{aula?.turmas?.nome}</h1>
            <p className="text-gray-500 text-sm">{aula?.disciplinas?.nome}</p>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {aula?.horario_inicio?.slice(0,5)} – {aula?.horario_fim?.slice(0,5)}
          </span>
        </div>
      </div>

      {/* Progresso */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso</span>
          <span className="text-sm font-bold text-indigo-600 font-nums">{marcados}/{total} alunos</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progresso}%` }} />
        </div>
        <div className="flex gap-5 mt-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-green-500 rounded-full"/><span className="font-nums text-green-700">{presentes}</span><span className="text-gray-400">presentes</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-red-500 rounded-full"/><span className="font-nums text-red-700">{faltas}</span><span className="text-gray-400">faltas</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-yellow-500 rounded-full"/><span className="font-nums text-yellow-700">{justificadas}</span><span className="text-gray-400">justificadas</span></span>
          {salvando && <span className="ml-auto text-gray-400 italic">Salvando...</span>}
        </div>
      </div>

      {/* Lista de alunos */}
      <div className="space-y-2 mb-6">
        {alunos.map((aluno, idx) => (
          <div key={aluno.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
            aluno.status === 'presente' ? 'border-green-200' :
            aluno.status === 'falta' ? 'border-red-200' :
            aluno.status === 'justificada' ? 'border-yellow-200' : 'border-slate-100'
          }`}>
            <div className="p-3">
              <div className="flex items-center gap-3 mb-3">
                {/* Foto */}
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {aluno.foto_url ? (
                    <Image src={aluno.foto_url} alt={aluno.nome_completo} width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xs font-bold text-slate-500">
                      {aluno.nome_completo.split(' ').map(n => n[0]).slice(0,2).join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{aluno.nome_completo}</p>
                  {aluno.entrada ? (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Entrada registrada às {aluno.entrada.hora.slice(0,5)}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">Entrada não registrada</p>
                  )}
                </div>
                <span className="text-xs text-slate-300 font-nums flex-shrink-0">{idx + 1}</span>
              </div>

              {/* Botões */}
              <div className="flex gap-2">
                {(['presente', 'falta', 'justificada'] as StatusPresenca[]).map(s => (
                  <button
                    key={s}
                    onClick={() => marcar(aluno.id, s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                      aluno.status === s
                        ? s === 'presente' ? 'bg-green-500 text-white shadow-sm'
                          : s === 'falta' ? 'bg-red-500 text-white shadow-sm'
                          : 'bg-yellow-500 text-white shadow-sm'
                        : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
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
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
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
                      className="w-full mt-1.5 px-3 py-2 text-xs border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botão confirmar */}
      <div className="sticky bottom-4">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={marcados < total || total === 0}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${
            marcados === total && total > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99] shadow-lg shadow-indigo-200'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {marcados === total && total > 0
            ? '✓ Confirmar Chamada'
            : `Marque todos os alunos (${total - marcados} restantes)`}
        </button>
      </div>

      {/* Modal confirmação */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Confirmar chamada?</h3>
            <p className="text-gray-500 text-sm mb-5">Após confirmar, apenas o administrador pode reabrir.</p>
            <div className="grid grid-cols-3 gap-3 mb-5 text-center">
              {[
                { n: presentes, label: 'Presentes', cls: 'bg-green-50 text-green-700 border-green-100' },
                { n: faltas, label: 'Faltas', cls: 'bg-red-50 text-red-700 border-red-100' },
                { n: justificadas, label: 'Justif.', cls: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
              ].map(k => (
                <div key={k.label} className={`rounded-xl p-3 border ${k.cls}`}>
                  <div className="text-2xl font-bold font-nums">{k.n}</div>
                  <div className="text-xs mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-gray-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >Cancelar</button>
              <button onClick={confirmar} disabled={confirmando}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                {confirmando ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
