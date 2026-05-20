# UX_USABILITY_REPORT.md — Hoje Dá
## Relatório de Usabilidade e Experiência do Usuário
**Versão auditada:** index.html (3.764 linhas, build v6)
**Data da auditoria:** 2026-05-17
**Metodologia:** Inspeção heurística + análise de código + simulação de cenários

---

## Heurísticas usadas na avaliação

1. **Visibilidade do estado do sistema** — o usuário sabe o que está acontecendo?
2. **Linguagem do usuário** — os termos fazem sentido para quem usa?
3. **Controle e liberdade** — o usuário consegue desfazer ações?
4. **Consistência e padrões** — comportamentos similares funcionam da mesma forma?
5. **Prevenção de erros** — o app ajuda a evitar erros?
6. **Reconhecer em vez de lembrar** — o usuário precisa memorizar coisas?
7. **Flexibilidade e eficiência** — o fluxo é rápido para quem já sabe?
8. **Design estético e minimalismo** — há informação irrelevante ou redundante?
9. **Recuperação de erros** — mensagens de erro são claras e orientam?
10. **Ajuda e documentação** — o app se explica?

---

## UX-01 — Terminologia técnica exposta ao usuário
**Heurística:** 2 (Linguagem do usuário)
**Severidade:** Alta
**Telas afetadas:** Onboarding, TelaConfig, TelaPainel, CalculationBreakdownSheet, TelaHistorico, UsoDoDiaBar

### Problema
O app usa termos técnicos definidos no CLAUDE.md como internos ("cota", "margem") em textos visíveis ao usuário. Esses termos aparecem em pelo menos 8 lugares distintos.

### Ocorrências mapeadas

| Local (linha aprox.) | Texto atual | Problema |
|---|---|---|
| Onboarding, passo 2 | "a cota diária reaproveita a margem de dias passados" | "cota" + "margem" para leigos |
| TelaConfig preview (~901) | "Sua cota diária" | "Cota" é termo interno |
| TelaPainel hero (~1934) | "Sua cota de hoje" (state noTx) | "Cota" exposta |
| CalculationBreakdownSheet (~1563) | "Cota de hoje" | "Cota" no breakdown |
| UsoDoDiaBar ticks (~1774-1792) | "restam da margem" / "restam da cota" | Dois termos técnicos |
| TelaHistorico ciclos anteriores (~2582) | "cota {fmt(...)}/dia" | "Cota" nos ciclos arquivados |
| SpendingGauge label (~1062) | "Ritmo do plano" | "Plano" pode confundir (é o app inteiro ou minha meta?) |
| DialogAjustarOrcamento (~3045) | "Ajustar orçamento" | "Orçamento" é proibido pelo guia de estilo |

### Substituições sugeridas

| Atual | Sugerido |
|---|---|
| "Sua cota diária" | "Você tem por dia" / "Seu valor diário" |
| "Sua cota de hoje" | "Ainda dá gastar hoje" / "Disponível para hoje" |
| "Cota de hoje" (breakdown) | "Valor de hoje" |
| "restam da margem" | "sobra guardada" / "reserva dos outros dias" |
| "restam da cota" | "ainda pode gastar hoje" |
| "cota X/dia" (histórico) | "X por dia" |
| "a cota diária reaproveita a margem" | "o que você economizou nos outros dias fica guardado" |

---

## UX-02 — Pill "Apertado" sobreposta para dois estados distintos
**Heurística:** 4 (Consistência) + 2 (Linguagem)
**Severidade:** Alta
**Tela:** TelaPainel

### Problema
A pill "Apertado" (amarela) é usada em duas situações fundamentalmente diferentes:

**Situação A:** `cotaDiaExcedida = true` (gastou mais do que o valor do dia, mas o saldo acumulado é positivo)
- Frase: "Você passou do valor de hoje, mas ainda tem R$ X guardados dos outros dias."
- Significado real: **Tudo bem, usou a reserva.**

**Situação B:** `ratioMargem < 0.25` (saldo total muito baixo, menos de 25% da cota diária)
- Frase: "Ainda dá, mas restou pouco para hoje. Melhor ir com calma."
- Significado real: **Atenção genuína, saldo baixo.**

