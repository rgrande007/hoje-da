# ACTION_PLAN.md — Hoje Dá
## Plano de Ação Priorizado
**Baseado em:** QA_SIMULATED_USERS.md, UX_USABILITY_REPORT.md, BUG_REPORT.md, UI_POLISH_RECOMMENDATIONS.md, PRE_REAL_TEST_CHECKLIST.md
**Data:** 2026-05-17
**Status:** Aguardando aprovação — nada foi implementado ainda.

---

## Legenda de risco

| Risco | Significado |
|---|---|
| 🟢 Baixo | Mudança localizada, sem lógica de estado, reversível |
| 🟡 Médio | Envolve lógica de estado ou decisão de produto |
| 🔴 Alto | Refactor, novo componente, ou pode quebrar outros fluxos |

---

# GRUPO 1 — Corrigir antes dos testes reais

Esses problemas vão contaminar o feedback dos primeiros usuários: eles vão reportar confusão causada por linguagem ou comportamento inesperado, não pelos fluxos que você quer testar. Corrija primeiro.

---

### A-01 — Terminologia técnica exposta: "cota" e "margem"

**Problema:** Os termos internos "cota" e "margem" aparecem em pelo menos 8 lugares visíveis ao usuário, incluindo o onboarding (passo 2), o painel principal, o breakdown e o histórico de ciclos. Esses termos são definidos no CLAUDE.md como terminologia interna — não devem aparecer para o usuário final.

**Impacto no usuário:** Um usuário leigo vê "Sua cota de hoje" e "restam da margem" logo na primeira interação e não entende o que o app está dizendo. O usuário pode desistir antes de explorar. Durante testes, você vai receber feedback "não entendi" que é na verdade sobre linguagem, não sobre lógica.

**Risco de mexer:** 🟢 Baixo. São substituições de strings literais. Sem lógica financeira envolvida. O maior risco é esquecer alguma ocorrência — buscar `"cota"` e `"margem"` no arquivo confirma todos os locais.

**Componentes afetados:**
- `OnboardingScreen` (~3137): passo 2 — "a cota diária reaproveita a margem de dias passados"
- `TelaConfig` (~901): preview — "Sua cota diária"
- `TelaPainel` (~1934): hero estado noTx — "Sua cota de hoje"
- `CalculationBreakdownSheet` (~1563): "Cota de hoje"
- `UsoDoDiaBar` (~1774–1792): ticks — "restam da margem" / "restam da cota"
- `TelaHistorico` (~2582): ciclos anteriores — "cota X/dia"

**Proposta de correção:**

| Local | Texto atual | Substituir por |
|---|---|---|
| Onboarding passo 2 | "a cota diária reaproveita a margem de dias passados" | "o que você economizou nos dias anteriores fica guardado" |
| TelaConfig preview | "Sua cota diária" | "Você tem por dia" |
| TelaPainel hero (noTx) | "Sua cota de hoje" | "Você pode gastar hoje" |
| Breakdown | "Cota de hoje" | "Valor de hoje" |
| UsoDoDiaBar tick | "restam da margem" | "reserva guardada" |
| UsoDoDiaBar tick | "restam da cota" | "ainda pode gastar" |
| Histórico ciclos | "cota X/dia" | "X por dia" |
| Fechamento positivo | "de saldo positivo neste ciclo" | "economizados neste ciclo" |

**Como testar depois:** Buscar `"cota"` e `"margem"` no HTML (case-insensitive) e confirmar que não aparecem em strings de UI. Abrir o app do zero e ler cada tela em voz alta.

---

### A-02 — Pill "Apertado" para dois estados opostos

**Problema:** A pill amarela "Apertado" é usada em duas situações com urgência completamente diferente:
- **Situação A** (`cotaDiaExcedida = true`): gastou mais que o valor do dia, mas ainda tem saldo positivo dos dias anteriores. Tudo certo, apenas usou a reserva.
- **Situação B** (`ratioMargem < 0.25`): saldo total muito baixo (menos de 25% da cota diária). Alerta genuíno, o usuário precisa frear.

Ambas as situações exibem a mesma pill amarela com o mesmo label "Apertado".

**Impacto no usuário:** Usuário impulsivo (situação A) se alarma desnecessariamente. Usuário com saldo genuinamente baixo (situação B) pode confundir com a situação A e ignorar o alerta. Nos testes, você vai ouvir "o app me diz que estou apertado mas eu estou bem" — poluindo o feedback.

