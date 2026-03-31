'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default function NotasAvaliacaoPage({ params: paramsPromise }: Props) {
  const [avaliacao, setAvaliacao] = useState<any>(null)
  const [notas, setNotas] = useState<any[]>([])
  const [notasInput, setNotasInput] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [id, setId] = useState<string>('')

  const router = useRouter()

  useEffect(() => {
    paramsPromise.then((params) => setId(params.id))
  }, [paramsPromise])

  useEffect(() => {
    if (!id) return
    async function carregar() {
      try {
        const res = await fetch(`/api/avaliacoes/${id}/notas`)
        if (!res.ok) throw new Error('Avaliação não encontrada')

        const { avaliacao: av, notas: ns } = await res.json()
        setAvaliacao(av)
        setNotas(ns || [])

        // Inicializar inputs com notas existentes
        const notasMap: Record<string, number | null> = {}
        for (const n of ns || []) {
          notasMap[n.aluno_id] = n.nota
        }
        setNotasInput(notasMap)
      } catch (e) {
        setErro(String(e))
      }
      setLoading(false)
    }
    carregar()
  }, [id])

  async function salvarNotas() {
    setSalvando(true)
    setErro('')
    setSucesso(false)

    try {
      // Preparar dados para enviar
      const notasParaEnviar = notas.map(n => ({
        aluno_id: n.aluno_id,
        nota: notasInput[n.aluno_id] !== undefined ? notasInput[n.aluno_id] : null
      }))

      const res = await fetch(`/api/avaliacoes/${params.id}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas: notasParaEnviar })
      })

      if (!res.ok) throw new Error('Erro ao salvar notas')

      setSucesso(true)
      setTimeout(() => setSucesso(false), 2000)
    } catch (e) {
      setErro(String(e))
    }
    setSalvando(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (erro && !avaliacao) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600 font-medium">{erro}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Voltar
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1"
      >
        ← Voltar
      </button>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{avaliacao?.titulo}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {avaliacao?.tipo} • Valor máximo: {avaliacao?.valor_maximo}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {new Date(avaliacao?.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
        </p>
      </div>

      {erro && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          ⚠ {erro}
        </div>
      )}

      {sucesso && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
          ✓ Notas salvas com sucesso!
        </div>
      )}

      {notas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhum aluno nesta turma.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 font-semibold text-slate-700">Aluno</th>
                  <th className="text-center py-3 px-3 font-semibold text-slate-700">Nota</th>
                </tr>
              </thead>
              <tbody>
                {notas.map(n => (
                  <tr key={n.aluno_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <p className="font-medium text-slate-900">{n.alunos?.nome_completo}</p>
                      <p className="text-xs text-slate-500">{n.alunos?.numero_chamada || '-'}</p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        value={notasInput[n.aluno_id] !== undefined ? notasInput[n.aluno_id] : ''}
                        onChange={e => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          setNotasInput({
                            ...notasInput,
                            [n.aluno_id]: val
                          })
                        }}
                        min="0"
                        max={avaliacao?.valor_maximo || 10}
                        step="0.5"
                        placeholder="—"
                        className="w-16 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={salvarNotas}
            disabled={salvando}
            className="w-full mt-5 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {salvando ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Salvando...
              </>
            ) : (
              'Salvar Notas'
            )}
          </button>
        </>
      )}
    </div>
  )
}
