'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

function BotaoNotificacao() {
  const [status, setStatus] = useState<'idle' | 'ativando' | 'ativo' | 'negado'>('idle')

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'granted') setStatus('ativo')
    if (Notification.permission === 'denied') setStatus('negado')
  }, [])

  async function ativar() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setStatus('ativando')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setStatus('negado'); return }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })

      setStatus('ativo')
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'ativo') return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="text-lg">🔔</span>
      <p className="text-sm text-green-700 font-medium">Notificações ativadas</p>
    </div>
  )

  if (status === 'negado') return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <span className="text-lg">🔕</span>
      <p className="text-sm text-red-700">Notificações bloqueadas. Ative nas configurações do navegador.</p>
    </div>
  )

  return (
    <button
      onClick={ativar}
      disabled={status === 'ativando'}
      className="w-full flex items-center justify-center gap-2 bg-[#39d353] hover:bg-green-400 disabled:opacity-60 text-black font-bold rounded-xl px-4 py-3 mb-4 transition-colors"
    >
      <span className="text-lg">🔔</span>
      {status === 'ativando' ? 'Ativando...' : 'Ativar notificações de chegada'}
    </button>
  )
}


export default function ResponsavelDashboard() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Busca alunos vinculados ao responsável
    const { data: vinculos } = await supabase
      .from('responsaveis_alunos')
      .select(`
        aluno_id,
        alunos (
          id, nome_completo, foto_url, matricula,
          turmas (id, nome, turno)
        )
      `)
      .eq('responsavel_id', user.id)

    if (!vinculos?.length) {
      setLoading(false)
      return
    }

    const hoje = new Date().toISOString().split('T')[0]

    // Para cada aluno, busca status do dia
    const alunosComStatus = await Promise.all((vinculos || []).map(async (v: any) => {
      const aluno = v.alunos

      // Entrada na escola
      const { data: entrada } = await supabase
        .from('entradas')
        .select('hora')
        .eq('aluno_id', aluno.id)
        .eq('data', hoje)
        .maybeSingle()

      // Status na chamada
      const { data: registro } = await supabase
        .from('registros_chamada')
        .select(`
          status, registrado_em, observacao,
          chamadas!inner (
            aulas!inner (data)
          )
        `)
        .eq('aluno_id', aluno.id)
        .order('registrado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Verifica se o registro é de hoje
      const registroHoje = registro?.chamadas?.aulas?.data === hoje ? registro : null

      return { ...aluno, entrada, registro: registroHoje }
    }))

    setAlunos(alunosComStatus)
    setLoading(false)
  }

  useEffect(() => {
    carregar()

    // Realtime: atualiza ao receber novo registro de chamada ou entrada
    const ch = supabase.channel('responsavel-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registros_chamada' }, carregar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registros_chamada' }, carregar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entradas' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">Acompanhamento</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {formatDate(new Date(), "EEEE, dd 'de' MMMM")}
        </p>
      </div>

      <BotaoNotificacao />

      {alunos.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">👨‍👩‍👦</div>
          <p className="text-gray-400 font-medium">Nenhum aluno vinculado</p>
          <p className="text-gray-600 text-sm mt-1">Entre em contato com a escola para vincular seu(s) filho(s)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alunos.map(aluno => {
            const status = aluno.registro?.status
            const temEntrada = !!aluno.entrada

            return (
              <div key={aluno.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#30363d]">
                      {aluno.foto_url ? (
                        <Image src={aluno.foto_url} alt="" width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">
                          {aluno.nome_completo.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-white text-base truncate">{aluno.nome_completo}</h2>
                      <p className="text-gray-500 text-sm">{aluno.turmas?.nome}</p>
                      <p className="text-xs text-gray-600 mt-0.5" style={{ fontFamily: 'DM Mono, monospace' }}>Matrícula: {aluno.matricula}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {/* Entrada */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      temEntrada ? 'bg-[#39d353]/10 border-[#39d353]/30' : 'bg-[#0d1117] border-[#30363d]'
                    }`}>
                      <span className="text-lg">{temEntrada ? '🏫' : '⏳'}</span>
                      <div>
                        <p className={`text-sm font-medium ${temEntrada ? 'text-[#39d353]' : 'text-gray-500'}`}>
                          {temEntrada ? 'Chegou na escola' : 'Aguardando chegada'}
                        </p>
                        {temEntrada && (
                          <p className="text-xs text-[#39d353]/70" style={{ fontFamily: 'DM Mono, monospace' }}>{aluno.entrada.hora.slice(0,5)}</p>
                        )}
                      </div>
                    </div>

                    {/* Chamada */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      status === 'presente' ? 'bg-[#39d353]/10 border-[#39d353]/30' :
                      status === 'falta' ? 'bg-[#f85149]/10 border-[#f85149]/30' :
                      status === 'justificada' ? 'bg-[#e3b341]/10 border-[#e3b341]/30' :
                      'bg-[#0d1117] border-[#30363d]'
                    }`}>
                      <span className="text-lg">
                        {status === 'presente' ? '✅' : status === 'falta' ? '❌' : status === 'justificada' ? '📝' : '📋'}
                      </span>
                      <div>
                        <p className={`text-sm font-medium ${
                          status === 'presente' ? 'text-[#39d353]' :
                          status === 'falta' ? 'text-[#f85149]' :
                          status === 'justificada' ? 'text-[#e3b341]' : 'text-gray-500'
                        }`}>
                          {status === 'presente' ? 'Presente na aula' :
                           status === 'falta' ? 'Falta registrada' :
                           status === 'justificada' ? 'Falta justificada' : 'Chamada não realizada'}
                        </p>
                        {aluno.registro?.registrado_em && (
                          <p className="text-xs text-gray-600" style={{ fontFamily: 'DM Mono, monospace' }}>
                            confirmado às {new Date(aluno.registro.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {aluno.registro?.observacao && (
                          <p className="text-xs text-gray-500 mt-0.5">{aluno.registro.observacao}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link href={`/responsavel/${aluno.id}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-[#0d1117] hover:bg-[#30363d] text-gray-400 hover:text-gray-200 rounded-xl text-sm transition-colors border border-[#30363d]"
                  >
                    📅 Ver histórico de frequência
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
