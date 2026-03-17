'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface EntradaRegistrada {
  aluno: {
    id: string
    nome_completo: string
    foto_url?: string
    turma: { nome: string }
  }
  hora: string
}

type Estado = 'idle' | 'lendo' | 'sucesso' | 'erro' | 'ja_registrado'

export default function PortariaPage() {
  const [estado, setEstado] = useState<Estado>('idle')
  const [entrada, setEntrada] = useState<EntradaRegistrada | null>(null)
  const [mensagemErro, setMensagemErro] = useState('')
  const [scannerAtivo, setScannerAtivo] = useState(false)
  const [html5QrCode, setHtml5QrCode] = useState<any>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    // Carrega html5-qrcode dinamicamente (client-side only)
    import('html5-qrcode').then(m => {
      setHtml5QrCode(() => m.Html5Qrcode)
    })
  }, [])

  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      stopScanner()
    }
  }, [])

  async function startScanner() {
    if (!html5QrCode || !scannerRef.current) return
    setScannerAtivo(true)
    setEstado('lendo')

    const scanner = new html5QrCode('qr-reader')

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText: string) => {
          if (processingRef.current) return
          processingRef.current = true

          await scanner.stop().catch(() => {})
          setScannerAtivo(false)
          await processarQRCode(decodedText)

          setTimeout(() => {
            processingRef.current = false
          }, 3000)
        },
        () => {}
      )
    } catch (err) {
      setEstado('erro')
      setMensagemErro('Câmera não disponível. Verifique as permissões.')
      setScannerAtivo(false)
    }
  }

  async function stopScanner() {
    try {
      const el = document.getElementById('qr-reader')
      if (el) {
        const scanner = new html5QrCode!('qr-reader')
        await scanner.stop().catch(() => {})
      }
    } catch {}
    setScannerAtivo(false)
  }

  async function processarQRCode(qrData: string) {
    setEstado('lendo')

    try {
      const res = await fetch('/api/portaria/registrar-entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrData }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setEntrada(data)
          setEstado('ja_registrado')
        } else {
          setMensagemErro(data.error || 'Erro ao processar QR Code')
          setEstado('erro')
        }
        return
      }

      setEntrada(data)
      setEstado('sucesso')

      // Auto-reset após 4 segundos
      setTimeout(() => {
        setEstado('idle')
        setEntrada(null)
      }, 4000)
    } catch {
      setMensagemErro('Erro de conexão. Tente novamente.')
      setEstado('erro')
    }
  }

  function resetar() {
    setEstado('idle')
    setEntrada(null)
    setMensagemErro('')
  }

  const bgColor = {
    idle: 'bg-gray-900',
    lendo: 'bg-gray-900',
    sucesso: 'bg-[#0d2b0d]',
    ja_registrado: 'bg-[#1a1a0d]',
    erro: 'bg-[#2b0d0d]',
  }[estado]

  return (
    <div className={`min-h-screen ${bgColor} flex flex-col items-center justify-center p-4 transition-colors duration-500`}
      style={{ fontFamily: 'Sora, sans-serif' }}>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">📱</div>
        <h1 className="text-xl font-bold text-white">Portaria Escolar</h1>
        <p className="text-gray-400 text-sm mt-1">Leitor de QR Code</p>
      </div>

      {/* Estado: IDLE */}
      {estado === 'idle' && (
        <div className="text-center">
          <div className="w-48 h-48 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <div className="text-center">
              <div className="text-5xl mb-2">📷</div>
              <p className="text-gray-500 text-sm">Câmera inativa</p>
            </div>
          </div>
          <button onClick={startScanner}
            className="px-8 py-4 bg-[#39d353] hover:bg-green-400 text-black font-bold rounded-2xl text-lg transition-all active:scale-95 shadow-lg shadow-green-900/30"
          >
            Iniciar Leitura
          </button>
        </div>
      )}

      {/* Scanner de QR ativo */}
      {(estado === 'lendo' && scannerAtivo) && (
        <div className="w-full max-w-sm">
          <div className="relative rounded-2xl overflow-hidden">
            <div id="qr-reader" ref={scannerRef} className="w-full" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-52 h-52 border-[3px] border-[#39d353] rounded-2xl live-dot" />
            </div>
          </div>
          <p className="text-center text-gray-400 text-sm mt-4 animate-pulse">Aponte para o QR Code do aluno...</p>
          <button onClick={() => { stopScanner(); resetar() }}
            className="w-full mt-4 py-3 bg-[#30363d] text-gray-300 rounded-xl text-sm hover:bg-[#21262d] transition-colors"
          >Cancelar</button>
        </div>
      )}

      {/* Estado: SUCESSO */}
      {estado === 'sucesso' && entrada && (
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#39d353] mb-1">Entrada Registrada!</h2>

          <div className="bg-[#161b22] border border-[#39d353]/30 rounded-2xl p-5 mt-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-[#30363d] overflow-hidden mx-auto mb-4 border-2 border-[#39d353]/50">
              {entrada.aluno.foto_url ? (
                <Image src={entrada.aluno.foto_url} alt="" width={80} height={80} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-300">
                  {entrada.aluno.nome_completo?.[0]}
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-white">{entrada.aluno.nome_completo}</h3>
            <p className="text-gray-400 text-sm mt-1">{entrada.aluno.turma?.nome}</p>
            <div className="mt-3 bg-[#39d353]/10 border border-[#39d353]/30 rounded-xl px-4 py-2">
              <p className="text-[#39d353] font-bold text-lg" style={{ fontFamily: 'DM Mono, monospace' }}>
                🕐 {entrada.hora?.slice(0,5)}
              </p>
            </div>
          </div>

          <p className="text-gray-500 text-sm">Próxima leitura em instantes...</p>
        </div>
      )}

      {/* Estado: JÁ REGISTRADO */}
      {estado === 'ja_registrado' && entrada && (
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="text-6xl mb-4">ℹ️</div>
          <h2 className="text-2xl font-bold text-[#e3b341] mb-1">Já Registrado</h2>

          <div className="bg-[#161b22] border border-[#e3b341]/30 rounded-2xl p-5 mt-4 mb-6">
            <h3 className="text-xl font-bold text-white">{entrada.aluno?.nome_completo}</h3>
            <p className="text-gray-400 text-sm mt-1">{entrada.aluno?.turma?.nome}</p>
            <p className="text-[#e3b341] text-sm mt-2">Entrada registrada às {entrada.hora?.slice(0,5)}</p>
          </div>

          <button onClick={() => { resetar(); startScanner() }}
            className="w-full py-4 bg-[#e3b341] text-black font-bold rounded-2xl hover:bg-yellow-400 transition-colors active:scale-95"
          >Próximo Aluno</button>
        </div>
      )}

      {/* Estado: ERRO */}
      {estado === 'erro' && (
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-[#f85149] mb-2">QR Code inválido</h2>
          <p className="text-gray-400 text-sm mb-6">{mensagemErro || 'QR Code não reconhecido pelo sistema'}</p>
          <button onClick={() => { resetar(); startScanner() }}
            className="w-full py-4 bg-[#f85149] text-white font-bold rounded-2xl hover:bg-red-400 transition-colors active:scale-95"
          >Tentar Novamente</button>
        </div>
      )}

      {/* Clock */}
      <div className="fixed bottom-6 left-0 right-0 text-center">
        <Clock />
      </div>
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    function update() {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <p className="text-gray-600 text-sm" style={{ fontFamily: 'DM Mono, monospace' }}>{time}</p>
  )
}
