import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate, formatTime } from '@/lib/utils'

export const revalidate = 0

export default async function ResumoChamadaPage({ params }: { params: { chamadaId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: chamada } = await admin
    .from('chamadas')
    .select(`
      id, status, iniciada_em, concluida_em,
      aulas (
        id, data, horario_inicio, horario_fim, professor_id,
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

  // Garante que é chamada do professor logado
  const aula = (chamada as any).aulas
  if (aula?.professor_id !== user.id) redirect('/professor')

  const regs: any[] = (chamada as any).registros_chamada || []
  const presentes = regs.filter(r => r.status === 'presente')
  const faltas = regs.filter(r => r.status === 'falta')
  const justificadas = regs.filter(r => r.status === 'justificada')
  const total = regs.length
  const freq = total > 0 ? Math.round(((presentes.length + justificadas.length) / total) * 100) : 0

  const Avatar = ({ r, cor }: { r: any; cor: string }) => (
    <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${cor}`}>
      {r.alunos?.foto_url ? (
        <Image src={r.alunos.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
      ) : (
        <span className="text-xs font-bold">{r.alunos?.nome_completo?.[0]}</span>
      )}
    </div>
  )

  return (
    <div>
      {/* Cabeçalho */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-white text-base">{aula?.turmas?.nome}</h2>
            {aula?.disciplinas?.nome && <p className="text-gray-400 text-sm">{aula.disciplinas.nome}</p>}
            <p className="text-gray-600 text-xs mt-1" style={{ fontFamily: 'DM Mono, monospace' }}>
              {formatDate(aula?.data, "dd/MM/yyyy")}
              {aula?.horario_inicio && ` · ${formatTime(aula.horario_inicio)} – ${formatTime(aula.horario_fim)}`}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${chamada.status === 'concluida' ? 'bg-[#39d353]/15 text-[#39d353]' : 'bg-yellow-500/15 text-yellow-400'}`}>
            {chamada.status === 'concluida' ? 'Concluída' : 'Em andamento'}
          </span>
        </div>
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

      {/* Barra de frequência */}
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
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Faltas ({faltas.length})
          </h3>
          <div className="space-y-2">
            {faltas.map((r: any) => (
              <div key={r.id} className="bg-[#161b22] border border-[#f85149]/30 rounded-xl p-3 flex items-center gap-3">
                <Avatar r={r} cor="bg-[#f85149]/20 text-[#f85149]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{r.alunos?.nome_completo}</p>
                  {r.observacao && <p className="text-xs text-gray-500 mt-0.5 italic">"{r.observacao}"</p>}
                </div>
                <span className="text-xs text-[#f85149] font-bold flex-shrink-0">F</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Justificadas */}
      {justificadas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Justificadas ({justificadas.length})
          </h3>
          <div className="space-y-2">
            {justificadas.map((r: any) => (
              <div key={r.id} className="bg-[#161b22] border border-[#e3b341]/30 rounded-xl p-3 flex items-center gap-3">
                <Avatar r={r} cor="bg-[#e3b341]/20 text-[#e3b341]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{r.alunos?.nome_completo}</p>
                  {r.observacao && <p className="text-xs text-gray-500 mt-0.5 italic">"{r.observacao}"</p>}
                </div>
                <span className="text-xs text-[#e3b341] font-bold flex-shrink-0">J</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presentes */}
      {presentes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Presentes ({presentes.length})
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {presentes.map((r: any) => (
              <div key={r.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex items-center gap-3">
                <Avatar r={r} cor="bg-[#39d353]/20 text-[#39d353]" />
                <p className="text-sm text-gray-300 truncate flex-1">{r.alunos?.nome_completo}</p>
                <span className="text-xs text-[#39d353] font-bold flex-shrink-0">P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 text-center text-gray-500 text-sm mb-4">
          Nenhum registro encontrado para esta chamada.
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <Link href="/professor"
          className="flex-1 py-3 bg-[#0d1117] border border-[#30363d] text-gray-400 rounded-xl font-medium text-center hover:bg-[#30363d] hover:text-gray-200 transition-colors text-sm"
        >
          ← Voltar
        </Link>
        <Link href={`/professor/chamada/${params.chamadaId}`}
          className="flex-1 py-3 bg-[#161b22] border border-[#39d353]/40 text-[#39d353] rounded-xl font-medium text-center hover:bg-[#39d353]/10 transition-colors text-sm"
        >
          ✏ Editar chamada
        </Link>
      </div>
    </div>
  )
}
