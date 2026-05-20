# BUG_REPORT.md — Hoje Dá
## Relatório de Bugs e Inconsistências Técnicas
**Versão auditada:** index.html (3.764 linhas, build v6)
**Data da auditoria:** 2026-05-17
**Metodologia:** Inspeção de código estático + simulação matemática de cenários

---

## Escala de severidade

| Nível | Critério |
|---|---|
| **Crítico** | Perda de dados, cálculo incorreto visível, crash |
| **Alto** | Comportamento inesperado que afeta decisão do usuário |
| **Médio** | Inconsistência de UI/comportamento, não afeta cálculo |
| **Baixo** | Código morto, feedback ausente, polish |

---

## BUG-01 — DialogAjustarOrcamento nunca é chamado (código morto)
**Severidade:** Baixo (componente inacessível, não afeta usuários)
**Arquivo:** index.html
**Linha:** ~3001

### Descrição
O componente `DialogAjustarOrcamento` é definido com lógica completa (campo de entrada, preview de impacto, botões confirmar/cancelar) mas nunca é renderizado em nenhum lugar do código. Não existe nenhuma chamada a ele em `App`, nos menus, ou em qualquer outra tela.

### Evidência
```javascript
// Componente definido na linha ~3001:
function DialogAjustarOrcamento({ valorAtual, state, onConfirmar, onCancelar }) { ... }

// Busca em todo o arquivo por "DialogAjustarOrcamento" → apenas definição, sem uso.
```

### Impacto funcional
Nenhum para o usuário final. O código apenas ocupa ~135 linhas sem serventia.

### Nota adicional
O componente também tem um bug interno: ele calcula `novaBase = stats.diasRestantes > 0 ? novoValor / state.diasDoMes : 0`. Isso usa `diasDoMes` como denominador (não `diasRestantes`), então o preview de "nova base/dia" seria baseado no ciclo inteiro, não nos dias restantes. Como não é usado, não afeta nada.

### Recomendação
Remover o componente ou conectá-lo a um fluxo (ex: botão no painel para ajustar apenas o valor sem reiniciar o ciclo).

---

## BUG-02 — Registro de transações após ciclo encerrado altera o saldo final
**Severidade:** Médio
**Arquivo:** index.html
**Linhas:** calcStats (~203–209), TelaEntrada (~2180), TelaPainel (~1875)

### Descrição
Quando o ciclo está encerrado (`cicloEncerrado = true`, ou seja, passou mais dias que `diasDoMes`), os botões "Gastei!" e "Recebi" ainda estão ativos e funcionais. O usuário pode registrar uma transação com data de hoje (que é após o fim do ciclo), e `calcStats` inclui essa transação nos totais porque:

```javascript
const txValidas = (state.transacoes || []).filter(t => {
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return !isNaN(d.getTime()) && d0 <= hoje_ts && d0 >= inicio_ts;
  // Não verifica d0 <= (inicio_ts + diasDoMes * 86400000)
});
```

`hoje_ts` é a data de hoje, que é após o fim do ciclo. A transação será incluída em `totalGastos`.

### Reprodução
1. Configurar ciclo com início 01/01/2026, duração 7 dias.
2. Abrir o app no dia 15/01/2026 (8 dias após o fim).
3. Clicar "Gastei!" e registrar R$ 100.
4. O saldo final do ciclo (que deveria estar fixo) é alterado.

### Impacto
- Saldo final exibido na TelaFechamentoCiclo pode ser alterado retroativamente.
- Quando o usuário inicia um novo ciclo e carrega o saldo, o `saldoTotalRestante` usado é o pós-bug.
- Inconsistência: um ciclo "encerrado" deveria ter saldo imutável.

### Correção sugerida (não implementar agora)
Em `calcStats`, filtrar também por `d0 <= inicio_ts + (safeDias - 1) * 86400000`. Ou desabilitar "Gastei!" e "Recebi" quando `cicloEncerrado`.

---

## BUG-03 — handleSalvarEdicao não dispara snackbar de confirmação
**Severidade:** Baixo
**Arquivo:** index.html
**Linha:** ~3564

