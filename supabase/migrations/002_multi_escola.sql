-- ============================================================
-- MIGRAÇÃO: Multi-escola
-- Cada escola tem seu próprio diretor, professores, alunos, etc.
-- Totalmente idempotente
-- ============================================================

-- ============================================================
-- BLOCO 1: Adicionar escola_id às tabelas principais
-- ============================================================

-- usuarios: cada usuário de escola (diretor, professor, secretaria, cozinha)
-- pertence a uma escola. admin (secretaria municipal) tem escola_id = NULL.
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escola(id) ON DELETE SET NULL;

-- turmas pertencem a uma escola
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escola(id) ON DELETE CASCADE;

-- disciplinas pertencem a uma escola
ALTER TABLE public.disciplinas ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escola(id) ON DELETE CASCADE;

-- anos_letivos pertencem a uma escola
ALTER TABLE public.anos_letivos ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escola(id) ON DELETE CASCADE;

-- ============================================================
-- BLOCO 2: Corrigir constraint UNIQUE de anos_letivos
-- Antes: UNIQUE(ano) — bloqueava que duas escolas tivessem o mesmo ano
-- Depois: UNIQUE(ano, escola_id)
-- ============================================================
ALTER TABLE public.anos_letivos DROP CONSTRAINT IF EXISTS anos_letivos_ano_key;
DROP INDEX IF EXISTS anos_letivos_ano_escola_unique;
CREATE UNIQUE INDEX IF NOT EXISTS anos_letivos_ano_escola_unique
  ON public.anos_letivos(ano, escola_id)
  WHERE escola_id IS NOT NULL;

-- ============================================================
-- BLOCO 3: Função helper — retorna escola_id do usuário logado
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_escola_id()
RETURNS UUID AS $$
  SELECT escola_id FROM public.usuarios WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- BLOCO 4: Atualizar funções de papel para incluir diretor
-- ============================================================

-- is_adm: secretaria e admin podem operar, diretor também gerencia sua escola
CREATE OR REPLACE FUNCTION public.is_adm()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND perfil IN ('secretaria', 'admin', 'diretor')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- is_staff: quem pode ver dados operacionais
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND perfil IN ('professor', 'secretaria', 'admin', 'diretor')
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- BLOCO 5: Atualizar RLS — isolamento por escola
-- ============================================================

-- ── usuarios ────────────────────────────────────────────────
DROP POLICY IF EXISTS "usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update" ON public.usuarios;

CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT USING (
  id = auth.uid()
  OR public.is_admin()
  OR (public.is_adm() AND (escola_id = public.get_user_escola_id() OR escola_id IS NULL))
);
CREATE POLICY "usuarios_insert_admin" ON public.usuarios FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE USING (
  id = auth.uid() OR public.is_admin()
  OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);

-- ── turmas ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "turmas_select_all" ON public.turmas;
DROP POLICY IF EXISTS "turmas_write_admin" ON public.turmas;
DROP POLICY IF EXISTS "turmas_update_admin" ON public.turmas;

CREATE POLICY "turmas_select" ON public.turmas FOR SELECT USING (
  public.is_admin() OR escola_id = public.get_user_escola_id()
);
CREATE POLICY "turmas_insert" ON public.turmas FOR INSERT WITH CHECK (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);
CREATE POLICY "turmas_update" ON public.turmas FOR UPDATE USING (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);

-- ── alunos ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "alunos_select_staff" ON public.alunos;
DROP POLICY IF EXISTS "alunos_write_adm" ON public.alunos;
DROP POLICY IF EXISTS "alunos_update_adm" ON public.alunos;

CREATE POLICY "alunos_select" ON public.alunos FOR SELECT USING (
  public.is_admin()
  OR EXISTS(
    SELECT 1 FROM public.turmas t
    WHERE t.id = alunos.turma_id AND (public.is_admin() OR t.escola_id = public.get_user_escola_id())
  )
  OR (public.is_staff() AND EXISTS(
    SELECT 1 FROM public.turmas t WHERE t.id = alunos.turma_id AND t.escola_id = public.get_user_escola_id()
  ))
  OR EXISTS(
    SELECT 1 FROM public.responsaveis_alunos WHERE responsavel_id = auth.uid() AND aluno_id = alunos.id
  )
);
CREATE POLICY "alunos_insert" ON public.alunos FOR INSERT WITH CHECK (
  public.is_admin() OR (
    public.is_adm() AND EXISTS(
      SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND t.escola_id = public.get_user_escola_id()
    )
  )
);
CREATE POLICY "alunos_update" ON public.alunos FOR UPDATE USING (
  public.is_admin() OR (
    public.is_adm() AND EXISTS(
      SELECT 1 FROM public.turmas t WHERE t.id = alunos.turma_id AND t.escola_id = public.get_user_escola_id()
    )
  )
);

-- ── disciplinas ───────────────────────────────────────────────
DROP POLICY IF EXISTS "disciplinas_select_all" ON public.disciplinas;
DROP POLICY IF EXISTS "disciplinas_write_admin" ON public.disciplinas;
DROP POLICY IF EXISTS "disciplinas_update_admin" ON public.disciplinas;

CREATE POLICY "disciplinas_select" ON public.disciplinas FOR SELECT USING (
  public.is_admin() OR escola_id = public.get_user_escola_id()
);
CREATE POLICY "disciplinas_insert" ON public.disciplinas FOR INSERT WITH CHECK (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);
CREATE POLICY "disciplinas_update" ON public.disciplinas FOR UPDATE USING (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);

