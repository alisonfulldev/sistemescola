'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from(Array.from(rawData).map(c => c.charCodeAt(0)))
}

function BannerInstalarApp() {
  const [visivel, setVisivel] = useState(false)
  const [mostrarInstrucoes, setMostrarInstrucoes] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-dispensado') === '1') return
    setVisivel(true)
    window.addEventListener('appinstalled', () => setVisivel(false))
  }, [])

  if (!visivel) return null

  async function instalar() {
    const p = (window as any).__pwaInstallPrompt
    if (p) {
      p.prompt()
      const { outcome } = await p.userChoice
      if (outcome === 'accepted') { setVisivel(false); return }
    }
    setMostrarInstrucoes(true)
  }

  function dispensar() {
    localStorage.setItem('pwa-dispensado', '1')
    setVisivel(false)
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-blue-600">Instalar app</p>
          <p className="text-xs text-slate-500 mt-0.5">Receba notificações mesmo com o navegador fechado</p>
        </div>
        <button onClick={dispensar} className="text-slate-400 hover:text-slate-600 text-xl px-1 flex-shrink-0">×</button>
        <button onClick={instalar} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
          Instalar
        </button>
      </div>
      {mostrarInstrucoes && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-600">Para instalar manualmente:</p>
          <p>• <strong>Android (Chrome):</strong> toque nos 3 pontos (⋮) → <em>"Adicionar à tela inicial"</em></p>
          <p>• <strong>iPhone (Safari):</strong> toque em compartilhar (⬆) → <em>"Adicionar à Tela de Início"</em></p>
        </div>
      )}
    </div>
  )
}

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
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) })
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
      setStatus('ativo')
    } catch { setStatus('idle') }
  }

  if (status === 'ativo') return (
    <button onClick={ativar} className="w-full flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <p className="text-sm text-green-600 font-medium">Notificações ativadas</p>
      </div>
      <span className="text-xs text-green-400">Toque para renovar</span>
    </button>
  )
  if (status === 'negado') return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <span className="text-lg">🔕</span>
      <p className="text-sm text-red-600">Notificações bloqueadas. Ative nas configurações do navegador.</p>
    </div>
  )
  return (
    <button onClick={ativar} disabled={status === 'ativando'}
      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold rounded-xl px-4 py-3 mb-4 transition-colors"
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
    // Registra SW no carregamento para habilitar instalação PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { })
    }
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
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Acompanhamento</h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">{formatDate(new Date(), "EEEE, dd 'de' MMMM")}</p>
      </div>

      <BannerInstalarApp />
      <BotaoNotificacao />

      {/* Card de Justificativas */}
      <Link href="/responsavel/justificativas"
        className="block bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 transition-colors mb-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">📋 Justificativas</p>
            <p className="text-xs text-slate-500">Justifique as faltas de seus filhos</p>
          </div>
          <span className="text-slate-400">→</span>
        </div>
      </Link>

      {alunos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">👨‍👩‍👦</div>
          <p className="text-slate-500 font-medium">Nenhum aluno vinculado</p>
          <p className="text-slate-400 text-sm mt-1">Entre em contato com a escola para vincular seu(s) filho(s)</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {alunos.map(aluno => {
            const status = aluno.registro?.status
            const registroId = aluno.registro?.id
            const justificativa = aluno.justificativa

            return (
              <div key={aluno.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                      {aluno.foto_url ? (
                        <Image src={aluno.foto_url} alt="" width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-lg font-bold text-slate-500">
                          {aluno.nome_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-slate-900 text-base truncate">{aluno.nome_completo}</h2>
                      <p className="text-slate-500 text-sm">{aluno.turmas?.nome}</p>
                      {(aluno.turmas?.serie || aluno.turmas?.turno) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[aluno.turmas?.serie, aluno.turmas?.turno].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">Matrícula: {aluno.matricula}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${status === 'presente' ? 'bg-green-50 border-green-200' :
                        status === 'falta' ? 'bg-red-50 border-red-200' :
                          status === 'justificada' ? 'bg-amber-50 border-amber-200' :
                            'bg-slate-50 border-slate-200'
                      }`}>
                      <span className="text-lg">
                        {status === 'presente' ? '✅' : status === 'falta' ? '❌' : status === 'justificada' ? '📝' : '📋'}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${status === 'presente' ? 'text-green-600' :
                            status === 'falta' ? 'text-red-600' :
                              status === 'justificada' ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                          {status === 'presente' ? 'Presente na aula' :
                            status === 'falta' ? 'Falta registrada' :
                              status === 'justificada' ? 'Falta justificada' : 'Chamada não realizada'}
                        </p>
                        {aluno.registro?.registrado_em && (
                          <p className="text-xs text-slate-400 font-mono">
                            confirmado às {new Date(aluno.registro.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {aluno.registro?.observacao && (
                          <p className="text-xs text-slate-500 mt-0.5 italic">{aluno.registro.observacao}</p>
                        )}
                      </div>
                    </div>

                    {/* Justificativa */}
                    {status === 'falta' && !justificativa && (
                      <div>
                        {justificandoId === registroId ? (
                          <div className="space-y-2">
                            {okJust === registroId ? (
                              <p className="text-xs text-green-600 text-center py-2">✓ Justificativa enviada! Aguardando aprovação do professor.</p>
                            ) : (
                              <>
                                <textarea
                                  value={motivoText}
                                  onChange={e => setMotivoText(e.target.value)}
                                  placeholder="Descreva o motivo da falta..."
                                  rows={2}
                                  className="w-full bg-white border border-amber-300 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 resize-none"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => justificar(registroId)} disabled={enviandoJust || !motivoText.trim()}
                                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                                  >
                                    {enviandoJust ? 'Enviando...' : 'Enviar justificativa'}
                                  </button>
                                  <button onClick={() => { setJustificandoId(null); setMotivoText('') }}
                                    className="px-3 py-2 bg-white border border-slate-300 text-slate-600 text-sm rounded-xl transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => setJustificandoId(registroId)}
                            className="w-full py-2 border border-amber-300 text-amber-600 text-sm rounded-xl hover:bg-amber-50 transition-colors"
                          >
                            📝 Justificar falta
                          </button>
                        )}
                      </div>
                    )}

                    {/* Status da justificativa */}
                    {justificativa && (
                      <div className={`px-3 py-2 rounded-xl border text-xs ${justificativa.status === 'pendente' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                          justificativa.status === 'aprovada' ? 'bg-green-50 border-green-200 text-green-600' :
                            'bg-red-50 border-red-200 text-red-600'
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

                  {aluno.ultima_aula && (aluno.ultima_aula.conteudo_programatico || aluno.ultima_aula.atividades_desenvolvidas) && (
                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        📖 Última aula{aluno.ultima_aula.disciplinas?.nome ? ` · ${aluno.ultima_aula.disciplinas.nome}` : ''}
                        {aluno.ultima_aula.data && <span className="ml-2 font-normal normal-case">{new Date(aluno.ultima_aula.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                      </p>
                      {aluno.ultima_aula.conteudo_programatico && (
                        <p className="text-xs text-slate-500 leading-relaxed">{aluno.ultima_aula.conteudo_programatico}</p>
                      )}
                      {aluno.ultima_aula.atividades_desenvolvidas && (
                        <p className="text-xs text-slate-400 leading-relaxed mt-1">✏️ {aluno.ultima_aula.atividades_desenvolvidas}</p>
                      )}
                    </div>
                  )}

                  <Link href={`/responsavel/${aluno.id}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl text-sm transition-colors border border-slate-200"
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
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Boletim — {new Date().getFullYear()}</h2>
          <div className="space-y-3">

            {/* Group by aluno - simplificado */}
            {Array.from(new Set(notas.map((n: any) => n.aluno_id))).map(alunoId => {
              const notasAluno = notas.filter((n: any) => n.aluno_id === alunoId)
              const alunoDados = notasAluno[0]
              return (
                <div key={alunoId as string} className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3">
                  <div className="px-4 py-3 border-b border-slate-200">
                    <p className="text-sm font-semibold text-slate-900">{alunoDados.aluno_nome} — {alunoDados.ano}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {notasAluno.map((n: any) => {
                      const medNum = n.media_final
                      return (
                        <div key={n.disciplina} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">{n.disciplina}</span>
                          <div className="text-right">
                            {medNum !== null && (
                              <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full ${medNum >= 7 ? 'bg-green-50 text-green-600 border border-green-200' :
                                  medNum >= 5 ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                    'bg-red-50 text-red-600 border border-red-200'
                                }`}>
                                {medNum.toFixed(1)}
                              </span>
                            )}
                            {n.situacao_final && (
                              <span className={`text-xs font-medium block mt-1 ${n.situacao_final === 'Aprovado' ? 'text-green-600' : 'text-amber-600'
                                }`}>
                                {n.situacao_final}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

          </div>
        </div>
      )}
    </div>
  )
}
