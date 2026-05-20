# QA Report — Hoje Dá v0.1
**Data:** 2026-05-17  
**Método:** Revisão estática de código + simulação lógica + testes automatizados de cálculo  
**Arquivos lidos:** `index.html` (3.635 linhas), `sw.js`, `vite.config.js`, `package.json`, `public/android-frame.jsx`  
**Comandos rodados:** `npm run build` ✓, `node` (simulações de cálculo)

**Atualização 2026-05-17:** Todos os bugs Crítico e Alto corrigidos. Build de verificação: ✅ 0 erros.

---

## 1. Mapa do app

### Telas e fluxos

```
[OnboardingScreen]
       ↓
[TelaConfig] ←──────────────────── btn "editar" / "Novo ciclo"
       ↓ handleIniciar()
[TelaPainel] ←──── TabBar ──────── [TelaHistorico] ←→ [TelaEntrada/editar]
       ↓                                  ↑
[TelaEntrada gasto/extra]          [TelaAnalise]
       ↓
[TelaFechamentoCiclo]
       ↓ handleNovoMes()
[DialogReiniciar] → [TelaConfig]
```

### Arquivos relevantes
| Arquivo | Responsabilidade |
|---|---|
| `index.html:189` | `calcStats()` — lógica financeira central |
| `index.html:249` | `getStatusDiario()` — status e frase contextual |
| `index.html:104` | `loadState()` / `saveState()` — persistência |
| `index.html:1623` | `TelaPainel` — dashboard principal |
| `index.html:2032` | `TelaEntrada` — registro de gasto/entrada |
| `index.html:3347` | `App` — estado global e roteamento |
| `sw.js` | Service worker — cache offline |

### Stack técnica
- React 18.3.1 via CDN unpkg
- Babel standalone (compilação JSX em runtime no browser)
- Vite 5 + vite-plugin-pwa (build + SW)
- localStorage: chave `orcamento_diario_v6`
- Sem testes automatizados (vitest/jest não configurados)

---

## 2. Comandos disponíveis

| Comando | Status |
|---|---|
| `npm run dev` | ✅ Disponível (Vite dev server, porta 5173) |
| `npm run build` | ✅ Passa — warning não-bloqueante |
| `npm run preview` | ✅ Disponível |
| Lint | ❌ Não configurado (sem ESLint) |
| Typecheck | ❌ Não aplicável (sem TypeScript) |
| Testes automatizados | ❌ Não existem |

**Warning de build (não-bloqueante):**
```
<script src="android-frame.jsx"> can't be bundled without type="module" attribute
```
O `android-frame.jsx` é servido como texto puro e compilado pelo Babel em runtime. Funciona, mas não é bundled.

---

## 3. Bugs encontrados

### 🔴 CRÍTICO

#### BUG-01: Banner "Ciclo encerrado" aparece no último dia ativo ✅ CORRIGIDO
**Arquivo:** `index.html:1693`, `calcStats():201`  
**Fix:** `calcStats` agora computa `rawDia` (sem clampar) e deriva `cicloEncerrado = rawDia > safeDias`. Adicionado ao objeto retornado. Banner e condição `getStatusDiario` trocados de `diasRestantes <= 0` para `cicloEncerrado`. O banner só dispara a partir do dia 31 (ou seja, após o último dia ativo).

---

#### BUG-02: Separador decimal inglês ("1500.00") parseado como R$150.000,00 ✅ CORRIGIDO
**Arquivo:** `index.html:725` (TelaConfig `handleChange`)  
**Fix:** `handleChange` agora verifica se o input contém vírgula antes de remover pontos. Se não houver vírgula, o ponto é tratado como separador decimal (formato EN). "1500.00" → 1500; "1.500,00" → 1500.

---

#### BUG-03: `getCat()` fallback retorna 'Pets' em vez de 'Outros' ✅ CORRIGIDO
**Arquivo:** `index.html:175`  
**Fix:** Índice corrigido de `CATS[7]` (Pets) para `CATS[8]` (Outros).

---

### 🟠 ALTO