-- ── aulas ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "aulas_select" ON public.aulas;
DROP POLICY IF EXISTS "aulas_write_admin" ON public.aulas;
DROP POLICY IF EXISTS "aulas_update_admin" ON public.aulas;
DROP POLICY IF EXISTS "aulas_delete_admin" ON public.aulas;

CREATE POLICY "aulas_select" ON public.aulas FOR SELECT USING (
  public.is_admin()
  OR professor_id = auth.uid()
  OR (public.is_adm() AND EXISTS(
    SELECT 1 FROM public.turmas t WHERE t.id = aulas.turma_id AND t.escola_id = public.get_user_escola_id()
  ))
);
CREATE POLICY "aulas_insert" ON public.aulas FOR INSERT WITH CHECK (
  public.is_admin() OR (public.is_adm() AND EXISTS(
    SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND t.escola_id = public.get_user_escola_id()
  ))
);
CREATE POLICY "aulas_update" ON public.aulas FOR UPDATE USING (
  public.is_admin() OR (public.is_adm() AND EXISTS(
    SELECT 1 FROM public.turmas t WHERE t.id = aulas.turma_id AND t.escola_id = public.get_user_escola_id()
  ))
);
CREATE POLICY "aulas_delete" ON public.aulas FOR DELETE USING (
  public.is_admin() OR (public.is_adm() AND EXISTS(
    SELECT 1 FROM public.turmas t WHERE t.id = aulas.turma_id AND t.escola_id = public.get_user_escola_id()
  ))
);

-- ── anos_letivos ──────────────────────────────────────────────
DROP POLICY IF EXISTS "anos_letivos_select" ON public.anos_letivos;
DROP POLICY IF EXISTS "anos_letivos_insert" ON public.anos_letivos;
DROP POLICY IF EXISTS "anos_letivos_update" ON public.anos_letivos;
DROP POLICY IF EXISTS "anos_letivos_delete" ON public.anos_letivos;

CREATE POLICY "anos_letivos_select" ON public.anos_letivos FOR SELECT USING (
  public.is_admin() OR escola_id = public.get_user_escola_id()
);
CREATE POLICY "anos_letivos_insert" ON public.anos_letivos FOR INSERT WITH CHECK (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);
CREATE POLICY "anos_letivos_update" ON public.anos_letivos FOR UPDATE USING (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);
CREATE POLICY "anos_letivos_delete" ON public.anos_letivos FOR DELETE USING (
  public.is_admin() OR (public.is_adm() AND escola_id = public.get_user_escola_id())
);

-- ── escola ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "escola_select" ON public.escola;
DROP POLICY IF EXISTS "escola_insert" ON public.escola;
DROP POLICY IF EXISTS "escola_update" ON public.escola;

CREATE POLICY "escola_select" ON public.escola FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "escola_insert" ON public.escola FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "escola_update" ON public.escola FOR UPDATE USING (
  public.is_admin() OR id = public.get_user_escola_id()
);

-- ── alertas ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "alertas_select_adm" ON public.alertas;
DROP POLICY IF EXISTS "alertas_select" ON public.alertas;
DROP POLICY IF EXISTS "alertas_insert" ON public.alertas;
DROP POLICY IF EXISTS "alertas_update_adm" ON public.alertas;
DROP POLICY IF EXISTS "alertas_update" ON public.alertas;

CREATE POLICY "alertas_select" ON public.alertas FOR SELECT USING (
  public.is_admin() OR (
    public.is_adm() AND (
      turma_id IS NULL OR EXISTS(
        SELECT 1 FROM public.turmas t WHERE t.id = alertas.turma_id AND t.escola_id = public.get_user_escola_id()
      )
    )
  )
);
CREATE POLICY "alertas_insert" ON public.alertas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "alertas_update" ON public.alertas FOR UPDATE USING (
  public.is_admin() OR (public.is_adm() AND (
    turma_id IS NULL OR EXISTS(
      SELECT 1 FROM public.turmas t WHERE t.id = alertas.turma_id AND t.escola_id = public.get_user_escola_id()
    )
  ))
);

-- ============================================================
-- BLOCO 6: Corrigir trigger calcular_bimestre_aula
-- Antes usava o ano letivo ativo globalmente — com multi-escola,
-- cada escola tem seu próprio ano letivo ativo.
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_bimestre_aula()
RETURNS TRIGGER AS $$
DECLARE
  v_bimestre INTEGER;
  v_escola_id UUID;
BEGIN
  SELECT t.escola_id INTO v_escola_id
  FROM public.turmas t WHERE t.id = NEW.turma_id;

  SELECT b.numero INTO v_bimestre
  FROM public.bimestres b
  JOIN public.anos_letivos al ON al.id = b.ano_letivo_id
  WHERE al.ativo = true
    AND al.escola_id = v_escola_id
    AND NEW.data BETWEEN b.data_inicio AND b.data_fim
  LIMIT 1;

  NEW.bimestre := v_bimestre;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BLOCO 7: Índices para performance multi-escola
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_turmas_escola ON public.turmas(escola_id);
CREATE INDEX IF NOT EXISTS idx_disciplinas_escola ON public.disciplinas(escola_id);
CREATE INDEX IF NOT EXISTS idx_anos_letivos_escola ON public.anos_letivos(escola_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_escola ON public.usuarios(escola_id);
