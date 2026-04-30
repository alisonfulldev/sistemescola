-- ============================================================
-- SISTEMA DE CHAMADA ESCOLAR COM QR CODE
-- Supabase PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Usuários (espelha auth.users)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  perfil TEXT NOT NULL CHECK (perfil IN ('professor', 'secretaria', 'admin', 'responsavel')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('matutino', 'vespertino', 'noturno')),
  ano_letivo TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alunos
CREATE TABLE IF NOT EXISTS public.alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome_completo TEXT NOT NULL,
  matricula TEXT NOT NULL UNIQUE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  foto_url TEXT,
  qr_code TEXT NOT NULL UNIQUE DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  nome_responsavel TEXT,
  contato_responsavel TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gerar QR Code automaticamente ao inserir aluno
CREATE OR REPLACE FUNCTION public.gerar_qr_code_aluno()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code = '' OR NEW.qr_code IS NULL THEN
    NEW.qr_code := 'escola_aluno_' || NEW.id::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_gerar_qr_code
  BEFORE INSERT ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_qr_code_aluno();

-- Vínculos responsável ↔ aluno
CREATE TABLE IF NOT EXISTS public.responsaveis_alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  responsavel_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(responsavel_id, aluno_id)
);

-- Disciplinas
CREATE TABLE IF NOT EXISTS public.disciplinas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  professor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aulas
CREATE TABLE IF NOT EXISTS public.aulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES public.disciplinas(id) ON DELETE RESTRICT,
  professor_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registros de entrada via QR Code (portaria)
CREATE TABLE IF NOT EXISTS public.entradas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIME NOT NULL DEFAULT (CURRENT_TIME AT TIME ZONE 'America/Sao_Paulo')::TIME,
  dispositivo TEXT DEFAULT 'portaria',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aluno_id, data)
);

-- Chamadas
CREATE TABLE IF NOT EXISTS public.chamadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id) ON DELETE CASCADE,
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluida_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(aula_id)
);

-- Registros de chamada (presença individual)
CREATE TABLE IF NOT EXISTS public.registros_chamada (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chamada_id UUID NOT NULL REFERENCES public.chamadas(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('presente', 'falta', 'justificada')),
  observacao TEXT,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(chamada_id, aluno_id)
);

-- Alertas
CREATE TABLE IF NOT EXISTS public.alertas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'falta_excessiva', 'chamada_nao_iniciada', 'justificativa',
    'chamada_atrasada', 'faltas_consecutivas'
  )),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_aulas_professor_data ON public.aulas(professor_id, data);
CREATE INDEX IF NOT EXISTS idx_aulas_turma_data ON public.aulas(turma_id, data);
CREATE INDEX IF NOT EXISTS idx_alunos_turma ON public.alunos(turma_id);
CREATE INDEX IF NOT EXISTS idx_alunos_qr ON public.alunos(qr_code);
CREATE INDEX IF NOT EXISTS idx_entradas_aluno_data ON public.entradas(aluno_id, data);
CREATE INDEX IF NOT EXISTS idx_entradas_data ON public.entradas(data);
CREATE INDEX IF NOT EXISTS idx_chamadas_aula ON public.chamadas(aula_id);
CREATE INDEX IF NOT EXISTS idx_registros_chamada ON public.registros_chamada(chamada_id);
CREATE INDEX IF NOT EXISTS idx_registros_aluno ON public.registros_chamada(aluno_id);
CREATE INDEX IF NOT EXISTS idx_alertas_nao_lidos ON public.alertas(lido, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_responsaveis_alunos ON public.responsaveis_alunos(responsavel_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_chamada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- Funções helper
CREATE OR REPLACE FUNCTION public.get_user_perfil()
RETURNS TEXT AS $$
  SELECT perfil FROM public.usuarios WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil = 'admin')
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_adm()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil IN ('secretaria', 'admin'))
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND perfil IN ('professor', 'secretaria', 'admin'))
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- POLÍTICAS: usuarios
CREATE POLICY "usuarios_select" ON public.usuarios FOR SELECT USING (
  id = auth.uid() OR public.is_adm()
);
CREATE POLICY "usuarios_insert_admin" ON public.usuarios FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "usuarios_update" ON public.usuarios FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- POLÍTICAS: turmas
CREATE POLICY "turmas_select_all" ON public.turmas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "turmas_write_admin" ON public.turmas FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "turmas_update_admin" ON public.turmas FOR UPDATE USING (public.is_admin());

-- POLÍTICAS: alunos
CREATE POLICY "alunos_select_staff" ON public.alunos FOR SELECT USING (
  public.is_staff() OR
  EXISTS(SELECT 1 FROM public.responsaveis_alunos WHERE responsavel_id = auth.uid() AND aluno_id = alunos.id)
);
CREATE POLICY "alunos_write_adm" ON public.alunos FOR INSERT WITH CHECK (public.is_adm());
CREATE POLICY "alunos_update_adm" ON public.alunos FOR UPDATE USING (public.is_adm());