### Descrição
Ao editar uma transação e salvar, a função `handleSalvarEdicao` atualiza o estado e dispara `triggerFlash`, mas **não chama `showSnackbar`**. O usuário vê o botão "Pronto, anotado ✅" por 700ms na tela de edição, mas ao retornar ao painel/histórico, nenhuma mensagem confirma que a edição foi salva.

### Comparação com fluxo de criação
```javascript
// Criar transação (linha ~3554):
function handleEntrada(tipo, ...) {
  update(...);
  showSnackbar(`✅ Gasto de ${fmt(valor)} registrado`); // ← presente
}

// Editar transação (linha ~3564):
function handleSalvarEdicao(...) {
  haptic('success');
  update(...);
  triggerFlash(editandoItem?.tipo || 'gasto');
  // ← showSnackbar ausente
}
```

### Impacto
Usuário não tem confirmação visual textual de que a edição foi aplicada. O flash no card principal é sutil e pode passar despercebido.

### Correção sugerida
Adicionar `showSnackbar('✅ Lançamento atualizado')` após `triggerFlash`.

---

## BUG-04 — accBufferStart em TelaPainel vs calcStats: gastos sem filtro inicio_ts
**Severidade:** Baixo (impacto raro, mas tecnicamente incorreto)
**Arquivo:** index.html
**Linhas:** TelaPainel ~1814, calcStats ~203

### Descrição
`gastosHoje` em TelaPainel é calculado assim:
```javascript
const gastosHoje = state.transacoes.filter(t =>
  t && t.tipo === 'gasto' && fmtDateKey(t.data) === hojeKey
).reduce((s, t) => s + t.valor, 0);
```
Filtra apenas por tipo e data de hoje. **Não filtra por `d0 >= inicio_ts`.**

`calcStats` usa `txValidas` que filtra por `d0 >= inicio_ts`. Se uma transação tiver data de hoje mas for de um ciclo anterior (ex: ciclo reconfigurando com data de início futura), `gastosHoje` a incluiria mas `totalGastos` não. Resultado: `accBufferStart` seria incorreto.

### Cenário de reprodução
1. Ciclo atual começa amanhã.
2. Existem transações de hoje de um ciclo anterior que foram mantidas por edição de config (com `isEditing = true`).
3. `gastosHoje` inclui essas transações, `calcStats` não.
4. `accBufferStart = max(0, disponivelHoje + gastosHoje - base)` usa um `gastosHoje` inflado.

### Probabilidade
Baixa em uso normal. Requer cenário específico de edição de config com transações de datas futuras.

### Correção sugerida
Adicionar filtro de `inicio_ts` ao cálculo de `gastosHoje` em TelaPainel.

---

## BUG-05 — Ciclos anteriores perdidos em "Recomeçar do zero"
**Severidade:** Alto
**Arquivo:** index.html
**Linha:** ~3645

### Descrição
```javascript
function handleRecomecarDoZero() {
  const reset = {
    configurado: false, valorMensal: 0, diasDoMes: 30,
    dataInicio: null, transacoes: []
    // ciclosAnteriores ausente → perdido!
  };
  saveState(reset); setState(reset);
}
```

A propriedade `ciclosAnteriores` não é incluída no reset. O histórico de ciclos anteriores é permanentemente apagado sem aviso específico.

Contraste: `handleNovoMes` preserva ciclos anteriores:
```javascript
const ciclosAnteriores = [...(state.ciclosAnteriores || []).slice(-11), cicloFechado];
const reset = { ...reset, ciclosAnteriores }; // preservado
```

### Impacto
Usuário que queria "recomeçar o ciclo atual" mas acidentalmente escolheu "Recomeçar do zero" perde todo o histórico de meses anteriores. O aviso no dialog menciona "histórico" mas não especifica que inclui ciclos anteriores.

### Correção sugerida
No dialog, tornar explícito: "Isso vai apagar X ciclos arquivados também." Ou oferecer "Recomeçar ciclo atual (mantém histórico)" como alternativa.

---

## BUG-06 — MoneyInput: limite de R$ 99.999,99 sem feedback visual
**Severidade:** Médio
**Arquivo:** index.html
**Linha:** ~487

