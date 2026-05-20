# PRE_REAL_TEST_CHECKLIST.md — Hoje Dá
## Checklist + Relatório Consolidado para Testes Reais
**Versão auditada:** index.html (3.764 linhas, build v6)
**Data da auditoria:** 2026-05-17

---

# PARTE 1 — RELATÓRIO CONSOLIDADO

## Top 10 Problemas Mais Importantes

### #1 — Terminologia técnica exposta ao usuário (UX-01)
**Tipo:** UX / Microcopy | **Severidade:** Alta
Termos como "cota", "margem" e "ritmo do plano" aparecem em pelo menos 8 lugares visíveis. Para o público-alvo (leigo em finanças), esses termos criam barreira de entendimento logo na primeira interação.
**Onde:** Onboarding passo 2, preview da TelaConfig, hero do painel (estado vazio), breakdown sheet, UsoDoDiaBar ticks, TelaHistorico ciclos.
**Impacto:** Um usuário leigo pode desistir do app por não entender o que está vendo.

---

### #2 — Pill "Apertado" para dois estados com significados opostos (UX-02)
**Tipo:** UX | **Severidade:** Alta
A mesma pill amarela "Apertado" é usada quando o usuário:
a) **Passou o valor do dia mas ainda tem saldo positivo** (tudo bem, usou a reserva)
b) **Tem saldo total muito baixo** (genuinamente precisa frear)
Esses são estados com urgências completamente diferentes mas parecem iguais para o usuário.
**Impacto:** Usuário impulsivo se preocupa desnecessariamente (caso A). Usuário com saldo baixo pode achar que é a mesma situação do caso A e ignorar o alerta (caso B).

---

### #3 — Ciclos anteriores perdidos em "Recomeçar do zero" (BUG-05)
**Tipo:** Bug | **Severidade:** Alta
`handleRecomecarDoZero` reseta o estado sem preservar `ciclosAnteriores`. Todo o histórico de meses anteriores é permanentemente apagado. O aviso no dialog diz "histórico será apagado" mas não especifica que inclui ciclos anteriores arquivados.
**Impacto:** Usuário que queria apenas reiniciar o ciclo atual pode perder meses de histórico acidentalmente.

---

### #4 — Registrar gastos após ciclo encerrar altera saldo final (BUG-02)
**Tipo:** Bug | **Severidade:** Média
Quando o ciclo está encerrado, os botões "Gastei!" e "Recebi" ainda estão ativos. Transações registradas (com data de hoje, que é após o fim do ciclo) são incluídas nos cálculos do ciclo encerrado. Isso muda o `saldoTotalRestante` que será carregado para o próximo ciclo.
**Impacto:** Saldo final incorreto pode ser transferido para o próximo ciclo.

---

### #5 — Comportamento inconsistente de exclusão (BUG-07 / UX-07)
**Tipo:** Bug + UX | **Severidade:** Média
No Painel: exclusão imediata ao tocar a lixeira (sem confirmação), recuperável por "Desfazer" em 4 segundos.
No Histórico: confirmação explícita antes de excluir, sem opção de desfazer.
Dois padrões completamente diferentes para a mesma ação em dois lugares do app.
**Impacto:** Exclusão acidental no Painel. Confusão de expectativa para quem usa os dois fluxos.

---

### #6 — Label do hero "Disponível no plano" é ambíguo (UX-03)
**Tipo:** UX | **Severidade:** Média
Quando o usuário passou o valor do dia mas ainda tem saldo positivo (`cotaDiaExcedida = true`), o label do número principal muda para "Disponível no plano". Um usuário ansioso pode interpretar "Estou fora do plano e tenho apenas R$ X" — o oposto da mensagem que o app quer passar.
**Impacto:** Ansiedade desnecessária. Confusão sobre o estado real.

---

### #7 — Sem feedback ao salvar edição de lançamento (BUG-03)
**Tipo:** Bug | **Severidade:** Baixa
`handleSalvarEdicao` não dispara `showSnackbar`. O usuário não recebe confirmação textual de que a edição foi salva ao retornar ao painel ou histórico.
**Impacto:** Usuário pode não ter certeza se a edição foi aplicada.

---