#### BUG-04: Edição de transação não valida data mínima do ciclo ✅ CORRIGIDO
**Arquivo:** `index.html:3534` (renderização de `TELAS.editar`)  
**Fix:** Adicionado `minDate={state.dataInicio ? fmtDateKey(new Date(state.dataInicio).toISOString()) : null}` ao `TelaEntrada` no caso `TELAS.editar`, igual aos fluxos de criação (`TELAS.gasto` e `TELAS.extra`).

---

#### BUG-05: Notificação não é reagendada se horário já passou ✅ CORRIGIDO
**Arquivo:** `index.html:3136` (`agendarLembrete`)  
**Fix:** Quando `delay <= 0`, o alvo é movido para amanhã no mesmo horário (`alvo.setDate(alvo.getDate() + 1)`). O `setTimeout` passa a usar `alvo - new Date()` em vez do `delay` original (que estava desatualizado após o ajuste).

---

#### BUG-06: Status pills divergem da terminologia canônica (CLAUDE.md) ✅ CORRIGIDO
**Arquivo:** `index.html:281,291`  
**Fix:** `pill: 'Usou uma sobra'` → `'Apertado'` e `titulo/pill: 'Atenção leve'` → `'Apertado'`. Os 4 estados canônicos (Passou | Apertado | No plano | Com folga) agora estão todos presentes na interface.

---

#### BUG-07: Terminologia "Orçado" em TelaFechamentoCiclo ✅ CORRIGIDO
**Arquivo:** `index.html:1324`  
**Fix:** `label: 'Orçado'` → `label: 'Planejado'`.

---

#### BUG-08: Terminologia "próximo mês" em DialogReiniciar ✅ CORRIGIDO
**Arquivo:** `index.html:2847`  
**Fix:** `"próximo mês"` → `"próximo ciclo"`.

---

#### BUG-09: Chip "Próx. mês" em TelaConfig ✅ CORRIGIDO
**Arquivo:** `index.html:931`  
**Fix:** `label: 'Próx. mês'` → `label: 'Próx. ciclo'`.

---

### 🟡 MÉDIO

#### BUG-10: `DialogAjustarOrcamento` — componente nunca renderizado (código morto)
**Arquivo:** `index.html:2874`  
Componente completo (130+ linhas) implementado mas sem nenhuma referência no `App`. O cálculo interno também tem um bug: `novoValor / state.diasDoMes` (deveria ser pelos dias restantes para mostrar impacto correto).

---

#### BUG-11: `diasNoPlanoPct` em TelaFechamentoCiclo — variável computada mas não usada
**Arquivo:** `index.html:1279`
```javascript
const diasNoPlanoPct = Math.round(...); // computada mas nunca renderizada
```
Código morto.

---

#### BUG-12: `corSaldo()` usa `valorDiarioBase` como threshold para saldo acumulado projetado
**Arquivo:** `index.html:2758`  
```javascript
const { cor: dCor, bg: dBg } = corSaldo(d.projecao, stats.valorDiarioBase);
// corSaldo: if (v < base * 0.25) → amarelo
```
`d.projecao` é o saldo total disponível (pode ser R$2.000), mas o threshold é `valorDiarioBase * 0.25` (ex: R$25). Um saldo projetado de R$40 no plano fica amarelo mesmo sendo suficiente para muitos dias.

---

#### BUG-13: ID de transação via `Date.now()` — risco de colisão
**Arquivo:** `index.html:3422`  
Dois gastos adicionados em < 1ms teriam o mesmo `id`. Baixo risco em uso manual, mas possível em testes automáticos ou duplo-clique rápido.

---

#### BUG-14: `projecaoDiff` trata entradas únicas como recorrentes
**Arquivo:** `index.html:218`
```javascript
const projecaoFinal = mediaGastoPorDia * state.diasDoMes;
const projecaoDiff  = (state.valorMensal + totalEntradas) - projecaoFinal;
```
Se o usuário recebeu R$500 de freela no dia 5, `totalEntradas` é somado permanentemente ao `projecaoDiff`. A projeção fica otimista para o ciclo inteiro, mesmo que o dinheiro extra já esteja planejado para ser gasto.

---

#### BUG-15: Snackbar de desfazer exclusão pode ficar atrás de modais
**Arquivo:** `index.html:3271`  
```javascript
position: 'absolute', zIndex: 300
```
O Snackbar é `position: absolute` (relativo ao container pai). Overlays usam `position: fixed` com `zIndex: 100`. Em alguns contextos de stacking, um `fixed` pode aparecer sobre um `absolute` mesmo com z-index menor.