As duas situações são opostas em urgência: A é informativa, B é alerta. Mas o usuário vê a mesma pill amarela e o mesmo label "Apertado".

### Impacto
- Usuário impulsivo (situação A) se preocupa desnecessariamente ao ver "Apertado".
- Usuário com saldo genuinamente baixo (situação B) pode confundir com a situação A.

### Sugestão
Criar pill diferente para cada situação:
- Situação A: pill azul-escuro "Sobra usada" ou "Dentro do plano" (não alarmar)
- Situação B: pill amarela "Atenção" (alarmar levemente)
- Ou ao menos diferenciar a cor do hero e da frase entre os dois casos.

---

## UX-03 — Label do hero ambíguo: "Disponível no plano"
**Heurística:** 2 (Linguagem) + 6 (Reconhecer em vez de lembrar)
**Severidade:** Média
**Tela:** TelaPainel (linha ~1934)

### Problema
Quando `cotaDiaExcedida = true` (gastou mais do que o valor do dia mas saldo positivo), o label do número principal muda para "Disponível no plano". Isso é diferente de "Disponível hoje" (estado normal) mas ambos mostram o mesmo valor (`disponivelHoje`).

O usuário vê "Disponível no plano: R$ 50" e pode interpretar:
- "Tenho R$ 50 disponíveis no meu plano" (correto) — mas o que é "meu plano"?
- "Estou fora do plano e tenho apenas R$ 50" (interpretação errada mas plausível)
- "Hoje eu posso gastar R$ 50" (parcialmente correto — é o saldo acumulado, não só hoje)

### Contexto do código
```javascript
const isNeg = avail < 0;
const noTx = state.transacoes.length === 0;
const cotaDiaExcedida = !isNeg && gastosHoje > base;
// hero label:
{isNeg ? 'Fora do previsto' : noTx ? 'Sua cota de hoje' : cotaDiaExcedida ? 'Disponível no plano' : 'Disponível hoje'}
```

### Sugestão
- `cotaDiaExcedida` → "Ainda disponível" ou "Saldo do ciclo"
- Ou manter "Disponível hoje" mas adicionar subtítulo: "Você passou o valor de hoje, mas tem reserva acumulada."

---

## UX-04 — SpendingGauge: posicionamento "Ainda cedo" em 37%
**Heurística:** 1 (Visibilidade do estado)
**Severidade:** Baixa
**Tela:** TelaPainel, componente SpendingGauge (linha ~1030)

### Problema
Quando `estado = 'cedo'` (menos de 3 dias ou zero gastos), o marcador triângulo é posicionado em `pos = 37` (37% da régua), que fica na zona "No ritmo" (azul). Isso é arbitrário e pode confundir: o usuário vê um ponteiro no meio da régua e não entende por que está ali.

### Código
```javascript
if (rhythm.estado === 'cedo') {
  pos = 37;
}
```

### Impacto
O usuário de primeira viagem ou com poucos dados vê um triângulo apontando para a zona azul sem saber o que isso significa.

### Sugestão
- Quando `estado = 'cedo'`, não mostrar o triângulo nem a régua colorida. Exibir apenas a mensagem "Ainda cedo".
- Ou mostrar o triângulo em posição central (50%) com cor cinza, deixando claro que é neutro.

---

## UX-05 — Breakdown não explica déficit acumulado
**Heurística:** 9 (Recuperação de erros) + 10 (Ajuda)
**Severidade:** Média
**Tela:** CalculationBreakdownSheet (linha ~1418)

### Problema
Quando o usuário está em déficit (disponivelHoje < 0), o breakdown mostra apenas:
1. Cota de hoje
2. Gasto de hoje
3. Quanto você passou hoje

Mas se o déficit foi acumulado ao longo de vários dias (ex: dia 10, gastou R$ 1.500 quando tinha R$ 1.000 disponível), o breakdown só mostra o dia de hoje. O usuário não consegue entender como chegou ao déficit total.

### Exemplo
- Saldo disponível dia 10: R$ 1.000
- Gastou hoje: R$ 150
- Déficit total: −R$ 500
- O breakdown mostra: "Gasto de hoje: R$ 150" — mas não explica os outros R$ 350 de déficit acumulado.

