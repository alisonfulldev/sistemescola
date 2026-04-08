-- ============================================================================
-- SISTEMA ESCOLA - SQL SETUP COMPLETO
-- Cole esse script no SQL Editor do Supabase para criar todas as tabelas
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- TABELAS BÁSICAS
-- ─────────────────────────────────────────────────────────────────────────

-- Anos Letivos (Academic Years)
CREATE TABLE IF NOT EXISTS anos_letivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano INTEGER NOT NULL UNIQUE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  nome VARCHAR(100),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Escolas (Schools)
CREATE TABLE IF NOT EXISTS escolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(200) NOT NULL UNIQUE,
  cnpj VARCHAR(20),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disciplinas (Disciplines/Subjects)
CREATE TABLE IF NOT EXISTS disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descricao TEXT,
  carga_horaria INTEGER,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Turmas (Classes)
CREATE TABLE IF NOT EXISTS turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  serie VARCHAR(20) NOT NULL,
  turno VARCHAR(20) NOT NULL, -- matutino, vespertino, noturno
  turma_letra VARCHAR(5),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(escola_id, nome, turma_letra)
);

-- Usuários (Users)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  usuario VARCHAR(100) NOT NULL UNIQUE,
  perfil VARCHAR(50) NOT NULL, -- admin, diretor, secretaria, professor, responsavel, cozinha
  escola_id UUID REFERENCES escolas(id),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alunos (Students)
CREATE TABLE IF NOT EXISTS alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo VARCHAR(200) NOT NULL,
  data_nascimento DATE,
  matricula VARCHAR(50) NOT NULL UNIQUE,
  turma_id UUID NOT NULL REFERENCES turmas(id),
  numero_chamada INTEGER,
  contato_responsavel VARCHAR(100),
  foto_url TEXT,
  situacao VARCHAR(20) DEFAULT 'ativo', -- ativo, inativo, transferido
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- AULAS, CHAMADAS E PRESENÇA
-- ─────────────────────────────────────────────────────────────────────────

-- Aulas (Classes/Lessons)
CREATE TABLE IF NOT EXISTS aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES usuarios(id),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  disciplina_id UUID NOT NULL REFERENCES disciplinas(id),
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  conteudo_programatico TEXT,
  atividades_desenvolvidas TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(professor_id, turma_id, data)
);

-- Chamadas (Roll Calls/Attendance Sessions)
CREATE TABLE IF NOT EXISTS chamadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES aulas(id) UNIQUE,
  status VARCHAR(50) DEFAULT 'em_andamento', -- em_andamento, concluida
  iniciada_em TIMESTAMP WITH TIME ZONE,
  concluida_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Registros de Chamada (Attendance Records)
CREATE TABLE IF NOT EXISTS registros_chamada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id UUID NOT NULL REFERENCES chamadas(id),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  status VARCHAR(50) DEFAULT 'presente', -- presente, falta, justificada
  observacao TEXT,
  motivo_alteracao TEXT,
  horario_evento TIME,
  registrado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(chamada_id, aluno_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- JUSTIFICATIVAS
-- ─────────────────────────────────────────────────────────────────────────

-- Justificativas de Falta (Absence Justifications)
CREATE TABLE IF NOT EXISTS justificativas_falta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id UUID NOT NULL REFERENCES registros_chamada(id),
  responsavel_id UUID NOT NULL REFERENCES usuarios(id),
  motivo TEXT NOT NULL,
  comprovante_url TEXT,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, aprovada, rejeitada
  professor_resposta TEXT,
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  respondida_em TIMESTAMP WITH TIME ZONE,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Justificativas Genéricas (Generic Justifications)
CREATE TABLE IF NOT EXISTS justificativas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  data_falta DATE NOT NULL,
  motivo TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, aprovada, rejeitada
  criada_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- NOTAS E AVALIAÇÕES
-- ─────────────────────────────────────────────────────────────────────────

-- Notas (Grades)
CREATE TABLE IF NOT EXISTS notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  disciplina_id UUID NOT NULL REFERENCES disciplinas(id),
  ano_letivo_id UUID NOT NULL REFERENCES anos_letivos(id),
  b1 NUMERIC(4,2), -- bimestre 1
  b2 NUMERIC(4,2), -- bimestre 2
  b3 NUMERIC(4,2), -- bimestre 3
  b4 NUMERIC(4,2), -- bimestre 4
  recuperacao NUMERIC(4,2),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(aluno_id, disciplina_id, ano_letivo_id)
);