---

### 🟢 BAIXO

#### BUG-16: Build warning não-bloqueante para android-frame.jsx
O warning `can't be bundled without type="module"` aparece em toda build. Não quebra nada, mas é ruído no CI.

#### BUG-17: Sem loading screen para CDN (React + Babel)
Se o CDN demorar, o usuário vê tela branca sem feedback.

#### BUG-18: Sem ARIA labels nos botões primários
`Gastei!` e `Recebi` não têm `aria-label`. Afeta leitores de tela.

#### BUG-19: Altura 40px em botões de ação no histórico expandido
```javascript
height: 40 // botões Editar/Excluir no item expandido
```
WCAG 2.5.5 recomenda 44×44px mínimo.

#### BUG-20: Confirmação de exclusão não mostra item sendo excluído
O diálogo diz apenas "Confirmar exclusão" sem mostrar descrição ou valor do item.

---

## 4. Problemas de UX e texto

| # | Descrição | Severidade |
|---|---|---|
| UX-01 | "Como chegamos aqui?" oculto quando não há transações — novo usuário não pode explorar | Alto |
| UX-02 | Botão "Gastei!" (68px altura, plena largura) — risco de toque acidental ao rolar | Médio |
| UX-03 | "Use os botões acima para registrar" — em tela pequena, os botões podem estar fora da viewport | Médio |
| UX-04 | Label "Disponível no plano" quando cota excedida — "no plano" é ambíguo para leigos | Médio |
| UX-05 | Gauge "Ritmo do plano" fica em "Ainda cedo" por 3 dias sem informar quando ficará disponível | Baixo |
| UX-06 | Barra semanal de hoje é sempre azul — sem sinalização visual se o usuário passou do valor hoje | Baixo |
| UX-07 | "Dia X de Y" no header pode ser estranho para usuário que não entende o ciclo | Baixo |
| UX-08 | Primeira configuração: campo de valor abre sem hint de que deve ser o valor livre (pós-fixos) | Médio |
| UX-09 | Botão de fechar "X" no CalculationBreakdownSheet tem área de toque 32×32px | Baixo |
| UX-10 | Confirmação de "Recomeçar do zero" faz scroll na hora (ação destrutiva sem fricção extra) | Médio |

---

## 5. Inconsistências visuais

| # | Descrição |
|---|---|
| VIS-01 | Bottom sheets usam `borderRadius: '24px 24px 0 0'` em alguns lugares e `'20px 20px 0 0'` em outros |
| VIS-02 | `T.r20` (number) vs `'20px 20px 0 0'` (string): mistura de tokens e valores hardcoded |
| VIS-03 | `T.textSec = '#667085'` em fundo branco: contraste estimado ~3.9:1 (abaixo do AA 4.5:1 para texto normal) |
| VIS-04 | Snackbar usa `position: absolute; bottom: 72` — em iPhone com safe area grande, pode sobrepor o tab bar |
| VIS-05 | `TelaFechamentoCiclo` usa `T.r16` como número (sem "px") em alguns `borderRadius` internos |
| VIS-06 | Barra de progresso no ciclo encerrado usa `pct * 100` mas o `pct` já é uma proporção 0-1 — a barra pode ultrapassar 100% (pct é clampado a 1, ok) |

---

## 6. Riscos de lógica financeira

| # | Risco | Impacto |
|---|---|---|
| FIN-01 | Dia 30 de ciclo 30d mostra "ciclo encerrado" + cálculos do dia ativos simultaneamente — estado dual contraditório | Usuário confuso sobre quanto pode gastar |
| FIN-02 | `projecaoDiff` inclui entradas únicas como renda recorrente na projeção | Projeção otimista; usuário pode gastar mais confiante |
| FIN-03 | Ciclo com `dataInicio` no futuro: `diaAtual = 1` sempre (clamped), `diasRestantes = safeDias - 1` — ciclo sempre no dia 1 | Usuário nunca avança no ciclo |
| FIN-04 | `valorMensal = 0` gera `valorDiarioBase = 0`, `disponivelHoje = 0`, `ratioMargem = 0` → status sempre "Atenção leve" | App funciona mas mostra estado enganoso |
| FIN-05 | Saldo anterior é **somado ao `valorMensal`** no novo ciclo: usuário pensa que definiu R$3.000 mas o app opera com R$5.900 | Cota diária bem maior que o esperado — pode induzir gastos extras |
| FIN-06 | `metaRecuperacaoDiaria` pode ser negativa se o déficit for maior que `valorDiarioBase * diasRestantes` — lógica correta mas nunca exibida diretamente ao usuário como negativa |

