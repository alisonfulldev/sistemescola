-- ============================================================
-- SEED DATA - Dados de exemplo
-- IMPORTANTE: Execute APÓS criar os usuários no Supabase Auth Dashboard
-- ============================================================

-- Desabilitar RLS para seed
SET session_replication_role = replica;

-- Usuários de exemplo (IDs devem ser substituídos pelos gerados pelo Supabase Auth)
-- Crie primeiro no Authentication > Users no painel do Supabase:
-- admin@escola.com / Admin@123456
-- secretaria@escola.com / Secr@123456
-- prof.carlos@escola.com / Prof@123456
-- prof.ana@escola.com / ProfAna@123456
-- resp.joao@escola.com / Resp@123456 (responsável)

INSERT INTO public.usuarios (id, nome, email, perfil, ativo) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Administrador', 'admin@escola.com', 'admin', true),
  ('00000000-0000-0000-0000-000000000002', 'Maria Silva', 'secretaria@escola.com', 'secretaria', true),
  ('00000000-0000-0000-0000-000000000003', 'Prof. Carlos Santos', 'prof.carlos@escola.com', 'professor', true),
  ('00000000-0000-0000-0000-000000000004', 'Prof. Ana Oliveira', 'prof.ana@escola.com', 'professor', true),
  ('00000000-0000-0000-0000-000000000005', 'Roberto Lima', 'resp.roberto@escola.com', 'responsavel', true)
ON CONFLICT (id) DO NOTHING;

-- Turmas
INSERT INTO public.turmas (id, nome, turno, ano_letivo) VALUES
  ('10000000-0000-0000-0000-000000000001', '6º Ano A', 'matutino', '2026'),
  ('10000000-0000-0000-0000-000000000002', '7º Ano B', 'matutino', '2026'),
  ('10000000-0000-0000-0000-000000000003', '8º Ano A', 'vespertino', '2026'),
  ('10000000-0000-0000-0000-000000000004', '9º Ano C', 'vespertino', '2026')
ON CONFLICT (id) DO NOTHING;

-- Alunos (o qr_code será gerado automaticamente pelo trigger)
INSERT INTO public.alunos (id, nome_completo, matricula, turma_id, nome_responsavel, contato_responsavel, qr_code) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Ágatha Ferreira Lima', '2026001', '10000000-0000-0000-0000-000000000001', 'Roberto Lima', '5511987654321', 'escola_aluno_20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Bruno Alves Costa', '2026002', '10000000-0000-0000-0000-000000000001', 'Claudia Costa', '5511976543210', 'escola_aluno_20000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000003', 'Carla Mendes Souza', '2026003', '10000000-0000-0000-0000-000000000001', 'Paulo Souza', '5511965432109', 'escola_aluno_20000000-0000-0000-0000-000000000003'),
  ('20000000-0000-0000-0000-000000000004', 'Diego Rocha Pereira', '2026004', '10000000-0000-0000-0000-000000000001', 'Fernanda Pereira', '5511954321098', 'escola_aluno_20000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000005', 'Elena Santos Ribeiro', '2026005', '10000000-0000-0000-0000-000000000001', 'Marcio Ribeiro', '5511943210987', 'escola_aluno_20000000-0000-0000-0000-000000000005'),
  ('20000000-0000-0000-0000-000000000006', 'Felipe Gomes Martins', '2026006', '10000000-0000-0000-0000-000000000001', 'Juliana Martins', '5511932109876', 'escola_aluno_20000000-0000-0000-0000-000000000006'),
  ('20000000-0000-0000-0000-000000000007', 'Gabriela Torres Lopes', '2026007', '10000000-0000-0000-0000-000000000001', 'Rodrigo Lopes', '5511921098765', 'escola_aluno_20000000-0000-0000-0000-000000000007'),
  ('20000000-0000-0000-0000-000000000008', 'Henrique Castro Nunes', '2026008', '10000000-0000-0000-0000-000000000001', 'Sandra Nunes', '5511910987654', 'escola_aluno_20000000-0000-0000-0000-000000000008'),
  ('20000000-0000-0000-0000-000000000009', 'Isabela Dias Moreira', '2026009', '10000000-0000-0000-0000-000000000002', 'Carlos Moreira', '5511909876543', 'escola_aluno_20000000-0000-0000-0000-000000000009'),
  ('20000000-0000-0000-0000-000000000010', 'João Victor Pinto', '2026010', '10000000-0000-0000-0000-000000000002', 'Amanda Pinto', '5511898765432', 'escola_aluno_20000000-0000-0000-0000-000000000010')
ON CONFLICT (matricula) DO NOTHING;

-- Vínculo responsável → aluno
INSERT INTO public.responsaveis_alunos (responsavel_id, aluno_id) VALUES
  ('00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Disciplinas
INSERT INTO public.disciplinas (id, nome, professor_id) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Matemática', '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000002', 'Ciências', '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000003', 'Português', '00000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000004', 'História', '00000000-0000-0000-0000-000000000004')
ON CONFLICT (id) DO NOTHING;

-- Aulas para hoje e próximos dias
INSERT INTO public.aulas (turma_id, disciplina_id, professor_id, data, horario_inicio, horario_fim) VALUES
  ('10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', CURRENT_DATE, '07:30', '08:20'),
  ('10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', CURRENT_DATE, '08:20', '09:10'),
  ('10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', CURRENT_DATE, '13:00', '13:50'),
  ('10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', CURRENT_DATE, '13:50', '14:40')
ON CONFLICT DO NOTHING;

-- Resetar RLS
SET session_replication_role = DEFAULT;

-- ============================================================
-- NOTAS SOBRE O SEED
-- ============================================================
-- 1. Crie os usuários no Authentication > Users do Supabase ANTES de rodar este seed
-- 2. Substitua os UUIDs (00000000-...) pelos IDs reais gerados pelo Supabase Auth
-- 3. Para o módulo de portaria (sem autenticação), use a API route com service_role_key
-- 4. QR Codes são gerados automaticamente pelo trigger para novos alunos
-- 5. Para download do QR Code, use a rota /api/alunos/[id]/qrcode
