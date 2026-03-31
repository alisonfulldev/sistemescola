# Análise: Dados Faltantes para Diário de Narandiba

## Comparação: Diário Narandiba vs Sistema Atual

Baseado nos prints do documento oficial "Diário de Classe Digital - Narandiba/SP 2026", aqui está o que **JÁ EXISTE** e o que **FALTA**:

---

## ✅ DADOS EXISTENTES (implementados)

### Tabela `escola` (Migration 001)
- ✅ Nome oficial da escola
- ✅ Município, UF, CEP
- ✅ Diretor
- ✅ Endereço completo (logradouro, número, bairro)
- ✅ Telefone, email

### Tabela `turmas` (com expansão na Migration 001)
- ✅ Nome da turma
- ✅ Série (1º, 2º, etc)
- ✅ Turma letra (A, B, C)
- ✅ Grau (EF = Ensino Fundamental, EM = Ensino Médio)
- ✅ Turno (matutino, vespertino, noturno)
- ✅ Ano letivo
- ✅ Aulas previstas

### Tabela `alunos` (com expansão)
- ✅ Nome completo
- ✅ Matrícula (UNIQUE)
- ✅ Número de chamada (1-55)
- ✅ Situação (ativo, transferido, remanejado)
- ✅ Data de matrícula
- ✅ Nome e contato do responsável
- ✅ Email responsável

### Tabela `disciplinas`
- ✅ Nome da disciplina
- ✅ Professor (vinculado)
- ✅ Código da disciplina
- ✅ Curso

### Tabela `aulas`
- ✅ Data da aula
- ✅ Hora de início e término
- ✅ Turma, disciplina, professor
- ✅ **Conteúdo programático** (NEW)
- ✅ **Atividades desenvolvidas** (NEW)
- ✅ **Bimestre** (calculado automaticamente)

### Tabela `chamadas` e `registros_chamada`
- ✅ Frequência por aluno (presente/falta/justificada)
- ✅ Data e hora de registro
- ✅ Status da chamada

### Tabelas de Calendário
- ✅ `anos_letivos` — ano, datas início/fim, recesso
- ✅ `bimestres` — 4 bimestres por ano
- ✅ `calendario_escolar` — feriados, pontos facultativos, eventos

### Tabela `notas` (Migration 001)
- ✅ Notas por bimestre (B1, B2, B3, B4)
- ✅ Nota de recuperação
- ✅ Ausências compensadas
- ✅ Aluno × Disciplina × Ano Letivo

---

## ⚠️ DADOS FALTANDO / INCOMPLETOS

### 1. **Tabela JUSTIFICATIVAS**
**Status**: ❌ FALTA COMPLETAMENTE

O sistema registra `registros_chamada.status = 'justificada'` mas NÃO tem uma tabela para armazenar:
- Data da falta
- Motivo/tipo de justificativa
- Documento anexado (comprovante)
- Data de envio
- Aprovado por (responsável/diretor)

**Precisa adicionar**:
```sql
CREATE TABLE public.justificativas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id),
  data_falta DATE NOT NULL,
  motivo TEXT NOT NULL, -- médico, dentista, falecimento, etc
  documento_url TEXT, -- foto do comprovante
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. **Tabela PROVA/AVALIAÇÕES**
**Status**: ❌ FALTA COMPLETAMENTE

Não há registro de:
- Tipo de avaliação (prova, trabalho, projeto, etc)
- Data da avaliação
- Descrição/conteúdo
- Nota individual por aluno

**Precisa adicionar**:
```sql
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aula_id UUID NOT NULL REFERENCES public.aulas(id),
  tipo TEXT NOT NULL, -- 'prova', 'trabalho', 'projeto', 'participacao'
  data DATE NOT NULL,
  descricao TEXT,
  valor NUMERIC(4,1) DEFAULT 10,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.notas_avaliacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id),
  nota NUMERIC(4,1) CHECK (nota BETWEEN 0 AND 10),
  UNIQUE(avaliacao_id, aluno_id)
);
```

### 3. **Dados de RESPONSAVEL Incompletos**
**Status**: ⚠️ PARCIAL

A tabela `responsaveis_alunos` vincula responsáveis a alunos, mas faltam dados como:
- CPF do responsável
- RG
- Profissão
- Parentesco (pai, mãe, avó, tutor, etc)
- Telefone primário/secundário
- Email

**Precisa expandir**:
```sql
ALTER TABLE public.responsaveis_alunos
  ADD COLUMN IF NOT EXISTS parentesco TEXT NOT NULL DEFAULT 'pai',
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS telefone_primario TEXT,
  ADD COLUMN IF NOT EXISTS telefone_secundario TEXT;