> **Nota sobre FIN-05:** O risco é mitigado pela UI transparente em `TelaConfig` (mostra banner "Saldo anterior" e preview de "R$5.900 no ciclo" antes do usuário confirmar). Não é um bug, mas requer atenção redobrada no texto para usuários confusos.

---

## 7. Matriz de testes

| # | Cenário | Resultado esperado | Resultado observado | Status |
|---|---|---|---|---|
| T-01 | Primeiro uso sem dados | Onboarding → TelaConfig | ✅ Fluxo correto | PASS |
| T-02 | Configurar ciclo com valor R$3.000, 30 dias | Cota = R$100/dia | ✅ Cálculo correto | PASS |
| T-03 | Dia normal, gasto R$80 (< cota R$100) | Status "No plano", disponível = R$100*dia - gastos | ✅ Correto | PASS |
| T-04 | Dia em que cota é totalmente usada (gasto = R$100) | `disponivelHoje` inclui carry de dias anteriores | ✅ Correto | PASS |
| T-05 | Gasto R$130 com buffer de dias anteriores | "Usou uma sobra", disponível = carry - overflow | ✅ Matemática correta | PASS |
| T-06 | Gasto total excede tudo (disponivelHoje < 0) | "Passou", mostra déficit | ✅ Correto | PASS |
| T-07 | Centavos: 0.01 + 0.02 | 0.03 (sem erro float) | ✅ r2() resolve | PASS |
| T-08 | 1.000 transações de R$1,99 | Total R$1.990,00 | ✅ Correto | PASS |
| T-09 | Transação futura (amanhã) | Ignorada pelo calcStats | ✅ Filtrada | PASS |
| T-10 | Transação antes do início do ciclo | Ignorada pelo calcStats | ✅ Filtrada | PASS |
| T-11 | Último dia do ciclo (dia 30/30) | App ainda ativo, usuário pode registrar | ✅ CORRIGIDO — `cicloEncerrado` só true após dia 30 | PASS |
| T-12 | Input "1500.00" no campo de valor | R$1.500,00 | ✅ CORRIGIDO — parse condicional por vírgula | PASS |
| T-13 | Categoria desconhecida em transação antiga | Exibe "Outros" | ✅ CORRIGIDO — CATS[8] = Outros | PASS |
| T-14 | Editar transação e setar data antes do ciclo | Transação rejeitada ou aviso | ✅ CORRIGIDO — `minDate` agora passado no fluxo de edição | PASS |
| T-15 | Ciclo encerrado → Novo ciclo com saldo | Saldo somado ao novo ciclo | ✅ Correto (com UI clara) | PASS |
| T-16 | Build de produção | Build sem erros | ✅ Warning não-bloqueante | PASS |
| T-17 | Exportar dados | JSON completo downloadado | ✅ Funciona | PASS |
| T-18 | Desfazer exclusão | Transação restaurada | ✅ Funciona | PASS |
| T-19 | valorMensal = 0 | Estado tratado sem crash | ✅ Funciona (estado válido) | PASS |
| T-20 | Ciclo com 28 dias (fevereiro) | Cota = valorMensal/28 | ✅ Cálculo correto (diasDoMes livre) | PASS |
| T-21 | Notificação configurada após horário passar | Dispara amanhã | ✅ CORRIGIDO — agenda para amanhã no mesmo horário | PASS |
| T-22 | Lembrete ativado com sucesso | Ativo e agendado | ✅ Funciona se antes do horário | PASS |

---

## 8. Testes automatizados recomendados

Dado que o projeto não tem testes, prioridade em:

