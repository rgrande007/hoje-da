# Design: "Como chegamos aqui" — Bottom Sheet de Detalhamento

**Data:** 2026-05-16  
**Feature:** Tela explicativa do cálculo do valor disponível  
**Arquivo alvo:** `index.html` (single-file React, sem bundler)

---

## Contexto

O card principal do app Hoje Dá exibe um valor hero ("disponível agora"). O usuário precisa entender como esse número foi calculado, especialmente quando gastou acima do valor de hoje mas ainda tem folga no plano. A tela "Como chegamos aqui" explica essa conta de forma humana, sem linguagem financeira.

---

## Terminologia obrigatória (esta tela)

| Usar | Não usar |
|---|---|
| "valor de hoje" | "cota diária" como termo principal |
| "folga" | "margem acumulada", "saldo acumulado" |
| "plano" | "orçamento" |
| "período" | "ciclo" (nesta tela, para o usuário leigo) |
| "ainda sobra no plano" | "saldo acumulado" |
| "saiu do plano" | "passou do plano" |

---

## Componente: `CalculationBreakdownSheet`

### Localização no código
Nova função global antes de `TelaPainel` no `<script type="text/babel">`.

### Props

```js
{
  dailyQuota,       // stats.valorDiarioBase
  todaySpent,       // gastosHoje
  carryBeforeToday, // accBufferStart (folga acumulada antes dos gastos de hoje)
  availableNow,     // avail = margemAteHoje (pode ser negativo)
  onClose,          // () => void
}
```

### Cálculos internos (sem estado)

```js
const todayOverflow     = Math.max(0, todaySpent - dailyQuota);
const usedPlanBuffer    = Math.min(carryBeforeToday, todayOverflow);
const remainingBuffer   = carryBeforeToday - usedPlanBuffer;
const withinQuota       = todaySpent <= dailyQuota;
const hasBuffer         = remainingBuffer > 0;
const isNegative        = availableNow < 0;
```

---

## Estrutura visual

### Container
- `position: fixed; inset: 0` — backdrop `rgba(0,0,0,0.35)`
- Toque no backdrop: fecha o sheet
- `position: fixed; bottom: 0; left: 0; right: 0` — panel branco
- `borderRadius: 24 24 0 0`, `maxHeight: 90vh`, `overflowY: auto`
- Animação de entrada: `transform: translateY(100%) → translateY(0)`, `transition: 0.35s cubic-bezier(.2,.8,.3,1)`

### Header do sheet
- Handle: linha cinza de 4×32px, centralizada, margem superior 12px
- Título: "Como chegamos aqui", fontSize 18, fontWeight 800
- Botão X: canto superior direito, 32×32px, fecha o sheet

### Linhas de cálculo
Cada linha tem: ícone circular (32px) à esquerda, título + subtítulo opcional no centro, valor alinhado à direita.

#### Estado 1 — `withinQuota === true` (gastosHoje ≤ dailyQuota)

| # | Título | Subtítulo | Valor | Cor ícone | Cor valor |
|---|---|---|---|---|---|
| 1 | Valor de hoje | — | `dailyQuota` | azul suave | default |
| 2 | Gasto de hoje | — | `todaySpent` | vermelho suave | default |

Bloco resultado: **"Ainda dá hoje"** · "É o quanto você ainda pode gastar" · `dailyQuota - todaySpent` · verde

#### Estado 2 — `!withinQuota && !isNegative` (passou da cota, tem folga)

| # | Título | Subtítulo | Valor | Cor ícone | Cor valor |
|---|---|---|---|---|---|
| 1 | Valor de hoje | cota diária | `dailyQuota` | azul suave | default |
| 2 | Gasto de hoje | — | `todaySpent` | vermelho suave | default |
| 3 | Passou do valor de hoje | Excesso sobre o valor de hoje | `todayOverflow` | vermelho suave | vermelho |
| 4 | Folga que você tinha | Antes de gastar hoje | `+carryBeforeToday` | verde suave | verde |
| 5 | Folga usada hoje | Para cobrir o excesso de hoje | `−usedPlanBuffer` | laranja suave | vermelho |

Bloco resultado: **"Ainda sobra no plano"** · "É o que você ainda pode gastar" · `remainingBuffer` · verde

#### Estado 3 — `isNegative === true` (zerou a folga)

Linhas 1, 2 e 3 sempre presentes. Linhas 4 e 5 **somente quando `carryBeforeToday > 0`** — se o usuário nunca teve folga, omitir para não exibir R$0,00.

| # | Título | Subtítulo | Valor | Cor ícone | Cor valor |
|---|---|---|---|---|---|
| 1 | Valor de hoje | cota diária | `dailyQuota` | azul suave | default |
| 2 | Gasto de hoje | — | `todaySpent` | vermelho suave | default |
| 3 | Passou do valor de hoje | Excesso sobre o valor de hoje | `todayOverflow` | vermelho suave | vermelho |
| 4* | Folga que você tinha | Antes de gastar hoje | `+carryBeforeToday` | verde suave | verde |
| 5* | Folga usada hoje | Para cobrir o excesso de hoje | `−carryBeforeToday` | laranja suave | vermelho |

*Linhas 4 e 5 só aparecem quando `carryBeforeToday > 0`.

Bloco resultado: **"Saiu do plano"** · "Você passou do valor disponível para este período" · `Math.abs(availableNow)` · vermelho

### Bloco "Entenda o cálculo" (sempre presente)
- Fundo azul bem claro (`T.blueLight`), bordas arredondadas (16px)
- Ícone 💡 (ou símbolo `i` circular azul)
- Título: **"Entenda o cálculo"**
- Texto: "Quando você gasta acima do valor de hoje, usamos sua folga do plano para manter tudo sob controle. Por isso, o valor disponível pode mudar durante o período."

---

## Integração em `TelaPainel`

### Estado local
```js
const [showBreakdown, setShowBreakdown] = React.useState(false);
```

### Gatilho "Ver cálculo"
Adicionado na linha de breakdown do hero value (linha ~1484 do código atual).  
Condição de exibição: `!noTx` (só quando há transações).  
Aparência: texto `Ver cálculo →` como `<button>` inline sem borda/fundo, `fontSize: 12`, `color: T.blue`, `fontWeight: 700`.

Posição exata: ao final da div que contém o breakdown text (logo abaixo do valor hero, antes da barra de progresso).

### Renderização do sheet
```jsx
{showBreakdown && (
  <CalculationBreakdownSheet
    dailyQuota={base}
    todaySpent={gastosHoje}
    carryBeforeToday={accBufferStart}
    availableNow={avail}
    onClose={() => setShowBreakdown(false)}
  />
)}
```

Renderizado dentro do `return` de `TelaPainel`, após o card principal (o `position: fixed` garante que ele flutua sobre tudo).

---

## Cores usadas (paleta T existente)

| Uso | Token |
|---|---|
| Ícone azul | `T.blueLight` com borda `T.blue` |
| Ícone verde | `T.greenLight` com borda `T.green` |
| Ícone vermelho | `T.redLight` com borda `T.red` |
| Ícone laranja | `#FFF3E0` com borda `#F97316` |
| Valor vermelho | `T.red` |
| Valor verde | `T.green` |
| Bloco resultado verde | `T.greenLight` |
| Bloco resultado vermelho | `T.redLight` |
| Bloco explicativo | `T.blueLight` |

---

## O que NÃO muda

- Lógica de `calcStats` — sem alterações
- Props de `TelaPainel` — sem novos props
- Estado global (`state`) — sem alterações
- Card principal — apenas adição do link "Ver cálculo"
- Nenhum mini gráfico de barra nesta tela
