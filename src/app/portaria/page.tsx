'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface AlunoEncontrado {
  id: string
  nome_completo: string
  foto_url?: string
  turma: { nome: string }
  qr_code: string
  ja_registrado?: boolean
  hora?: string
}

type Estado = 'lendo' | 'confirmando' | 'processando' | 'sucesso' | 'recusado' | 'erro'

export default function PortariaPage() {
  const [estado, setEstado] = useState<Estado>('lendo')
  const [aluno, setAluno] = useState<AlunoEncontrado | null>(null)
  const [mensagemErro, setMensagemErro] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const processingRef = useRef(false)

  useEffect(() => {
    if (estado !== 'lendo') return
    let active = true

    async function iniciarCamera() {
      try {
        // Câmera frontal — aluno aponta QR para a tela
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        scanLoop()
      } catch {
        if (active) {
          setEstado('erro')
          setMensagemErro('Câmera não disponível. Verifique as permissões.')
        }
      }
    }

    async function scanLoop() {
      if (!active) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scanLoop)
        return
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const jsQR = (await import('jsqr')).default
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code && !processingRef.current && active) {
        processingRef.current = true
        pararCamera()
        await buscarAluno(code.data)
        return
      }
      animFrameRef.current = requestAnimationFrame(scanLoop)
    }

    iniciarCamera()
    return () => { active = false; pararCamera() }
  }, [estado])

  function pararCamera() {
    cancelAnimationFrame(animFrameRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function buscarAluno(qrData: string) {
    try {
      // Busca aluno pelo QR sem registrar ainda
      const res = await fetch('/api/portaria/buscar-aluno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrData }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMensagemErro(data.error || 'QR Code não reconhecido')
        setEstado('erro')
        setTimeout(reiniciar, 3000)
        return
      }
      setAluno(data)
      setEstado('confirmando')
    } catch {
      setMensagemErro('Erro de conexão.')
      setEstado('erro')
      setTimeout(reiniciar, 3000)
    }
  }

  async function confirmarEntrada() {
    if (!aluno) return
    setEstado('processando')
    try {
      const res = await fetch('/api/portaria/registrar-entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: aluno.qr_code }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 409) {
        setMensagemErro(data.error || 'Erro ao registrar')
        setEstado('erro')
        setTimeout(reiniciar, 3000)
        return
      }
      setEstado('sucesso')
      setTimeout(reiniciar, 4000)
    } catch {
      setMensagemErro('Erro de conexão.')
      setEstado('erro')
      setTimeout(reiniciar, 3000)
    }
  }

  function recusarEntrada() {
    setEstado('recusado')
    setTimeout(reiniciar, 3000)
  }

  function reiniciar() {
    processingRef.current = false
    setAluno(null)
    setMensagemErro('')
    setEstado('lendo')
  }

  const bgColor = {
    lendo: 'bg-gray-900',
    confirmando: 'bg-[#0d1b2b]',
    processando: 'bg-[#0d1b2b]',
    sucesso: 'bg-[#0d2b0d]',
    recusado: 'bg-[#2b1a0d]',
    erro: 'bg-[#2b0d0d]',
  }[estado]

  return (
    <div
      className={`min-h-screen ${bgColor} flex flex-col items-center justify-center p-4 transition-colors duration-500`}
      style={{ fontFamily: 'Sora, sans-serif' }}
    >
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-white">Portaria Escolar</h1>
        <p className="text-gray-500 text-xs mt-1">Leitor de QR Code</p>
      </div>

      {/* Lendo */}
      {estado === 'lendo' && (
        <div className="w-full max-w-sm">
          <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '3/4' }}>
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-[3px] border-[#39d353] rounded-2xl opacity-80" />
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 mx-4 py-2 rounded-xl animate-pulse">
                Aponte o QR Code para a câmera
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmando */}
      {(estado === 'confirmando' || estado === 'processando') && aluno && (
        <div className="w-full max-w-sm text-center">
          <p className="text-gray-400 text-sm mb-4">Confirme sua entrada</p>

          <div className="bg-[#161b22] border border-blue-500/30 rounded-2xl p-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-[#30363d] overflow-hidden mx-auto mb-4 border-2 border-blue-400/50">
              {aluno.foto_url ? (
                <Image src={aluno.foto_url} alt="" width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300">
                  {aluno.nome_completo?.[0]}
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">{aluno.nome_completo}</h2>
            <p className="text-gray-400 text-sm mt-1">{aluno.turma?.nome}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={recusarEntrada}
              disabled={estado === 'processando'}
              className="flex-1 py-4 bg-[#30363d] text-gray-300 font-bold rounded-2xl text-lg hover:bg-[#21262d] transition-colors active:scale-95 disabled:opacity-50"
            >
              ✗ Não sou eu
            </button>
            <button
              onClick={confirmarEntrada}
              disabled={estado === 'processando'}
              className="flex-1 py-4 bg-[#39d353] text-black font-bold rounded-2xl text-lg hover:bg-green-400 transition-colors active:scale-95 disabled:opacity-50"
            >
              {estado === 'processando' ? '...' : '✓ Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {estado === 'sucesso' && aluno && (
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#39d353] mb-1">Entrada Registrada!</h2>
          <div className="bg-[#161b22] border border-[#39d353]/30 rounded-2xl p-5 mt-4">
            <h3 className="text-xl font-bold text-white">{aluno.nome_completo}</h3>
            <p className="text-gray-400 text-sm mt-1">{aluno.turma?.nome}</p>
            <p className="text-[#39d353] text-sm mt-3 font-mono">
              🕐 {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <p className="text-gray-500 text-sm mt-4">Pode entrar! Próxima leitura em instantes...</p>
        </div>
      )}

      {/* Recusado */}
      {estado === 'recusado' && (
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">↩️</div>
          <h2 className="text-2xl font-bold text-orange-400 mb-2">Cancelado</h2>
          <p className="text-gray-400 text-sm">Entrada não registrada.</p>
          <p className="text-gray-500 text-sm mt-2">Reiniciando...</p>
        </div>
      )}

      {/* Erro */}
      {estado === 'erro' && (
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-[#f85149] mb-2">Erro</h2>
          <p className="text-gray-400 text-sm mb-6">{mensagemErro}</p>
          <button onClick={reiniciar} className="px-8 py-3 bg-[#f85149] text-white font-bold rounded-2xl">
            Tentar Novamente
          </button>
        </div>
      )}

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
  return <p className="text-gray-600 text-sm font-mono">{time}</p>
}
