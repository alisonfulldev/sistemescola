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
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY })
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
      setStatus('ativo')
    } catch { setStatus('idle') }
  }

  if (status === 'ativo') return (
    <div className="flex items-center gap-2 bg-[#39d353]/10 border border-[#39d353]/30 rounded-xl px-4 py-3 mb-4">
      <span className="text-lg">🔔</span>
      <p className="text-sm text-[#39d353] font-medium">Notificações ativadas</p>
    </div>
  )
  if (status === 'negado') return (
    <div className="flex items-center gap-2 bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl px-4 py-3 mb-4">
      <span className="text-lg">🔕</span>
      <p className="text-sm text-[#f85149]">Notificações bloqueadas. Ative nas configurações do navegador.</p>
    </div>
  )
  return (
    <button onClick={ativar} disabled={status === 'ativando'}
      className="w-full flex items-center justify-center gap-2 bg-[#39d353] hover:bg-green-400 disabled:opacity-60 text-black font-bold rounded-xl px-4 py-3 mb-4 transition-colors"
    >
      <span className="text-lg">🔔</span>
      {status === 'ativando' ? 'Ativando...' : 'Ativar notificações'}
    </button>
  )
}

export default function ResponsavelDashboard() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [notas, setNotas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [justificandoId, setJustificandoId] = useState<string | null>(null)
  const [motivoText, setMotivoText] = useState('')
  const [enviandoJust, setEnviandoJust] = useState(false)
  const [okJust, setOkJust] = useState<string | null>(null)
  const supabase = createClient()

  async function carregar() {
    const [statusRes, notasRes] = await Promise.all([
      fetch('/api/responsavel/status'),
      fetch('/api/responsavel/notas'),
    ])
    if (statusRes.ok) { const { alunos: data } = await statusRes.json(); setAlunos(data || []) }
    if (notasRes.ok) { const { notas: n } = await notasRes.json(); setNotas(n || []) }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    const interval = setInterval(carregar, 30000)
    const ch = supabase.channel('responsavel-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_chamada' }, carregar)
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(ch) }
  }, [])

  async function justificar(registroId: string) {
    if (!motivoText.trim()) return
    setEnviandoJust(true)
    const res = await fetch('/api/responsavel/justificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registro_id: registroId, motivo: motivoText }),
    })
    if (res.ok) {
      setOkJust(registroId)
      setJustificandoId(null)
      setMotivoText('')
      setTimeout(() => { setOkJust(null); carregar() }, 2000)
    }
    setEnviandoJust(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white">Acompanhamento</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{formatDate(new Date(), "EEEE, dd 'de' MMMM")}</p>
      </div>

      <BotaoNotificacao />

      {alunos.length === 0 ? (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">👨‍👩‍👦</div>
          <p className="text-gray-400 font-medium">Nenhum aluno vinculado</p>
          <p className="text-gray-600 text-sm mt-1">Entre em contato com a escola para vincular seu(s) filho(s)</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {alunos.map(aluno => {
            const status = aluno.registro?.status
            const registroId = aluno.registro?.id
            const justificativa = aluno.justificativa

            return (
              <div key={aluno.id} className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#30363d]">
                      {aluno.foto_url ? (
                        <Image src={aluno.foto_url} alt="" width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-lg font-bold text-gray-400">
                          {aluno.nome_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-white text-base truncate">{aluno.nome_completo}</h2>
                      <p className="text-gray-500 text-sm">{aluno.turmas?.nome}</p>
                      <p className="text-xs text-gray-600 mt-0.5 font-mono">Matrícula: {aluno.matricula}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                      status === 'presente' ? 'bg-[#39d353]/10 border-[#39d353]/30' :
                      status === 'falta' ? 'bg-[#f85149]/10 border-[#f85149]/30' :
                      status === 'justificada' ? 'bg-[#e3b341]/10 border-[#e3b341]/30' :
                      'bg-[#0d1117] border-[#30363d]'
                    }`}>
                      <span className="text-lg">
                        {status === 'presente' ? '✅' : status === 'falta' ? '❌' : status === 'justificada' ? '📝' : '📋'}
                      </span>
                      <div className="flex-1">
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
                          <p className="text-xs text-gray-600 font-mono">
                            confirmado às {new Date(aluno.registro.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {aluno.registro?.observacao && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">{aluno.registro.observacao}</p>
                        )}
                      </div>
                    </div>

                    {/* Justificativa */}
                    {status === 'falta' && !justificativa && (
                      <div>
                        {justificandoId === registroId ? (
                          <div className="space-y-2">
                            {okJust === registroId ? (
                              <p className="text-xs text-[#39d353] text-center py-2">✓ Justificativa enviada! Aguardando aprovação do professor.</p>
                            ) : (
                              <>
                                <textarea
                                  value={motivoText}
                                  onChange={e => setMotivoText(e.target.value)}
                                  placeholder="Descreva o motivo da falta..."
                                  rows={2}
                                  className="w-full bg-[#0d1117] border border-yellow-400/30 text-gray-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-yellow-400 resize-none"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => justificar(registroId)} disabled={enviandoJust || !motivoText.trim()}
                                    className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm font-bold rounded-xl transition-colors"
                                  >
                                    {enviandoJust ? 'Enviando...' : 'Enviar justificativa'}
                                  </button>
                                  <button onClick={() => { setJustificandoId(null); setMotivoText('') }}
                                    className="px-3 py-2 bg-[#30363d] text-gray-300 text-sm rounded-xl transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setJustificandoId(registroId)}
                            className="w-full py-2 border border-yellow-400/30 text-yellow-400 text-sm rounded-xl hover:bg-yellow-400/10 transition-colors"
                          >
                            📝 Justificar falta
                          </button>
                        )}
                      </div>
                    )}

                    {/* Status da justificativa */}
                    {justificativa && (
                      <div className={`px-3 py-2 rounded-xl border text-xs ${
                        justificativa.status === 'pendente' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                        justificativa.status === 'aprovada' ? 'bg-[#39d353]/10 border-[#39d353]/30 text-[#39d353]' :
                        'bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]'
                      }`}>
                        <p className="font-medium">
                          {justificativa.status === 'pendente' ? '⏳ Justificativa enviada — aguardando aprovação' :
                           justificativa.status === 'aprovada' ? '✅ Justificativa aprovada pelo professor' :
                           '❌ Justificativa não aprovada'}
                        </p>
                        {justificativa.professor_resposta && <p className="mt-0.5 opacity-80">"{justificativa.professor_resposta}"</p>}
                      </div>
                    )}
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

      {/* Boletim / Notas */}
      {notas.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Boletim — Notas publicadas</h2>
          <div className="space-y-2">
            {notas.map((n, i) => {
              const pct = n.nota !== null && n.nota_maxima ? (n.nota / n.nota_maxima) * 100 : null
              return (
                <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{n.titulo}</p>
                      <p className="text-xs text-gray-500">{n.aluno_nome} · {n.turma} · {n.data ? new Date(n.data + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {n.nota !== null ? (
                        <p className={`text-lg font-bold ${pct !== null && pct >= 60 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>
                          {n.nota}<span className="text-xs text-gray-500">/{n.nota_maxima}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">—</p>
                      )}
                    </div>
                  </div>
                  {pct !== null && (
                    <div className="w-full bg-[#0d1117] rounded-full h-1.5 mt-2">
                      <div className={`h-1.5 rounded-full ${pct >= 60 ? 'bg-[#39d353]' : 'bg-[#f85149]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
