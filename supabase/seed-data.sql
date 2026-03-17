-- Seed de dados de exemplo (roda após usuários criados no GoTrue)
SET session_replication_role = replica;

-- Turmas
INSERT INTO public.turmas (id, nome, turno, ano_letivo) VALUES
  ('10000000-0000-0000-0000-000000000001', '6º Ano A', 'matutino', '2026'),
  ('10000000-0000-0000-0000-000000000002', '7º Ano B', 'matutino', '2026'),
  ('10000000-0000-0000-0000-000000000003', '8º Ano A', 'vespertino', '2026'),
  ('10000000-0000-0000-0000-000000000004', '9º Ano C', 'vespertino', '2026')
ON CONFLICT (id) DO NOTHING;

-- Alunos
INSERT INTO public.alunos (id, nome_completo, matricula, turma_id, nome_responsavel, contato_responsavel, qr_code) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Agatha Ferreira Lima',  '2026001', '10000000-0000-0000-0000-000000000001', 'Roberto Lima',     '5511987654321', 'escola_aluno_2026001'),
  ('20000000-0000-0000-0000-000000000002', 'Bruno Alves Costa',     '2026002', '10000000-0000-0000-0000-000000000001', 'Claudia Costa',    '5511976543210', 'escola_aluno_2026002'),
  ('20000000-0000-0000-0000-000000000003', 'Carla Mendes Souza',    '2026003', '10000000-0000-0000-0000-000000000001', 'Paulo Souza',      '5511965432109', 'escola_aluno_2026003'),
  ('20000000-0000-0000-0000-000000000004', 'Diego Rocha Pereira',   '2026004', '10000000-0000-0000-0000-000000000001', 'Fernanda Pereira', '5511954321098', 'escola_aluno_2026004'),
  ('20000000-0000-0000-0000-000000000005', 'Elena Santos Ribeiro',  '2026005', '10000000-0000-0000-0000-000000000001', 'Marcio Ribeiro',   '5511943210987', 'escola_aluno_2026005'),
  ('20000000-0000-0000-0000-000000000006', 'Felipe Gomes Martins',  '2026006', '10000000-0000-0000-0000-000000000001', 'Juliana Martins',  '5511932109876', 'escola_aluno_2026006'),
  ('20000000-0000-0000-0000-000000000007', 'Gabriela Torres Lopes', '2026007', '10000000-0000-0000-0000-000000000001', 'Rodrigo Lopes',    '5511921098765', 'escola_aluno_2026007'),
  ('20000000-0000-0000-0000-000000000008', 'Henrique Castro Nunes', '2026008', '10000000-0000-0000-0000-000000000001', 'Sandra Nunes',     '5511910987654', 'escola_aluno_2026008'),
  ('20000000-0000-0000-0000-000000000009', 'Isabela Dias Moreira',  '2026009', '10000000-0000-0000-0000-000000000002', 'Carlos Moreira',   '5511909876543', 'escola_aluno_2026009'),
  ('20000000-0000-0000-0000-000000000010', 'Joao Victor Pinto',     '2026010', '10000000-0000-0000-0000-000000000002', 'Amanda Pinto',     '5511898765432', 'escola_aluno_2026010')
ON CONFLICT (matricula) DO NOTHING;

-- Disciplinas (usa subquery para pegar o UUID real pelo email do professor)
INSERT INTO public.disciplinas (id, nome, professor_id)
SELECT '30000000-0000-0000-0000-000000000001', 'Matematica', id FROM public.usuarios WHERE email = 'prof.carlos@escola.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.disciplinas (id, nome, professor_id)
SELECT '30000000-0000-0000-0000-000000000002', 'Ciencias', id FROM public.usuarios WHERE email = 'prof.carlos@escola.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.disciplinas (id, nome, professor_id)
SELECT '30000000-0000-0000-0000-000000000003', 'Portugues', id FROM public.usuarios WHERE email = 'prof.ana@escola.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.disciplinas (id, nome, professor_id)
SELECT '30000000-0000-0000-0000-000000000004', 'Historia', id FROM public.usuarios WHERE email = 'prof.ana@escola.com'
ON CONFLICT (id) DO NOTHING;

-- Vínculo responsável → aluno
INSERT INTO public.responsaveis_alunos (responsavel_id, aluno_id)
SELECT u.id, '20000000-0000-0000-0000-000000000001'
FROM public.usuarios u WHERE u.email = 'resp.roberto@escola.com'
ON CONFLICT DO NOTHING;

-- Aulas para hoje
INSERT INTO public.aulas (turma_id, disciplina_id, professor_id, data, horario_inicio, horario_fim)
SELECT '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', u.id, CURRENT_DATE, '07:30', '08:20'
FROM public.usuarios u WHERE u.email = 'prof.carlos@escola.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.aulas (turma_id, disciplina_id, professor_id, data, horario_inicio, horario_fim)
SELECT '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', u.id, CURRENT_DATE, '08:20', '09:10'
FROM public.usuarios u WHERE u.email = 'prof.carlos@escola.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.aulas (turma_id, disciplina_id, professor_id, data, horario_inicio, horario_fim)
SELECT '10000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', u.id, CURRENT_DATE, '13:00', '13:50'
FROM public.usuarios u WHERE u.email = 'prof.ana@escola.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.aulas (turma_id, disciplina_id, professor_id, data, horario_inicio, horario_fim)
SELECT '10000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', u.id, CURRENT_DATE, '13:50', '14:40'
FROM public.usuarios u WHERE u.email = 'prof.ana@escola.com'
ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
