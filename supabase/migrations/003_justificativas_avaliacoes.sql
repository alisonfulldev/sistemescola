-- ============================================================
-- MIGRAÇÃO 003: Justificativas de Falta e Avaliações/Provas
-- Adequação completa ao Diário de Narandiba
-- ============================================================

-- ============================================================
-- BLOCO 1: Expandir tabela alunos com dados pessoais
-- ============================================================
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS naturalidade TEXT,
  ADD COLUMN IF NOT EXISTS nacionalidade TEXT DEFAULT 'Brasileira',
  ADD COLUMN IF NOT EXISTS nome_mae TEXT,
  ADD COLUMN IF NOT EXISTS cpf_aluno TEXT,
  ADD COLUMN IF NOT EXISTS rg_aluno TEXT;

-- Índices para CPF (busca comum)
CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_cpf ON public.alunos(cpf_aluno) WHERE cpf_aluno IS NOT NULL;

-- ============================================================
-- BLOCO 2: Expandir tabela responsaveis_alunos
-- ============================================================
ALTER TABLE public.responsaveis_alunos
  ADD COLUMN IF NOT EXISTS parentesco TEXT NOT NULL DEFAULT 'responsavel'
    CHECK (parentesco IN ('pai', 'mae', 'avo', 'avó', 'tio', 'tutor', 'responsavel', 'outro')),
  ADD COLUMN IF NOT EXISTS cpf_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS rg_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS telefone_primario TEXT,
  ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;

-- Índice para CPF do responsável
CREATE INDEX IF NOT EXISTS idx_responsaveis_cpf ON public.responsaveis_alunos(cpf_responsavel) WHERE cpf_responsavel IS NOT NULL;

-- ============================================================
-- BLOCO 3: Tabela JUSTIFICATIVAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.justificativas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_falta DATE NOT NULL,
  motivo TEXT NOT NULL CHECK (motivo IN (
    'medico', 'dentista', 'falecimento', 'acompanhamento_responsavel',
    'consulta_especialista', 'atividade_escolar', 'motivo_pessoal', 'outro'
  )),
  descricao_detalhada TEXT,

  -- Comprovante/documento
  documento_url TEXT,
  tipo_documento TEXT,

  -- Status da justificativa
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),

  -- Metadata
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,

  aprovado_em TIMESTAMPTZ,
  aprovado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacao_aprovacao TEXT,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_justificativa_falta UNIQUE(aluno_id, data_falta)
);

ALTER TABLE public.justificativas ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_justificativas_aluno ON public.justificativas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_justificativas_data_falta ON public.justificativas(data_falta);
CREATE INDEX IF NOT EXISTS idx_justificativas_status ON public.justificativas(status);

-- RLS Policies
DROP POLICY IF EXISTS "justificativas_select" ON public.justificativas;
DROP POLICY IF EXISTS "justificativas_insert" ON public.justificativas;
DROP POLICY IF EXISTS "justificativas_update" ON public.justificativas;
DROP POLICY IF EXISTS "justificativas_delete" ON public.justificativas;

CREATE POLICY "justificativas_select" ON public.justificativas FOR SELECT USING (
  -- Admin/secretaria vê todas
  public.is_adm()
  -- Responsável vê apenas de seus filhos
  OR EXISTS(
    SELECT 1 FROM public.responsaveis_alunos
    WHERE responsavel_id = auth.uid() AND aluno_id = justificativas.aluno_id
  )
  -- Professor vê de seus alunos
  OR EXISTS(
    SELECT 1 FROM public.aulas a
    WHERE a.professor_id = auth.uid()
    AND EXISTS(
      SELECT 1 FROM public.registros_chamada rc
      JOIN public.chamadas c ON c.id = rc.chamada_id
      WHERE rc.aluno_id = justificativas.aluno_id AND c.aula_id = a.id
    )
  )
);

CREATE POLICY "justificativas_insert" ON public.justificativas FOR INSERT WITH CHECK (
  -- Responsável pode enviar para seus filhos
  EXISTS(
    SELECT 1 FROM public.responsaveis_alunos
    WHERE responsavel_id = auth.uid() AND aluno_id = aluno_id
  )
  -- Admin pode registrar por qualquer aluno
  OR public.is_adm()
);

