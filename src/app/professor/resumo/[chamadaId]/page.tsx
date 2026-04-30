import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatTime } from '@/lib/utils'
import Image from 'next/image'

export const revalidate = 0

export default async function ResumoChamadaPage({ params }: { params: Promise<{ chamadaId: string }> }) {
  const { chamadaId } = await params
  const supabase = await createClient()
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
    .eq('id', chamadaId)
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
    <div className="animate-fade-in">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">✓</div>
        <div>
          <p className="font-bold text-green-800">Chamada concluída!</p>
          <p className="text-green-600 text-sm">
            {(chamada as any).concluida_em ? formatDate((chamada as any).concluida_em, "dd/MM 'às' HH:mm") : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <h2 className="font-semibold text-gray-800">{aula?.turmas?.nome}</h2>
        <p className="text-gray-500 text-sm">{aula?.disciplinas?.nome}</p>
        <p className="text-gray-400 text-xs font-mono mt-1">
          📅 {formatDate(aula?.data)} · {formatTime(aula?.horario_inicio)} – {formatTime(aula?.horario_fim)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { n: total, label: 'Total', cls: 'bg-white border-slate-100 text-gray-800' },
          { n: presentes.length, label: 'Presentes', cls: 'bg-green-50 border-green-100 text-green-700' },
          { n: faltas.length, label: 'Faltas', cls: 'bg-red-50 border-red-100 text-red-700' },
          { n: justificadas.length, label: 'Justif.', cls: 'bg-yellow-50 border-yellow-100 text-yellow-700' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-3 text-center shadow-sm ${k.cls}`}>
            <div className="text-xl font-bold font-nums">{k.n}</div>
            <div className="text-xs mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Frequência da turma</span>
          <span className={`text-lg font-bold font-nums ${freq >= 75 ? 'text-green-600' : 'text-red-600'}`}>{freq}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all duration-500 ${freq >= 75 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${freq}%` }} />
        </div>
        {freq < 75 && <p className="text-xs text-red-500 mt-2">⚠ Frequência abaixo do mínimo (75%)</p>}
      </div>

      {faltas.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Faltas registradas</h3>
          <div className="space-y-2">
            {faltas.map((r: any) => (
              <div key={r.id} className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {r.alunos?.foto_url ? (
                    <Image src={r.alunos.foto_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xs font-bold text-red-400">{r.alunos?.nome_completo?.[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{r.alunos?.nome_completo}</p>
                  {r.observacao && <p className="text-xs text-red-600">{r.observacao}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link href="/professor" className="flex-1 py-3 bg-slate-100 text-gray-700 rounded-xl font-medium text-center hover:bg-slate-200 transition-colors text-sm">
          ← Dashboard
        </Link>
        <button onClick={() => window.print()} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm">
          🖨 Imprimir
        </button>
      </div>
    </div>
  )
}