-- POLÍTICAS: responsaveis_alunos
CREATE POLICY "resp_alunos_select" ON public.responsaveis_alunos FOR SELECT USING (
  responsavel_id = auth.uid() OR public.is_adm()
);
CREATE POLICY "resp_alunos_write_admin" ON public.responsaveis_alunos FOR INSERT WITH CHECK (public.is_admin());

-- POLÍTICAS: disciplinas
CREATE POLICY "disciplinas_select_all" ON public.disciplinas FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "disciplinas_write_admin" ON public.disciplinas FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "disciplinas_update_admin" ON public.disciplinas FOR UPDATE USING (public.is_admin());

-- POLÍTICAS: aulas
CREATE POLICY "aulas_select" ON public.aulas FOR SELECT USING (
  professor_id = auth.uid() OR public.is_adm()
);
CREATE POLICY "aulas_write_admin" ON public.aulas FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "aulas_update_admin" ON public.aulas FOR UPDATE USING (public.is_admin());
CREATE POLICY "aulas_delete_admin" ON public.aulas FOR DELETE USING (public.is_admin());

-- POLÍTICAS: entradas (portaria pode inserir sem auth via service_role)
CREATE POLICY "entradas_select" ON public.entradas FOR SELECT USING (
  public.is_staff() OR
  EXISTS(SELECT 1 FROM public.responsaveis_alunos WHERE responsavel_id = auth.uid() AND aluno_id = entradas.aluno_id)
);
CREATE POLICY "entradas_insert_staff" ON public.entradas FOR INSERT WITH CHECK (
  public.is_staff() OR auth.uid() IS NULL
);

-- POLÍTICAS: chamadas
CREATE POLICY "chamadas_select" ON public.chamadas FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.aulas WHERE id = chamadas.aula_id AND (professor_id = auth.uid() OR public.is_adm()))
  OR EXISTS(
    SELECT 1 FROM public.registros_chamada rc
    JOIN public.responsaveis_alunos ra ON ra.aluno_id = rc.aluno_id
    WHERE rc.chamada_id = chamadas.id AND ra.responsavel_id = auth.uid()
  )
);
CREATE POLICY "chamadas_insert_professor" ON public.chamadas FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM public.aulas WHERE id = aula_id AND professor_id = auth.uid())
);
CREATE POLICY "chamadas_update" ON public.chamadas FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.aulas WHERE id = chamadas.aula_id AND (professor_id = auth.uid() OR public.is_adm()))
);

-- POLÍTICAS: registros_chamada
CREATE POLICY "registros_select" ON public.registros_chamada FOR SELECT USING (
  EXISTS(
    SELECT 1 FROM public.chamadas c JOIN public.aulas a ON a.id = c.aula_id
    WHERE c.id = registros_chamada.chamada_id AND (a.professor_id = auth.uid() OR public.is_adm())
  )
  OR EXISTS(
    SELECT 1 FROM public.responsaveis_alunos ra
    WHERE ra.aluno_id = registros_chamada.aluno_id AND ra.responsavel_id = auth.uid()
  )
);
CREATE POLICY "registros_write_professor" ON public.registros_chamada FOR INSERT WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.chamadas c JOIN public.aulas a ON a.id = c.aula_id
    WHERE c.id = chamada_id AND a.professor_id = auth.uid()
  )
);
CREATE POLICY "registros_update_professor" ON public.registros_chamada FOR UPDATE USING (
  EXISTS(
    SELECT 1 FROM public.chamadas c JOIN public.aulas a ON a.id = c.aula_id
    WHERE c.id = registros_chamada.chamada_id AND (a.professor_id = auth.uid() OR public.is_adm())
  )
);

-- POLÍTICAS: alertas
CREATE POLICY "alertas_select_adm" ON public.alertas FOR SELECT USING (public.is_adm());
CREATE POLICY "alertas_insert" ON public.alertas FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "alertas_update_adm" ON public.alertas FOR UPDATE USING (public.is_adm());