-- Avaliações (Assessments/Evaluations)
CREATE TABLE IF NOT EXISTS avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id UUID NOT NULL REFERENCES aulas(id),
  disciplina_id UUID NOT NULL REFERENCES disciplinas(id),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  titulo VARCHAR(200) NOT NULL,
  tipo VARCHAR(50), -- prova, trabalho, projeto, participacao, seminario, lista_exercicios, outra
  data_aplicacao DATE NOT NULL,
  data_entrega DATE,
  valor_maximo NUMERIC(4,2) DEFAULT 10,
  peso NUMERIC(4,2) DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notas de Avaliação (Assessment Grades)
CREATE TABLE IF NOT EXISTS notas_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id UUID NOT NULL REFERENCES avaliacoes(id),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  nota NUMERIC(4,2),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(avaliacao_id, aluno_id)
);

-- Provas (Tests)
CREATE TABLE IF NOT EXISTS provas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES usuarios(id),
  turma_id UUID NOT NULL REFERENCES turmas(id),
  titulo VARCHAR(200) NOT NULL,
  data DATE NOT NULL,
  nota_maxima NUMERIC(4,2) DEFAULT 10,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- RESPONSÁVEIS E VÍNCULO
-- ─────────────────────────────────────────────────────────────────────────

-- Responsáveis pelos Alunos (Guardians)
CREATE TABLE IF NOT EXISTS responsaveis_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id UUID NOT NULL REFERENCES usuarios(id),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  parentesco VARCHAR(50),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(responsavel_id, aluno_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- ALERTAS E NOTIFICAÇÕES
-- ─────────────────────────────────────────────────────────────────────────

-- Alertas (Alerts)
CREATE TABLE IF NOT EXISTS alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  tipo VARCHAR(50), -- frequencia_baixa, notas_baixas, falta_sem_justificar
  mensagem TEXT NOT NULL,
  lido BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  lido_em TIMESTAMP WITH TIME ZONE
);

-- Push Subscriptions (para notificações)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id UUID NOT NULL REFERENCES usuarios(id),
  subscription JSONB NOT NULL,
  user_agent TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(responsavel_id, subscription)
);

