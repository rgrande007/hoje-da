# UI_POLISH_RECOMMENDATIONS.md — Hoje Dá
## Recomendações de Polimento Visual e de Interface
**Versão auditada:** index.html (3.764 linhas, build v6)
**Data da auditoria:** 2026-05-17

---

## Escala de esforço e impacto

| Esforço | Descrição |
|---|---|
| 🟢 Baixo | 1–10 linhas de código, sem risco |
| 🟡 Médio | 10–30 linhas, envolve lógica de estado |
| 🔴 Alto | 30+ linhas, envolve refactor ou novo componente |

---

## UI-01 — SpendingGauge: marcador "Ainda cedo" em posição aleatória
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
Quando `estado = 'cedo'`, o triângulo é posicionado em `pos = 37` (zona "No ritmo" azul), mas com cor cinza. O usuário vê um ponteiro na zona azul sem entender por que está ali.

### Recomendação
**Opção A (preferida):** Quando `estado = 'cedo'`, não renderizar o triângulo marcador. Manter apenas a mensagem "Ainda cedo" e a frase explicativa. A régua colorida com todos os 4 segmentos ainda aparece como referência visual.

**Opção B:** Posicionar o triângulo exatamente no centro (`pos = 50`) com cor cinza neutra, transmitindo "você está no meio, dados insuficientes".

### Código afetado
`SpendingGauge` — linhas ~1069–1082. Adicionar condição `{si >= 0 && <div triângulo ... />}`.

---

## UI-02 — WeeklyMiniChart: barra de hoje deveria refletir estado real
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
```javascript
const barBg = d.isToday ? T.blue : ... : val > valorDiarioBase ? T.red : T.green;
```
Hoje é sempre azul, independente do valor. Quando o gasto de hoje excedeu a cota, o card principal fica amarelo/vermelho mas o gráfico permanece azul.

### Recomendação
Manter azul como a cor de "marcação de hoje" (para destacar o dia), mas adicionar um contorno ou indicador quando o gasto ultrapassa a base:
- Se `val > valorDiarioBase`: barra azul com borda/sombra vermelha: `boxShadow: '0 6px 16px rgba(227,93,106,0.32)'`
- Ou: combinar cor — `val > valorDiarioBase ? T.red : T.blue` para a barra de hoje, mantendo boxShadow azul

### Código afetado
`WeeklyMiniChart` — linha ~1185.

---

## UI-03 — "Uso do Dia" sem label no estado zero transações
**Esforço:** 🟢 Baixo
**Impacto:** Baixo

### Problema atual
Quando não há transações (`gastosHoje = 0`), o `UsoDoDiaBar` renderiza uma barra cheia (azul + amarelo para buffer) sem balloon e sem contexto. O usuário não sabe o que a barra cheia representa.

Em `semGastos = true`, a label "Uso do dia" está em `marginBottom: semGastos ? 8 : 0`, mas não há subtexto explicativo.

### Recomendação
Quando `semGastos = true`, adicionar texto pequeno abaixo da barra: "Barra cheia · Nenhum gasto registrado hoje" ou simplesmente esconder a barra no estado zero e mostrá-la apenas quando `gastosHoje > 0`.

---

## UI-04 — Card principal: hierarquia visual do hero pode ser mais forte
**Esforço:** 🟡 Médio
**Impacto:** Médio

### Problema atual
O label do hero ("Disponível hoje", "Sua cota de hoje", etc.) está em `fontSize: 11, fontWeight: 600, color: T.textTer`. O número principal está em `fontSize: 48, fontWeight: 800`. A frase está em `fontSize: 13, fontWeight: 500`.

O valor tem hierarquia visual correta, mas o label (que define o contexto do número) é quase invisível — tamanho 11px e cor terciária.

### Recomendação
Aumentar o label para `fontSize: 13, fontWeight: 700, color: T.textSec` (não mais tertiary). A frase contextual pode diminuir ligeiramente para não competir. O usuário precisa saber o que o número significa antes de lê-lo.

### Impacto visual
Mais clareza sobre o contexto do número principal sem mudar o design.

---

## UI-05 — Painel estado vazio: gráfico semanal parece broken
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
No estado inicial (sem transações), o `WeeklyMiniChart` exibe 7 barras minúsculas e cinzas (as passadas/futuras) + 1 barra azul (hoje, mas vazia = 8px de altura). Parece um gráfico com erro de dados.

### Recomendação
Quando `transacoes.filter(gasto).length === 0`:
- Sobrepor o gráfico com um texto centrado: "Seus gastos da semana aparecem aqui"
- Ou: não renderizar as barras (apenas o contêiner branco com o título e esse texto)
- Manter a lógica atual quando houver pelo menos 1 transação

---

## UI-06 — TelaFechamentoCiclo: valores grandes em viewport estreito
**Esforço:** 🟡 Médio
**Impacto:** Alto (acessibilidade)