**Risco de mexer:** 🟡 Médio. A lógica de status é bem isolada em `getStatusDiario` (~249), mas é necessário decidir o produto antes de mexer (decisão D-01 do checklist). Criar uma pill nova requer CSS + lógica de cor.

**Componentes afetados:**
- `getStatusDiario` (~249): definição dos dois estados que resultam em "Apertado"
- `TelaPainel` (hero, pill): renderização do label e cor

**Proposta de correção:**
Separar os dois estados visualmente:
- Situação A (cotaDiaExcedida): pill azul-escuro ou slate, label **"Sobra usada"** — não alarmar
- Situação B (ratioMargem < 0.25): pill amarela, label **"Atenção"** — manter o alerta

A frase do hero já diferencia os dois casos — a pill precisa seguir o mesmo raciocínio.

**Como testar depois:** Criar dois cenários: (1) gasto > base mas saldo positivo → verificar pill azul-escuro "Sobra usada"; (2) saldo total < 25% da base → verificar pill amarela "Atenção".

---

### A-03 — Label do hero "Disponível no plano" ambíguo

**Problema:** Quando `cotaDiaExcedida = true`, o label do número principal muda de "Disponível hoje" para "Disponível no plano". O usuário pode interpretar "estou fora do plano e tenho apenas R$ X" — o oposto da mensagem que o app quer passar.

```javascript
// TelaPainel ~1934
{isNeg ? 'Fora do previsto' : noTx ? 'Sua cota de hoje' : cotaDiaExcedida ? 'Disponível no plano' : 'Disponível hoje'}
```

**Impacto no usuário:** Ansiedade desnecessária. O usuário vê "Disponível no plano: R$ 50" e não sabe se isso é bom ou ruim. A frase do hero explica, mas o label lido primeiro contradiz.

**Risco de mexer:** 🟢 Baixo. Mudança de string literal em uma expressão ternária.

**Componentes afetados:**
- `TelaPainel` (~1934): expressão ternária do label

**Proposta de correção:**
Substituir `'Disponível no plano'` por `'Ainda disponível'`.

**Como testar depois:** Registrar gasto maior que o valor do dia (mas com saldo total positivo) e verificar que o label exibe "Ainda disponível".

---

### A-04 — Aviso insuficiente no "Recomeçar do zero" (BUG-05)

**Problema:** `handleRecomecarDoZero` apaga permanentemente `ciclosAnteriores` (o histórico de todos os ciclos arquivados) sem mencioná-los explicitamente. O dialog atual diz "Todas as suas movimentações, orçamento e histórico serão apagados permanentemente" — mas o usuário pode não entender que inclui ciclos de meses anteriores.

```javascript
// handleRecomecarDoZero ~3645
const reset = { configurado: false, valorMensal: 0, diasDoMes: 30, dataInicio: null, transacoes: [] };
// ciclosAnteriores ausente → apagado para sempre
```

**Impacto no usuário:** Usuário que queria "recomeçar o ciclo atual" mas escolheu "Recomeçar do zero" perde meses de histórico irreversivelmente. Durante testes, isso pode destruir dados de teste.

**Risco de mexer:** 🟢 Baixo. Apenas mudar o texto do dialog + adicionar contagem de ciclos anteriores. Não muda a lógica do reset em si (ver D-04 para a decisão de produto).

**Componentes afetados:**
- `DialogReiniciar` ou o dialog de confirmação de "Recomeçar do zero" (~3645)
- `handleRecomecarDoZero` (~3645): texto do aviso

**Proposta de correção:**
Adicionar ao texto do aviso a contagem de ciclos anteriores:
```javascript
const numCiclos = (state.ciclosAnteriores || []).length;
// Texto: numCiclos > 0
//   ? `Isso também vai apagar ${numCiclos} ciclo(s) anterior(es) arquivado(s). Essa ação não pode ser desfeita.`
//   : `Essa ação não pode ser desfeita.`
```

**Como testar depois:** Arquivar 2 ciclos via "Novo ciclo". Ir em "Recomeçar do zero" e verificar que o aviso menciona "2 ciclos anteriores arquivados". Confirmar e verificar que `ciclosAnteriores` foi de fato apagado.

---

### A-05 — Sem confirmação ao salvar edição de lançamento (BUG-03)

**Problema:** `handleSalvarEdicao` usa haptic e triggerFlash, mas não chama `showSnackbar`. O usuário edita um lançamento, vê o botão mudar para "Pronto ✅" por 700ms, a tela fecha — e ao retornar ao painel não há nenhuma confirmação textual de que a edição foi salva.

