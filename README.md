# 📋 Sistema de Chamada Escolar com QR Code

Sistema web completo de frequência escolar com 4 perfis de acesso, leitura de QR Code na portaria e notificações em tempo real para pais.

## ✨ Funcionalidades

### 👨‍🏫 Professor
- Login seguro com Supabase Auth
- Dashboard com aulas do dia (horário, turma, disciplina)
- Chamada com visualização de foto e horário de entrada do aluno
- Indicador de presença na portaria (entrada via QR Code)
- Barra de progresso da chamada
- Confirmação com resumo e exportação

### 👩‍💼 Secretaria (ADM)
- Painel dark theme com 4 KPIs em tempo real
- Chamadas em andamento com barra de progresso ao vivo
- Feed de alertas automáticos (falta excessiva, chamada atrasada)
- Frequência por turma com filtro mensal
- Busca de alunos com link WhatsApp para responsável

### ⚙️ Administrador
- CRUD completo: turmas, alunos, professores, disciplinas, aulas
- Upload de foto do aluno (Supabase Storage)
- Geração e download de QR Code por aluno
- Cadastro de novos usuários (todos os perfis)

### 📱 Portaria (QR Code)
- Interface dedicada sem login
- Câmera do celular com scanner HTML5
- Feedback visual instantâneo (verde = sucesso, amarelo = já registrado, vermelho = erro)
- Registro de horário de entrada automático

### 👨‍👩‍👦 Responsáveis (Pais)
- Login com conta própria
- Status do dia em tempo real (entrada na escola + presença em sala)
- Histórico mensal de frequência com calendário
- Alertas de falta com observações do professor
- Atualização instantânea via Supabase Realtime

## 🚀 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend + Backend | Next.js 14 (App Router) |
| Banco de Dados | Supabase PostgreSQL |
| Autenticação | Supabase Auth (JWT) |
| Tempo Real | Supabase Realtime |
| Fotos | Supabase Storage |
| QR Code Geração | `qrcode` npm |
| QR Code Leitura | `html5-qrcode` |
| Deploy | Vercel |

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── login/              # Página de login (todos os perfis)
│   ├── professor/          # Dashboard + chamada + resumo
│   ├── adm/                # Painel secretaria (dark theme)
│   │   ├── page.tsx        # Visão geral + KPIs + tempo real
│   │   ├── chamadas/       # Lista de chamadas por data
│   │   ├── frequencia/     # Relatório mensal por turma
│   │   ├── alunos/         # Busca de alunos
│   │   └── alertas/        # Central de alertas
│   ├── admin/              # Gestão do sistema
│   │   ├── turmas/         # CRUD turmas
│   │   ├── alunos/         # CRUD alunos + QR Code + foto
│   │   ├── professores/    # CRUD usuários
│   │   ├── disciplinas/    # CRUD disciplinas
│   │   └── aulas/          # Agendamento de aulas
│   ├── portaria/           # Leitor QR Code (sem login)
│   ├── responsavel/        # Portal dos pais
│   │   └── [alunoId]/      # Histórico individual
│   └── api/
│       ├── portaria/registrar-entrada/    # API pública para portaria
│       ├── admin/criar-usuario/           # Criar usuário Supabase Auth
│       └── alunos/[id]/qrcode/           # Gerar PNG do QR Code
├── lib/
│   ├── supabase/client.ts  # Browser client
│   └── supabase/server.ts  # Server client (SSR)
├── types/index.ts          # TypeScript types
├── middleware.ts            # Auth + proteção de rotas
└── app/globals.css         # Estilos globais + animações
supabase/
├── schema.sql              # Schema completo + RLS + funções
└── seed.sql                # Dados de exemplo
```

## ⚙️ Configuração

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute:
   ```
   supabase/schema.sql
   ```
3. Habilite Realtime para as tabelas:
   - Vá em **Database > Replication**
   - Habilite para: `chamadas`, `registros_chamada`, `alertas`, `entradas`

### 2. Configurar Storage

No painel do Supabase:
- Vá em **Storage**
- O bucket `alunos-fotos` é criado pelo schema.sql automaticamente
- Verifique se está como público

### 3. Criar usuário administrador inicial

No **Authentication > Users**:
1. Clique em "Add user"
2. Preencha: `admin@escola.com` / `Admin@123456`
3. Em **SQL Editor**, execute:
   ```sql
   UPDATE public.usuarios
   SET perfil = 'admin'
   WHERE email = 'admin@escola.com';
   ```

### 4. Variáveis de Ambiente

Copie `.env.local.example` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3020
```

