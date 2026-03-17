export type Perfil = 'professor' | 'secretaria' | 'admin' | 'responsavel'
export type Turno = 'matutino' | 'vespertino' | 'noturno'
export type StatusChamada = 'pendente' | 'em_andamento' | 'concluida'
export type StatusPresenca = 'presente' | 'falta' | 'justificada'
export type TipoAlerta = 'falta_excessiva' | 'chamada_nao_iniciada' | 'justificativa' | 'chamada_atrasada' | 'faltas_consecutivas'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criado_em: string
}

export interface Turma {
  id: string
  nome: string
  turno: Turno
  ano_letivo: string
  ativo?: boolean
}

export interface Aluno {
  id: string
  nome_completo: string
  matricula: string
  turma_id: string
  foto_url?: string
  qr_code: string
  ativo: boolean
  nome_responsavel?: string
  contato_responsavel?: string
  turma?: Turma
}

export interface ResponsavelAluno {
  id: string
  responsavel_id: string
  aluno_id: string
  aluno?: Aluno
  responsavel?: Usuario
}

export interface Disciplina {
  id: string
  nome: string
  professor_id: string
  professor?: Usuario
}

export interface Aula {
  id: string
  turma_id: string
  disciplina_id: string
  professor_id: string
  data: string
  horario_inicio: string
  horario_fim: string
  turma?: Turma
  disciplina?: Disciplina
  professor?: Usuario
  chamada?: Chamada
}

export interface Entrada {
  id: string
  aluno_id: string
  data: string
  hora: string
  dispositivo?: string
  criado_em: string
  aluno?: Aluno
}

export interface Chamada {
  id: string
  aula_id: string
  iniciada_em: string
  concluida_em?: string
  status: StatusChamada
  aula?: Aula
  registros?: RegistroChamada[]
}

export interface RegistroChamada {
  id: string
  chamada_id: string
  aluno_id: string
  status: StatusPresenca
  observacao?: string
  registrado_em: string
  aluno?: Aluno
}

export interface Alerta {
  id: string
  tipo: TipoAlerta
  aluno_id?: string
  turma_id?: string
  descricao: string
  lido: boolean
  criado_em: string
  aluno?: Aluno
  turma?: Turma
}

export interface KPIsDia {
  total_matriculados: number
  total_presentes: number
  total_faltas: number
  chamadas_pendentes: number
  chamadas_em_andamento: number
  chamadas_concluidas: number
}
