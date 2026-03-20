import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Aulas do professor
  const { data: aulas } = await admin
    .from('aulas')
    .select('id')
    .eq('professor_id', user.id)

  if (!aulas?.length) return NextResponse.json({ justificativas: [] })

  const aulaIds = aulas.map((a: any) => a.id)

  // Chamadas dessas aulas
  const { data: chamadas } = await admin
    .from('chamadas')
    .select('id')
    .in('aula_id', aulaIds)

  if (!chamadas?.length) return NextResponse.json({ justificativas: [] })

  const chamadaIds = chamadas.map((c: any) => c.id)

  // Registros de falta dessas chamadas
  const { data: registros } = await admin
    .from('registros_chamada')
    .select('id, aluno_id, chamada_id, chamadas(aulas(data, turmas(nome)))')
    .in('chamada_id', chamadaIds)
    .eq('status', 'falta')

  if (!registros?.length) return NextResponse.json({ justificativas: [] })

  const registroIds = registros.map((r: any) => r.id)

  // Justificativas desses registros
  const { data: justificativas } = await admin
    .from('justificativas_falta')
    .select('id, registro_id, motivo, status, professor_resposta, criada_em, responsavel_id, usuarios(nome)')
    .in('registro_id', registroIds)
    .order('criada_em', { ascending: false })

  if (!justificativas?.length) return NextResponse.json({ justificativas: [] })

  // Enriquece com dados do aluno e da chamada
  const registroMap = new Map(registros.map((r: any) => [r.id, r]))
  const alunoIds = [...new Set(registros.map((r: any) => r.aluno_id))]
  const { data: alunos } = await admin.from('alunos').select('id, nome_completo').in('id', alunoIds)
  const alunoMap = new Map((alunos || []).map((a: any) => [a.id, a]))

  const resultado = justificativas.map((j: any) => {
    const reg = registroMap.get(j.registro_id) as any
    const aluno = alunoMap.get(reg?.aluno_id) as any
    return {
      id: j.id,
      registro_id: j.registro_id,
      motivo: j.motivo,
      status: j.status,
      professor_resposta: j.professor_resposta,
      criada_em: j.criada_em,
      responsavel_nome: (j as any).usuarios?.nome,
      aluno_nome: aluno?.nome_completo,
      data: reg?.chamadas?.aulas?.data,
      turma: reg?.chamadas?.aulas?.turmas?.nome,
    }
  })

  return NextResponse.json({ justificativas: resultado })
}
