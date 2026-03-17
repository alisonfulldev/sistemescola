# Sistema de Chamada Escolar com QR Code

Sistema web de frequência escolar com 5 perfis de acesso, leitura de QR Code na portaria e notificações em tempo real.

## Rodar localmente com Docker

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e **rodando**

### 1. Clone o repositório

```bash
git clone https://github.com/alisonfulldev/sistemescola.git
cd sistemescola
```

### 2. Suba os containers

```bash
docker compose up --build
```

> Na primeira vez baixa as imagens do Supabase (~2 minutos). Aguarde aparecer `✓ Ready` no terminal.

### 3. Acesse o sistema

**http://localhost:3020**

### Usuários de teste

| Email | Senha | Perfil |
|---|---|---|
| `admin@escola.com` | `Escola@123` | Administrador |
| `secretaria@escola.com` | `Escola@123` | Secretaria |
| `prof.carlos@escola.com` | `Escola@123` | Professor |
| `prof.ana@escola.com` | `Escola@123` | Professor |
| `resp.roberto@escola.com` | `Escola@123` | Responsável |

### Parar o sistema

```bash
docker compose down
```

### Resetar o banco de dados

```bash
docker compose down -v
docker compose up --build
```

---

## Rotas do sistema

| URL | Perfil | Descrição |
|---|---|---|
| `/login` | Todos | Página de login |
| `/professor` | Professor | Aulas do dia + fazer chamada |
| `/adm` | Secretaria | Painel com KPIs em tempo real |
| `/admin` | Admin | CRUD completo do sistema |
| `/portaria` | — | Leitor QR Code (sem login) |
| `/responsavel` | Responsável | Portal dos pais |

---

## Stack

- **Next.js 14** — frontend e backend (App Router)
- **Supabase** — autenticação, banco PostgreSQL, storage e realtime
- **Tailwind CSS** — estilização
- **Docker Compose** — ambiente local completo

---

## Deploy na Vercel

1. Crie um projeto gratuito em [supabase.com](https://supabase.com)
2. Execute `supabase/schema.sql` e `supabase/seed.sql` no SQL Editor
3. Importe o repositório na [Vercel](https://vercel.com)
4. Configure as variáveis de ambiente:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```
