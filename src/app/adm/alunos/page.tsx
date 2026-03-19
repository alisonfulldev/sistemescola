'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function AlunosAdmPage() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [turmas, setTurmas] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [turmaFiltro, setTurmaFiltro] = useState('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function carregar() {
      const [{ data: turmasData }, { data: alunosData }] = await Promise.all([
        supabase.from('turmas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('alunos').select('*, turmas(nome)').eq('ativo', true).order('nome_completo'),
      ])
      setTurmas(turmasData || [])
      setAlunos(alunosData || [])
      setLoading(false)
    }
    carregar()
  }, [])

  const filtrados = alunos.filter(a => {
    const matchBusca = a.nome_completo.toLowerCase().includes(busca.toLowerCase()) || a.matricula.includes(busca)
    const matchTurma = turmaFiltro === 'all' || a.turma_id === turmaFiltro
    return matchBusca && matchTurma
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Alunos</h1>
          <p className="text-gray-400 text-sm">{filtrados.length} aluno(s) encontrado(s)</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Buscar por nome ou matrícula..." value={busca} onChange={e => setBusca(e.target.value)}
          className="flex-1 min-w-48 bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff] placeholder-gray-500"
        />
        <select value={turmaFiltro} onChange={e => setTurmaFiltro(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#58a6ff]"
        >
          <option value="all">Todas as turmas</option>
          {turmas.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-[#30363d]">
              <th className="p-4 text-gray-400 font-medium text-left">Aluno</th>
              <th className="p-4 text-gray-400 font-medium text-left">Matrícula</th>
              <th className="p-4 text-gray-400 font-medium text-left hidden md:table-cell">Turma</th>
              <th className="p-4 text-gray-400 font-medium text-left hidden lg:table-cell">Responsável</th>
              <th className="p-4 text-gray-400 font-medium text-center">Contato</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            : filtrados.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhum aluno encontrado</td></tr>
            : filtrados.map((a: any) => (
              <tr key={a.id} className="border-b border-[#30363d]/50 hover:bg-[#21262d] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {a.foto_url ? (
                        <Image src={a.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">{a.nome_completo.split(' ').map((n: string) => n[0]).slice(0,2).join('')}</span>
                      )}
                    </div>
                    <span className="text-white">{a.nome_completo}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-300 text-xs" style={{ fontFamily: 'DM Mono, monospace' }}>{a.matricula}</td>
                <td className="p-4 text-gray-300 hidden md:table-cell">{a.turmas?.nome}</td>
                <td className="p-4 text-gray-300 hidden lg:table-cell">{a.nome_responsavel || '—'}</td>
                <td className="p-4 text-center">
                  {a.contato_responsavel ? (
                    <a href={`https://wa.me/55${a.contato_responsavel.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá! Sobre o(a) aluno(a) ${a.nome_completo}.`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[#39d353] hover:text-green-300 transition-colors border border-[#39d353]/30 px-2 py-1 rounded-lg hover:bg-[#39d353]/10"
                    >WhatsApp</a>
                  ) : <span className="text-gray-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
