'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NotasAvaliacaoAdmPage({ params }: { params: { id: string } }) {
  const [avaliacao, setAvaliacao] = useState<any>(null)
  const [notas, setNotas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`/api/avaliacoes/${params.id}/notas`)
        if (!res.ok) throw new Error('Avaliação não encontrada')

        const { avaliacao: av, notas: ns } = await res.json()
        setAvaliacao(av)
        setNotas(ns || [])
      } catch (e) {
        console.error('Erro:', e)
      }
      setLoading(false)
    }
    carregar()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!avaliacao) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-600 font-medium">Avaliação não encontrada</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          ← Voltar
        </button>
      </div>
    )
  }

  const notasRegistradas = notas.filter(n => n.nota !== null).length
  const mediaNota = notas.length > 0
    ? (notas.filter(n => n.nota !== null).reduce((sum, n) => sum + n.nota, 0) / notas.length).toFixed(1)
    : 0

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-blue-600 hover:underline mb-6 flex items-center gap-1"
      >
        ← Voltar
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{avaliacao?.titulo}</h1>
        <p className="text-slate-600 text-sm mt-1">
          {avaliacao?.tipo.charAt(0).toUpperCase() + avaliacao?.tipo.slice(1)} • Valor máximo: {avaliacao?.valor_maximo}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {new Date(avaliacao?.data_aplicacao + 'T12:00:00').toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{notas.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total de alunos</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{notasRegistradas}</p>
          <p className="text-xs text-slate-500 mt-0.5">Notas lançadas</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{mediaNota}</p>
          <p className="text-xs text-slate-500 mt-0.5">Média de notas</p>
        </div>
      </div>

      {/* Tabela de notas */}
      {notas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm">Nenhum aluno nesta turma.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Aluno</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700">Matrícula</th>
                <th className="text-center py-3 px-3 font-semibold text-slate-700">Nota</th>
              </tr>
            </thead>
            <tbody>
              {notas.map(n => (
                <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-3">
                    <p className="font-medium text-slate-900">{n.alunos?.nome_completo}</p>
                  </td>
                  <td className="py-3 px-3">
                    <p className="text-xs font-mono text-slate-500">{n.alunos?.numero_chamada || '-'}</p>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {n.nota !== null ? (
                      <span className={`inline-block px-2 py-1 rounded-lg font-semibold ${
                        n.nota >= 7 ? 'bg-green-50 text-green-600' :
                        n.nota >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {n.nota}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