### #8 — Valores grandes em viewport estreito podem cortar (UI-06, UI-07)
**Tipo:** UI | **Severidade:** Média
`fontSize: 48` no hero da TelaFechamentoCiclo e grid de 3 colunas com `fontSize: 15` podem exceder a largura disponível em telas de 320px (iPhone SE, Galaxy A01, etc.).
**Impacto:** Layout quebrado em dispositivos pequenos que são comuns no Brasil.

---

### #9 — Onboarding usa os termos que deveria evitar (UX-01 / microcopy)
**Tipo:** UX | **Severidade:** Média
O Passo 2 do onboarding diz: *"a cota diária reaproveita a margem de dias passados"*. Dois termos técnicos internos (`cota`, `margem`) aparecem na primeira explicação que o usuário lê. Esse é o momento mais crítico para retenção.
**Impacto:** Primeira impressão ruim. Usuário leigo pode abandonar antes de configurar.

---

### #10 — Projeção com dados insuficientes parece confiável (UX-09 / UI-16)
**Tipo:** UX + UI | **Severidade:** Média
A TelaAnalise exibe projeção com gradiente azul/vermelho e número grande mesmo com apenas 1 dia de dados. Com `mediaGastoPorDia = 0` (sem gastos), a projeção dos 7 dias futuros cresce linearmente como se o usuário não fosse gastar nada — resultado absurdamente otimista.
**Impacto:** Usuário toma decisões baseado em projeção não confiável.

---

## Bugs Críticos

Não foram identificados bugs **críticos** (crash, perda imediata de dados, cálculo incorreto visível para o usuário no fluxo normal).

Todos os cálculos financeiros foram verificados matematicamente e estão **corretos**:
- `calcStats`: ✅
- `getStatusDiario`: ✅ (lógica correta, problemas são de UX)
- `getPlanRhythmStatus`: ✅
- `accBufferStart`: ✅
- Filtro de transações futuras: ✅
- Persistência no localStorage: ✅
- Novo ciclo com saldo anterior: ✅
- Gastos retroativos: ✅

---

## Problemas de UX que Podem Atrapalhar Testes Reais

Os seguintes problemas podem comprometer a qualidade dos testes reais com usuários reais porque causarão confusão que contamina o feedback:

1. **Terminologia técnica** → Usuário responde ao questionário dizendo "não entendeu" quando na verdade o cálculo estava certo mas os termos eram errados. Você vai receber feedback sobre UX/copy quando o bug real é linguagem.

2. **Pill "Apertado" duplicada** → Usuário no cenário mais comum (passou o valor do dia mas tem saldo) vai reportar "o app diz que estou apertado, mas estou bem". Isso vai poluir o feedback sobre a lógica de status.

3. **Exclusão inconsistente** → Durante testes, usuário vai excluir acidentalmente e não vai encontrar "Desfazer" no histórico. Vai pensar que o app perdeu dados.

4. **Onboarding com "cota" e "margem"** → Usuário leigo vai travar no onboarding e não vai chegar ao app. Você não vai conseguir testar as funcionalidades principais.

5. **Snackbar de edição ausente** → Usuário vai editar e achar que não funcionou. Pode editar múltiplas vezes causando confusão nos dados de teste.

---

## Melhorias Rápidas de Alto Impacto

Essas melhorias têm implementação simples (< 30 linhas) e impacto significativo na experiência dos primeiros testes:

### 1. Renomear "Cota" → "Valor" nos textos visíveis (todos os lugares)
Busca: `"cota"` no HTML → substituir nos textos de UI. Não muda lógica.
- "Cota de hoje" → "Valor de hoje"
- "Sua cota de hoje" → "Você pode gastar hoje"
- "cota X/dia" → "X por dia"
- "Sua cota diária" → "Por dia"

### 2. Renomear "margem" → "guardado" ou "reserva" nos textos visíveis
- "restam da margem" → "guardado dos dias anteriores"
- "a cota diária reaproveita a margem" → "o que você guardou nos outros dias"

### 3. Adicionar snackbar ao salvar edição
```javascript
function handleSalvarEdicao({ valor, descricao, categoria, dataLancamento }) {
  haptic('success');
  update(prev => ...);
  triggerFlash(editandoItem?.tipo || 'gasto');
  showSnackbar('✅ Lançamento atualizado'); // ← adicionar esta linha
}
```

