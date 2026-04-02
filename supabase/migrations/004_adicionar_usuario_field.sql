-- ============================================================
-- MIGRAÇÃO 004: Adicionar campo usuario (username) na tabela usuarios
-- ============================================================

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS usuario TEXT UNIQUE;

-- Preencher campo usuario com base no email para usuários existentes
UPDATE public.usuarios
SET usuario = LOWER(SPLIT_PART(email, '@', 1))
WHERE usuario IS NULL AND email IS NOT NULL;

-- Criar índice para buscas por usuario
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON public.usuarios(usuario);
