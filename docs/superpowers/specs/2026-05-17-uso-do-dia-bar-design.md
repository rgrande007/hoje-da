# Design Spec — Barra "Uso do Dia"

**Data:** 2026-05-17  
**Status:** Aprovado  
**Componente alvo:** `TelaPainel` (card principal) em `index.html`

---

## Contexto

O card principal do Hoje Dá exibe o valor disponível hoje e uma barra visual de uso. O redesign substitui a barra existente e o `SpendingGauge` por um componente único de duas camadas que responde a 4 estados financeiros distintos.

---

## O que muda

### Removido do card principal
- `SpendingGauge` (barra "Ritmo do Plano") — movido para `TelaAnalise` (análise já existente, sem perda de funcionalidade)

### Adicionado ao card principal
- Novo componente `UsoDoDiaBar` com barra bicolor + balão de consumo + ticks de remanescente

---

## Componente: `UsoDoDiaBar`

### Props recebidas (via `calcStats` + locais já calculados em `TelaPainel`)

```
base          = stats.valorDiarioBase          // cota diária
accBufferStart                                  // margem acumulada (folga + entradas)
gastosHoje                                      // total gasto hoje
totalCapacity = base + accBufferStart           // capacidade total do dia
```

### Estados e comportamento visual

#### Estado 0 — Sem gastos (`gastosHoje === 0`)
- Barra: background bicolor (azul claro = zona cota / amarelo claro = zona margem)
- Sem fill, sem balão
- 1 delimitador branco na fronteira cota/margem (`quotaZonePct = base/totalCapacity * 100%`)
- Ticks abaixo:
  - Esquerdo (azul): `R$ {base}` / "restam da cota"
  - Direito (amarelo): `R$ {accBufferStart}` / "restam da margem"
  - (se `accBufferStart === 0`: tick direito oculto)

#### Estado 1 — Dentro da cota (`0 < gastosHoje <= base`)
- Fill azul da esquerda: `spendPct = gastosHoje / totalCapacity * 100%`
- Balão azul na ponta do fill (posição `left: spendPct%`): mostra `gastosHoje`
- 1 delimitador branco em `quotaZonePct`
- Ticks abaixo:
  - Esquerdo (azul): `max(0, base − gastosHoje)` / "restam da cota"
  - Direito (amarelo): `accBufferStart` / "restam da margem"

#### Estado 2 — Dentro da margem (`base < gastosHoje <= totalCapacity`)
- Fill azul (cota completa: `quotaZonePct`) + fill amarelo (na zona margem)
- Posição total fill: `spendPct = gastosHoje / totalCapacity * 100%`
- Balão **amarelo** na ponta do fill
- 1 delimitador branco em `quotaZonePct`
- Ticks abaixo:
  - Esquerdo (cinza): `R$ 0,00` / "restam da cota"
  - Direito (amarelo): `max(0, accBufferStart − (gastosHoje − base))` / "restam da margem"

#### Estado 3 — Passou (`gastosHoje > totalCapacity`)
- Barra 3 segmentos, 100% contidos com `overflow: hidden`:
  - Azul: `base / gastosHoje * 100%`
  - Amarelo: `accBufferStart / gastosHoje * 100%`
  - Vermelho: `excedente / gastosHoje * 100%` (onde `excedente = gastosHoje − totalCapacity`)
- Balão **vermelho**, ancorado no limite direito (`right: 0`)
- 2 delimitadores brancos: em `(base/gastosHoje)*100%` e em `((base+accBufferStart)/gastosHoje)*100%`
- 3 ticks abaixo:
  - Esquerdo (cinza): `R$ 0,00` / "restam da cota"
  - Centro (cinza): `R$ 0,00` / "restam da margem"
  - Direito (vermelho): `R$ {excedente}` / "excedente"

### Balão (callout)

```
┌──────────────────┐
│   R$ XX,XX       │  ← pill com sombra
└──────────────────┘
         ▼           ← triângulo (border-trick, mesma cor do pill)
    [ponta do fill]
```

- Pill: `border-radius: 99px`, padding `5px 14px`, font `12px/800`
- Triângulo: `border-left/right: 6px transparent`, `border-top: 8px solid {cor}`
- Cor: azul (estado 1) / amarelo (estado 2) / vermelho (estado 3)
- Estado 3: `position: absolute; right: 0` (sem `translateX`)
- Estados 1-2: `position: absolute; left: {spendPct}%; transform: translateX(-50%)`

### Delimitadores

- `position: absolute; width: 2.5px; background: white; border-radius: 2px`
- Aplicados via overlay div (`z-index: 3`) sobre a barra com `overflow: hidden`
- Extensão: `top: -2px; bottom: -2px` para ficar visível sobre os cantos da barra

### Ticks

- Layout: `display: grid`
  - Estado 0/1/2: `grid-template-columns: 1fr 1fr`
  - Estado 3: `grid-template-columns: 1fr 1fr 1fr`
- Valor: `font-size: 12px; font-weight: 800`
- Rótulo: `font-size: 9px; color: T.textTer`
- Cor do valor: azul (`T.blue`) / amarelo (`T.yellow`) / cinza (`T.textTer`) / vermelho (`T.red`) conforme contexto

---

## O que NÃO muda

- Hero value (DISPONÍVEL HOJE + valor grande + frase contextual)
- Status pill
- Botão "Como chegamos aqui?" (`CalculationBreakdownSheet`)
- `WeeklyMiniChart`, "Resumo do ciclo", botões de ação — inalterados

## Decisão de escopo: `SpendingGauge`

`SpendingGauge` é chamado **somente** em `TelaPainel` (linha 1831). Não está em `TelaAnalise`.
Ao remover do card, o componente fica sem uso. **Decisão: remover a chamada do card e manter o componente no código** — preserva a opção de adicioná-lo a `TelaAnalise` no futuro sem reescrever.

---

## Edge cases

| Situação | Comportamento |
|---|---|
| `accBufferStart === 0` (sem margem) | Tick direito oculto; barra é 100% zona cota |
| `totalCapacity === 0` | Barra oculta, sem fill, sem balão |
| `gastosHoje === totalCapacity` exato | Estado 2, balão em `left: 100%` — clampar posição com `Math.min(spendPct, 92)` para não cortar pill na borda direita |
| `base === 0` | Barra é 100% zona margem |

---

## Localização no código

| Elemento | Linha aprox. |
|---|---|
| Variáveis locais (`totalCapacity`, `spendPct` etc.) | `TelaPainel` ~1712 |
| Barra atual a substituir | ~1776–1826 |
| `SpendingGauge` call a remover do card | ~1831 |
| `SpendingGauge` a manter em `TelaAnalise` | verificar `TelaAnalise` ~2414 |