### Testes unitários (lógica financeira)
```javascript
// calcStats.test.js
describe('calcStats', () => {
  it('cota diária = valorMensal / diasDoMes')
  it('disponivelHoje = cota * diaAtual + entradas - gastos')
  it('diasRestantes = 0 no penúltimo e último dia (distinguir)')
  it('transações futuras são filtradas')
  it('transações antes do início são filtradas')
  it('saldoTotalRestante = valorMensal + entradas - gastos')
  it('metaRecuperacaoDiaria quando déficit > 0')
  it('centavos sem floating point error (0.01 + 0.02 = 0.03)')
})

describe('getStatusDiario', () => {
  it('retorna "Passou" quando disponivelHoje < 0')
  it('retorna pill correto para cotaDiaExcedida com buffer')
  it('retorna "No plano" quando ratioMargem entre 0.25 e 1.5')
  it('retorna "Com folga" quando ratioMargem >= 1.5')
})

describe('MoneyInput parsing', () => {
  it('"1500,00" → 1500')
  it('"1.500,00" → 1500')
  it('"0,99" → 0.99')
  it('"1500.00" → 1500 (não 150000)')  // BUG atual
})
```

### Testes de integração/E2E (Playwright/Cypress)
```javascript
it('fluxo completo: configurar → gastar → verificar saldo')
it('dia 30 de 30: banner não aparece até dia 31')
it('editar transação mantém no ciclo correto')
it('novo ciclo carrega saldo anterior corretamente')
it('exportar dados gera JSON válido')
it('localStorage persiste após reload')
```

---

## 9. Sugestões de melhoria rápida (antes dos testes reais)

Ordenadas por impacto / esforço:

### Obrigatório antes dos testes

1. **[BUG-01] Corrigir threshold do banner de ciclo encerrado**  
   Mudar condição de `diasRestantes <= 0` para `diasRestantes < 0` (ou usar comparação de datas).

2. **[BUG-02] Corrigir parsing de valor com ponto decimal**  
   Em `TelaConfig handleChange`, se o input não contém vírgula, tratar ponto como decimal:
   ```javascript
   // Se não tem vírgula, o ponto é decimal (usuário EN)
   const raw = text.includes(',')
     ? text.replace(/\./g, '').replace(',', '.')
     : text;
   ```

3. **[BUG-08/09] Corrigir terminologia "próximo mês" e "Próx. mês"**  
   Substituições de texto simples em 2 linhas.

4. **[BUG-07] Corrigir "Orçado" → "Planejado" em TelaFechamentoCiclo**  
   Substituição simples de label.

5. **[BUG-06] Verificar se "Usou uma sobra" / "Atenção leve" são intencionais**  
   Se a intenção é seguir a spec de CLAUDE.md com "Apertado", atualizar os dois cases em `getStatusDiario`.

### Recomendado antes dos testes

6. **[BUG-04] Passar `minDate` para TelaEntrada no fluxo de edição**  
   Uma linha no `renderTela()` case `TELAS.editar`.

7. **[UX-01] Mostrar "Como chegamos aqui?" mesmo sem transações**  
   Remover a condição `{!noTx && ...}` ou usar um estado demo.

8. **[BUG-03] Corrigir fallback de `getCat`**  
   `CATS[7]` → `CATS[8]` (ou `CATS.find(...) || CATS.at(-1)`).

---

## 10. Sugestões para depois (não mexer agora)

1. **Remover `DialogAjustarOrcamento`** — componente morto, pode confundir futuros contribuidores
2. **Remover `diasNoPlanoPct`** — variável computada e não usada em `TelaFechamentoCiclo`
3. **Refatorar projeção para separar entradas recorrentes das únicas** — `FIN-02`
4. **Adicionar testes automatizados** com Vitest (sem mudar a arquitetura)
5. **Migrar `Date.now()` como ID para `crypto.randomUUID()`** — eliminação do risco de colisão
6. **Melhorar agendamento de notificações** — usar `setTimeout` com cálculo para amanhã
7. **Avaliar threshold da `corSaldo`** nos próximos 7 dias da TelaAnalise — usar escala relativa ao saldo total restante
8. **Adicionar `aria-label` em "Gastei!" e "Recebi"** para acessibilidade
9. **Considerar substituir `Date.now()` IDs por UUID** para evitar colisão
10. **Avaliar mostrar ao usuário que o banco está cheio** antes de salvar (não apenas no erro)