-- Ou melhor: tabela separada se um responsável tiver múltiplos filhos
```

### 4. **Informações de OBSERVAÇÕES na Aula**
**Status**: ⚠️ PARCIAL

A tabela `aulas` tem campos para `conteudo_programatico` e `atividades_desenvolvidas`, mas faltam:
- Observações gerais da aula
- Campo para "resumo do conteúdo programado E atividades" em uma descrição mais formal

Estes campos já existem, apenas precisam ser preenchidos/validados.

### 5. **Histórico de FREQUÊNCIA por Aluno**
**Status**: ⚠️ EXISTE MAS PRECISA DE EXPORT

O sistema tem `registros_chamada` para cada aula, mas precisa de:
- **View ou Endpoint** que retorne frequência mensal/bimestral formatada
- **Percentual de frequência** por período
- **Total de faltas justificadas vs não justificadas**

### 6. **INFORMAÇÕES ADICIONAIS DO ALUNO** (faltam alguns campos)
**Status**: ⚠️ PARCIAL

Campos que podem estar no Diário:
- Data de nascimento ❌
- Naturalidade ❌
- Nacionalidade ❌
- Nome da mãe ❌
- CPF ❌
- RG ❌

**Precisa adicionar a `alunos`**:
```sql
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS naturalidade TEXT,
  ADD COLUMN IF NOT EXISTS nacionalidade TEXT DEFAULT 'Brasileira',
  ADD COLUMN IF NOT EXISTS nome_mae TEXT,
  ADD COLUMN IF NOT EXISTS cpf_aluno TEXT,
  ADD COLUMN IF NOT EXISTS rg_aluno TEXT;
```

### 7. **CAMPOS DE RECUPERAÇÃO**
**Status**: ⚠️ PARCIAL

A tabela `notas` tem campo `recuperacao`, mas faltam:
- Tipo de recuperação (paralela, final, etc)
- Data da avaliação de recuperação
- Descrição

---

## 📊 RESUMO DAS AÇÕES NECESSÁRIAS

| Item | Status | Prioridade | Ação |
|------|--------|-----------|------|
| Justificativas de falta | ❌ Falta | **ALTA** | Criar tabela `justificativas` |
| Avaliações/Provas | ❌ Falta | **ALTA** | Criar tabelas `avaliacoes` e `notas_avaliacao` |
| Dados pessoais aluno | ❌ Falta | **MÉDIA** | Expandir tabela `alunos` (data nasc, CPF, etc) |
| Dados responsável | ⚠️ Incompleto | **MÉDIA** | Expandir `responsaveis_alunos` com parentesco, CPF, etc |
| Export para Google Sheets | ⚠️ Incompleto | **ALTA** | Criar endpoints de export formatados |
| Views de Frequência | ⚠️ Incompleto | **ALTA** | Criar views/endpoints para relatórios de frequência |

---

## 🎯 PRÓXIMOS PASSOS

1. **Criar migração 003** com as tabelas faltando (justificativas, avaliações)
2. **Expandir dados pessoais** do aluno e responsável
3. **Implementar endpoints de export** para Google Sheets
4. **Criar views** para relatórios (frequência, notas, etc)
5. **Validar campos** obrigatórios vs opcionais conforme Diário Narandiba
