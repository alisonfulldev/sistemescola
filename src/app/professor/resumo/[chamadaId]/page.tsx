import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatTime } from '@/lib/utils'
import Image from 'next/image'

export const revalidate = 0

export default async function ResumoChamadaPage({ params }: { params: { chamadaId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: chamada } = await supabase
    .from('chamadas')
    .select(`
      id, status, iniciada_em, concluida_em,
      aulas (
        id, data, horario_inicio, horario_fim,
        turmas (nome),
        disciplinas (nome)
      ),
      registros_chamada (
        id, status, observacao,
        alunos (id, nome_completo, foto_url)
      )
    `)
    .eq('id', params.chamadaId)
    .single()

  if (!chamada) redirect('/professor')

  const regs = (chamada as any).registros_chamada || []
  const presentes = regs.filter((r: any) => r.status === 'presente')
  const faltas = regs.filter((r: any) => r.status === 'falta')
  const justificadas = regs.filter((r: any) => r.status === 'justificada')
  const total = regs.length
  const freq = total > 0 ? Math.round(((presentes.length + justificadas.length) / total) * 100) : 0
  const aula = (chamada as any).aulas

  return (
    <div>
      {/* Banner sucesso */}
      <div className="bg-[#39d353]/10 border border-[#39d353]/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#39d353] rounded-full flex items-center justify-center text-black font-bold text-lg flex-shrink-0">✓</div>
        <div>
          <p className="font-bold text-[#39d353]">Chamada concluída!</p>
          <p className="text-[#39d353]/70 text-sm">
            {(chamada as any).concluida_em ? formatDate((chamada as any).concluida_em, "dd/MM 'às' HH:mm") : ''}
          </p>
        </div>
      </div>

      {/* Info da aula */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-4">
        <h2 className="font-semibold text-white">{aula?.turmas?.nome}</h2>
        <p className="text-gray-400 text-sm">{aula?.disciplinas?.nome}</p>
        <p className="text-gray-600 text-xs mt-1" style={{ fontFamily: 'DM Mono, monospace' }}>
          📅 {formatDate(aula?.data)} · {formatTime(aula?.horario_inicio)} – {formatTime(aula?.horario_fim)}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { n: total, label: 'Total', cls: 'bg-[#161b22] border-[#30363d] text-white' },
          { n: presentes.length, label: 'Presentes', cls: 'bg-[#39d353]/10 border-[#39d353]/30 text-[#39d353]' },
          { n: faltas.length, label: 'Faltas', cls: 'bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]' },
          { n: justificadas.length, label: 'Justif.', cls: 'bg-[#e3b341]/10 border-[#e3b341]/30 text-[#e3b341]' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-3 text-center ${k.cls}`}>
            <div className="text-xl font-bold">{k.n}</div>
            <div className="text-xs mt-0.5 opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Frequência */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">Frequência da turma</span>
          <span className={`text-lg font-bold ${freq >= 75 ? 'text-[#39d353]' : 'text-[#f85149]'}`}>{freq}%</span>
        </div>
        <div className="w-full bg-[#0d1117] rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${freq >= 75 ? 'bg-[#39d353]' : 'bg-[#f85149]'}`}
            style={{ width: `${freq}%` }}
          />
        </div>
        {freq < 75 && <p className="text-xs text-[#f85149] mt-2">⚠ Frequência abaixo do mínimo (75%)</p>}
      </div>

      {/* Faltas */}
      {faltas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Faltas registradas</h3>
          <div className="space-y-2">
            {faltas.map((r: any) => (
              <div key={r.id} className="bg-[#161b22] border border-[#f85149]/30 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f85149]/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {r.alunos?.foto_url ? (
                    <Image src={r.alunos.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xs font-bold text-[#f85149]">{r.alunos?.nome_completo?.[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200">{r.alunos?.nome_completo}</p>
                  {r.observacao && <p className="text-xs text-gray-500 mt-0.5">{r.observacao}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link href="/professor"
          className="flex-1 py-3 bg-[#0d1117] border border-[#30363d] text-gray-400 rounded-xl font-medium text-center hover:bg-[#30363d] hover:text-gray-200 transition-colors text-sm"
        >
          ← Voltar
        </Link>
        <Link href={`/professor/chamada/${params.chamadaId}`}
          className="flex-1 py-3 bg-[#161b22] border border-[#39d353]/40 text-[#39d353] rounded-xl font-medium text-center hover:bg-[#39d353]/10 transition-colors text-sm"
        >
          ✏️ Editar chamada
        </Link>
      </div>
    </div>
  )
}
