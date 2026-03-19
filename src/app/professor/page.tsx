'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

export default function ProfessorDashboard() {
  const [turmas, setTurmas] = useState<any[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [alunos, setAlunos] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const [{ data: turmasData }, histRes] = await Promise.all([
        supabase.from('turmas').select('id, nome, turno').eq('ativo', true).order('nome'),
        fetch('/api/professor/historico'),
      ])

      setTurmas(turmasData || [])

      if (histRes.ok) {
        const { chamadas } = await histRes.json()
        setHistorico(chamadas || [])
      }

      setLoading(false)
    }
    carregar()
  }, [])

  async function selecionarTurma(turmaId: string) {
    setTurmaSelecionada(turmaId)
    setAlunos([])
    if (!turmaId) return
    setCarregandoAlunos(true)
    const { data: alunosData } = await supabase
      .from('alunos')
      .select('id, nome_completo, foto_url, matricula')
      .eq('turma_id', turmaId)
      .eq('ativo', true)
      .order('nome_completo')
    setAlunos(alunosData || [])
    setCarregandoAlunos(false)
  }

  async function iniciarChamada() {
    if (!turmaSelecionada) return
    setIniciando(true)
    setErro('')
    try {
      const res = await fetch('/api/professor/iniciar-chamada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaSelecionada }),
      })
      const data = await res.json()
      if (data.chamada_id) {
        router.push(`/professor/chamada/${data.chamada_id}`)
      } else {
        setErro(data.error || 'Erro ao iniciar chamada')
        setIniciando(false)
      }
    } catch {
      setErro('Erro de conexão')
      setIniciando(false)
    }
  }

  const turmaSel = turmas.find(t => t.id === turmaSelecionada)
  const hoje = new Date().toISOString().split('T')[0]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-[#39d353] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Chamada</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {formatDate(new Date(), "EEEE, dd 'de' MMMM")}
        </p>
      </div>

      {/* Histórico — primeira tela */}
      {historico.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Histórico de chamadas</h2>
          <div className="space-y-2">
            {historico.map(c => {
              const freq = c.total > 0 ? Math.round(((c.presentes + c.justificadas) / c.total) * 100) : 0
              const isHoje = c.data === hoje
              return (
                <Link
                  key={c.id}
                  href={`/professor/resumo/${c.id}`}
                  className="block bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3 hover:border-[#39d353]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-200 font-medium">
                        {c.turma}
                        {isHoje && <span className="ml-2 text-xs text-[#39d353]">hoje</span>}
                      </p>
                      <p className="text-xs text-gray-600 mb-1">{formatDate(c.data, "dd/MM/yyyy")}</p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-[#39d353]">{c.presentes}P</span>
                        <span className="text-[#f85149]">{c.faltas}F</span>
                        {c.justificadas > 0 && <span className="text-[#e3b341]">{c.justificadas}J</span>}
                        <span className="text-gray-600">· {c.total} alunos</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${freq >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>{freq}%</p>
                      <p className="text-xs text-gray-600">frequência</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Seletor de turma */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 mb-4">
        <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wide">Selecione a turma</label>
        {turmas.length === 0 ? (
          <p className="text-gray-600 text-sm py-2">Nenhuma turma vinculada. Contate o administrador.</p>
        ) : (
          <select
            value={turmaSelecionada}
            onChange={e => selecionarTurma(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#39d353] transition-colors"
          >
            <option value="">-- Selecione uma turma --</option>
            {turmas.map(t => (
              <option key={t.id} value={t.id}>{t.nome} · {t.turno}</option>
            ))}
          </select>
        )}
      </div>

      {/* Lista de alunos */}
      {turmaSelecionada && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">{turmaSel?.nome}</p>
              <p className="text-gray-500 text-xs">{alunos.length} aluno(s) matriculado(s)</p>
            </div>
            <span className="text-xs text-gray-500 capitalize">{turmaSel?.turno}</span>
          </div>
          {carregandoAlunos ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-[#39d353] border-t-transparent rounded-full" />
            </div>
          ) : alunos.length === 0 ? (
            <div className="py-8 text-center text-gray-600 text-sm">Nenhum aluno matriculado</div>
          ) : (
            <div className="divide-y divide-[#30363d]">
              {alunos.map((aluno, idx) => (
                <div key={aluno.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-[#30363d] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {aluno.foto_url ? (
                      <Image src={aluno.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs font-bold text-gray-400">
                        {aluno.nome_completo.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{aluno.nome_completo}</p>
                    <p className="text-xs text-gray-600" style={{ fontFamily: 'DM Mono, monospace' }}>{aluno.matricula}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {erro && (
        <div className="mb-4 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-xl text-[#f85149] text-sm">
          ⚠ {erro}
        </div>
      )}

      {/* Botão iniciar chamada */}
      {turmaSelecionada && alunos.length > 0 && (
        <button
          onClick={iniciarChamada}
          disabled={iniciando}
          className="w-full py-4 bg-[#39d353] hover:bg-green-400 disabled:opacity-60 text-black font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 mb-6"
        >
          {iniciando ? (
            <><div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />Iniciando...</>
          ) : '📋 Iniciar Chamada'}
        </button>
      )}

    </div>
  )
}
