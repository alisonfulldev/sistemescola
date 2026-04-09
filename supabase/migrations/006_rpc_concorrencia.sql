-- ========================================================================
-- MIGRAÇÃO 006: Correções de Concorrência, Atomicidade e Race Conditions
-- ========================================================================
-- Esta migração introduz:
-- 1. UNIQUE constraints para evitar duplicatas em concorrência
-- 2. RPC atômica para operações multi-step (avaliações)
-- 3. Índices para melhor performance em queries críticas
-- ========================================================================

-- ========================================================================
-- PHASE 1: CONSTRAINTS PARA EVITAR DUPLICATAS
-- ========================================================================

-- Evitar aulas duplicadas para o mesmo professor+turma+data
ALTER TABLE aulas
ADD CONSTRAINT unique_aula_professor_turma_data
UNIQUE (professor_id, turma_id, data);

-- Garantir que cada aula tem no máximo uma chamada
-- (Já existe mas deixamos explícito)
ALTER TABLE chamadas
DROP CONSTRAINT IF EXISTS unique_chamada_aula CASCADE;

ALTER TABLE chamadas
ADD CONSTRAINT unique_chamada_aula UNIQUE (aula_id);

-- Garantir unicidade de registros de presença por chamada+aluno
-- (Já existe mas deixamos explícito)
ALTER TABLE registros_chamada
DROP CONSTRAINT IF EXISTS unique_registro_chamada_aluno CASCADE;

ALTER TABLE registros_chamada
ADD CONSTRAINT unique_registro_chamada_aluno UNIQUE (chamada_id, aluno_id);

-- ========================================================================
-- PHASE 2: RPC ATÔMICAS PARA OPERAÇÕES CRÍTICAS
-- ========================================================================

