-- ============================================================
-- MIGRAÇÃO: Adequação ao Diário de Narandiba
-- Pode ser executado inteiro de uma só vez — totalmente idempotente
-- ============================================================

-- ============================================================
-- BLOCO 1: Tabela escola
-- ============================================================
CREATE TABLE IF NOT EXISTS public.escola (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_oficial TEXT NOT NULL,
  municipio TEXT NOT NULL,
  uf CHAR(2) NOT NULL DEFAULT 'SP',
  codigo TEXT,
  diretor TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  telefone TEXT,
  email TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.escola ENABLE ROW LEVEL SECURITY;

-- Adicionar colunas caso a tabela já exista sem elas
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS diretor TEXT;
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.escola ADD COLUMN IF NOT EXISTS email TEXT;

DROP POLICY IF EXISTS "escola_select" ON public.escola;
DROP POLICY IF EXISTS "escola_insert" ON public.escola;
DROP POLICY IF EXISTS "escola_update" ON public.escola;
CREATE POLICY "escola_select" ON public.escola FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escola_insert" ON public.escola FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "escola_update" ON public.escola FOR UPDATE USING (public.is_adm());

-- ============================================================
-- BLOCO 2: Tabela anos_letivos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.anos_letivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano INTEGER NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT false,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  recesso_inicio DATE,
  recesso_fim DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.anos_letivos ENABLE ROW LEVEL SECURITY;

-- Adicionar colunas caso a tabela já exista sem elas
ALTER TABLE public.anos_letivos ADD COLUMN IF NOT EXISTS recesso_inicio DATE;
ALTER TABLE public.anos_letivos ADD COLUMN IF NOT EXISTS recesso_fim DATE;

DROP POLICY IF EXISTS "anos_letivos_select" ON public.anos_letivos;
DROP POLICY IF EXISTS "anos_letivos_insert" ON public.anos_letivos;
DROP POLICY IF EXISTS "anos_letivos_update" ON public.anos_letivos;
CREATE POLICY "anos_letivos_select" ON public.anos_letivos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "anos_letivos_insert" ON public.anos_letivos FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "anos_letivos_update" ON public.anos_letivos FOR UPDATE USING (public.is_adm());

-- ============================================================
-- BLOCO 3: Tabela bimestres
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bimestres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano_letivo_id UUID NOT NULL REFERENCES public.anos_letivos(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero IN (1, 2, 3, 4)),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ano_letivo_id, numero)
);

ALTER TABLE public.bimestres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bimestres_select" ON public.bimestres;
DROP POLICY IF EXISTS "bimestres_insert" ON public.bimestres;
DROP POLICY IF EXISTS "bimestres_update" ON public.bimestres;
CREATE POLICY "bimestres_select" ON public.bimestres FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bimestres_insert" ON public.bimestres FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "bimestres_update" ON public.bimestres FOR UPDATE USING (public.is_adm());

-- ============================================================
-- BLOCO 4: Tabela calendario_escolar
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendario_escolar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ano_letivo_id UUID NOT NULL REFERENCES public.anos_letivos(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo_dia TEXT NOT NULL CHECK (tipo_dia IN ('letivo','feriado_nacional','feriado_municipal','ponto_facultativo','recesso','evento_escolar')),
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ano_letivo_id, data)
);

ALTER TABLE public.calendario_escolar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendario_select" ON public.calendario_escolar;
DROP POLICY IF EXISTS "calendario_insert" ON public.calendario_escolar;
DROP POLICY IF EXISTS "calendario_update" ON public.calendario_escolar;
DROP POLICY IF EXISTS "calendario_delete" ON public.calendario_escolar;
CREATE POLICY "calendario_select" ON public.calendario_escolar FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "calendario_insert" ON public.calendario_escolar FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "calendario_update" ON public.calendario_escolar FOR UPDATE USING (public.is_adm());
CREATE POLICY "calendario_delete" ON public.calendario_escolar FOR DELETE USING (public.is_adm());