### Problema atual
```javascript
// Hero do fechamento:
fontSize: 48, fontWeight: 800
// Exemplo: "+ R$ 3.000,00" = ~12 chars × fontSize 48
```
Em viewports < 380px (ex: iPhone SE 375px), o valor "+ R$ 3.000,00" em 48px ocupa ~150–160px, o que cabe. Mas valores como "+ R$ 10.000,00" (13 chars) podem exceder a largura disponível (~320px com padding 32px = 288px).

### Recomendação
Usar `fontSize: Math.min(48, Math.max(32, ...)` calculado dinamicamente, ou CSS `clamp`:
```javascript
fontSize: 'clamp(32px, 11vw, 48px)'
```
Isso garante que o valor sempre cabe na tela sem quebrar o layout.

### Código afetado
`TelaFechamentoCiclo` — linha ~1315.

---

## UI-07 — Grid 3 colunas no TelaFechamentoCiclo pode cortar em 320px
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
```javascript
gridTemplateColumns: '1fr 1fr 1fr'; gap: 10px
```
Em 320px − 32px padding = 288px / 3 − 20px gaps = ~83px por coluna.
"R$ 3.000,00" em `fontSize: 15, fontWeight: 800` ocupa ~12 chars × ~9px/char = ~108px.
**Excede os 83px da coluna.** O texto vai cortar ou quebrar linha.

### Recomendação
- Adicionar `overflow: hidden, textOverflow: 'ellipsis', whiteSpace: 'nowrap'` nos valores, OU
- Reduzir `fontSize` para 13 nos cards do grid de fechamento, OU
- Mudar para `gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'` com `fontSize: 'clamp(12px, 3.5vw, 15px)'`

### Código afetado
`TelaFechamentoCiclo` — linha ~1325.

---

## UI-08 — TabBar: "Hoje" poderia ter indicador de estado de saúde
**Esforço:** 🔴 Alto
**Impacto:** Médio

### Ideia (opcional)
O ícone da tab "Hoje" é sempre o mesmo, independente do estado do usuário. Uma melhoria seria adicionar um micro-indicador de cor no ícone quando há alertas:
- Estado "Passou": ponto vermelho no ícone
- Estado "Apertado": ponto amarelo
- Estado "Com folga": sem indicador (não sobrecarregar)

### Avaliação
Esse tipo de indicador é comum em apps financeiros mas pode causar ansiedade desnecessária. **Decisão de design a ser tomada antes de implementar.** Não implementar sem validação.

---

## UI-09 — Pill de status sem tooltip ou explicação
**Esforço:** 🟡 Médio
**Impacto:** Médio

### Problema atual
As pills ("No plano", "Apertado", "Com folga", "Passou") são exibidas sem nenhuma explicação de o que significam. Um usuário de primeira viagem pode não entender o que "Apertado" quer dizer.

### Recomendação
Ao tocar na pill, mostrar um mini bottom sheet ou tooltip com a explicação:
- "No plano: seus gastos estão dentro do combinado."
- "Apertado: você está próximo do limite."
- "Com folga: você economizou nos outros dias."
- "Passou: você gastou mais do que estava disponível até hoje."

Ou incluir essa explicação como subtexto no card (já existe parcialmente na `frase` do hero).

---

## UI-10 — MoneyInput: botão de limpar ausente
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
Para corrigir um valor digitado, o usuário precisa apertar ⌫ repetidamente. Para R$ 50,00 (4 dígitos), são 4 toques. Para R$ 1.234,56 (6 dígitos), são 6 toques.

### Recomendação
Quando `raw.length > 2` (valor maior que R$ 0,01), mostrar botão "×" ou "C" (clear) na posição do espaço vazio no teclado (posição 10 no grid, que atualmente é `''` = invisible):

```javascript
const pad = ['1','2','3','4','5','6','7','8','9','C','0','⌫'];
// Em pressKey, tratar 'C' como clear: if (k === 'C') { setRaw(''); return; }
```

---

## UI-11 — Transições de tela: back (slideDown) muito sutil
**Esforço:** 🟢 Baixo
**Impacto:** Baixo

### Observação
```css
.screen-back { animation: slideDown 0.22s cubic-bezier(.2,.8,.3,1) both; }
```
```javascript
// Implementado em:
function TelaConfig: className="screen-enter"
function TelaEntrada: className="screen-enter"
// Mas a animação screen-back não é aplicada ao retornar.
```

A animação `screen-back` está definida no CSS mas não está sendo aplicada às telas ao voltar. Todas as transições usam `screen-enter` (slideUp). O retorno por "←" deveria usar `screen-back` (slideDown) para indicar direção da navegação.

### Recomendação
Usar `screen-back` ao navegar de volta e `screen-enter` ao avançar. Requer estado de direção de navegação.

---

## UI-12 — Legenda do WeeklyMiniChart aparece apenas no componente standalone
**Esforço:** 🟢 Baixo
**Impacto:** Baixo