CREATE POLICY "justificativas_update" ON public.justificativas FOR UPDATE USING (
  -- Responsável pode editar enquanto pendente
  (
    EXISTS(
      SELECT 1 FROM public.responsaveis_alunos
      WHERE responsavel_id = auth.uid() AND aluno_id = justificativas.aluno_id
    )
    AND status = 'pendente'
  )
  -- Admin pode editar sempre
  OR public.is_adm()
);

CREATE POLICY "justificativas_delete" ON public.justificativas FOR DELETE USING (
  public.is_admin()
);

-- ============================================================
-- BLOCO 4: Tabela AVALIAÇÕES (provas, trabalhos, etc)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,

  -- Identificação
  tipo TEXT NOT NULL CHECK (tipo IN ('prova', 'trabalho', 'projeto', 'participacao', 'seminario', 'lista_exercicios', 'outra')),
  titulo TEXT NOT NULL,
  descricao TEXT,

  -- Escala de avaliação
  valor_maximo NUMERIC(5,1) NOT NULL DEFAULT 10,
  peso NUMERIC(3,1) NOT NULL DEFAULT 1,

  -- Datas
  data_aplicacao DATE NOT NULL,
  data_entrega DATE,

  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_avaliacoes_aula ON public.avaliacoes(aula_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_disciplina ON public.avaliacoes(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma ON public.avaliacoes(turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data ON public.avaliacoes(data_aplicacao);

-- RLS Policies
DROP POLICY IF EXISTS "avaliacoes_select" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_insert" ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_update" ON public.avaliacoes;

CREATE POLICY "avaliacoes_select" ON public.avaliacoes FOR SELECT USING (
  -- Professor vê suas avaliações
  EXISTS(SELECT 1 FROM public.aulas WHERE id = aula_id AND professor_id = auth.uid())
  -- Admin vê todas
  OR public.is_adm()
  -- Responsável vê avaliações dos seus filhos
  OR EXISTS(
    SELECT 1 FROM public.responsaveis_alunos ra
    WHERE ra.responsavel_id = auth.uid()
    AND ra.aluno_id IN (SELECT DISTINCT aluno_id FROM public.notas_avaliacao WHERE avaliacao_id = avaliacoes.id)
  )
);

CREATE POLICY "avaliacoes_insert" ON public.avaliacoes FOR INSERT WITH CHECK (
  -- Professor pode criar na sua aula
  EXISTS(SELECT 1 FROM public.aulas WHERE id = aula_id AND professor_id = auth.uid())
  -- Admin pode criar em qualquer lugar
  OR public.is_admin()
);

CREATE POLICY "avaliacoes_update" ON public.avaliacoes FOR UPDATE USING (
  -- Professor pode editar suas
  EXISTS(SELECT 1 FROM public.aulas WHERE id = aula_id AND professor_id = auth.uid())
  -- Admin pode editar todas
  OR public.is_admin()
);

-- ============================================================
-- BLOCO 5: Tabela NOTAS_AVALIAÇÃO (notas individuais)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notas_avaliacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,

  nota NUMERIC(5,1) CHECK (nota BETWEEN 0 AND 99.9),
  observacao TEXT,

  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  registrado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,

  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(avaliacao_id, aluno_id)
);

ALTER TABLE public.notas_avaliacao ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_notas_avaliacao_aluno ON public.notas_avaliacao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_avaliacao_avaliacao ON public.notas_avaliacao(avaliacao_id);

-- RLS Policies
DROP POLICY IF EXISTS "notas_avaliacao_select" ON public.notas_avaliacao;
DROP POLICY IF EXISTS "notas_avaliacao_insert" ON public.notas_avaliacao;
DROP POLICY IF EXISTS "notas_avaliacao_update" ON public.notas_avaliacao;

CREATE POLICY "notas_avaliacao_select" ON public.notas_avaliacao FOR SELECT USING (
  -- Professor vê notas de seus alunos
  EXISTS(
    SELECT 1 FROM public.avaliacoes av
    JOIN public.aulas a ON a.id = av.aula_id
    WHERE av.id = avaliacao_id AND a.professor_id = auth.uid()
  )
  -- Admin vê todas
  OR public.is_adm()
  -- Responsável vê notas de seus filhos
  OR EXISTS(
    SELECT 1 FROM public.responsaveis_alunos
    WHERE responsavel_id = auth.uid() AND aluno_id = notas_avaliacao.aluno_id
  )
);

CREATE POLICY "notas_avaliacao_insert" ON public.notas_avaliacao FOR INSERT WITH CHECK (
  -- Professor pode registrar notas de seus alunos
  EXISTS(
    SELECT 1 FROM public.avaliacoes av
    JOIN public.aulas a ON a.id = av.aula_id
    WHERE av.id = avaliacao_id AND a.professor_id = auth.uid()
  )
  -- Admin pode registrar em qualquer lugar
  OR public.is_admin()
);

CREATE POLICY "notas_avaliacao_update" ON public.notas_avaliacao FOR UPDATE USING (
  -- Professor pode editar suas próprias notas
  EXISTS(
    SELECT 1 FROM public.avaliacoes av
    JOIN public.aulas a ON a.id = av.aula_id
    WHERE av.id = avaliacao_id AND a.professor_id = auth.uid()
  )
  -- Admin pode editar todas
  OR public.is_admin()
);

-- ============================================================
-- BLOCO 6: View para facilitar relatório de frequência
-- ============================================================
CREATE OR REPLACE VIEW public.v_frequencia_aluno_mes AS
SELECT
  a.id AS aluno_id,
  a.nome_completo,
  a.matricula,
  t.id AS turma_id,
  t.nome AS turma_nome,
  EXTRACT(YEAR FROM au.data)::INTEGER AS ano,
  EXTRACT(MONTH FROM au.data)::INTEGER AS mes,
  COUNT(DISTINCT au.id) AS total_aulas,
  COUNT(DISTINCT CASE WHEN rc.status = 'presente' THEN au.id END) AS presentes,
  COUNT(DISTINCT CASE WHEN rc.status = 'falta' THEN au.id END) AS faltas,
  COUNT(DISTINCT CASE WHEN rc.status = 'justificada' THEN au.id END) AS justificadas,
  ROUND(
    (COUNT(DISTINCT CASE WHEN rc.status = 'presente' THEN au.id END)::NUMERIC /
     NULLIF(COUNT(DISTINCT au.id), 0)) * 100,
    1
  ) AS percentual_frequencia
FROM public.alunos a
JOIN public.turmas t ON t.id = a.turma_id
JOIN public.aulas au ON au.turma_id = t.id
JOIN public.chamadas c ON c.aula_id = au.id AND c.status = 'concluida'
LEFT JOIN public.registros_chamada rc ON rc.chamada_id = c.id AND rc.aluno_id = a.id
WHERE a.ativo = true
GROUP BY a.id, a.nome_completo, a.matricula, t.id, t.nome,
         EXTRACT(YEAR FROM au.data), EXTRACT(MONTH FROM au.data)
ORDER BY a.nome_completo;

-- ============================================================
-- BLOCO 7: View para facilitar relatório de notas por aluno
-- ============================================================
CREATE OR REPLACE VIEW public.v_notas_aluno_resumo AS
SELECT
  n.aluno_id,
  a.nome_completo,
  n.disciplina_id,
  d.nome AS disciplina_nome,
  n.ano_letivo_id,
  al.ano,
  n.b1, n.b2, n.b3, n.b4, n.recuperacao,
  ROUND((COALESCE(n.b1, 0) + COALESCE(n.b2, 0) + COALESCE(n.b3, 0) + COALESCE(n.b4, 0)) / 4, 1) AS media_bimestral,
  CASE
    WHEN (COALESCE(n.b1, 0) + COALESCE(n.b2, 0) + COALESCE(n.b3, 0) + COALESCE(n.b4, 0)) / 4 >= 7 THEN 'Aprovado'
    WHEN n.recuperacao >= 7 THEN 'Recuperado'
    ELSE 'Reprovado'
  END AS situacao
FROM public.notas n
JOIN public.alunos a ON a.id = n.aluno_id
JOIN public.disciplinas d ON d.id = n.disciplina_id
JOIN public.anos_letivos al ON al.id = n.ano_letivo_id
WHERE a.ativo = true
ORDER BY a.nome_completo, d.nome;