### Sugestão
Adicionar linha no breakdown quando `isNegative` e déficit > gasto do dia:
- "Saldo antes de hoje: −R$ 350" (contexto histórico)

---

## UX-06 — "Como chegamos aqui?" ausente no estado zero transações
**Heurística:** 10 (Ajuda)
**Severidade:** Baixa
**Tela:** TelaPainel

### Problema
O botão "Como chegamos aqui?" só aparece quando há transações (`{!noTx && <button...>}`). No estado vazio (primeiro uso), o usuário vê o valor da cota mas não tem como entender como esse valor foi calculado.

### Impacto
Usuário de primeira viagem não consegue verificar se configurou corretamente.

### Sugestão
Mostrar o breakdown também no estado vazio (mostrando apenas cota + total planejado + explicação da divisão por dias).

---

## UX-07 — Inconsistência no comportamento de exclusão
**Heurística:** 4 (Consistência) + 3 (Controle e liberdade)
**Severidade:** Média
**Telas:** TelaPainel (linha ~2126) vs TelaHistorico (linha ~2525)

### Problema

**No TelaPainel** (card "Últimos movimentos"):
- Ícone lixeira exclui imediatamente sem confirmação.
- Snackbar "Transação excluída" aparece com opção "Desfazer" por 4 segundos.

**No TelaHistorico:**
- Clicar em excluir abre botões "Cancelar" / "Confirmar exclusão".
- Apenas após confirmar a transação é excluída (sem snackbar de desfazer).

Dois comportamentos completamente diferentes para a mesma ação.

### Risco
- No painel: exclusão acidental (toque inadvertido na lixeira = exclusão imediata).
- Usuário que veio do Histórico não espera exclusão imediata ao tocar a lixeira no Painel.
- Janela de desfazer de 4 segundos é muito curta para quem não estava esperando.

### Sugestão
Unificar o comportamento: usar o padrão do Histórico (confirmação antes) em ambos, ou usar o padrão do Painel (exclusão + desfazer) em ambos, com timer de pelo menos 8 segundos.

---

## UX-08 — Sem feedback textual ao salvar edição
**Heurística:** 1 (Visibilidade do estado)
**Severidade:** Baixa
**Fluxo:** Editar lançamento → salvar

### Problema
Quando o usuário edita uma transação e confirma, `handleSalvarEdicao` é chamado mas não dispara `showSnackbar`. O botão muda para "Pronto, anotado ✅" por 700ms e então a tela fecha. Não há confirmação de texto no painel após retornar.

### Código
```javascript
function handleSalvarEdicao({ valor, descricao, categoria, dataLancamento }) {
  haptic('success');
  update(prev => ...);
  triggerFlash(editandoItem?.tipo || 'gasto');
  // Sem showSnackbar aqui!
}
```

Comparação: ao **criar** uma transação, o snackbar aparece:
```javascript
showSnackbar(`✅ Gasto de ${fmt(valor)} registrado`);
```

### Sugestão
Adicionar `showSnackbar('✅ Lançamento atualizado')` em `handleSalvarEdicao`.

---

## UX-09 — Projeção de 7 dias com zero gastos é enganosa
**Heurística:** 1 (Visibilidade do estado) + 8 (Minimalismo)
**Severidade:** Média
**Tela:** TelaAnalise (linha ~2628)

### Problema
Quando `mediaGastoPorDia = 0` (sem gastos registrados), a projeção dos próximos 7 dias usa:
```javascript
const deltaLiquido = stats.valorDiarioBase - stats.mediaGastoPorDia; // = base - 0 = base
const proximos7 = proximos7.map(d => saldoAtual + deltaLiquido * diaProj);
```
Isso projetaria que o saldo cresce `base` por dia, como se o usuário não fosse gastar nada. Resultado: uma projeção absurdamente otimista.

O painel principal (TelaPainel) verifica `diaAtual < 5` antes de mostrar projeção. A TelaAnalise não tem esse guard para os próximos 7 dias — apenas para o card de projeção total (`stats.diaAtual < 5` adiciona aviso de "menos de 5 dias").