As chaves estão em: **Supabase > Settings > API**

### 5. Instalar e rodar localmente

```bash
npm install
npm run dev
# Acesse: http://localhost:3020
```

## 🌐 Deploy na Vercel

### Método 1: Via GitHub (Recomendado)

1. Suba o projeto para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Clique em **"Import Project"** → selecione seu repositório
4. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Clique em **Deploy**

### Método 2: Via CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Na raiz do projeto
vercel

# Produção
vercel --prod
```

### Configurar domínio na Vercel

Após o deploy, adicione o domínio em:
**Vercel > Project > Settings > Domains**

## 📱 Configurar Portaria

A tela da portaria está disponível em `/portaria` e **não requer login**.

Para usar na portaria:
1. Abra `seudominio.com/portaria` no celular dedicado
2. Adicione ao homescreen (A2HS) para usar como app
3. Toque em **"Iniciar Leitura"** e aponte para o QR Code do cartão do aluno
4. O sistema registra a entrada automaticamente

> **Dica:** Use o modo tela cheia do Chrome para melhor experiência

## 🎨 QR Code dos Alunos

Cada aluno recebe um QR Code único gerado automaticamente.

Para baixar:
1. Acesse **Admin > Alunos**
2. Clique em **"QR Code"** ao lado do aluno
3. Clique em **"⬇ Download"** para salvar o PNG

O QR Code contém: `escola_aluno_{id_do_aluno}`

Use o PNG para imprimir no cartão físico do aluno.

## 👥 Perfis de Acesso

| Perfil | Rota | Descrição |
|--------|------|-----------|
| `professor` | `/professor` | Aulas do dia + fazer chamada |
| `secretaria` | `/adm` | Painel com todos os dados |
| `admin` | `/admin` | Gestão completa + acesso ao ADM |
| `responsavel` | `/responsavel` | Portal dos pais |
| Portaria | `/portaria` | Leitor QR (sem login) |

## 🔔 Alertas Automáticos

O sistema gera alertas automaticamente via triggers PostgreSQL:

| Condição | Alerta |
|----------|--------|
| Frequência < 75% no mês | `falta_excessiva` |
| 3+ faltas consecutivas | `faltas_consecutivas` |
| Chamada não iniciada (45min após aula) | `chamada_nao_iniciada` |

Os alertas aparecem no painel ADM em tempo real.

## 📡 Tempo Real (Supabase Realtime)

| Tabela | Quem recebe |
|--------|-------------|
| `chamadas` | ADM dashboard |
| `registros_chamada` | ADM + Responsáveis |
| `alertas` | ADM sidebar badge |
| `entradas` | Professor (tela de chamada) |

## 🔒 Segurança (RLS)

Cada perfil só acessa seus dados:

- **Professor**: apenas suas aulas e chamadas
- **Secretaria**: visualiza tudo, não edita dados cadastrais
- **Admin**: acesso total
- **Responsável**: apenas dados dos seus filhos vinculados
- **Portaria**: API pública usa `service_role_key` no servidor

## 🗃️ Banco de Dados

Tabelas principais:

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Todos os usuários (espelha `auth.users`) |
| `turmas` | Turmas escolares |
| `alunos` | Alunos com QR Code e foto |
| `responsaveis_alunos` | Vínculo responsável ↔ aluno |
| `disciplinas` | Matérias com professor responsável |
| `aulas` | Grade de aulas agendadas |
| `entradas` | Registros de chegada via QR Code |
| `chamadas` | Chamadas iniciadas pelos professores |
| `registros_chamada` | Presença individual por chamada |
| `alertas` | Alertas automáticos para ADM |

## 🆘 Solução de Problemas

**Câmera não funciona na portaria:**
- Use HTTPS (Vercel fornece automaticamente)
- Verifique permissões de câmera no browser
- Chrome/Safari têm melhor suporte

**Realtime não atualiza:**
- Verifique se as tabelas estão na publication `supabase_realtime`
- Execute `supabase/schema.sql` novamente a partir da seção REALTIME

**QR Code não reconhecido:**
- Confirme que o campo `qr_code` do aluno segue o padrão `escola_aluno_{uuid}`
- Verifique se o aluno está com `ativo = true`

**Erro de permissão (RLS):**
- Confirme que o usuário tem o perfil correto na tabela `usuarios`
- Verifique se o trigger `on_auth_user_created` está ativo

---

*Desenvolvido com Next.js 14 + Supabase — Deploy na Vercel*