**Impacto no usuário:** Usuário não tem certeza se a edição foi aplicada. Pode tentar editar novamente. Durante testes, pode criar confusão nos dados de teste.

**Risco de mexer:** 🟢 Muito baixo. Adicionar 1 linha de código.

**Componentes afetados:**
- `handleSalvarEdicao` no `App` (~3564)

**Proposta de correção:**
```javascript
function handleSalvarEdicao({ valor, descricao, categoria, dataLancamento }) {
  haptic('success');
  update(prev => ...);
  triggerFlash(editandoItem?.tipo || 'gasto');
  showSnackbar('✅ Lançamento atualizado'); // ← adicionar esta linha
}
```

**Como testar depois:** Editar qualquer lançamento e verificar que o snackbar "Lançamento atualizado" aparece ao retornar ao painel ou histórico.

---

# GRUPO 2 — Melhorar se for rápido e seguro

Esses problemas são reais, mas não vão contaminar o feedback dos primeiros testes da mesma forma. Implemente se houver tempo antes dos testes; caso contrário, priorize para a segunda rodada.

---

### B-01 — Registrar gastos após ciclo encerrado (BUG-02 / UX-16)

**Problema:** Quando `cicloEncerrado = true`, os botões "Gastei!" e "Recebi" ainda estão ativos. O usuário pode registrar uma transação com data de hoje (pós-ciclo), que é incluída nos cálculos do ciclo encerrado, alterando o saldo final.

**Impacto no usuário:** Saldo final do ciclo encerrado pode ser alterado retroativamente, contaminando o valor que é transferido para o próximo ciclo.

**Risco de mexer:** 🟢 Baixo. Apenas condicionar os botões à flag `cicloEncerrado` que já existe.

**Componentes afetados:**
- `TelaPainel` (~1875): botões "Gastei!" e "Recebi"

**Proposta de correção:**
Quando `stats.cicloEncerrado`:
- Substituir os botões "Gastei!" / "Recebi" por um único botão "Iniciar próximo ciclo"
- Ou mostrar os botões desabilitados com tooltip "Ciclo encerrado — inicie um novo ciclo para continuar"

**Como testar depois:** Criar ciclo com data de início anterior que já encerrou. Verificar que os botões estão desabilitados ou ausentes, e que o botão de novo ciclo está visível.

---

### B-02 — Exclusão inconsistente: Painel imediata vs Histórico com confirmação (BUG-07 / UX-07)

**Problema:** Dois comportamentos completamente diferentes para excluir a mesma entidade:
- **No Painel:** um toque na lixeira exclui imediatamente (snackbar "Desfazer" por 4s)
- **No Histórico:** clicar expande botões "Cancelar / Confirmar exclusão" antes de excluir

**Impacto no usuário:** Exclusão acidental no Painel (toque inadvertido). Usuário vindo do Histórico não espera a exclusão imediata. A janela de 4s para "Desfazer" é curta para quem não estava esperando.

**Risco de mexer:** 🟡 Médio. Mudar o Painel para pedir confirmação ou aumentar o timer são mudanças de comportamento que podem surpreender quem já usa.

**Componentes afetados:**
- `TelaPainel` (~2127): comportamento da lixeira no card "Últimos movimentos"
- `TelaHistorico` (~2525–2543): comportamento de exclusão

**Proposta de correção (opções):**
- **Opção A (recomendada):** Padronizar para o modelo do Painel (exclusão + desfazer), mas aumentar o timer de 4s para 8s e aplicar o mesmo no Histórico.
- **Opção B:** Padronizar para o modelo do Histórico (confirmação explícita) em ambas as telas.

**Como testar depois:** Excluir uma transação de cada tela e verificar que o comportamento é idêntico.

---

### B-03 — MoneyInput sem feedback ao atingir limite (BUG-06 / UX-14)

**Problema:** Quando o valor atinge R$ 99.999,99 (7 dígitos), o teclado simplesmente para de responder. Nenhum haptic, nenhuma animação, nenhum texto. O usuário pode pensar que o app travou.

**Impacto no usuário:** Confusão. Usuário desiste ou tenta reiniciar o app.

**Risco de mexer:** 🟢 Baixo. Adicionar 2 linhas no `pressKey`.

**Componentes afetados:**
- `pressKey` em `MoneyInput` (~487)

**Proposta de correção:**
```javascript
if (raw.length >= 7) {
  haptic('error');
  // opcional: adicionar animação de shake no display
  return;
}
```
E/ou exibir texto "Valor máximo: R$ 99.999,99" quando o limite for atingido.