### Impacto
Com 1 dia de uso e R$ 50 gastos de R$ 100 base:
- `deltaLiquido = 100 − 50 = 50`
- Dia 1 futuro: saldo+50, dia 2: saldo+100...
A projeção mostra saldo crescendo — pode dar falsa sensação de segurança.

### Sugestão
Quando `diaAtual < 3 || totalGastos === 0`, não mostrar a tabela de 7 dias ou mostrar com aviso explícito "projeção baseada em dados insuficientes".

---

## UX-10 — WeeklyMiniChart: hoje sempre azul independente do estado
**Heurística:** 4 (Consistência)
**Severidade:** Baixa
**Componente:** WeeklyMiniChart (linha ~1185)

### Problema
A barra de hoje no gráfico semanal é sempre azul (`T.blue`), independente de o gasto ter ultrapassado a cota:
```javascript
const barBg = d.isToday ? T.blue : ... : val > valorDiarioBase ? T.red : T.green;
```

No card principal, quando `cotaDiaExcedida = true`, a cor do hero muda para amarelo/vermelho. Mas no gráfico, a barra de hoje permanece azul. Inconsistência visual.

### Sugestão
Colorir a barra de hoje com a mesma lógica das outras barras (verde/vermelho conforme gasto vs base), mantendo apenas o box-shadow azul para destacar que é hoje.

---

## UX-11 — Estado vazio do WeeklyMiniChart confunde usuário novo
**Heurística:** 1 (Visibilidade) + 10 (Ajuda)
**Severidade:** Baixa
**Componente:** WeeklyMiniChart

### Problema
No estado inicial (sem transações), o gráfico semanal exibe 7 barras: a de hoje é azul pequena (8px), as passadas são cinzas, as futuras são pontilhadas. Parece um gráfico "vazio" ou "com erro" para o usuário de primeira viagem.

Não há mensagem explicativa dentro do gráfico. A mensagem "Nenhum movimento ainda" fica em um card separado abaixo.

### Sugestão
Adicionar texto dentro do card do gráfico quando não há transações: "Seus gastos da semana vão aparecer aqui" ou esconder o gráfico no estado vazio e mostrar apenas quando há pelo menos 1 transação.

---

## UX-12 — "Novo ciclo" e "Fechamento de ciclo" são dois caminhos diferentes
**Heurística:** 4 (Consistência) + 7 (Flexibilidade)
**Severidade:** Baixa
**Fluxo:** TelaPainel → TelaFechamentoCiclo vs Menu → DialogReiniciar

### Problema
Há dois caminhos para iniciar um novo ciclo:
1. **Banner "Seu ciclo encerrou!"** → `TelaFechamentoCiclo` (resumo completo) → `DialogReiniciar` (opção de carregar saldo)
2. **Menu → "Novo ciclo"** → `DialogReiniciar` diretamente (sem resumo do ciclo)

Usuários que encontram o menu antes do banner pulam o resumo do ciclo (TelaFechamentoCiclo), que inclui informações valiosas (gasto total, categorias, saldo final).

### Sugestão
Quando `cicloEncerrado = true` e o usuário toca "Novo ciclo" no menu, redirecionar para `TelaFechamentoCiclo` antes do dialog, ou incluir um mini-resumo dentro do `DialogReiniciar`.

---

## UX-13 — Teclado numérico: apagar exige muitos toques
**Heurística:** 7 (Flexibilidade e eficiência)
**Severidade:** Baixa
**Componente:** MoneyInput (linha ~475)

### Problema
Para corrigir um valor digitado (ex: R$ 150,00), o usuário precisa apertar ⌫ 5 vezes (1,5,0,0,0). Não há como limpar o campo inteiro de uma vez.

### Sugestão
Adicionar botão "×" (limpar tudo) quando `raw.length > 0`, ou permitir pressionar e segurar ⌫ para limpar.

---

## UX-14 — Limite de R$99.999,99 no MoneyInput sem aviso
**Heurística:** 5 (Prevenção de erros) + 9 (Recuperação)
**Severidade:** Média
**Componente:** MoneyInput (linha ~487)

### Problema
```javascript
if (raw.length >= 7) return; // máx 7 dígitos = R$ 99.999,99
```
O teclado simplesmente para de responder ao toque quando o limite é atingido. Não há feedback visual de que existe um limite ou que o valor máximo foi alcançado.

