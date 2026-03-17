-- Cria usuários no auth.users com os mesmos UUIDs do seed
-- Senha: Escola@123 para todos

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@escola.com',
    crypt('Escola@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome":"Administrador","perfil":"admin"}',
    'authenticated', 'authenticated', NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'secretaria@escola.com',
    crypt('Escola@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome":"Maria Silva","perfil":"secretaria"}',
    'authenticated', 'authenticated', NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'prof.carlos@escola.com',
    crypt('Escola@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome":"Prof. Carlos Santos","perfil":"professor"}',
    'authenticated', 'authenticated', NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'prof.ana@escola.com',
    crypt('Escola@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome":"Prof. Ana Oliveira","perfil":"professor"}',
    'authenticated', 'authenticated', NOW(), NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'resp.roberto@escola.com',
    crypt('Escola@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"nome":"Roberto Lima","perfil":"responsavel"}',
    'authenticated', 'authenticated', NOW(), NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Identidades (necessário para login funcionar)
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@escola.com"}', 'email', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"secretaria@escola.com"}', 'email', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '{"sub":"00000000-0000-0000-0000-000000000003","email":"prof.carlos@escola.com"}', 'email', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '{"sub":"00000000-0000-0000-0000-000000000004","email":"prof.ana@escola.com"}', 'email', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '{"sub":"00000000-0000-0000-0000-000000000005","email":"resp.roberto@escola.com"}', 'email', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
