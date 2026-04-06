import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: perfilData } = await supabase
    .from('usuarios')
    .select('perfil, escola_id')
    .eq('id', user.id)
    .single()

  if (!['admin', 'secretaria', 'diretor'].includes(perfilData?.perfil)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const escolaId: string | null = perfilData?.perfil === 'admin' ? null : (perfilData?.escola_id || null)

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const hoje = new Date().toISOString().split('T')[0]

  // helper: filtra por escola via turmas quando necessário
  function filtrarEscola(q: any, campo = 'turmas.escola_id') {
    return escolaId ? q.eq(campo, escolaId) : q
  }

  const [
    { count: matriculados },
    { data: registrosHoje },
    { data: aulasHoje },
    { data: chamadasHoje },
    { data: alertas },
  ] = await Promise.all([
    filtrarEscola(
      admin.from('alunos').select('*, turmas!inner(escola_id)', { count: 'exact', head: true }).eq('ativo', true)
    ),

    admin.from('registros_chamada')
      .select('status, chamadas!inner(aulas!inner(data))')
      .eq('chamadas.aulas.data', hoje),

    filtrarEscola(
      admin.from('aulas').select('id, chamadas(id), turmas!inner(escola_id)').eq('data', hoje),
    ),

    filtrarEscola(
      admin.from('chamadas')
        .select(`
          id, status, iniciada_em, concluida_em,
          aulas!inner(id, data, horario_inicio, horario_fim,
            turmas!inner(id, nome, turno, escola_id), disciplinas(nome), usuarios(nome)
          ),
          registros_chamada(id, status, motivo_alteracao, horario_evento, alunos(nome_completo, foto_url))
        `)
        .eq('aulas.data', hoje)
        .order('iniciada_em', { ascending: false })
    ),

    filtrarEscola(
      admin.from('alertas')
        .select('*, alunos(nome_completo), turmas!inner(nome, escola_id)')
        .eq('lido', false)
        .order('criado_em', { ascending: false })
        .limit(6),
      'turmas.escola_id'
    ),
  ])

  const regsHoje = (registrosHoje || []).filter((r: any) => r.chamadas?.aulas?.data === hoje)
  const presentes = regsHoje.filter((r: any) => r.status === 'presente').length
  const faltas = regsHoje.filter((r: any) => r.status === 'falta').length
  const pendentes = (aulasHoje || []).filter((a: any) => !a.chamadas?.length).length
  const chamadasDeHoje = (chamadasHoje || []).filter((c: any) => c.aulas?.data === hoje)

  return NextResponse.json({
    kpis: { matriculados: matriculados || 0, presentes, faltas, pendentes },
    chamadas: chamadasDeHoje,
    alertas: alertas || [],
  })
}
