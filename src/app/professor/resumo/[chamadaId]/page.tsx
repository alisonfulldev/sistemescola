import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatDate, formatTime } from '@/lib/utils'

export const revalidate = 0

export default async function ResumoChamadaPage({ params: paramsPromise }: { params: Promise<{ chamadaId: string }> }) {
  const { chamadaId } = await paramsPromise

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
        alunos (id, nome_completo, foto_url),
        justificativas_falta (motivo, responsavel_id, usuarios!responsavel_id(nome), criada_em)
      )
    `)
    .eq('id', chamadaId)
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-slate-900 text-base">{aula?.turmas?.nome}</h2>
            {aula?.disciplinas?.nome && <p className="text-slate-500 text-sm">{aula.disciplinas.nome}</p>}
            <p className="text-slate-400 text-xs mt-1" style={{ fontFamily: 'DM Mono, monospace' }}>
              {formatDate(aula?.data, "dd/MM/yyyy")}
              {aula?.horario_inicio && ` · ${formatTime(aula.horario_inicio)} – ${formatTime(aula.horario_fim)}`}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${chamada.status === 'concluida' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
            {chamada.status === 'concluida' ? 'Concluída' : 'Em andamento'}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { n: total, label: 'Total', cls: 'bg-white border-slate-200 text-slate-900' },
          { n: presentes.length, label: 'Presentes', cls: 'bg-green-50 border-green-200 text-green-600' },
          { n: faltas.length, label: 'Faltas', cls: 'bg-red-50 border-red-200 text-red-600' },
          { n: justificadas.length, label: 'Justif.', cls: 'bg-amber-50 border-amber-200 text-amber-600' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-3 text-center ${k.cls}`}>
            <div className="text-xl font-bold">{k.n}</div>
            <div className="text-xs mt-0.5 opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Barra de frequência */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600">Frequência da turma</span>
          <span className={`text-lg font-bold ${freq >= 75 ? 'text-green-600' : 'text-red-600'}`}>{freq}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${freq >= 75 ? 'bg-green-600' : 'bg-red-600'}`}
            style={{ width: `${freq}%` }}
          />
        </div>
        {freq < 75 && <p className="text-xs text-red-600 mt-2">⚠ Frequência abaixo do mínimo (75%)</p>}
      </div>

      {/* Faltas */}
      {faltas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Faltas ({faltas.length})
          </h3>
          <div className="space-y-2">
            {faltas.map((r: any) => (
              <div key={r.id} className="bg-white border border-red-200 rounded-xl p-3 flex items-center gap-3">
                <Avatar r={r} cor="bg-red-50 text-red-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{r.alunos?.nome_completo}</p>
                  {r.observacao && <p className="text-xs text-slate-500 mt-0.5 italic">"{r.observacao}"</p>}
                </div>
                <span className="text-xs text-red-600 font-bold flex-shrink-0">F</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Justificadas */}
      {justificadas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Justificadas ({justificadas.length})
          </h3>
          <div className="space-y-2">
            {justificadas.map((r: any) => {
              const just = r.justificativas_falta?.[0]
              return (
                <div key={r.id} className="bg-white border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <Avatar r={r} cor="bg-amber-50 text-amber-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{r.alunos?.nome_completo}</p>
                      {just?.usuarios?.nome && (
                        <p className="text-xs text-slate-500 mt-0.5">por {just.usuarios.nome}</p>
                      )}
                    </div>
                    <span className="text-xs text-amber-600 font-bold flex-shrink-0">J</span>
                  </div>
                  {just?.motivo && (
                    <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-600 italic">"{just.motivo}"</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Presentes */}
      {presentes.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Presentes ({presentes.length})
          </h3>
          <div className="grid grid-cols-1 gap-1.5">
            {presentes.map((r: any) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <Avatar r={r} cor="bg-green-50 text-green-600" />
                <p className="text-sm text-slate-600 truncate flex-1">{r.alunos?.nome_completo}</p>
                <span className="text-xs text-green-600 font-bold flex-shrink-0">P</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm mb-4">
          Nenhum registro encontrado para esta chamada.
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <Link href="/professor"
          className="flex-1 py-3 bg-white border border-slate-300 text-slate-500 rounded-xl font-medium text-center hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm"
        >
          ← Voltar
        </Link>
        <Link href={`/professor/chamada/${chamadaId}`}
          className="flex-1 py-3 bg-white border border-green-300 text-green-600 rounded-xl font-medium text-center hover:bg-green-50 transition-colors text-sm"
        >
          ✏ Editar chamada
        </Link>
      </div>
    </div>
  )
}
