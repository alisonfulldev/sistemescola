# CRUD API GUIDE - Sistema Escola

Guia completo para usar os novos endpoints CRUD de gerenciamento.

## 📋 Índice
- [Turmas CRUD](#turmas-crud)
- [Alunos CRUD](#alunos-crud)
- [Disciplinas CRUD](#disciplinas-crud)
- [Anos Letivos CRUD](#anos-letivos-crud)
- [Autenticação](#autenticação)
- [Códigos de Erro](#códigos-de-erro)

---

## Turmas CRUD

### GET /api/admin/turmas
Lista todas as turmas ativas.

**Autenticação:** Requer `admin`, `diretor` ou `secretaria`

**Query Parameters:**
- Nenhum

**Exemplo de Resposta:**
```json
{
  "turmas": [
    {
      "id": "uuid-123",
      "nome": "1ºA",
      "serie": "1º ano",
      "turno": "matutino",
      "turma_letra": "A",
      "escola_id": "uuid-escola",
      "ativo": true
    }
  ]
}
```

### POST /api/admin/turmas
Cria uma nova turma.

**Autenticação:** Requer `admin`, `secretaria` ou `diretor`

**Body:**
```json
{
  "nome": "1ºA",
  "serie": "1º ano",
  "turno": "matutino",
  "turma_letra": "A",
  "escola_id": "uuid-escola",
  "ativo": true
}
```

**Status:** 201 Created

### GET /api/admin/turmas/{turmaId}
Busca uma turma específica.

**Status:** 200 OK ou 404 Not Found

### PUT /api/admin/turmas/{turmaId}
Atualiza uma turma (todos os campos são opcionais).

**Body:**
```json
{
  "nome": "1ºB",
  "turno": "vespertino"
}
```

### DELETE /api/admin/turmas/{turmaId}
Soft delete: marca a turma como inativa.

**Status:** 200 OK

---

## Alunos CRUD

### GET /api/admin/alunos
Lista alunos (com paginação de 500).

**Query Parameters:**
- `turma_id` (opcional): Filtra por turma
- `situacao` (opcional): 'ativo', 'inativo', 'transferido' (default: 'ativo')

**Exemplo:**
```
GET /api/admin/alunos?turma_id=uuid-123&situacao=ativo
```

### POST /api/admin/alunos
Cria um novo aluno.

**Body:**
```json
{
  "nome_completo": "João Silva",
  "data_nascimento": "2010-05-15",
  "matricula": "2024001",
  "turma_id": "uuid-turma",
  "contato_responsavel": "11999999999",
  "situacao": "ativo",
  "foto_url": "https://..."
}
```

### PUT /api/admin/alunos/{alunoId}
Atualiza um aluno.

**Body:** (todos os campos opcionais)
```json
{
  "nome_completo": "João Silva Santos",
  "turma_id": "uuid-outra-turma"
}
```

### DELETE /api/admin/alunos/{alunoId}
Soft delete: marca o aluno como inativo.

---

## Disciplinas CRUD

### GET /api/admin/disciplinas
Lista todas as disciplinas ativas.

### POST /api/admin/disciplinas
Cria uma disciplina.

**Body:**
```json
{
  "nome": "Matemática",
  "codigo": "MAT001",
  "descricao": "Disciplina de matemática",
  "carga_horaria": 80,
  "ativo": true
}
```

### PUT /api/admin/disciplinas/{disciplinaId}
Atualiza uma disciplina.

### DELETE /api/admin/disciplinas/{disciplinaId}
Soft delete: marca como inativa.

---

## Anos Letivos CRUD

### GET /api/admin/anos-letivos
Lista todos os anos letivos (ordenado decrescente por ano).

### POST /api/admin/anos-letivos
Cria um ano letivo.

**Body:**
```json
{
  "ano": 2026,
  "data_inicio": "2026-01-15",
  "data_fim": "2026-12-15",
  "ativo": true,
  "nome": "2026 - Ano Letivo Regular"
}
```

**Autenticação:** Requer `admin` ou `diretor`

### PUT /api/admin/anos-letivos/{anoId}
Atualiza um ano letivo.

### DELETE /api/admin/anos-letivos/{anoId}
Soft delete: marca como inativo.

---

## Autenticação

Todos os endpoints requerem um header `Authorization` com o token JWT:

```
Authorization: Bearer <token>
```

O token é obtido via `/api/auth/login` ou está no localStorage do cliente após login.

### Verificar Permissões

O sistema verifica automaticamente:
- ✅ Usuário está autenticado
- ✅ Usuário está ativo (`ativo = true`)
- ✅ Usuário tem o perfil correto
- ✅ Diretor/Secretaria podem gerenciar apenas sua escola

---

## Códigos de Erro

| Código | Significado |
|--------|-------------|
| `200` | OK - Sucesso |
| `201` | Created - Recurso criado |
| `400` | Bad Request - Dados inválidos |
| `401` | Unauthorized - Não autenticado |
| `403` | Forbidden - Sem permissão |
| `404` | Not Found - Recurso não encontrado |
| `409` | Conflict - Já existe (unique constraint) |
| `500` | Server Error - Erro interno |

---

## Exemplo Completo: Criar Turma + Alunos

```bash
# 1. Criar turma
curl -X POST http://localhost:3000/api/admin/turmas \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "1ºA",
    "serie": "1º ano",
    "turno": "matutino",
    "turma_letra": "A",
    "escola_id": "uuid-escola",
    "ativo": true
  }'

# Copiar o ID retornado (turmaId)

# 2. Criar aluno 1
curl -X POST http://localhost:3000/api/admin/alunos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_completo": "João Silva",
    "matricula": "2024001",
    "turma_id": "turmaId-do-passo-1",
    "situacao": "ativo"
  }'

# 3. Criar aluno 2
curl -X POST http://localhost:3000/api/admin/alunos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_completo": "Maria Santos",
    "matricula": "2024002",
    "turma_id": "turmaId-do-passo-1",
    "situacao": "ativo"
  }'
```

---

## Auditoria

Todos os endpoints CRUD loggam as operações:
- ✅ `turmas_listar` - GET /api/admin/turmas
- ✅ `turmas_criar` - POST /api/admin/turmas
- ✅ `turmas_atualizar` - PUT /api/admin/turmas/{id}
- ✅ `turmas_deletar` - DELETE /api/admin/turmas/{id}
- ✅ Similar para alunos, disciplinas, anos_letivos

Veja a tabela `auditoria` para rastrear todas as operações.

---

## Setup Inicial Completo

1. **Aplicar SQL** do arquivo `SETUP_SQL.sql` no Supabase
2. **Criar Escola:**
   ```sql
   INSERT INTO escolas (nome) VALUES ('Minha Escola');
   -- Copiar o UUID
   ```

3. **Criar Ano Letivo:**
   ```sql
   INSERT INTO anos_letivos (ano, data_inicio, data_fim, nome)
   VALUES (2026, '2026-01-15', '2026-12-15', '2026 - Ano Letivo');
   ```

4. **Criar Diretor via API:**
   - Use `/api/setup/admin-unico` ou `/api/setup/criar-diretor`

5. **Criar Disciplinas:**
   ```bash
   POST /api/admin/disciplinas
   { "nome": "Matemática", "codigo": "MAT001" }
   ```

6. **Criar Turmas:**
   ```bash
   POST /api/admin/turmas
   { "nome": "1ºA", "serie": "1º ano", "turno": "matutino", ... }
   ```

7. **Criar Alunos:**
   ```bash
   POST /api/admin/alunos
   { "nome_completo": "João", "matricula": "001", "turma_id": "..." }
   ```

8. **Vincular Responsáveis (via banco):**
   ```sql
   INSERT INTO responsaveis_alunos (responsavel_id, aluno_id)
   VALUES ('uuid-responsavel', 'uuid-aluno');
   ```

---

## Validações

### Turmas
- `nome`: obrigatório, max 100 chars
- `serie`: obrigatório, max 20 chars
- `turno`: obrigatório - `matutino`, `vespertino` ou `noturno`
- `turma_letra`: obrigatório, max 5 chars
- `escola_id`: obrigatório, must be valid UUID
- Constraint: UNIQUE(escola_id, nome, turma_letra)

### Alunos
- `nome_completo`: min 3, max 200 chars
- `matricula`: obrigatório, UNIQUE
- `turma_id`: obrigatório, valid UUID
- `data_nascimento`: opcional, formato DATE
- `situacao`: 'ativo', 'inativo', 'transferido'

### Disciplinas
- `nome`: obrigatório, max 100 chars
- `codigo`: obrigatório, UNIQUE, max 20 chars
- `carga_horaria`: opcional, must be positive integer

### Anos Letivos
- `ano`: obrigatório, UNIQUE, 2000-2100
- `data_inicio`: obrigatório, DATE format
- `data_fim`: obrigatório, DATE format
- `ativo`: boolean, default true

---

## Próximos Passos

Após setup inicial, você pode:
1. ✅ Criar professores (via `/api/admin/criar-usuario` com perfil "professor")
2. ✅ Vincular professores a turmas/disciplinas (tabela `aulas`)
3. ✅ Iniciar chamadas (POST `/api/professor/iniciar-chamada`)
4. ✅ Registrar presença (POST `/api/professor/marcar-presenca`)
5. ✅ Gerenciar notas e avaliações

---

**Versão:** 1.0  
**Última atualização:** 2026-04-08