**Como testar depois:** Digitar 7 dígitos e verificar feedback haptic/visual. Tentar digitar um 8º dígito e confirmar que não é aceito mas há feedback.

---

### B-04 — Valores grandes cortados em viewport 320px (UI-06 + UI-07)

**Problema:** Na `TelaFechamentoCiclo`, o hero usa `fontSize: 48`. Em valores como "R$ 10.000,00" em tela de 320px (padding 32px = 288px disponíveis), o texto pode cortar. O grid de 3 colunas com `fontSize: 15` sofre o mesmo problema.

**Impacto no usuário:** Layout quebrado em dispositivos comuns no Brasil (Samsung Galaxy A14, 360px; iPhone SE, 375px).

**Risco de mexer:** 🟢 Baixo. Mudança de valor CSS, sem lógica.

**Componentes afetados:**
- `TelaFechamentoCiclo` (~1315): hero do fechamento
- `TelaFechamentoCiclo` (~1325): grid de 3 colunas

**Proposta de correção:**
```javascript
// Hero:
fontSize: 'clamp(32px, 11vw, 48px)'

// Grid de 3 colunas — adicionar nos valores:
overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
// ou: fontSize: 'clamp(12px, 3.5vw, 15px)'
```

**Como testar depois:** Testar em viewport 320px (DevTools) com valor "R$ 99.999,99" e verificar que não corta.

---

### B-05 — Snackbar coberto pelo TabBar em iPhone (BUG-08)

**Problema:** Snackbar usa `bottom: 72`. Em iPhones com home indicator (safe-area-inset-bottom = 34px), o TabBar pode ter ~84px de altura. O snackbar fica coberto em ~12px.

**Impacto no usuário:** Snackbar parcialmente invisível em iPhone 14, 15, etc.

**Risco de mexer:** 🟢 Muito baixo. Mudar 1 valor CSS.

**Componentes afetados:**
- Snackbar (~3401)

**Proposta de correção:**
```javascript
bottom: 'calc(72px + env(safe-area-inset-bottom))'
```

**Como testar depois:** Testar em iPhone real ou com DevTools em modo iPhone 14, verificar que snackbar está visível acima do TabBar.

---

### B-06 — Gráfico semanal vazio parece quebrado (UI-05 / UX-11)

**Problema:** No estado inicial (sem transações), o `WeeklyMiniChart` exibe 7 barras minúsculas — a de hoje é azul com 8px, as outras são cinzas ou pontilhadas. Para o usuário novo, parece um gráfico com erro de dados.

**Impacto no usuário:** Primeira impressão de que o app está com problema. Pode gerar desconfiança antes do primeiro uso.

**Risco de mexer:** 🟢 Baixo. Adicionar um guard e texto de placeholder.

**Componentes afetados:**
- `WeeklyMiniChart` (~1044)

**Proposta de correção:**
Quando `transacoes.filter(t => t.tipo === 'gasto').length === 0`, sobrepor o gráfico com texto centrado:
```
"Seus gastos da semana aparecem aqui"
```
Manter a lógica atual quando houver pelo menos 1 transação.

**Como testar depois:** Abrir o app em estado zero (sem transações). Verificar que o texto placeholder aparece. Registrar um gasto e verificar que o gráfico aparece normalmente.

---

### B-07 — Projeção exibida com dados insuficientes (UI-16 / UX-09)

**Problema:** A `TelaAnalise` exibe o card de projeção com gradiente colorido e número grande mesmo com apenas 1 dia de dados. Com `mediaGastoPorDia = 0` (sem gastos), a projeção cresce como se o usuário não fosse gastar nada — resultado absurdamente otimista.

**Impacto no usuário:** Decisões financeiras baseadas em projeção sem base estatística. O aviso atual (nota `* Projeção baseada em menos de 5 dias`) está em `fontSize: 11, opacity: 0.55` — invisível na prática.

**Risco de mexer:** 🟢 Baixo. Adicionar guard com estado visual neutro.

**Componentes afetados:**
- `TelaAnalise` (~2628): card de projeção do ciclo

**Proposta de correção:**
Quando `stats.diaAtual < 3 || stats.totalGastos === 0`:
- Fundo do card: cinza neutro (em vez do gradiente azul/vermelho)
- Texto central: "Continue registrando por pelo menos 3 dias para uma projeção confiável."
- Não exibir o número de projeção