-- ============================================================
-- BLOCO 5: Alterar turmas
-- ============================================================
ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS serie INTEGER,
  ADD COLUMN IF NOT EXISTS turma_letra CHAR(1),
  ADD COLUMN IF NOT EXISTS grau TEXT CHECK (grau IN ('EF', 'EM')),
  ADD COLUMN IF NOT EXISTS aulas_previstas INTEGER;

-- ============================================================
-- BLOCO 6: Alterar alunos
-- ============================================================
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS numero_chamada INTEGER CHECK (numero_chamada BETWEEN 1 AND 55),
  ADD COLUMN IF NOT EXISTS situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'transferido', 'remanejado')),
  ADD COLUMN IF NOT EXISTS email_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS data_matricula DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_alunos_num_chamada_turma
  ON public.alunos(turma_id, numero_chamada)
  WHERE numero_chamada IS NOT NULL;

-- ============================================================
-- BLOCO 7: Alterar disciplinas
-- ============================================================
ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS curso TEXT,
  ADD COLUMN IF NOT EXISTS codigo_disciplina TEXT;

-- ============================================================
-- BLOCO 8: Alterar aulas (conteudo + bimestre automático)
-- ============================================================
ALTER TABLE public.aulas
  ADD COLUMN IF NOT EXISTS conteudo_programatico TEXT,
  ADD COLUMN IF NOT EXISTS atividades_desenvolvidas TEXT,
  ADD COLUMN IF NOT EXISTS bimestre INTEGER CHECK (bimestre IN (1, 2, 3, 4));

CREATE OR REPLACE FUNCTION public.calcular_bimestre_aula()
RETURNS TRIGGER AS $$
DECLARE
  v_bimestre INTEGER;
BEGIN
  SELECT b.numero INTO v_bimestre
  FROM public.bimestres b
  JOIN public.anos_letivos al ON al.id = b.ano_letivo_id
  WHERE al.ativo = true
    AND NEW.data BETWEEN b.data_inicio AND b.data_fim
  LIMIT 1;

  NEW.bimestre := v_bimestre;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_calcular_bimestre ON public.aulas;
CREATE TRIGGER trigger_calcular_bimestre
  BEFORE INSERT OR UPDATE OF data ON public.aulas
  FOR EACH ROW EXECUTE FUNCTION public.calcular_bimestre_aula();

-- ============================================================
-- BLOCO 9: Tabela notas (diário de notas por bimestre)
-- ============================================================

-- Se existir uma tabela notas antiga (sem ano_letivo_id), remove para recriar corretamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notas'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'ano_letivo_id'
  ) THEN
    DROP TABLE public.notas CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  ano_letivo_id UUID NOT NULL REFERENCES public.anos_letivos(id) ON DELETE RESTRICT,
  b1 NUMERIC(4,1) CHECK (b1 BETWEEN 0 AND 10),
  b2 NUMERIC(4,1) CHECK (b2 BETWEEN 0 AND 10),
  b3 NUMERIC(4,1) CHECK (b3 BETWEEN 0 AND 10),
  b4 NUMERIC(4,1) CHECK (b4 BETWEEN 0 AND 10),
  recuperacao NUMERIC(4,1) CHECK (recuperacao BETWEEN 0 AND 10),
  ausencias_compensadas INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aluno_id, disciplina_id, ano_letivo_id)
);

ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notas_select" ON public.notas;
DROP POLICY IF EXISTS "notas_insert" ON public.notas;
DROP POLICY IF EXISTS "notas_update" ON public.notas;
CREATE POLICY "notas_select" ON public.notas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "notas_insert" ON public.notas FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "notas_update" ON public.notas FOR UPDATE USING (public.is_adm());

-- Índices
CREATE INDEX IF NOT EXISTS idx_notas_aluno ON public.notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_ano ON public.notas(ano_letivo_id);
CREATE INDEX IF NOT EXISTS idx_aulas_bimestre ON public.aulas(bimestre);

-- ============================================================
-- BLOCO 10: Corrigir constraint de perfis na tabela usuarios
-- ============================================================
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil IN ('professor', 'secretaria', 'admin', 'responsavel', 'cozinha', 'diretor'));