### 4. Alerta no "Recomeçar do zero" sobre ciclos anteriores
Adicionar ao dialog: quantos ciclos anteriores serão perdidos.
```javascript
const numCiclosAnteriores = (state.ciclosAnteriores || []).length;
// No texto: `Isso também vai apagar ${numCiclosAnteriores} ciclo(s) anterior(es) arquivado(s).`
```

### 5. Desabilitar "Gastei!" e "Recebi" quando ciclo encerrado
```javascript
// Em TelaPainel, nos botões:
onClick={stats.cicloEncerrado ? onFechamento : onRegistrarGasto}
// + aviso visual de que o ciclo encerrou
```

---

## Melhorias que Podem Ficar para Depois

Estas melhorias são válidas mas não afetam a qualidade dos testes iniciais:

- SpendingGauge: posição do marcador no estado "Ainda cedo" (UI-01)
- WeeklyMiniChart: cor da barra de hoje refletir estado (UI-02)
- MoneyInput: botão limpar (UI-10)
- Projeção 7 dias: aviso quando dados insuficientes (UX-09)
- Pill com tooltip explicativo (UI-09)
- Animações de retorno (screen-back) (UI-11)
- Delay no botão "Apagar tudo" (UI-15)
- Badge de saúde na TabBar (UI-08)

---

## Pontos que Precisam de Decisão do Dono

Estas questões não têm resposta óbvia — dependem de escolha de produto:

### D-01: Pill "Apertado" para dois estados distintos
**Pergunta:** Deve existir uma pill diferente quando o usuário passou o valor do dia mas ainda tem saldo? Exemplos: "Reserva usada", "No plano", "Dentro do combinado". Ou a pill "Apertado" deve ser mantida mesmo sendo imprecisa?

### D-02: SpendingGauge — manter ou simplificar
**Pergunta:** O SpendingGauge (régua de 4 zonas) adiciona valor para o usuário leigo? Ou deveria ser substituído por apenas a mensagem de texto (ex: "Você está gastando R$ X a menos por dia que o combinado")? A régua é intuitiva para quem já entende o conceito, mas pode ser ruído para leigos.

### D-03: "Como chegamos aqui?" para estado zero transações
**Pergunta:** O breakdown deve aparecer mesmo sem transações, mostrando apenas "Valor do ciclo: R$ X ÷ 30 dias = R$ Y por dia"? Isso ajudaria o usuário de primeira viagem a entender a cota.

### D-04: Ciclos anteriores ao "Recomeçar do zero"
**Pergunta:** O "Recomeçar do zero" deve oferecer opção de manter o histórico de ciclos anteriores? Ou deve ser realmente um reset total com aviso mais claro?

### D-05: Limite de R$ 99.999,99 no MoneyInput
**Pergunta:** O limite atual é suficiente para o público-alvo? Se alguém tem um ciclo de R$ 10.000 e precisa registrar uma compra de R$ 8.000 (carro, viagem), consegue (cabe em 7 dígitos). Mas R$ 100.000 não cabe. Esse limite deve ser aumentado?

### D-06: Mostrar saldo disponível no botão "Gastei!"
**Pergunta:** "Gastei! · R$ 71,50 restam" seria valioso no botão primário? Ou sobrecarrega?

---

## Recomendação Final

### O app está pronto para teste real controlado?

**Resposta: Sim, com ressalvas. Recomendo implementar pelo menos os itens de alta prioridade antes.**

**Estado atual:**
- Lógica financeira: ✅ Correta e bem implementada
- Fluxos principais: ✅ Funcionam corretamente
- Persistência: ✅ localStorage funciona
- Cálculos: ✅ Verificados matematicamente em 25 cenários
- Interface: ✅ Bem-feita, responsiva, com bom uso de cores e tipografia
- Microcopy: ⚠️ Termos técnicos expostos para público leigo

**Risco se testar sem ajustes:**
Os usuários vão reportar confusão com "cota", "margem" e a pill "Apertado" — problemas que você já sabe que existem e que contaminarão o feedback com ruído. Você vai gastar tempo entendendo se o feedback é sobre linguagem ou sobre lógica.