**Como testar depois:** Abrir TelaAnalise com 1 dia de dados e verificar estado neutro. Com 3+ dias e gastos, verificar que o card de projeção normal aparece.

---

# GRUPO 3 — Deixar para depois

Válidos, mas não afetam os primeiros testes. Resolver após validar os fluxos principais com usuários reais.

---

### C-01 — BUG-01: DialogAjustarOrcamento código morto

**Problema:** Componente `DialogAjustarOrcamento` (~3001, ~135 linhas) totalmente implementado mas nunca referenciado em nenhum lugar do app.

**Proposta:** Remover o componente ou conectá-lo a um fluxo real. Contém também um bug interno no cálculo de preview (usa `diasDoMes` em vez de `diasRestantes`), mas como nunca é chamado, não afeta ninguém.

**Quando:** Só fazer quando houver decisão sobre o fluxo de "ajustar ciclo sem reiniciar".

---

### C-02 — BUG-04: gastosHoje sem filtro inicio_ts

**Problema:** Em `TelaPainel` (~1814), `gastosHoje` não filtra por `inicio_ts`, podendo incluir transações de ciclos anteriores em edge case muito específico (ciclo reconfigurando com transações de ciclo anterior na mesma data).

**Proposta:** Adicionar filtro `d0 >= inicio_ts` no cálculo de `gastosHoje` em TelaPainel.

**Quando:** Baixa prioridade — cenário quase impossível em uso normal.

---

### C-03 — BUG-09: fmtDateKey problemático em fuso UTC+

**Problema:** `fmtDateKey(new Date().toISOString())` para `hojeKey` funciona corretamente para UTC−3 (Brasil), mas pode retornar data errada em fusos UTC+ (ex: UTC+5, +9).

**Proposta:** Simplificar para `fmtDateKey(new Date())` sem converter para ISO string.

**Quando:** Antes de qualquer expansão internacional.

---

### C-04 — BUG-10: Card "Diferença" sem contexto semântico

**Problema:** Na TelaAnalise, o card "Diferença" mostra um número positivo/negativo com cor, mas sem texto explicativo: "poupando R$ 20/dia" ou "passando R$ 20/dia".

**Proposta:** Adicionar sublabel contextual abaixo do valor.

---

### C-05 — BUG-11: Onboarding sem botão "Pular" após "Recomeçar do zero"

**Problema:** Usuário que faz "Recomeçar do zero" e já conhece o app é forçado a ver o onboarding completo novamente. Não há "Pular".

**Proposta:** Detectar se `ciclosAnteriores` tinha dados antes do reset (ex: via localStorage temporário) e mostrar "Pular" no onboarding.

---

### C-06 — UX-04 / UI-01: SpendingGauge marcador em 37% no estado "Ainda cedo"

**Problema:** Quando `estado = 'cedo'`, o triângulo fica em `pos = 37` (zona azul) com cor cinza. Posição arbitrária sem sentido.

**Proposta (opção A):** Não renderizar o triângulo quando `estado = 'cedo'`. Manter apenas a mensagem e a régua.

---

### C-07 — UX-05: Breakdown sem contexto de déficit acumulado

**Problema:** Quando o déficit é maior que o gasto do dia (acumulado ao longo de vários dias), o breakdown não explica os dias anteriores — só mostra o dia de hoje.

**Proposta:** Adicionar linha "Saldo antes de hoje: −R$ X" quando `isNeg && abs(déficit) > gastosHoje`.

---

### C-08 — UX-06 / D-03: Breakdown ausente no estado zero transações

**Problema:** O botão "Como chegamos aqui?" não aparece quando não há transações (`{!noTx && <button...>}`). Usuário de primeira viagem não consegue verificar o cálculo da cota.

**Proposta:** Mostrar o breakdown também no estado zero, exibindo apenas cota + total planejado + divisão por dias.

**Decisão de produto necessária (D-03).**

---

### C-09 — UX-10 / UI-02: Barra de hoje sempre azul no gráfico semanal

**Problema:** A barra de hoje no `WeeklyMiniChart` é sempre azul, mesmo quando o gasto ultrapassou a cota (e o hero já está amarelo/vermelho). Inconsistência visual.

**Proposta:** Colorir a barra de hoje com a mesma lógica das outras barras, mantendo box-shadow azul para destacar que é hoje.

---

### C-10 — UX-12: Dois caminhos para "Novo ciclo"

**Problema:** O caminho pelo banner (TelaFechamentoCiclo) inclui o resumo do ciclo. O caminho pelo menu (DialogReiniciar direto) pula esse resumo.

