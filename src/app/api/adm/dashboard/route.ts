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

  const hoje = new Date().toISOString().split('T')[0]

  const [
    { count: matriculados },
    { data: registrosHoje },
    { data: aulasHoje },
    { data: chamadasHoje },
    { data: alertas },
  ] = await Promise.all([
    admin.from('alunos').select('*', { count: 'exact', head: true }).eq('ativo', true),

    admin.from('registros_chamada')
      .select('status, chamadas!inner(aulas!inner(data))')
      .eq('chamadas.aulas.data', hoje),

    admin.from('aulas').select('id, chamadas(id)').eq('data', hoje),

    admin.from('chamadas')
      .select(`
        id, status, iniciada_em, concluida_em,
        aulas!inner(id, data, horario_inicio, horario_fim,
          turmas(id, nome, turno), disciplinas(nome), usuarios(nome)
        ),
        registros_chamada(id, status, alunos(nome_completo, foto_url))
      `)
      .eq('aulas.data', hoje)
      .order('iniciada_em', { ascending: false }),

    admin.from('alertas')
      .select('*, alunos(nome_completo), turmas(nome)')
      .eq('lido', false)
      .order('criado_em', { ascending: false })
      .limit(6),
  ])

  // Filtra registros de hoje
  const regsHoje = (registrosHoje || []).filter((r: any) => r.chamadas?.aulas?.data === hoje)
  const presentes = regsHoje.filter((r: any) => r.status === 'presente').length
  const faltas = regsHoje.filter((r: any) => r.status === 'falta').length
  const pendentes = (aulasHoje || []).filter((a: any) => !a.chamadas?.length).length

  // Filtra chamadas de hoje
  const chamadasDeHoje = (chamadasHoje || []).filter((c: any) => c.aulas?.data === hoje)

  return NextResponse.json({
    kpis: { matriculados: matriculados || 0, presentes, faltas, pendentes },
    chamadas: chamadasDeHoje,
    alertas: alertas || [],
  })
}
