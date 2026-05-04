# Guia de Backup do Banco de Dados

Este guia explica como fazer backups do Supabase PostgreSQL do projeto.

## Configuração Inicial

### 1. Instalar PostgreSQL Tools (para usar `pg_dump`)

**Windows:**
- Baixe PostgreSQL em: https://www.postgresql.org/download/windows/
- Durante instalação, marque "Command Line Tools"
- Ou use Chocolatey: `choco install postgresql`

**macOS:**
```bash
brew install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql-client
```

### 2. Configurar Variável de Ambiente

Adicione no seu `.env.local` ou `.env`:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.ngawjmwvgrjqgzltmxed.supabase.co:5432/postgres
```

Substitua `[YOUR-PASSWORD]` pela senha real do Supabase.

> ⚠️ **Importante:** Nunca commite o `.env` com a senha real no Git. Use `.env.local` ou `.env.example`.

## Uso

### Backup Manual (Uma vez)

```bash
npm run backup
```

Isso vai:
1. Conectar ao banco de dados
2. Fazer dump completo com `pg_dump`
3. Salvar em `./backups/backup-YYYY-MM-DD-HH-MM-SS.sql.gz`
4. Compactar automaticamente
5. Manter apenas os 10 últimos backups

### Backup Automatizado (Diariamente)

Deixe rodando em um terminal:

```bash
npm run backup:schedule
```

Isso agenda um backup automático **diariamente às 2:00 AM**.

> **Alternativa:** Configure no seu sistema operacional ou servidor:

**Windows (Task Scheduler):**
1. Abra "Agendador de Tarefas"
2. Crie nova tarefa
3. Ação: `npm run backup`
4. Diretório: `C:\Users\Home\Desktop\sistema escola`
5. Horário desejado

**Linux/macOS (crontab):**
```bash
# Editar crontab
crontab -e

# Adicione (backup diariamente às 2:00 AM)
0 2 * * * cd /caminho/do/projeto && npm run backup
```

## Arquivos de Backup

### Localização
```
projeto/
└── backups/
    ├── backup-2026-04-14-14-30-45.sql.gz
    ├── backup-2026-04-13-02-00-00.sql.gz
    └── ...
```

### Tamanho Esperado
- **Compactado:** ~5-50 MB (depende do volume de dados)
- **Descompactado:** ~50-500 MB

## Restaurar um Backup

### 1. Descompactar o arquivo
```bash
gunzip backup-2026-04-14-14-30-45.sql.gz
```

Resultado: `backup-2026-04-14-14-30-45.sql`

### 2. Restaurar no Supabase

**Opção A - Via psql:**
```bash
psql "postgresql://postgres:[PASSWORD]@db.ngawjmwvgrjqgzltmxed.supabase.co:5432/postgres" < backup-2026-04-14-14-30-45.sql
```

**Opção B - Via Supabase Dashboard:**
1. Vá para: Project Settings → SQL Editor
2. Crie nova query
3. Cole o conteúdo do arquivo SQL
4. Execute

> ⚠️ **Cuidado:** Restaurar um backup vai **SOBRESCREVER** todos os dados atuais!

## Estrutura do Backup

O arquivo `.sql` contém:
- ✅ Todas as tabelas
- ✅ Todos os esquemas
- ✅ Índices
- ✅ Foreign keys
- ✅ Triggers
- ✅ Funções
- ✅ Todos os dados

**NÃO inclui:**
- ❌ Configurações de autenticação do Supabase
- ❌ Secrets/API Keys
- ❌ RLS Policies (precisa configurar manualmente)

## Dicas Importantes

### 1. Testar Restaurações Periodicamente
```bash
# Num banco de teste
psql "postgresql://postgres:test@localhost:5432/test_db" < backup.sql
```

### 2. Armazenar em Local Seguro
```bash
# Copiar para Google Drive, Dropbox, S3, etc
cp backups/*.sql.gz ~/Dropbox/database-backups/
```

### 3. Monitorar Espaço em Disco
```bash
# Ver tamanho dos backups
du -sh backups/
```

### 4. Alertas em Caso de Falha
Adicione no seu script de agendamento:
```bash
# Se backup falhar, envie email/notificação
npm run backup || notify-send "❌ Backup falhou!"
```

## Troubleshooting

### Erro: "pg_dump: command not found"
- **Solução:** Instale PostgreSQL Tools (veja seção "Configuração Inicial")

### Erro: "FATAL: password authentication failed"
- **Solução:** Verifique a senha no DATABASE_URL
- Certifique-se que a senha não tem caracteres especiais ou escape corretamente

### Erro: "Connection refused"
- **Solução:** Verifique se o host está correto
- Verifique se Supabase está online
- Teste: `ping db.ngawjmwvgrjqgzltmxed.supabase.co`

### Backup muito lento
- **Solução:** É normal para bancos grandes
- Primeiros backup podem levar 5-30 minutos
- Próximos backups geralmente são mais rápidos (dados similares)

## Referências

- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Supabase Database Backup](https://supabase.com/docs/guides/platform/backups)
- [node-cron](https://github.com/kelektiv/node-cron)
