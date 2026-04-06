# Implementação de Zod - Plano de Ação

## Status: ✅ COMEÇADO

### ✅ Completadas (4 rotas)
- [x] `/api/professor/notas_bimestral` (POST) 
- [x] `/api/professor/marcar-presenca` (POST)
- [x] `/api/professor/confirmar-chamada` (POST)
- [x] `/api/avaliacoes/[id]/notas` (POST)

### 🔲 Pendentes - Críticas (10 rotas)

#### Admin - Gestão de Dados
- [ ] `/api/admin/alunos` (POST/PUT)
  - Schema: `CreateAlunoSchema` ✅ existe
  
- [ ] `/api/admin/turmas` (POST/PUT)
  - Schema: `CreateTurmaSchema` ✅ existe

- [ ] `/api/admin/disciplinas` (POST/PUT)
  - Schema: `CreateDisciplinaSchema` ✅ existe

- [ ] `/api/admin/escola` (POST/PUT)
  - Schema: Criar `CreateEscolaSchema`

- [ ] `/api/admin/professores` (POST/PUT)
  - Schema: `CreateUsuarioSchema` ✅ existe

#### Professor - Operações
- [ ] `/api/professor/notas` (POST)
  - Schema: `SaveNotasSchema` ✅ existe

- [ ] `/api/professor/iniciar-chamada` (POST)
  - Schema: Criar `IniciarChamadaSchema`

#### Avaliacoes
- [ ] `/api/avaliacoes` (POST)
  - Schema: `CreateAvaliacaoSchema` ✅ existe

#### Justificativas
- [ ] `/api/justificativas` (POST)
  - Schema: Criar `CreateJustificativaSchema`

- [ ] `/api/professor/justificativas/responder` (POST)
  - Schema: Criar `ResponderJustificativaSchema`

### 🔲 Pendentes - Secundárias (15+ rotas)
- `/api/admin/atualizar-usuario` 
- `/api/admin/excluir-usuario`
- `/api/adm/chamadas`
- `/api/adm/frequencia`
- `/api/adm/justificativas`
- `/api/adm/notas`
- E mais...

## Como Aplicar (Template)

```typescript
// 1. Adicionar import
import { SeuSchema } from '@/lib/schemas/sua-entidade'
import { validateData, errorResponse } from '@/lib/api-utils'

// 2. No POST/PUT, validar
const validation = validateData(SeuSchema, await req.json())
if (!validation.success) return errorResponse(validation.error.message, validation.error.fields, validation.status)
const { campo1, campo2 } = validation.data

// 3. Remover validações manuais
// ❌ if (!campo1) return erro(...)
// ❌ if (campo1.length < 3) return erro(...)
```

## Benefícios Ao Completar

- ✅ Erros consistentes em toda API
- ✅ Documentação automática via tipos TypeScript
- ✅ Validação robusta: UUIDs, emails, ranges, enums
- ✅ Fácil manutenção: mudar regra em 1 lugar (schema)
- ✅ Menos bugs: nenhum campo "obrigatório" esquecido

## Tempo Estimado

- Críticas (10 rotas): 30 min
- Secundárias (15+ rotas): 1h
- **Total: ~1.5h para todo sistema**

## Próxima Execução

```bash
# Todos os POST/PUT devem ter Zod
git grep "await req.json()" -- "*.ts" | grep -E "POST|PUT" | wc -l
# Deve retornar 0 (todos com Zod)
```