Cenários afetados:
- Transação única acima de R$ 99.999,99 (ex: aluguel comercial alto, compra de bem durável)
- O ciclo pode ser configurado com R$ 200.000 (via input de texto livre), mas um gasto único de R$ 100.000 não pode ser registrado

### Sugestão
Quando `raw.length === 7`, mostrar feedback visual (borda pulsante, texto "Valor máximo atingido"). Ou aumentar o limite para 10 dígitos.

---

## UX-15 — "Recomeçar do zero" apaga ciclos anteriores também
**Heurística:** 3 (Controle) + 5 (Prevenção de erros)
**Severidade:** Alta
**Fluxo:** Menu → "Recomeçar do zero"

### Problema
`handleRecomecarDoZero` faz:
```javascript
const reset = { configurado: false, valorMensal: 0, diasDoMes: 30, dataInicio: null, transacoes: [] };
saveState(reset); setState(reset);
```
Note que `ciclosAnteriores` **não é preservado**. Todo o histórico de ciclos anteriores é apagado.

O aviso no dialog diz: "Todas as suas movimentações, orçamento e histórico serão apagados permanentemente." — isso é correto, mas o usuário pode não entender que inclui ciclos de meses anteriores.

### Contraste com `handleNovoMes`
`handleNovoMes` **arquiva** o ciclo atual em `ciclosAnteriores` antes de resetar. `handleRecomecarDoZero` não faz isso.

### Sugestão
Tornar mais explícito: "Isso vai apagar TODOS os seus dados, incluindo o histórico de X ciclos anteriores. Considere exportar antes."
Ou adicionar opção "Recomeçar mas manter histórico".

---

## UX-16 — "Gastei depois do ciclo encerrado" não tem aviso
**Heurística:** 5 (Prevenção de erros) + 1 (Visibilidade)
**Severidade:** Média

### Problema
Quando `cicloEncerrado = true`, os botões "Gastei!" e "Recebi" ainda estão ativos. O usuário pode registrar transações para datas após o fim do ciclo (usando a data de hoje, que é após o ciclo). Essas transações são incluídas nos cálculos do ciclo encerrado.

**Por que é problema:** O usuário pode alterar involuntariamente o saldo final de um ciclo encerrado, mudando o valor que apareceria na tela de resumo.

### Sugestão
Quando `cicloEncerrado = true`:
- Desabilitar os botões "Gastei!" e "Recebi" (ou mostrar aviso "Ciclo encerrado").
- Ou ao tocar nesses botões, mostrar "Seu ciclo encerrou. Inicie um novo ciclo para continuar registrando."

---

## UX-17 — Análise de Tela: pergunta "O gauge está trazendo informação nova?"
**Heurística:** 8 (Minimalismo)
**Severidade:** Baixa

### Avaliação do SpendingGauge (Ritmo do plano)

| Pergunta | Resposta |
|---|---|
| A métrica usada faz sentido? | Sim — média gasto/dia vs base é uma métrica de tendência clara |
| O texto é compreensível? | Parcialmente — "Ritmo do plano" soa técnico; "Ainda cedo" é bom |
| O usuário entende a diferença entre "disponível hoje" e "ritmo do plano"? | Provavelmente não sem explicação |
| O gauge deveria ganhar mais destaque? | Não — já ocupa espaço considerável |
| Está redundante com a pill ou o valor principal? | Parcialmente — "Ritmo alto" + pill vermelha "Passou" são redundantes |
| Precisa de novos estados? | Os 4 estados atuais (Leve/No ritmo/Atenção/Alto) parecem suficientes |

**Conclusão:** O gauge é útil para usuários que entendem "tendência vs saldo pontual", mas para leigos é apenas mais uma coisa desconhecida na tela. A mensagem de texto abaixo do gauge ("Você está gastando R$ X a menos por dia") é a parte mais valiosa. Considerar esconder a régua visual e manter apenas o texto.

---

## UX-18 — Card principal responde às perguntas do usuário?

Avaliação de cada pergunta da especificação:

