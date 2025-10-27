# Bug Fix: Saldo Incorreto com Transações Recorrentes (Especialmente em Datas de DST)

## Problema Relatado
Ao lançar uma transação com recorrência diária a partir do dia 27/10/2025, o saldo não estava incrementando corretamente:
- 27 - 1
- 28 - 2
- 29 - 3
- 30 - 4
- 31 - 5
- 01 - 6
- **02 - 6** (❌ não incrementou, manteve valor de 01)
- 03 - 7

## Raiz do Problema
O bug ocorria em duas funções que iteravam sobre datas usando um padrão perigoso:

### Em `src/utils/dailyBalances.js` (linhas 78-81):
```javascript
const d = new Date(minISO);  // ❌ Cria UTC date
const end = new Date(maxISO);  // ❌ Cria UTC date
for (let cur = new Date(d); cur <= end; cur.setDate(cur.getDate() + 1)) {
  const iso = cur.toISOString().slice(0, 10);  // ❌ Pode gerar ISO errado em timezones negativos
```

### Em `src/ui/accordion.js` (linhas 510-515):
```javascript
const startDateObj = new Date(effectiveMinDate);  // ❌ Cria UTC date
const endDateObj = new Date(maxDate);  // ❌ Cria UTC date
for (let current = new Date(startDateObj); current <= endDateObj; current.setDate(current.getDate() + 1)) {
  const iso = current.toISOString().slice(0, 10);  // ❌ Pode gerar ISO errado
```

## Causa Técnica
Quando criar-se um `Date` a partir de uma string ISO **sem especificar timezone** (ex: `new Date('2025-11-02')`), JavaScript interpreta como **UTC**. 

Em timezones com offset negativo (como São Paulo: UTC-3), isto causa misalignments:
- `new Date('2025-11-02')` → `2025-11-02T00:00:00Z` (UTC) → Equivalente a 2025-11-01T21:00:00 (local)
- Quando convertido para ISO com `toISOString().slice(0, 10)`, pode retornar data errada

Isso especialmente manifesta-se em **02 de novembro de 2025**, quando há mudança de horário (DST) no Brasil, causando comportamentos inconsistentes.

## Solução Implementada

### 1. Em `src/utils/dailyBalances.js`:
- Importado `formatToISO` de `date.js`
- Mudado de `new Date(isoString)` para **parsing direto de componentes**:
  ```javascript
  const [minY, minM, minD] = minISO.split('-').map(Number);
  const startDate = new Date(minY, minM - 1, minD);  // ✓ Cria local date
  ```
- Mudado de `cur.toISOString().slice(0, 10)` para **`formatToISO(cur)`**:
  ```javascript
  const iso = formatToISO(cur);  // ✓ Converte com ajuste de timezone
  ```

### 2. Em `src/ui/accordion.js`:
- Mesma mudança de `new Date(isoString)` para parsing de componentes
- Adicionada função helper `parseISO`:
  ```javascript
  const parseISO = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  ```
- Mudado de `current.toISOString().slice(0, 10)` para `formatToISO(current)`

## Resultado
Agora o saldo incrementa corretamente independentemente de:
- Timezone do usuário
- Mudanças de horário (DST)
- Datas de transições (como 02/11/2025)

Valores esperados vs anteriores:
- Antes: 27-1, 28-2, 29-3, 30-4, 31-5, 01-6, **02-6**, 03-7 ❌
- Depois: 27-1, 28-2, 29-3, 30-4, 31-5, 01-6, **02-7**, 03-8 ✓

## Arquivos Modificados
1. `src/utils/dailyBalances.js` - Adicionado import de `formatToISO`, refatorado loops de data
2. `src/ui/accordion.js` - Refatorado `buildRunningBalanceMap()` para usar local dates

## Nota Técnica
A função `formatToISO` em `src/utils/date.js` já estava implementada corretamente, ajustando pelo timezone offset. O bug era que não estava sendo usada em todos os lugares onde deveria ser.
