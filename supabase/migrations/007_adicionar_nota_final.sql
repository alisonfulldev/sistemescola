-- ============================================================
-- MIGRAÇÃO: Adicionar coluna nota (nota final) na tabela notas
-- ============================================================

-- Adicionar coluna nota (nota final/sintética)
ALTER TABLE public.notas
  ADD COLUMN IF NOT EXISTS nota NUMERIC(4,1) CHECK (nota BETWEEN 0 AND 10);

-- Adicionar coluna turma_id para facilitar queries
ALTER TABLE public.notas
  ADD COLUMN IF NOT EXISTS turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE;

-- Preencher turma_id baseado nos alunos
UPDATE public.notas n
SET turma_id = a.turma_id
FROM public.alunos a
WHERE n.aluno_id = a.id AND n.turma_id IS NULL;

-- Criar índice para turma_id
CREATE INDEX IF NOT EXISTS idx_notas_turma ON public.notas(turma_id);

-- Atualizar a política RLS para permitir que professores insiram notas
DROP POLICY IF EXISTS "notas_insert" ON public.notas;
CREATE POLICY "notas_insert" ON public.notas
  FOR INSERT WITH CHECK (
    public.is_adm() OR
    auth.uid() IN (
      SELECT DISTINCT professor_id
      FROM public.aulas
      WHERE turma_id = (SELECT turma_id FROM public.alunos WHERE id = NEW.aluno_id)
        AND disciplina_id = NEW.disciplina_id
    )
  );

-- Atualizar a política RLS para permitir que professores atualizem suas notas
DROP POLICY IF EXISTS "notas_update" ON public.notas;
CREATE POLICY "notas_update" ON public.notas
  FOR UPDATE USING (
    public.is_adm() OR
    auth.uid() IN (
      SELECT DISTINCT professor_id
      FROM public.aulas
      WHERE turma_id = (SELECT turma_id FROM public.alunos WHERE id = aluno_id)
        AND disciplina_id = disciplina_id
    )
  );