-- Função atômica para criar avaliação completa com registros de nota para todos alunos
-- Encapsula: INSERT avaliacoes + INSERT N notas_avaliacao em uma transação
CREATE OR REPLACE FUNCTION criar_avaliacao_completa(
  p_aula_id UUID,
  p_disciplina_id UUID,
  p_turma_id UUID,
  p_titulo TEXT,
  p_tipo TEXT,
  p_data_aplicacao DATE,
  p_data_entrega DATE DEFAULT NULL,
  p_valor_maximo NUMERIC DEFAULT 10,
  p_peso NUMERIC DEFAULT 1,
  p_registrado_por UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_avaliacao_id UUID;
  v_alunos_count INT;
  v_registrado_por UUID;
BEGIN
  -- Usar o professor que cria (p_registrado_por) ou o professor da aula como fallback
  IF p_registrado_por IS NOT NULL THEN
    v_registrado_por := p_registrado_por;
  ELSE
    SELECT professor_id INTO v_registrado_por FROM aulas WHERE id = p_aula_id;
  END IF;

  -- 1. Inserir avaliação
  INSERT INTO avaliacoes (
    aula_id, disciplina_id, turma_id, titulo, tipo,
    data_aplicacao, data_entrega, valor_maximo, peso,
    ativo, criado_em, atualizado_em
  )
  VALUES (
    p_aula_id, p_disciplina_id, p_turma_id, p_titulo, p_tipo,
    p_data_aplicacao, p_data_entrega, p_valor_maximo, p_peso,
    true, NOW(), NOW()
  )
  RETURNING id INTO v_avaliacao_id;

  -- 2. Contar alunos ativos da turma
  SELECT COUNT(*) INTO v_alunos_count
  FROM alunos
  WHERE turma_id = p_turma_id AND situacao = 'ativo';

  -- 3. Inserir registros de notas_avaliacao para cada aluno
  IF v_alunos_count > 0 THEN
    INSERT INTO notas_avaliacao (avaliacao_id, aluno_id, nota, registrado_por, registrado_em, atualizado_em)
    SELECT v_avaliacao_id, id, NULL, v_registrado_por, NOW(), NOW()
    FROM alunos
    WHERE turma_id = p_turma_id AND situacao = 'ativo'
    ON CONFLICT (avaliacao_id, aluno_id) DO NOTHING;
  END IF;

  RETURN v_avaliacao_id;
END;
$$ LANGUAGE plpgsql;

-- Função atômica para aprovar/rejeitar justificativa e atualizar registro de presença
-- Encapsula: UPDATE justificativas + UPDATE registros_chamada + trigger verificação frequência
CREATE OR REPLACE FUNCTION aprovar_justificativa_atomica(
  p_justificativa_id UUID,
  p_status TEXT, -- 'aprovada' ou 'rejeitada'
  p_observacao_aprovacao TEXT DEFAULT NULL,
  p_usuario_aprovador_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_registro_id UUID;
  v_aluno_id UUID;
BEGIN
  -- Validar status
  IF p_status NOT IN ('aprovada', 'rejeitada') THEN
    RAISE EXCEPTION 'Status inválido: %', p_status;
  END IF;

  -- 1. Buscar registro associado à justificativa
  SELECT j.registro_id, r.aluno_id
  INTO v_registro_id, v_aluno_id
  FROM justificativas_falta j
  LEFT JOIN registros_chamada r ON j.registro_id = r.id
  WHERE j.id = p_justificativa_id
  FOR UPDATE; -- Lock pessimista para evitar race condition

  IF v_registro_id IS NULL THEN
    RAISE EXCEPTION 'Justificativa não encontrada ou registro inválido';
  END IF;

  -- 2. Atualizar justificativa
  UPDATE justificativas_falta
  SET
    status = p_status,
    aprovado_em = NOW(),
    aprovado_por = COALESCE(p_usuario_aprovador_id, auth.uid()),
    observacao_aprovacao = p_observacao_aprovacao,
    respondida_em = NOW()
  WHERE id = p_justificativa_id;

  -- 3. SE aprovada, atualizar registro para 'justificada'
  -- Trigger verificar_frequencia dispara automaticamente
  IF p_status = 'aprovada' THEN
    UPDATE registros_chamada
    SET status = 'justificada'
    WHERE id = v_registro_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- PHASE 3: ÍNDICES PARA PERFORMANCE EM QUERIES CRÍTICAS
-- ========================================================================

-- Índice para busca rápida de aulas por professor+turma+data (usado em iniciar-chamada)
CREATE INDEX IF NOT EXISTS idx_aulas_professor_turma_data_unique
ON aulas (professor_id, turma_id, data)
WHERE ativo = true;

-- Índice para busca rápida de aulas por turma+data (para responsavel/status)
CREATE INDEX IF NOT EXISTS idx_aulas_turma_data
ON aulas (turma_id, data)
WHERE ativo = true;

-- Índice para chamadas por turma_id (via aulas) — usado em relatórios
CREATE INDEX IF NOT EXISTS idx_chamadas_aula_status
ON chamadas (aula_id, status)
WHERE status IN ('em_andamento', 'concluida');

-- Índice para registros_chamada filtrado por aluno (usado em responsavel/status)
CREATE INDEX IF NOT EXISTS idx_registros_chamada_aluno_status
ON registros_chamada (aluno_id, status)
WHERE status IN ('presente', 'falta', 'justificada');

-- Índice para justificativas_falta por registro_id (chave estrangeira)
CREATE INDEX IF NOT EXISTS idx_justificativas_falta_registro
ON justificativas_falta (registro_id)
WHERE status IN ('pendente', 'aprovada');

-- Índice para avaliacoes por turma_id (usado em listagens)
CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma_ativo
ON avaliacoes (turma_id, ativo)
WHERE ativo = true;

-- Índice para notas_avaliacao por aluno_id (para dashboard responsável)
CREATE INDEX IF NOT EXISTS idx_notas_avaliacao_aluno
ON notas_avaliacao (aluno_id)
WHERE nota IS NOT NULL;

-- ========================================================================
-- PHASE 4: TIPO ENUM PARA TRANSAÇÕES (FUTURE USE - OPTIONAL)
-- ========================================================================

-- Criar tipo para transações de operações críticas (para auditoria)
DO $$
BEGIN
  CREATE TYPE transacao_status AS ENUM ('iniciada', 'concluida', 'falhou', 'parcial');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Tabela para rastrear transações críticas (para detecção de race conditions)
CREATE TABLE IF NOT EXISTS transacoes_criticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'iniciar_chamada', 'criar_avaliacao', 'aprovar_justificativa'
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
  dados JSONB,
  status transacao_status DEFAULT 'iniciada',
  timestamp_inicio TIMESTAMPTZ DEFAULT NOW(),
  timestamp_fim TIMESTAMPTZ,
  erro TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transacoes_criticas_usuario_tipo
ON transacoes_criticas (usuario_id, tipo, status);

-- ========================================================================
-- PHASE 5: GRANT PERMISSIONS PARA RPC
-- ========================================================================

GRANT EXECUTE ON FUNCTION criar_avaliacao_completa(UUID, UUID, UUID, TEXT, TEXT, DATE, DATE, NUMERIC, NUMERIC)
TO authenticated, anon;

GRANT EXECUTE ON FUNCTION aprovar_justificativa_atomica(UUID, TEXT, TEXT, UUID)
TO authenticated, anon;

-- ========================================================================
-- FIM DA MIGRAÇÃO 006
-- ========================================================================
-- Logs:
-- - Added UNIQUE (professor_id, turma_id, data) to aulas
-- - Added UNIQUE (aula_id) to chamadas (explicit)
-- - Added UNIQUE (chamada_id, aluno_id) to registros_chamada (explicit)
-- - Created RPC criar_avaliacao_completa() for atomic evaluation creation
-- - Created RPC aprovar_justificativa_atomica() for atomic approval
-- - Added 7 performance indices
-- - Created transacoes_criticas table for audit trail
-- ========================================================================