| Pergunta | Responde? | Como |
|---|---|---|
| 1. Quanto ainda posso gastar hoje? | ✅ Sim | Número principal "Disponível hoje" |
| 2. Estou dentro do plano? | ✅ Sim | Pill de status |
| 3. Passei o valor de hoje? | ⚠️ Parcial | Frase explica, mas label "Disponível no plano" confunde |
| 4. Usei sobra dos outros dias? | ⚠️ Parcial | Frase explica, UsoDoDiaBar ajuda visualmente |
| 5. Saí do plano? | ✅ Sim | Pill "Passou" + frase clara |
| 6. O que preciso fazer agora? | ✅ Sim | Frase de recuperação com meta diária |
| 7. Gauge traz info nova? | ⚠️ Parcial | Para leigos, não. Para usuários avançados, sim |
| 8. Frase principal é humana? | ✅ Sim | "Ainda tem R$ X guardados dos outros dias" é ótimo |
| 9. Cores ajudam ou confundem? | ⚠️ Parcial | Amarelo em dois estados distintos confunde |
| 10. "Como chegamos aqui?" resolve a dúvida? | ✅ Sim | Breakdown é claro, exceto para déficit acumulado |

---

## UX-19 — Microcopy: análise geral

### Textos muito bons (manter):
- "Você ainda tem R$ X para usar e está com sobra dos outros dias." → humano, claro
- "Ainda dá, mas restou pouco para hoje. Melhor ir com calma." → coloquial, acolhedor
- "Para voltar ao plano, tente gastar até R$ X/dia." → acionável, específico
- "Quanto você gastou? 💸" → conversacional
- "Registre seu primeiro gasto para acompanhar o dia." → claro call-to-action
- "Entendi, vamos lá" → tom correto
- "Dá por dia: R$ X" → linguagem natural, nome do app aplicado

### Textos problemáticos (reescrever):

| Local | Texto atual | Sugestão |
|---|---|---|
| Onboarding passo 2 | "a cota diária reaproveita a margem de dias passados" | "o que você economizou nos dias anteriores fica guardado" |
| Config preview | "Sua cota diária" | "Você tem por dia" |
| Painel noTx | "Sua cota de hoje" | "Você pode gastar hoje" |
| Breakdown | "Cota de hoje" | "Valor de hoje" |
| UsoDoDiaBar | "restam da margem" | "reserva guardada" |
| UsoDoDiaBar | "restam da cota" | "ainda pode gastar" |
| Histórico ciclos | "cota X/dia" | "X por dia" |
| Painel hero cotaDiaExcedida | "Disponível no plano" | "Ainda disponível" |
| Fechamento positivo | "de saldo positivo neste ciclo" | "economizados neste ciclo" |

---

## Ranking de prioridade UX

| ID | Problema | Severidade | Prioridade antes dos testes |
|---|---|---|---|
| UX-01 | Terminologia técnica | Alta | **Sim** |
| UX-02 | Pill "Apertado" duplicada | Alta | **Sim** |
| UX-03 | Label "Disponível no plano" | Média | **Sim** |
| UX-07 | Inconsistência exclusão | Média | **Sim** |
| UX-14 | Limite MoneyInput sem aviso | Média | Sim |
| UX-15 | Recomeçar apaga histórico sem aviso | Alta | **Sim** |
| UX-16 | Registrar após ciclo encerrar | Média | Sim |
| UX-05 | Breakdown não explica déficit histórico | Média | Pode aguardar |
| UX-08 | Sem snackbar ao salvar edição | Baixa | Pode aguardar |
| UX-09 | Projeção 7 dias com zero gastos | Média | Pode aguardar |
| UX-04 | Gauge "Ainda cedo" em 37% | Baixa | Pode aguardar |
| UX-06 | Breakdown ausente no estado zero | Baixa | Pode aguardar |
| UX-10 | Hoje sempre azul no WeeklyMiniChart | Baixa | Pode aguardar |
| UX-11 | Gráfico vazio confunde | Baixa | Pode aguardar |
| UX-12 | Dois caminhos para novo ciclo | Baixa | Pode aguardar |
| UX-13 | Teclado: apagar exige muitos toques | Baixa | Pode aguardar |
| UX-17 | Gauge redundante | Baixa | Pode aguardar |
| UX-18 | Card principal responde perguntas? | Geral | Referência |
| UX-19 | Microcopy | Média | **Sim** |
