# Validação com Zod - Guia de Padrão

## Como usar Zod em uma rota

### 1. Criar o Schema

Arquivo: `src/lib/schemas/sua-entidade.ts`

```typescript
import { z } from 'zod'

export const SuaEntidadeSchema = z.object({
  campo_obrigatorio: z.string().min(1, 'Campo obrigatório'),
  email: z.string().email('Email inválido'),
  numero: z.number().min(0).max(10),
  uuid: z.string().uuid('Deve ser UUID válido'),
  enum: z.enum(['opcao1', 'opcao2']),
  opcional: z.string().optional(),
  nulo: z.string().nullable()
})

export type SuaEntidade = z.infer<typeof SuaEntidadeSchema>
```

### 2. Usar na Rota

Arquivo: `src/app/api/sua-rota/route.ts`

```typescript
import { validateData, errorResponse, successResponse } from '@/lib/api-utils'
import { SuaEntidadeSchema, type SuaEntidade } from '@/lib/schemas/sua-entidade'

export async function POST(req: NextRequest) {
  // Validar dados
  const validation = validateData<SuaEntidade>(SuaEntidadeSchema, await req.json())
  
  if (!validation.success) {
    return errorResponse(validation.error.message, validation.error.fields, validation.status)
  }

  const { campo_obrigatorio, email, numero } = validation.data

  // ... resto do código

  return successResponse({ ok: true })
}
```

## Tipos de Validação

```typescript
z.string()                              // String
z.string().min(3)                       // String com mín 3 caracteres
z.string().email()                      // Email válido
z.string().uuid()                       // UUID válido
z.string().url()                        // URL válida

z.number()                              // Número
z.number().int()                        // Inteiro
z.number().min(0).max(10)               // Entre 0 e 10

z.boolean()                             // Boolean
z.enum(['a', 'b', 'c'])                 // Uma das opções

z.string().optional()                   // Opcional (undefined permitido)
z.string().nullable()                   // Nulo (null permitido)
z.string().optional().nullable()        // Ambos

z.array(z.object({...}))                // Array de objetos
```

## Rotas com Zod aplicado

- ✅ `/api/professor/notas_bimestral` — POST
- 🔲 `/api/professor/marcar-presenca` — POST
- 🔲 `/api/avaliacoes` — POST
- 🔲 `/api/admin/alunos` — POST/PUT
- 🔲 `/api/admin/turmas` — POST/PUT
- 🔲 `/api/admin/disciplinas` — POST/PUT

## Exemplo de Erro com Zod

**Requisição:**
```json
{
  "turma_id": "xyz",
  "nota": 15
}
```

**Resposta (400):**
```json
{
  "error": "Dados inválidos",
  "details": {
    "turma_id": ["Deve ser UUID válido"],
    "nota": ["Number must be less than or equal to 10"]
  }
}
```

Assim o cliente sabe **exatamente** o que está errado!