-- ============================================================
-- TRIGGER: sincronizar novo usuário
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, perfil)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'professor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNÇÃO: verificar frequência e gerar alertas
-- ============================================================
CREATE OR REPLACE FUNCTION public.verificar_frequencia_aluno(p_aluno_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_aulas INTEGER;
  v_total_faltas INTEGER;
  v_percentual NUMERIC;
  v_aluno_nome TEXT;
  v_turma_id UUID;
  v_faltas_consecutivas INTEGER;
BEGIN
  SELECT nome_completo, turma_id INTO v_aluno_nome, v_turma_id
  FROM public.alunos WHERE id = p_aluno_id;

  -- Frequência mensal
  SELECT
    COUNT(DISTINCT a.id),
    COUNT(CASE WHEN rc.status = 'falta' THEN 1 END)
  INTO v_total_aulas, v_total_faltas
  FROM public.aulas a
  JOIN public.chamadas c ON c.aula_id = a.id AND c.status = 'concluida'
  JOIN public.registros_chamada rc ON rc.chamada_id = c.id AND rc.aluno_id = p_aluno_id
  WHERE a.turma_id = v_turma_id
    AND EXTRACT(MONTH FROM a.data) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM a.data) = EXTRACT(YEAR FROM CURRENT_DATE);

  IF v_total_aulas > 0 THEN
    v_percentual := ((v_total_aulas - v_total_faltas)::NUMERIC / v_total_aulas) * 100;
    IF v_percentual < 75 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alertas
        WHERE aluno_id = p_aluno_id AND tipo = 'falta_excessiva' AND lido = false
          AND EXTRACT(MONTH FROM criado_em) = EXTRACT(MONTH FROM CURRENT_DATE)
      ) THEN
        INSERT INTO public.alertas (tipo, aluno_id, turma_id, descricao)
        VALUES ('falta_excessiva', p_aluno_id, v_turma_id,
          format('Aluno %s com frequência de %.1f%% no mês (mínimo: 75%%)', v_aluno_nome, v_percentual));
      END IF;
    END IF;
  END IF;

  -- Faltas consecutivas (últimas 5 chamadas concluídas)
  SELECT COUNT(*) INTO v_faltas_consecutivas
  FROM (
    SELECT rc.status
    FROM public.registros_chamada rc
    JOIN public.chamadas c ON c.id = rc.chamada_id
    JOIN public.aulas a ON a.id = c.aula_id
    WHERE rc.aluno_id = p_aluno_id AND c.status = 'concluida'
    ORDER BY a.data DESC, a.horario_inicio DESC
    LIMIT 3
  ) ultimas
  WHERE status = 'falta';

  IF v_faltas_consecutivas >= 3 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.alertas
      WHERE aluno_id = p_aluno_id AND tipo = 'faltas_consecutivas' AND lido = false
        AND criado_em >= NOW() - INTERVAL '7 days'
    ) THEN
      INSERT INTO public.alertas (tipo, aluno_id, turma_id, descricao)
      VALUES ('faltas_consecutivas', p_aluno_id, v_turma_id,
        format('Aluno %s com 3 ou mais faltas consecutivas', v_aluno_nome));
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pós-registro de chamada
CREATE OR REPLACE FUNCTION public.trigger_verificar_frequencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('falta', 'justificada') THEN
    PERFORM public.verificar_frequencia_aluno(NEW.aluno_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_registro_chamada ON public.registros_chamada;
CREATE TRIGGER after_registro_chamada
  AFTER INSERT OR UPDATE ON public.registros_chamada
  FOR EACH ROW EXECUTE FUNCTION public.trigger_verificar_frequencia();

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chamadas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registros_chamada;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entradas;

-- ============================================================
-- STORAGE BUCKET para fotos de alunos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('alunos-fotos', 'alunos-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fotos_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'alunos-fotos');

CREATE POLICY "fotos_insert_adm" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'alunos-fotos' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "fotos_update_adm" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'alunos-fotos' AND auth.uid() IS NOT NULL
  );

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.v_aulas_hoje AS
SELECT
  a.id, a.data, a.horario_inicio, a.horario_fim,
  t.id AS turma_id, t.nome AS turma_nome, t.turno,
  d.id AS disciplina_id, d.nome AS disciplina_nome,
  u.id AS professor_id, u.nome AS professor_nome,
  c.id AS chamada_id, c.status AS chamada_status,
  c.iniciada_em, c.concluida_em,
  (SELECT COUNT(*) FROM public.alunos al WHERE al.turma_id = t.id AND al.ativo = true) AS total_alunos,
  (SELECT COUNT(*) FROM public.registros_chamada rc WHERE rc.chamada_id = c.id AND rc.status = 'presente') AS presentes,
  (SELECT COUNT(*) FROM public.registros_chamada rc WHERE rc.chamada_id = c.id AND rc.status = 'falta') AS faltas
FROM public.aulas a
JOIN public.turmas t ON t.id = a.turma_id
JOIN public.disciplinas d ON d.id = a.disciplina_id
JOIN public.usuarios u ON u.id = a.professor_id
LEFT JOIN public.chamadas c ON c.aula_id = a.id
WHERE a.data = CURRENT_DATE
ORDER BY a.horario_inicio;
