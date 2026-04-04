-- ============================================================
-- MIGRAÇÃO 005: Limpar todos os dados (sem apagar tabelas)
-- ============================================================
-- CUIDADO: Deleta TODOS os registros do banco de dados
-- Mantém a estrutura das tabelas intacta

-- Desabilitar triggers temporariamente
ALTER TABLE public.registros_chamada DISABLE TRIGGER ALL;
ALTER TABLE public.chamadas DISABLE TRIGGER ALL;
ALTER TABLE public.aulas DISABLE TRIGGER ALL;
ALTER TABLE public.entradas DISABLE TRIGGER ALL;
ALTER TABLE public.alunos DISABLE TRIGGER ALL;
ALTER TABLE public.disciplinas DISABLE TRIGGER ALL;
ALTER TABLE public.responsaveis_alunos DISABLE TRIGGER ALL;
ALTER TABLE public.alertas DISABLE TRIGGER ALL;
ALTER TABLE public.justificativas DISABLE TRIGGER ALL;
ALTER TABLE public.avaliacoes DISABLE TRIGGER ALL;
ALTER TABLE public.notas DISABLE TRIGGER ALL;
ALTER TABLE public.usuarios DISABLE TRIGGER ALL;

-- Deletar na ordem correta (respeitando foreign keys)
DELETE FROM public.registros_chamada;
DELETE FROM public.chamadas;
DELETE FROM public.aulas;
DELETE FROM public.entradas;
DELETE FROM public.alertas;
DELETE FROM public.avaliacoes;
DELETE FROM public.justificativas;
DELETE FROM public.notas;
DELETE FROM public.disciplinas;
DELETE FROM public.responsaveis_alunos;
DELETE FROM public.alunos;
DELETE FROM public.bimestres;
DELETE FROM public.anos_letivos;
DELETE FROM public.turmas;
DELETE FROM public.usuarios;
DELETE FROM public.calendario_escolar;
DELETE FROM public.escola;

-- Reabilitar triggers
ALTER TABLE public.registros_chamada ENABLE TRIGGER ALL;
ALTER TABLE public.chamadas ENABLE TRIGGER ALL;
ALTER TABLE public.aulas ENABLE TRIGGER ALL;
ALTER TABLE public.entradas ENABLE TRIGGER ALL;
ALTER TABLE public.alunos ENABLE TRIGGER ALL;
ALTER TABLE public.disciplinas ENABLE TRIGGER ALL;
ALTER TABLE public.responsaveis_alunos ENABLE TRIGGER ALL;
ALTER TABLE public.alertas ENABLE TRIGGER ALL;
ALTER TABLE public.justificativas ENABLE TRIGGER ALL;
ALTER TABLE public.avaliacoes ENABLE TRIGGER ALL;
ALTER TABLE public.notas ENABLE TRIGGER ALL;
ALTER TABLE public.usuarios ENABLE TRIGGER ALL;

-- Resetar sequences de ID (se houver)
ALTER SEQUENCE IF EXISTS public.registros_chamada_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.chamadas_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.aulas_id_seq RESTART WITH 1;

-- Listar status
SELECT 'Limpeza concluída! Todas as tabelas estão vazias.' as status;