-- ─────────────────────────────────────────────────────────────────────────
-- ÍNDICES PARA PERFORMANCE
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_turmas_escola_id ON turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_turmas_ativo ON turmas(ativo);
CREATE INDEX IF NOT EXISTS idx_alunos_turma_id ON alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_alunos_situacao ON alunos(situacao);
CREATE INDEX IF NOT EXISTS idx_usuarios_escola_id ON usuarios(escola_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil);
CREATE INDEX IF NOT EXISTS idx_aulas_professor_turma_data ON aulas(professor_id, turma_id, data);
CREATE INDEX IF NOT EXISTS idx_aulas_turma_id ON aulas(turma_id);
CREATE INDEX IF NOT EXISTS idx_aulas_disciplina_id ON aulas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_aula_id ON chamadas(aula_id);
CREATE INDEX IF NOT EXISTS idx_chamadas_status ON chamadas(status);
CREATE INDEX IF NOT EXISTS idx_registros_chamada_aluno_id ON registros_chamada(aluno_id);
CREATE INDEX IF NOT EXISTS idx_registros_chamada_chamada_id ON registros_chamada(chamada_id);
CREATE INDEX IF NOT EXISTS idx_registros_chamada_status ON registros_chamada(status);
CREATE INDEX IF NOT EXISTS idx_justificativas_falta_registro_id ON justificativas_falta(registro_id);
CREATE INDEX IF NOT EXISTS idx_justificativas_falta_responsavel_id ON justificativas_falta(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_justificativas_falta_status ON justificativas_falta(status);
CREATE INDEX IF NOT EXISTS idx_justificativas_aluno_id ON justificativas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_aluno_id ON notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_disciplina_id ON notas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_notas_ano_letivo_id ON notas(ano_letivo_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma_id ON avaliacoes(turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aula_id ON avaliacoes(aula_id);
CREATE INDEX IF NOT EXISTS idx_notas_avaliacao_aluno_id ON notas_avaliacao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_avaliacao_avaliacao_id ON notas_avaliacao(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_provas_professor_id ON provas(professor_id);
CREATE INDEX IF NOT EXISTS idx_provas_turma_id ON provas(turma_id);
CREATE INDEX IF NOT EXISTS idx_responsaveis_alunos_responsavel_id ON responsaveis_alunos(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_responsaveis_alunos_aluno_id ON responsaveis_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_alertas_aluno_id ON alertas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_alertas_lido ON alertas(lido);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_responsavel_id ON push_subscriptions(responsavel_id);

-- ─────────────────────────────────────────────────────────────────────────
-- RPC FUNCTIONS (Operações Atômicas)
-- ─────────────────────────────────────────────────────────────────────────

-- RPC para criar avaliação com registros de nota atomicamente
CREATE OR REPLACE FUNCTION criar_avaliacao_completa(
  p_aula_id UUID,
  p_disciplina_id UUID,
  p_turma_id UUID,
  p_titulo TEXT,
  p_tipo TEXT,
  p_data_aplicacao DATE,
  p_data_entrega DATE,
  p_valor_maximo NUMERIC,
  p_peso NUMERIC
) RETURNS UUID AS $$
DECLARE v_avaliacao_id UUID;
BEGIN
  INSERT INTO avaliacoes (
    aula_id, disciplina_id, turma_id, titulo, tipo,
    data_aplicacao, data_entrega, valor_maximo, peso, ativo
  ) VALUES (
    p_aula_id, p_disciplina_id, p_turma_id, p_titulo, p_tipo,
    p_data_aplicacao, p_data_entrega, p_valor_maximo, p_peso, true
  ) RETURNING id INTO v_avaliacao_id;

  INSERT INTO notas_avaliacao (avaliacao_id, aluno_id, nota, criado_em, atualizado_em)
    SELECT v_avaliacao_id, id, NULL, now(), now()
    FROM alunos
    WHERE turma_id = p_turma_id AND situacao = 'ativo';

  RETURN v_avaliacao_id;
END;
$$ LANGUAGE plpgsql;

-- RPC para aprovar justificativa atomicamente
CREATE OR REPLACE FUNCTION aprovar_justificativa_atomica(
  p_justificativa_id UUID,
  p_professor_resposta TEXT,
  p_aprovar BOOLEAN
) RETURNS UUID AS $$
DECLARE v_registro_id UUID;
BEGIN
  UPDATE justificativas_falta
  SET
    status = CASE WHEN p_aprovar THEN 'aprovada' ELSE 'rejeitada' END,
    professor_resposta = p_professor_resposta,
    respondida_em = now(),
    atualizado_em = now()
  WHERE id = p_justificativa_id
  RETURNING registro_id INTO v_registro_id;

  IF p_aprovar AND v_registro_id IS NOT NULL THEN
    UPDATE registros_chamada
    SET status = 'justificada', atualizado_em = now()
    WHERE id = v_registro_id;
  END IF;

  RETURN v_registro_id;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- FIM DO SETUP
-- ─────────────────────────────────────────────────────────────────────────
-- Próximos passos:
-- 1. Criar uma escola: INSERT INTO escolas (nome) VALUES ('Minha Escola')
-- 2. Criar um ano letivo: INSERT INTO anos_letivos (ano, data_inicio, data_fim) VALUES (2026, '2026-01-01', '2026-12-31')
-- 3. Criar disciplinas
-- 4. Criar turmas
-- 5. Criar usuários via API
-- 6. Vincular alunos às turmas
-- 7. Vincular responsáveis aos alunos
-- ─────────────────────────────────────────────────────────────────────────
