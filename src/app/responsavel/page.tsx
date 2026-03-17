'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function ResponsavelDashboard() {
  const [alunos, setAlunos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Busca alunos vinculados ao responsável
    const { data: vinculos } = await supabase
      .from('responsaveis_alunos')
      .select(`
        aluno_id,
        alunos (
          id, nome_completo, foto_url, matricula,
          turmas (id, nome, turno)
        )
      `)
      .eq('responsavel_id', user.id)

    if (!vinculos?.length) {
      setLoading(false)
      return
    }

    const hoje = new Date().toISOString().split('T')[0]

    // Para cada aluno, busca status do dia
    const alunosComStatus = await Promise.all((vinculos || []).map(async (v: any) => {
      const aluno = v.alunos

      // Entrada na escola
      const { data: entrada } = await supabase
        .from('entradas')
        .select('hora')
        .eq('aluno_id', aluno.id)
        .eq('data', hoje)
        .maybeSingle()

      // Status na chamada
      const { data: registro } = await supabase
        .from('registros_chamada')
        .select(`
          status, registrado_em, observacao,
          chamadas!inner (
            aulas!inner (data)
          )
        `)
        .eq('aluno_id', aluno.id)
        .order('registrado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Verifica se o registro é de hoje
      const registroHoje = registro?.chamadas?.aulas?.data === hoje ? registro : null

      return { ...aluno, entrada, registro: registroHoje }
    }))

    setAlunos(alunosComStatus)
    setLoading(false)
  }

  useEffect(() => {
    carregar()

    // Realtime: atualiza ao receber novo registro de chamada ou entrada
    const ch = supabase.channel('responsavel-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registros_chamada' }, carregar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registros_chamada' }, carregar)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entradas' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Acompanhamento</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {formatDate(new Date(), "EEEE, dd 'de' MMMM")}
        </p>
      </div>

      {alunos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">👨‍👩‍👦</div>
          <p className="text-gray-500 font-medium">Nenhum aluno vinculado</p>
          <p className="text-gray-400 text-sm mt-1">Entre em contato com a escola para vincular seu(s) filho(s)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alunos.map(aluno => {
            const status = aluno.registro?.status
            const temEntrada = !!aluno.entrada

            return (
              <div key={aluno.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Header do card */}
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    {/* Foto */}
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                      {aluno.foto_url ? (
                        <Image src={aluno.foto_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xl font-bold text-slate-400">
                          {aluno.nome_completo.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-900 text-lg truncate">{aluno.nome_completo}</h2>
                      <p className="text-gray-500 text-sm">{aluno.turmas?.nome}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">Matrícula: {aluno.matricula}</p>
                    </div>
                  </div>

                  {/* Status do dia */}
                  <div className="mt-4 space-y-2">
                    {/* Entrada na escola */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                      temEntrada ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{temEntrada ? '🏫' : '⏳'}</span>
                        <div>
                          <p className={`text-sm font-medium ${temEntrada ? 'text-blue-800' : 'text-gray-500'}`}>
                            {temEntrada ? 'Chegou na escola' : 'Aguardando chegada'}
                          </p>
                          {temEntrada && (
                            <p className="text-xs text-blue-600 font-mono">{aluno.entrada.hora.slice(0,5)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status na aula */}
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                      status === 'presente' ? 'bg-green-50 border border-green-100' :
                      status === 'falta' ? 'bg-red-50 border border-red-100' :
                      status === 'justificada' ? 'bg-yellow-50 border border-yellow-100' :
                      'bg-slate-50 border border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {status === 'presente' ? '✅' :
                           status === 'falta' ? '❌' :
                           status === 'justificada' ? '📝' : '📋'}
                        </span>
                        <div>
                          <p className={`text-sm font-medium ${
                            status === 'presente' ? 'text-green-800' :
                            status === 'falta' ? 'text-red-800' :
                            status === 'justificada' ? 'text-yellow-800' :
                            'text-gray-500'
                          }`}>
                            {status === 'presente' ? 'Presente na aula' :
                             status === 'falta' ? 'Falta registrada' :
                             status === 'justificada' ? 'Falta justificada' :
                             'Chamada não realizada'}
                          </p>
                          {aluno.registro?.registrado_em && (
                            <p className={`text-xs font-mono ${
                              status === 'presente' ? 'text-green-600' :
                              status === 'falta' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              confirmado às {new Date(aluno.registro.registrado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {aluno.registro?.observacao && (
                            <p className="text-xs text-gray-500 mt-0.5">{aluno.registro.observacao}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Link para histórico */}
                  <Link href={`/responsavel/${aluno.id}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-medium transition-colors border border-slate-100"
                  >
                    📅 Ver histórico de frequência
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