**Mínimo para teste controlado (1–2 dias de trabalho):**
1. Substituir "cota" por "valor" nos textos visíveis
2. Substituir "margem" por "guardado/reserva" nos textos visíveis
3. Corrigir a pill "Apertado" ou ao menos a frase do hero quando `cotaDiaExcedida`
4. Adicionar snackbar na edição
5. Testar em iPhone SE (375px) ou dispositivo 360px fisicamente

**Se tiver mais tempo (3–5 dias):**
- Corrigir BUG-07 (exclusão inconsistente)
- Corrigir BUG-02 (registrar após ciclo encerrado)
- Corrigir BUG-05 (aviso no "recomeçar do zero")
- Resolver UI-06 e UI-07 (viewport estreito)

---

# PARTE 2 — CHECKLIST PRÉ-TESTE

## A. Funcionalidades Core

### A1 — Configuração inicial
- [ ] Consigo inserir um valor de ciclo via teclado numérico
- [ ] A data de início e fim são selecionáveis via date picker nativo
- [ ] Quick chips "Este mês", "Hoje +30d", "Próx. ciclo" funcionam corretamente
- [ ] Resumo do plano aparece corretamente ao preencher os campos
- [ ] Botão "Continuar" só ativa quando valor > 0 e datas válidas
- [ ] Preview "Dá por dia" calcula e exibe corretamente

### A2 — Registro de gasto
- [ ] Teclado numérico funciona corretamente (0–9, backspace)
- [ ] Categorias de gasto são selecionáveis
- [ ] Última categoria usada é pré-selecionada
- [ ] Campo de descrição aceita texto (até 40 chars)
- [ ] Data do lançamento pode ser alterada (retroativo)
- [ ] Badge "Retroativo" aparece quando data ≠ hoje
- [ ] Confirmação funciona (haptic + snackbar)
- [ ] Retorno ao painel com saldo atualizado

### A3 — Registro de entrada
- [ ] Categorias de renda são selecionáveis (Salário, Freela, Bônus, Reembolso, Outros)
- [ ] Entrada é incorporada ao saldo disponível
- [ ] "Como chegamos aqui?" mostra a entrada na folga acumulada

### A4 — Dashboard principal
- [ ] Número principal exibe valor correto para o dia
- [ ] Pill de status muda corretamente entre os 4 estados
- [ ] Frase do hero é contextual ao estado
- [ ] UsoDoDiaBar reflete corretamente o uso do dia
- [ ] SpendingGauge mostra estado correto ("Ainda cedo" até dia 3)
- [ ] "Como chegamos aqui?" abre o breakdown
- [ ] Breakdown mostra cálculo correto
- [ ] Últimos 3 movimentos aparecem no card

### A5 — Histórico
- [ ] Lista de transações agrupada por data
- [ ] Filtros (Todos/Gastos/Entradas) funcionam
- [ ] Busca por descrição/categoria funciona
- [ ] Expandir item mostra botões Editar/Excluir
- [ ] Confirmação de exclusão funciona
- [ ] Ciclos anteriores aparecem na seção de histórico

### A6 — Edição de lançamento
- [ ] Tela abre com valores pré-preenchidos
- [ ] Pode alterar valor, categoria, descrição e data
- [ ] Ao salvar, saldo é recalculado
- [ ] Ao cancelar com valor preenchido, aparece confirmação "Descartar?"

### A7 — Análise
- [ ] Projeção do ciclo exibe corretamente
- [ ] Cards "Média/dia", "Meta/dia", "Diferença" corretos
- [ ] Gráfico de barras por dia renderiza
- [ ] Gastos por categoria renderiza quando há dados
- [ ] Próximos 7 dias renderiza

### A8 — Fechamento de ciclo
- [ ] Banner "Seu ciclo encerrou!" aparece quando `cicloEncerrado = true`
- [ ] TelaFechamentoCiclo exibe corretamente (saldo, categorias, %)
- [ ] Botão "Iniciar próximo ciclo" abre DialogReiniciar
- [ ] Opção "Levar saldo para próximo ciclo" funciona
- [ ] Opção "Começar do zero" funciona
- [ ] Ciclo anterior arquivado aparece no histórico

### A9 — Persistência
- [ ] Recarregar a página mantém todos os dados
- [ ] Fechar e reabrir o app mantém todos os dados
- [ ] Dados corretos após edição
- [ ] Dados corretos após exclusão

---

## B. Cenários de Cálculo