### Descrição
```javascript
function pressKey(k) {
  if (k === '⌫') { ... return; }
  if (raw.length >= 7) return; // ← silencioso
  setRaw(r => r + k);
}
```

Quando o valor atinge R$ 99.999,99 (7 dígitos em centavos), o teclado para de responder. Não há haptic, animação, nem texto indicando que o limite foi atingido.

### Impacto
- Para valores acima de R$ 99.999,99 (ex: R$ 100.000 de aluguel comercial), o usuário simplesmente não consegue digitar mais e não sabe por quê.
- O usuário pode pensar que o app travou.

### Limites observados
- R$ 99.999,99 = 7 dígitos (máximo aceito)
- R$ 100.000,00 = 8 dígitos (bloqueado sem aviso)

### Correção sugerida
Quando `raw.length === 7`, disparo de haptic 'error' e animação de shake no display, ou exibir texto "Valor máximo: R$ 99.999,99".

---

## BUG-07 — Comportamento inconsistente de exclusão (Painel vs Histórico)
**Severidade:** Médio
**Arquivo:** index.html
**Linhas:** TelaPainel ~2127, TelaHistorico ~2525–2543

### Descrição
Dois comportamentos diferentes para excluir a mesma entidade (transação):

**No TelaPainel:**
```javascript
onClick={e => { e.stopPropagation(); haptic('light'); onExcluir(t.id); }}
// ← exclusão imediata, sem confirmação, snackbar com desfazer por 4s
```

**No TelaHistorico:**
```javascript
// Primeiro clique → mostra botões Cancelar/Confirmar
// Segundo clique em "Confirmar exclusão" → exclui
// ← confirmação explícita, sem snackbar de desfazer
```

### Impacto
- Inconsistência de padrão: usuário acostumado com o Histórico não espera exclusão imediata no Painel.
- No Painel, um toque acidental na lixeira (ao lado do valor, em tela pequena) exclui imediatamente.
- A janela de desfazer de 4 segundos pode não ser suficiente.

---

## BUG-08 — Posição do Snackbar pode ser coberta pelo TabBar
**Severidade:** Baixo
**Arquivo:** index.html
**Linhas:** Snackbar ~3401 (bottom: 72), TabBar ~3451

### Descrição
O Snackbar é posicionado com `position: 'absolute', bottom: 72`. O TabBar tem `padding: '6px 0 calc(10px + env(safe-area-inset-bottom))'` com altura mínima de ~50px. Com safe-area-inset-bottom em iPhones (34px), o TabBar pode ter altura de ~50+34=84px. O snackbar em `bottom: 72` poderia ser parcialmente coberto.

### Reprodução
Em iPhone 14 ou similar com home indicator (safe area bottom = 34px):
- TabBar height ≈ 84px
- Snackbar bottom = 72px → sobreposto pelo TabBar em ~12px

### Correção sugerida
`bottom: 'calc(72px + env(safe-area-inset-bottom))'` ou `bottom: 80`.

---

## BUG-09 — fmtDateKey usa toISOString() que pode retornar dia errado por timezone
**Severidade:** Médio
**Arquivo:** index.html
**Linha:** ~91

### Descrição
```javascript
const fmtDateKey = d => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};
```

E na linha ~92:
```javascript
const hojeKey = fmtDateKey(new Date().toISOString());
```

`new Date().toISOString()` retorna UTC. Se o usuário estiver no UTC−3 (Brasil), `toISOString()` às 23:00 retorna o dia seguinte em UTC. Mas `fmtDateKey` usa `dt.getDate()` (local time), então a conversão está correta aqui.

Porém, em `calcStats`:
```javascript
const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
```
Usa `Date.getFullYear/Month/Date` → local time. ✓

E em `handleEntrada`:
```javascript
const dataObj = dataLancamento ? new Date(dataLancamento + 'T12:00:00') : new Date();
```
Usa `T12:00:00` para evitar problemas de timezone em datas selecionadas. ✓