### Observação
```javascript
<WeeklyMiniChart ... showLegend={false} />  // No TelaPainel
<WeeklyMiniChart ... showLegend={true} />   // Não usado assim — inferido
```

No TelaPainel, `showLegend={false}`. A legenda (Hoje/Com gasto/Sem gasto/Futuro) não aparece no painel principal, apenas quando `showLegend = true`. Isso pode fazer o usuário não entender o que as cores das barras significam.

### Recomendação
Manter `showLegend={false}` no painel (para não sobrecarregar), mas garantir que um novo usuário consiga descobrir o significado das cores ao tocar em uma barra (o tooltip já existe no clique — `activeBar`).

---

## UI-13 — Feedback de haptic: falta no MoneyInput ao atingir limite
**Esforço:** 🟢 Baixo
**Impacto:** Baixo

### Problema
Quando `raw.length >= 7`, o teclado silenciosamente ignora o toque. Não há vibração `haptic('error')`.

### Recomendação
```javascript
function pressKey(k) {
  if (k === '⌫') { haptic('light'); setRaw(r => r.slice(0, -1)); return; }
  if (raw.length >= 7) { haptic('error'); /* opcional: shake */ return; }
  haptic('light');
  setRaw(r => r + k);
}
```

---

## UI-14 — Chips "Este mês / Hoje +30d / Próx. ciclo" sem estado ativo
**Esforço:** 🟢 Baixo
**Impacto:** Baixo

### Problema atual
Os chips de quick-select na TelaConfig têm estilo estático — quando o usuário toca em um, o chip não muda visualmente para indicar que foi selecionado. O estado só é refletido nos pickers de data abaixo.

### Recomendação
Adicionar estado `selectedChip` e aplicar estilo ativo ao chip selecionado:
```javascript
background: selected ? T.blue : T.blueLight,
color: selected ? '#fff' : T.blue,
```

---

## UI-15 — Dialog "Recomeçar do zero": botão de confirmação poderia ter delay
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
O botão "Sim, apagar tudo" é vermelho e imediatamente clicável. Para uma ação irreversível que apaga todo o histórico, a ausência de um delay ou fricção extra é perigosa.

### Recomendação
Adicionar um delay de 2 segundos no botão (countdown visual): "Aguarde 2s para confirmar" → "Apagar tudo". Esse padrão é usado em apps que precisam de intenção deliberada para ações destrutivas.

---

## UI-16 — Análise: card "Projeção do ciclo" aparece mesmo sem dados suficientes
**Esforço:** 🟢 Baixo
**Impacto:** Médio

### Problema atual
Na TelaAnalise, o card de projeção principal exibe sempre um número (ex: "+ R$ 1.500,00") com fundo gradiente azul/vermelho, mesmo quando `diaAtual < 5`. A nota `* Projeção baseada em menos de 5 dias — pode variar.` está em `fontSize: 11, opacity: 0.55` — muito discreta.

### Recomendação
Quando `diaAtual < 3 || totalGastos === 0`:
- Mostrar o card em fundo cinza (neutro) com mensagem central: "Dados insuficientes para projeção confiável. Continue registrando por pelo menos 3 dias."
- Não mostrar o número de projeção que pode ser enganoso.

---

## Ranking por impacto antes dos testes reais

| ID | Descrição | Esforço | Impacto | Prioridade |
|---|---|---|---|---|
| UI-06 | Valores grandes em viewport estreito | 🟡 | Alto | **Alta** |
| UI-07 | Grid 3 colunas pode cortar em 320px | 🟢 | Alto | **Alta** |
| UI-04 | Label do hero mais legível | 🟡 | Médio | Média |
| UI-05 | Gráfico vazio parece broken | 🟢 | Médio | Média |
| UI-10 | Botão limpar no teclado | 🟢 | Médio | Média |
| UI-15 | Delay no botão destrutivo | 🟢 | Médio | Média |
| UI-16 | Projeção sem dados suficientes | 🟢 | Médio | Média |
| UI-01 | SpendingGauge cedo em 37% | 🟢 | Médio | Baixa |
| UI-02 | Barra de hoje reflete estado real | 🟢 | Médio | Baixa |
| UI-03 | UsoDoDiaBar sem label no zero | 🟢 | Baixo | Baixa |
| UI-13 | Haptic no limite MoneyInput | 🟢 | Baixo | Baixa |
| UI-14 | Chips sem estado ativo | 🟢 | Baixo | Baixa |
| UI-09 | Pill com explicação | 🟡 | Médio | Pode aguardar |
| UI-11 | Animação de voltar | 🟢 | Baixo | Pode aguardar |
| UI-12 | Legenda do gráfico | 🟢 | Baixo | Pode aguardar |
| UI-08 | Badge de saúde na tab | 🔴 | Médio | Decisão do dono |