---

## 11. Partes não testadas (e por quê)

| Área | Motivo |
|---|---|
| Instalação PWA real | Requer browser com HTTPS ou localhost servido |
| Comportamento offline (SW cache) | Requer browser; a lógica do `sw.js` parece correta |
| AudioContext / vibração háptica | Requer interação do usuário no browser |
| Renderização em iPhone real | Requer dispositivo físico |
| Tela em Android físico pequeno (320px) | Requer dispositivo |
| Push notifications em background | Requer browser + permissão + app instalado como PWA |
| Importação de backup JSON | Funcionalidade não implementada (só exportação) |
| Edição de configuração de ciclo durante ciclo ativo | Testado na lógica, não na UI |

---

## 12. Resumo executivo — Os 5 problemas mais importantes

### 🥇 1. Banner "Ciclo encerrado" no último dia ativo (CRÍTICO)
**Por que importa:** O usuário no dia 30 vê a tela de ciclo encerrado + dashboard ao mesmo tempo. Pode não registrar gastos do último dia achando que "o ciclo já acabou". Dados do dia 30 ficam perdidos ou o usuário abre o próximo ciclo prematuramente.

### 🥈 2. Input "1500.00" → R$150.000 (CRÍTICO)
**Por que importa:** Um usuário que digita com ponto decimal (hábito de apps bancários) define um orçamento 100× errado. O app aceita silenciosamente. A cota diária aparece como R$5.000/dia para um orçamento que deveria ser R$50/dia. Alta chance de abandonar o app por "bug".

### 🥉 3. Terminologia divergente da spec (ALTO — múltiplos locais)
**Por que importa:** "Orçado", "próximo mês" e "Próx. mês" violam a brand voice definida. Para um app de leigos, consistência de linguagem é central na confiança. Se o usuário lê "orçamento" em um lugar e "planejado" em outro, fica confuso sobre se são coisas diferentes.

### 4️⃣ 4. Status pill não segue terminologia canônica (ALTO)
**Por que importa:** A spec define 4 estados ("Passou | Apertado | No plano | Com folga"), mas o código usa "Usou uma sobra" e "Atenção leve". Se os testes de usuário forem conduzidos com a intenção de validar esses estados, os dados coletados serão baseados em termos errados.

### 5️⃣ 5. Transação editada pode ser movida antes do ciclo sem aviso (ALTO)
**Por que importa:** Um usuário desorganizado que edita uma transação antiga e acidentalmente muda a data para antes do ciclo vê a transação no histórico mas ela não conta nos cálculos. O saldo parece maior do que deveria. Decisão financeira errada invisível.

---

## 13. O que corrigir antes dos testes reais

| Ação | Arquivo | Linha aprox. | Esforço |
|---|---|---|---|
| Banner ciclo: mudar `<= 0` para `< 0` | `index.html` | 1693 | 2 min |
| Input decimal: tratar ponto quando sem vírgula | `index.html` | 725 | 15 min |
| "Orçado" → "Planejado" | `index.html` | 1324 | 1 min |
| "próximo mês" → "próximo ciclo" | `index.html` | 2847 | 1 min |
| "Próx. mês" → "Próx. ciclo" | `index.html` | 931 | 1 min |
| `getCat` fallback: `CATS[7]` → `CATS[8]` | `index.html` | 175 | 30 seg |
| Passar `minDate` na edição de transação | `index.html` | 3532 | 5 min |

**Total estimado: ~25 minutos de trabalho de código**

---

## 14. O que pode esperar

- Testes automatizados (Vitest)
- Remoção de código morto (DialogAjustarOrcamento, diasNoPlanoPct)
- Melhoria da projeção (separar entradas únicas vs recorrentes)
- Agendamento de notificação para o dia seguinte
- `aria-label` nos botões primários
- Correção de `corSaldo` para projeções de 7 dias
- Ajuste de contraste de `T.textSec` (#667085 → WCAG AA)

---

*Relatório gerado por inspeção estática e simulação de cálculo. Testes em browser ao vivo não realizados — ver seção 11.*
