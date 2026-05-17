# Design Spec — Barra "Uso do Dia"

**Data:** 2026-05-17  
**Status:** Aprovado (design final)  
**Componente alvo:** `TelaPainel` (card principal) em `index.html`

---

## Contexto

O card principal do Hoje Dá exibe o valor disponível hoje e uma barra visual de uso. O redesign substitui a barra de "bateria" existente (`isNeg ? barra vermelha : barra bizona fill`) por um novo componente `UsoDoDiaBar` com lógica invertida: barra começa cheia e drena da direita para a esquerda conforme o gasto aumenta.

`SpendingGauge` (Ritmo do Plano) **permanece no card**, abaixo da nova barra.

---

## O que muda

### Substituído no card principal
- Bloco da barra atual (~linha 1776–1826 em `TelaPainel`) → novo componente `UsoDoDiaBar`

### O que NÃO muda
- Hero value (DISPONÍVEL HOJE + valor grande + frase contextual)
- Status pill
- `SpendingGauge` — permanece no card
- Botão "Como chegamos aqui?" (`CalculationBreakdownSheet`)
- `WeeklyMiniChart`, "Resumo do ciclo", botões de ação

---

## Componente: `UsoDoDiaBar`

### Variáveis (já calculadas em `TelaPainel` ~linha 1712)

```js
const base          = stats.valorDiarioBase        // cota diária
const accBufferStart                               // margem acumulada
const gastosHoje                                   // total gasto hoje
const totalCapacity = base + accBufferStart        // capacidade total do dia
const excedente     = Math.max(0, gastosHoje - totalCapacity)
const remainingPct  = totalCapacity > 0
  ? Math.max(0, (totalCapacity - gastosHoje) / totalCapacity) * 100
  : 0
```

### Layout da barra (fixo, independente do estado)

```
[← margem (amarelo, left)  |  cota (azul, right) →]
```

- Margem zone: `accBufferStart / totalCapacity * 100%` da esquerda  
- Cota zone: `base / totalCapacity * 100%` da direita  
- Delimitador branco fixo na fronteira margem/cota: `accBufferStart / totalCapacity * 100%` da esquerda

A barra drena da **direita para a esquerda** — cota é consumida primeiro, depois a margem.

### Estados

#### Estado 0 — Sem gastos (`gastosHoje === 0`)
- Barra totalmente colorida: [amarelo | azul], sem cinza
- Sem balloon
- 1 delimitador branco em `buffZonePct`
- Ticks: `[margem: accBufferStart (amarelo)] [cota: base (azul)]`
- (Se `accBufferStart === 0`: omitir zone amarela e tick de margem)

#### Estado 1 — Dentro da cota (`0 < gastosHoje ≤ base`)
- Barra: `[amarelo 0–buffZonePct%] [azul restante da cota] [cinza #E2E8F0 à direita]`
  - `cotaRestPct = (base - gastosHoje) / totalCapacity * 100%`
  - Cinza começa em `buffZonePct + cotaRestPct` = `remainingPct`
- Balloon **azul** posicionado em `left: remainingPct%`
- 1 delimitador branco em `buffZonePct` (fixo)
- 1 linha sutil em `remainingPct` (borda do cinza, opcional)
- Ticks: `[margem: accBufferStart (amarelo)] [cota: base − gastosHoje (azul)]`

#### Estado 2 — Dentro da margem (`base < gastosHoje ≤ totalCapacity`)
- Barra: `[amarelo restante da margem] [cinza #E2E8F0 à direita]`
  - `margRestPct = (totalCapacity - gastosHoje) / totalCapacity * 100%` (= `remainingPct`)
- Balloon **amarelo** em `left: remainingPct%`
- Delimitador original em `buffZonePct` — agora dentro da zona cinza, exibido com `opacity: 0.4`
- Ticks: `[margem: totalCapacity − gastosHoje (amarelo)] [cota: R$0,00 (cinza)]`

#### Estado 3 — Passou (`gastosHoje > totalCapacity`)
- Barra toda em **vermelho claro** (`#FECDD3`), sem fill nem zones — `overflow: hidden`, border-radius mantido
- Balloon **vermelho** (`#E35D6A`) ancorado no extremo esquerdo: `position: absolute; left: 0`
- Delimitador original em `buffZonePct` — exibido com `rgba(255,255,255,0.6)` sobre o vermelho
- 3 ticks: `[excedente: gastosHoje − totalCapacity (vermelho)] [margem: R$0,00 (cinza)] [cota: R$0,00 (cinza)]`

### Balloon (callout)

```
┌──────────────────────┐
│  R$ XX,XX gastos     │   ← pill (border-radius 99px, padding 4px 12px)
└──────────────────────┘
            ▼              ← triângulo (border-trick, mesma cor)
      [borda do remaining]
```

- **Cor**: azul (estado 1) / amarelo (estado 2) / vermelho (estado 3)
- **Posição estados 1–2**: `position: absolute; left: clamp(8%, remainingPct%, 90%); transform: translateX(-50%)`
  - Clampar para evitar corte nas bordas
- **Posição estado 3**: `position: absolute; left: 0` (sem transform), triângulo com `margin-left: 14px`

### Ticks

- **Estados 0, 1, 2**: `display: grid; grid-template-columns: 1fr 1fr`
  - Esquerdo: restam da margem
  - Direito: restam da cota
- **Estado 3**: `display: grid; grid-template-columns: 1fr 1fr 1fr`
  - Esquerdo: excedente (vermelho)
  - Centro: margem R$0,00 (cinza)
  - Direito: cota R$0,00 (cinza)
- Valor: `font-size: 12px; font-weight: 800`
- Rótulo: `font-size: 9px; color: T.textTer`

### Delimitador fixo (margem/cota boundary)

```js
const buffZonePct = totalCapacity > 0
  ? (accBufferStart / totalCapacity) * 100
  : 0
```

- `position: absolute; left: buffZonePct%; top: -2px; bottom: -2px; width: 2.5px; background: white; transform: translateX(-50%); border-radius: 2px; z-index: 3`
- Aplicado via overlay div sobre a barra (para funcionar com `overflow: hidden`)
- Estados 0 e 1: opacidade total
- Estado 2: `opacity: 0.4` (dentro do cinza)
- Estado 3: `rgba(255,255,255,0.6)` (sobre o vermelho claro)

---

## Edge cases

| Situação | Comportamento |
|---|---|
| `accBufferStart === 0` | Barra 100% azul (só cota); sem zone amarela; sem delimitador; ticks só mostra cota |
| `totalCapacity === 0` | Componente não renderiza |
| `base === 0` | Barra 100% amarela (só margem) |
| `remainingPct` perto de 0 | Balloon clampa em `left: 8%` para não cortar na borda esquerda |
| `remainingPct` perto de 100 | Balloon clampa em `left: 90%` para não cortar na borda direita |

---

## Localização no código

| Elemento | Linha aprox. |
|---|---|
| Variáveis locais (`totalCapacity`, `spendPct` etc.) | `TelaPainel` ~1712 |
| **Bloco a substituir** (barra atual) | ~1776–1826 |
| `SpendingGauge` call — **manter** | ~1831 |
