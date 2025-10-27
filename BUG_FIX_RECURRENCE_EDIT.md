# Bug Fix: Erro "Data é controlada pela recorrência" ao editar transações recorrentes

## Problema Relatado
Ao tentar editar uma transação recorrente e selecionar qualquer uma das três opções:
- **"Somente esta"**
- **"Esta e futuras"**
- **"Todas"**

O sistema exibe a mensagem de erro: **"A data é controlada pela recorrência e não pode ser alterada."**

Isso impede completamente a edição da transação.

## Causa do Bug

### Fluxo de Edição com Recorrência
1. Usuário clica em editar uma transação recorrente que ocorre em uma data específica (ex: 31/10)
2. Modal de "Editar recorrência" é mostrado, permitindo escolher:
   - "Somente esta" → edita apenas essa ocorrência
   - "Esta e futuras" → edita esta e futuras
   - "Todas" → edita todas as ocorrências

3. Após escolher, o modal deveria permitir editar a transação

### O Problema
Quando o usuário escolhe uma das opções e o modal de edição é aberto:

1. **Transação Master**: Possui `opDate = "2025-10-27"` com recorrência diária
2. **Ocorrência Específica**: Data visual é "2025-10-31" (parte da série)
3. **Campo de Data**: Está preenchido com `"2025-10-31"` (correto)

Mas a validação em `transactionModal.js` estava checando:
```javascript
const originalISO = originalTx && originalTx.opDate;  // = "2025-10-27"
const isMaster = !!originalTx.recurrence;  // = true

if ((isMaster || isChild) && originalISO && newISO !== originalISO) {
  // newISO = "2025-10-31", originalISO = "2025-10-27"
  // newISO !== originalISO → ERRO!
  return 'A data é controlada pela recorrência e não pode ser alterada.';
}
```

### Por que a validação estava errada
A validação não levava em conta que em modo **`'single'`** ou **`'future'`**, o usuário está editando uma **ocorrência específica** cuja data é diferente da data original do master.

Em modo `'single'`:
- Usuário está editando **apenas essa data específica**
- A data pode (e deve) ser diferente do `master.opDate`
- A validação não deveria bloquear isso

## Solução Implementada

### Arquivo: `src/ui/transactionModal.js`

**Antes:**
```javascript
if ((isMaster || isChild) && originalISO && newISO !== originalISO) {
  return 'A data é controlada pela recorrência e não pode ser alterada.';
}
```

**Depois:**
```javascript
// When in 'single' or 'future' mode, don't validate against originalISO because the user
// may be editing a specific occurrence whose date differs from the master's opDate
if (!(mode === 'single' || mode === 'future') && (isMaster || isChild) && originalISO && newISO !== originalISO) {
  return 'A data é controlada pela recorrência e não pode ser alterada.';
}
```

### Lógica da Correção
- Em modo **`'single'`** ou **`'future'`**: Permite que a data seja diferente do `master.opDate` porque está editando uma ocorrência específica
- Em modo **`'all'`** ou **sem modo**: Valida normalmente, pois está editando o master ou todas as ocorrências

## Resultado
Agora o usuário consegue editar transações recorrentes normalmente:

✅ "Somente esta" - Edita apenas essa ocorrência  
✅ "Esta e futuras" - Edita esta e futuras ocorrências  
✅ "Todas" - Edita todas as ocorrências da série

## Commits Relacionados
- `fix: corrige validação de data ao editar recorrência (single/future mode)` - Correção principal
- `fix: corrige cálculo de saldo com transações recorrentes e timezones (DST boundary)` - Bug anterior de saldo

## Correções Adicionais (Segundo Erro)

### Erro: "A data selecionada é incompatível com recorrências"
Após corrigir o primeiro erro, o usuário ainda recebia mensagem: **"A data selecionada é incompatível com recorrências. Use a data de hoje ou desative a recorrência."**

**Causa:** Havia outra validação que checava se a transação tem recorrência E data futura, impedindo edição de ocorrências futuras.

**Solução:** Adicionado check de `currentEditMode` (ou `g.pendingEditMode`) para pular essa validação quando está editando uma ocorrência específica via modal de escopo.

**Locais corrigidos em `transactionModal.js`:**
- Linha ~476-482: Bloco de edição
- Linha ~891-895: Bloco de adição

## Notas Técnicas
- A validação ainda mantém o check para modo `'single'/'future'` para garantir que a data não seja mudada **para uma data diferente** da ocorrência selecionada (linha 411)
- As validações de "data futura + recorrência" agora respeitam `pendingEditMode`:
  - Se `pendingEditMode` está setado (single/future/all), pula validação
  - Se `pendingEditMode` é null/undefined, aplica validação normalmente
- Isso permite que usuários editem ocorrências futuras de transações recorrentes sem erro