- [ ] Dia 1 sem transações: hero mostra cota diária, status neutro
- [ ] Dia 1 gasto < base: status "No plano" ou "Com folga"
- [ ] Dia 1 gasto = base: disponivelHoje = 0, status "Apertado"
- [ ] Dia 1 gasto > base: status "Passou", metaRecuperacaoDiaria correta
- [ ] Dia 5 com sobra: accBufferStart acumulado, bar amarela correta
- [ ] Dia 5 gasto > base mas saldo positivo: "Apertado" + frase de reserva
- [ ] Dia 5 gasto > disponível total: status "Passou" + frase de recuperação
- [ ] Entrada extra: disponivelHoje sobe corretamente
- [ ] Gasto retroativo: recalcula corretamente
- [ ] Ciclo curto (7 dias): sem problemas de edge case
- [ ] Ciclo longo (90 dias): sem problemas de edge case
- [ ] Valores R$ 0,50: aceito e calculado corretamente
- [ ] Valor R$ 99.999,99: máximo do MoneyInput

---

## C. Dispositivos e Compatibilidade

- [ ] iPhone SE 2020 (375px)
- [ ] Samsung Galaxy A14 (360px) — dispositivo mais comum no Brasil
- [ ] iPhone 14 (390px)
- [ ] Android com notch (safe area)
- [ ] Desktop (frame AndroidDevice renderiza)
- [ ] PWA instalado como app no Android
- [ ] PWA instalado como app no iOS

---

## D. Fluxos de Erro e Edge Cases

- [ ] Digitar valor zero e tentar confirmar: botão desabilitado
- [ ] Tentar data antes do início do ciclo: bloqueado pelo minDate
- [ ] Tentar data futura: bloqueado pelo maxDate
- [ ] Campo descrição com 40+ chars: truncado no input
- [ ] Apagar e desfazer: transação volta ao lugar correto
- [ ] Exportar dados: arquivo JSON baixado corretamente
- [ ] Lembretes: toggle ativa/desativa
- [ ] Recomeçar do zero: confirmação + onboarding reexibido

---

## E. UX/Microcopy (validar com usuário leigo)

- [ ] Usuário entende "Disponível hoje" sem explicação
- [ ] Usuário entende por que o número mudou após registrar gasto
- [ ] Usuário entende a diferença entre "Passou o dia" e "Saiu do plano"
- [ ] Usuário entende a frase de recuperação quando saiu do plano
- [ ] Usuário entende o SpendingGauge (ou ignora sem problemas)
- [ ] Usuário consegue registrar primeiro gasto em menos de 30 segundos
- [ ] Usuário consegue verificar histórico sem instrução

---

## F. Itens para Decidir Antes dos Testes (owner)

- [ ] **D-01**: Pill para `cotaDiaExcedida` — "Apertado" ou nome diferente?
- [ ] **D-02**: Manter SpendingGauge ou simplificar para apenas texto?
- [ ] **D-03**: Breakdown no estado zero transações?
- [ ] **D-04**: "Recomeçar" manter ou não manter ciclos anteriores?
- [ ] **D-05**: Aumentar limite MoneyInput para R$ 999.999?
- [ ] **D-06**: Mostrar saldo disponível no botão "Gastei!"?

---

## Resumo Executivo

| Categoria | Total encontrado | Crítico | Alto | Médio | Baixo |
|---|---|---|---|---|---|
| UX/Usabilidade | 19 | 0 | 3 | 8 | 8 |
| Bugs técnicos | 11 | 0 | 1 | 5 | 5 |
| UI Polish | 16 | 0 | 0 | 8 | 8 |

**Bloqueadores para testes reais:** Nenhum (sem bugs críticos de cálculo).

**Itens de alta prioridade antes dos testes:**
1. Terminologia técnica (UX-01)
2. Pill "Apertado" duplicada (UX-02)
3. Aviso ao "recomeçar do zero" (BUG-05)
4. Snackbar ao salvar edição (BUG-03)
5. Desabilitar registros pós-ciclo (BUG-02)
6. Exclusão consistente (BUG-07)

**Veredicto:** App está funcionalmente sólido. A lógica financeira é correta. Os problemas são majoritariamente de linguagem e consistência de UX — exatamente o tipo de coisa que os testes reais vão expor muito mais se não for corrigido antes.
