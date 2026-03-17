import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDate, formatTime } from '@/lib/utils'

export const revalidate = 0

export default async function ProfessorDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const hoje = new Date().toISOString().split('T')[0]

  const { data: aulas } = await supabase
    .from('aulas')
    .select(`
      id, data, horario_inicio, horario_fim,
      turmas (id, nome, turno),
      disciplinas (id, nome),
      chamadas (id, status, iniciada_em, concluida_em)
    `)
    .eq('professor_id', user!.id)
    .eq('data', hoje)
    .order('horario_inicio')

  const { data: usuario } = await supabase.from('usuarios').select('nome').eq('id', user!.id).single()

  const agora = new Date()
  const minutosAtual = agora.getHours() * 60 + agora.getMinutes()

  function getStatusAula(aula: any) {
    const chamada = aula.chamadas?.[0]
    if (chamada?.status === 'concluida') return 'concluida'
    if (chamada?.status === 'em_andamento') return 'em_andamento'
    const [h, m] = aula.horario_inicio.split(':').map(Number)
    const inicioMin = h * 60 + m
    if (minutosAtual >= inicioMin - 30 && minutosAtual <= inicioMin + 45) return 'disponivel'
    if (minutosAtual < inicioMin - 30) return 'futura'
    return 'atrasada'
  }

  const concluidas = aulas?.filter((a: any) => a.chamadas?.[0]?.status === 'concluida').length || 0
  const pendentes = aulas?.filter((a: any) => !a.chamadas?.[0]).length || 0

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Olá, {usuario?.nome?.split(' ')[0] || 'Professor'}! 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">
          {formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")}
        </p>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Aulas hoje', value: aulas?.length || 0, color: 'text-indigo-600' },
          { label: 'Concluídas', value: concluidas, color: 'text-green-600' },
          { label: 'Pendentes', value: pendentes, color: 'text-orange-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm text-center">
            <div className={`text-2xl font-bold font-nums ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-gray-600 mb-3 text-xs uppercase tracking-widest">Aulas do dia</h2>

      {!aulas?.length ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center shadow-sm">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-500 font-medium">Nenhuma aula hoje</p>
          <p className="text-gray-400 text-sm mt-1">Entre em contato com o administrador</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aulas.map((aula: any) => {
            const status = getStatusAula(aula)
            const chamada = aula.chamadas?.[0]
            const statusConfig: Record<string, { label: string; cls: string }> = {
              concluida: { label: '✓ Concluída', cls: 'bg-green-100 text-green-700' },
              em_andamento: { label: '⏳ Em curso', cls: 'bg-blue-100 text-blue-700' },
              disponivel: { label: '● Disponível', cls: 'bg-indigo-100 text-indigo-700' },
              futura: { label: '◷ Aguardando', cls: 'bg-gray-100 text-gray-500' },
              atrasada: { label: '⚠ Atrasada', cls: 'bg-red-100 text-red-600' },
            }
            const sc = statusConfig[status]

            return (
              <div key={aula.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{aula.turmas?.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          aula.turmas?.turno === 'matutino' ? 'bg-yellow-100 text-yellow-700' :
                          aula.turmas?.turno === 'vespertino' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                        }`}>{aula.turmas?.turno}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{aula.disciplinas?.nome}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        🕐 {formatTime(aula.horario_inicio)} – {formatTime(aula.horario_fim)}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-slate-50">
                    {status === 'em_andamento' && chamada && (
                      <Link href={`/professor/chamada/${aula.id}`}
                        className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                      >
                        ⏳ Continuar Chamada
                      </Link>
                    )}
                    {(status === 'disponivel' || status === 'atrasada') && !chamada && (
                      <Link href={`/professor/chamada/${aula.id}`}
                        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                        </svg>
                        Iniciar Chamada
                      </Link>
                    )}
                    {status === 'concluida' && chamada && (
                      <Link href={`/professor/resumo/${chamada.id}`}
                        className="w-full py-2.5 px-4 bg-slate-100 text-gray-600 text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                      >
                        👁 Ver Resumo
                      </Link>
                    )}
                    {status === 'futura' && (
                      <div className="text-center text-xs text-gray-400 py-1">
                        Disponível às {formatTime(aula.horario_inicio)} (30 min antes)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
