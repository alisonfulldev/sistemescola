'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const POR_PAGINA = 20

export default function AlunosAdmPage() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [turmaFiltro, setTurmaFiltro] = useState('all')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      const [{ data: turmasData }, { data: alunosData }] = await Promise.all([
        supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('alunos').select('*, turmas(nome)').order('nome_completo'),
      ])
      setTurmas(turmasData || [])
      setAlunos(alunosData || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const filtrados = alunos.filter(a => {
    const matchBusca = !busca || a.nome_completo.toLowerCase().includes(busca.toLowerCase()) || a.matricula.includes(busca)
    const matchTurma = turmaFiltro === 'all' || a.turma_id === turmaFiltro
    return matchBusca && matchTurma
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const paginated = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function handleBusca(v: string) { setBusca(v); setPagina(1) }
  function handleTurma(v: string) { setTurmaFiltro(v); setPagina(1) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Alunos</h1>
          <p className="text-slate-600 text-sm">{filtrados.length} aluno(s) encontrado(s)</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Buscar por nome ou matrícula..." value={busca} onChange={e => handleBusca(e.target.value)}
          className="flex-1 min-w-48 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
        />
        <select value={turmaFiltro} onChange={e => handleTurma(e.target.value)}
          className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Todas as turmas</option>
          {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-slate-500 font-medium text-left">Aluno</th>
                <th className="p-4 text-slate-500 font-medium text-left">Matrícula</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden md:table-cell">Turma</th>
                <th className="p-4 text-slate-500 font-medium text-left hidden lg:table-cell">Responsável</th>
                <th className="p-4 text-slate-500 font-medium text-center">Contato</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Carregando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum aluno encontrado</td></tr>
              ) : paginated.map((a: any) => (
                <tr key={a.id} onClick={() => router.push(`/adm/alunos/${a.id}`)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {a.foto_url ? (
                          <Image src={a.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-xs font-bold text-slate-500">{a.nome_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-900">{a.nome_completo}</span>
                        {!a.ativo && <span className="ml-2 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Inativo</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>{a.matricula}</td>
                  <td className="p-4 text-slate-600 hidden md:table-cell">{a.turmas?.nome || '—'}</td>
                  <td className="p-4 text-slate-600 hidden lg:table-cell">{a.nome_responsavel || '—'}</td>
                  <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                    {a.contato_responsavel ? (
                      <a href={`https://wa.me/55${a.contato_responsavel.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Sobre o(a) aluno(a) ${a.nome_completo}.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:text-green-800 transition-colors border border-green-200 px-2 py-1 rounded-lg hover:bg-green-50"
                      >WhatsApp</a>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <span className="text-xs text-slate-400">
              {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPagina(1)} disabled={paginaAtual === 1}
                className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaAtual === 1}
                className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const start = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4))
                const p = start + i
                return (
                  <button key={p} onClick={() => setPagina(p)}
                    className={`w-7 h-7 text-xs rounded transition-colors ${p === paginaAtual ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  >{p}</button>
                )
              })}
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaAtual === totalPaginas}
                className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
              <button onClick={() => setPagina(totalPaginas)} disabled={paginaAtual === totalPaginas}
                className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
