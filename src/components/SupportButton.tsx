'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ErroCapturado {
  tipo: string
  mensagem: string
  hora: string
  pagina: string
}

const ICONE_WHATSAPP = (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function SupportButton() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [erros, setErros] = useState<ErroCapturado[]>([])
  const [usuario, setUsuario] = useState<{ nome: string; email: string; perfil: string } | null>(null)
  const [enviado, setEnviado] = useState(false)
  const errosRef = useRef<ErroCapturado[]>([])

  // Não mostra na tela de login
  const paginasOcultas = ['/login', '/']
  if (paginasOcultas.includes(pathname)) return null

  // Busca dados do usuário logado
  useEffect(() => {
    async function carregarUsuario() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('usuarios')
        .select('nome, perfil')
        .eq('id', user.id)
        .single()
      if (data) setUsuario({ nome: data.nome, email: user.email || '', perfil: data.perfil })
    }
    carregarUsuario()
  }, [])

  // Intercepta erros do sistema
  useEffect(() => {
    function adicionarErro(tipo: string, mensagem: string) {
      const entrada: ErroCapturado = {
        tipo,
        mensagem: mensagem.slice(0, 800),
        hora: new Date().toLocaleTimeString('pt-BR'),
        pagina: typeof window !== 'undefined' ? window.location.pathname : '',
      }
      errosRef.current = [entrada, ...errosRef.current].slice(0, 10)
      setErros([...errosRef.current])
    }

    // Intercepta console.error
    const consoleOriginal = console.error
    console.error = (...args: any[]) => {
      const msg = args.map(a =>
        a instanceof Error ? `${a.name}: ${a.message}` :
        typeof a === 'object' ? JSON.stringify(a) : String(a)
      ).join(' ')
      adicionarErro('Erro JS', msg)
      consoleOriginal.apply(console, args)
    }

    // Intercepta erros não tratados
    function onWindowError(e: ErrorEvent) {
      adicionarErro('Exceção', `${e.message} — ${e.filename}:${e.lineno}`)
    }
    function onUnhandledRejection(e: PromiseRejectionEvent) {
      const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
      adicionarErro('Promise rejeitada', msg)
    }

    // Intercepta erros HTTP via fetch
    const fetchOriginal = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const resposta = await fetchOriginal(...args)
      if (!resposta.ok) {
        const url = typeof args[0] === 'string' ? args[0] :
          args[0] instanceof Request ? args[0].url : String(args[0])
        const urlCurta = url.replace(window.location.origin, '')
        adicionarErro(`HTTP ${resposta.status}`, `${resposta.status} ${resposta.statusText} → ${urlCurta}`)
      }
      return resposta
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      console.error = consoleOriginal
      window.fetch = fetchOriginal
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  function gerarMensagem() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const errosTexto = erros.length > 0
      ? erros.map(e => `[${e.hora}] ${e.tipo}: ${e.mensagem}`).join('\n')
      : 'Nenhum erro capturado automaticamente.'

    return (
      `🚨 *CHAMADO DE SUPORTE — ESTUDAPP*\n\n` +
      `👤 *Usuário:* ${usuario?.nome || 'N/A'}\n` +
      `📧 *Email:* ${usuario?.email || 'N/A'}\n` +
      `🔑 *Perfil:* ${usuario?.perfil || 'N/A'}\n` +
      `🔗 *Página:* ${url}\n` +
      `🕐 *Data/hora:* ${new Date().toLocaleString('pt-BR')}\n\n` +
      `📝 *Descrição do problema:*\n${descricao || '(não informada)'}\n\n` +
      `⚠️ *Erros capturados automaticamente:*\n\`\`\`\n${errosTexto}\n\`\`\``
    )
  }

  function enviarWhatsApp() {
    const mensagem = encodeURIComponent(gerarMensagem())
    const numero = process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP || ''
    const url = numero
      ? `https://wa.me/${numero}?text=${mensagem}`
      : `https://api.whatsapp.com/send?text=${mensagem}`
    window.open(url, '_blank')
    setEnviado(true)
    setTimeout(() => {
      setAberto(false)
      setEnviado(false)
      setDescricao('')
    }, 1500)
  }

  const temErros = erros.length > 0

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        title="Reportar problema ao suporte"
      >
        {ICONE_WHATSAPP}
        <span className="hidden sm:inline">Suporte</span>
        {temErros && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {erros.length > 9 ? '9+' : erros.length}
          </span>
        )}
      </button>

      {/* Modal */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                  {ICONE_WHATSAPP}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Abrir Chamado de Suporte</p>
                  <p className="text-xs text-slate-400">Erros são anexados automaticamente</p>
                </div>
              </div>
              <button onClick={() => { setAberto(false); setDescricao('') }}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-lg leading-none">
                ×
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Usuário */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-14 shrink-0">Usuário</span>
                  <span className="text-slate-700 font-medium">{usuario?.nome || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-14 shrink-0">Perfil</span>
                  <span className="text-slate-700 capitalize">{usuario?.perfil || '—'}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-14 shrink-0">Página</span>
                  <span className="text-slate-700 font-mono truncate">{typeof window !== 'undefined' ? window.location.pathname : ''}</span>
                </div>
              </div>

              {/* Erros capturados */}
              {temErros ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                      {erros.length} erro{erros.length > 1 ? 's' : ''} capturado{erros.length > 1 ? 's' : ''}
                    </span>
                    <button onClick={() => { errosRef.current = []; setErros([]) }}
                      className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto">
                      limpar
                    </button>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                    {erros.map((e, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex gap-2 items-baseline">
                          <span className="text-red-400 font-mono shrink-0">{e.hora}</span>
                          <span className="text-red-700 font-semibold">{e.tipo}</span>
                        </div>
                        <p className="text-red-600 font-mono mt-0.5 break-all leading-relaxed">{e.mensagem}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <span className="text-amber-500">⚠️</span>
                  <p className="text-xs text-amber-700">Nenhum erro capturado ainda. Reproduza o problema e clique em suporte novamente.</p>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Descreva o problema
                </label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="O que aconteceu? Qual ação você tentou fazer? Quando ocorreu?"
                  rows={3}
                  className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={enviarWhatsApp}
                disabled={enviado}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-75 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {enviado ? (
                  <><span>✓</span> Abrindo WhatsApp...</>
                ) : (
                  <>{ICONE_WHATSAPP} Enviar via WhatsApp</>
                )}
              </button>
              <button
                onClick={() => { setAberto(false); setDescricao('') }}
                className="px-5 py-3 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