E `fmtDateKey(new Date().toISOString())` para `hojeKey`: `new Date().toISOString()` é UTC, mas `fmtDateKey` usa `dt.getDate()` = local. A string UTC pode ser "2026-05-18T02:00:00Z" (UTC) quando local é 2026-05-17T23:00-03:00. `new Date("2026-05-18T02:00:00Z").getDate()` = 18 se local time > UTC (UTC−X), ou = 17 se local time < UTC. Para UTC−3 às 23:00, UTC seria 02:00 do dia seguinte. `getDate()` = local date = 17. Correto.

**Conclusão:** A lógica está correta para UTC negativo (Brasil). Pode ter problemas em UTC+X onde `getDate()` retornaria o dia anterior. **Risco para usuários em fusos positivos.**

### Correção sugerida
Para robustez global: `const hojeKey = fmtDateKey(new Date())` em vez de `fmtDateKey(new Date().toISOString())`. `fmtDateKey(new Date())` sem conversão para string ISO é equivalente e mais direto.

---

## BUG-10 — TelaAnalise: "Diferença" pode ser positiva ou negativa sem indicação de qual é bom
**Severidade:** Baixo (UX/informacional, não cálculo)
**Arquivo:** index.html
**Linha:** ~2695

### Descrição
O card "Diferença" no resumo rápido da TelaAnalise mostra `valorDiarioBase − mediaGastoPorDia`. Quando positivo (você gastou menos que a meta), é verde. Quando negativo (você gastou mais que a meta), é vermelho.

Mas não há texto indicando "quanto você está poupando por dia" ou "quanto está passando por dia". O usuário vê apenas um número com cor.

Cenário: `Diferença: R$ 20,00` (verde). O que significa? Que eu poupei R$ 20 por dia? Que sobrou R$ 20? A cor ajuda mas sem contexto semântico o número é ambíguo.

### Sugestão
Adicionar texto contextual: "poupando R$ 20/dia" ou "passando R$ 20/dia". Ou um ícone de seta up/down.

---

## BUG-11 — Onboarding pode ser re-visto mas não tem "pular"
**Severidade:** Baixo
**Arquivo:** index.html
**Linha:** ~3137, ~3626

### Descrição
`handleVoltarParaOnboarding` (chamado quando não há estado configurado e o usuário toca "cancelar" na config) remove `onboardingSeen` e exibe o onboarding novamente. Isso é correto para o fluxo normal.

Mas: usuário que já configurou e faz "Recomeçar do zero" também vê o onboarding novamente (linha ~3650):
```javascript
localStorage.removeItem('onboardingSeen'); setOnboardingVisto(false);
```

Para um usuário que já conhece o app e quer apenas recomeçar um ciclo novo, ver o onboarding completo é redundante. Não há botão "Pular".

### Sugestão
Adicionar link "Pular" no onboarding, ou não mostrar o onboarding após "Recomeçar do zero" para usuários que já tinham dados.

---

## Resumo dos Bugs

| ID | Descrição | Severidade | Prioridade antes dos testes |
|---|---|---|---|
| BUG-01 | DialogAjustarOrcamento nunca chamado | Baixo | Não |
| BUG-02 | Transações após ciclo encerrado alteram saldo | Médio | **Sim** |
| BUG-03 | Sem snackbar ao salvar edição | Baixo | Sim |
| BUG-04 | gastosHoje sem filtro inicio_ts | Baixo | Não (raro) |
| BUG-05 | ciclosAnteriores perdidos no "recomeçar" | Alto | **Sim** |
| BUG-06 | MoneyInput sem feedback ao atingir limite | Médio | Sim |
| BUG-07 | Exclusão inconsistente Painel vs Histórico | Médio | **Sim** |
| BUG-08 | Snackbar coberto pelo TabBar em iPhone | Baixo | Sim |
| BUG-09 | fmtDateKey com fuso UTC+ pode errar dia | Médio | Sim (se lançar global) |
| BUG-10 | "Diferença" sem contexto semântico | Baixo | Não |
| BUG-11 | Onboarding sem "pular" após recomeçar | Baixo | Não |

### Bugs críticos para testes reais
Nenhum bug é **Crítico** (perda de dados ou cálculo errado visível). Os mais relevantes para testes são:
- **BUG-05**: O usuário pode perder histórico acidentalmente.
- **BUG-07**: Exclusão acidental no painel.
- **BUG-02**: Registrar gastos após ciclo encerrado.