**Proposta:** Quando `cicloEncerrado = true`, redirecionar o menu "Novo ciclo" para TelaFechamentoCiclo antes do dialog.

---

### C-11 — UX-13 / UI-10: MoneyInput sem botão limpar

**Problema:** Para corrigir um valor digitado, o usuário precisa pressionar ⌫ para cada dígito. Sem botão de limpar tudo.

**Proposta:** Substituir a posição vazia do grid numérico por botão "C" (clear) quando `raw.length > 2`.

---

### C-12 — UI-03: UsoDoDiaBar sem contexto no estado zero gastos

**Problema:** Quando `gastosHoje = 0`, a barra aparece cheia (azul + amarelo) sem balloon e sem texto explicativo.

**Proposta:** Adicionar texto pequeno "Barra cheia · Nenhum gasto registrado ainda" ou esconder a barra quando sem gastos.

---

### C-13 — UI-04: Label do hero com hierarquia visual fraca

**Problema:** O label ("Disponível hoje", "Fora do previsto") está em `fontSize: 11, fontWeight: 600, color: T.textTer` — quase invisível. O número é em 48px mas sem contexto legível.

**Proposta:** Aumentar para `fontSize: 13, fontWeight: 700, color: T.textSec`.

---

### C-14 — UI-09: Pills sem explicação acessível

**Problema:** "No plano", "Apertado", "Passou", "Com folga" não têm nenhuma explicação para usuários de primeira viagem.

**Proposta:** Ao tocar na pill, mostrar mini bottom sheet com explicação de cada estado.

---

### C-15 — UI-11: Animação de retorno não aplicada

**Problema:** CSS `screen-back` está definido mas não é usado ao voltar de telas. Todas as transições usam `screen-enter`.

**Proposta:** Usar `screen-back` ao navegar para trás e `screen-enter` ao avançar (requer estado de direção de navegação).

---

### C-16 — UI-13: Sem haptic no limite do MoneyInput

**Problema:** Quando `raw.length >= 7`, o teclado para sem nenhum haptic de erro.

**Proposta:** `haptic('error')` quando o limite for atingido. (Relacionado ao B-03 — pode ser implementado junto.)

---

### C-17 — UI-14: Chips de quick-select sem estado ativo

**Problema:** Os chips "Este mês / Hoje +30d / Próx. ciclo" na TelaConfig não mudam visualmente ao ser selecionados.

**Proposta:** Adicionar estado `selectedChip` e estilo ativo (`background: T.blue, color: '#fff'`).

---

### C-18 — UI-15: Botão "Apagar tudo" sem delay de segurança

**Problema:** O botão de confirmação de "Recomeçar do zero" é imediatamente clicável, sem fricção.

**Proposta:** Delay de 2 segundos com countdown visual antes de habilitar o botão.

---

# Itens que precisam de decisão antes de implementar

Esses não são bugs — são escolhas de produto. Precisam da sua resposta antes de qualquer implementação.

| ID | Pergunta |
|---|---|
| **D-01** | Pill para `cotaDiaExcedida`: criar "Sobra usada" / "Dentro do plano" ou manter "Apertado"? |
| **D-02** | SpendingGauge: manter a régua visual ou simplificar para apenas o texto ("Você gasta R$ X a menos por dia")? |
| **D-03** | Breakdown: mostrar no estado zero transações? |
| **D-04** | "Recomeçar do zero": oferecer "Recomeçar mantendo histórico" como alternativa, ou apenas melhorar o aviso? |
| **D-05** | Limite MoneyInput: manter R$ 99.999,99 ou aumentar para R$ 999.999,99 (10 dígitos)? |
| **D-06** | Mostrar saldo disponível no botão "Gastei!": "Gastei! · R$ 71,50 restam"? |

---

# Resumo executivo

| Grupo | Itens | Esforço estimado | Impacto nos testes |
|---|---|---|---|
| Grupo 1 (antes dos testes) | 5 itens (A-01 a A-05) | ~1 dia | Reduz ruído de feedback em ~70% |
| Grupo 2 (se rápido e seguro) | 7 itens (B-01 a B-07) | ~1–2 dias | Melhora qualidade da experiência |
| Grupo 3 (deixar para depois) | 18 itens (C-01 a C-18) | variável | Não bloqueia testes |

**Recomendação:** Implemente o Grupo 1 antes de qualquer teste com usuário real. O Grupo 2 pode ser feito em paralelo ou logo depois dos primeiros testes. O Grupo 3 pode entrar no roadmap pós-validação.
