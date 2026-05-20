# QA_SIMULATED_USERS.md — Hoje Dá
## Simulações de Perfis de Usuários Reais
**Versão auditada:** index.html (3.764 linhas, build v6)
**Data da auditoria:** 2026-05-17
**Modo:** Leitura de código + simulação mental de cenários (sem alterar código)

---

## Glossário interno usado na auditoria

| Termo interno | O que representa |
|---|---|
| `valorDiarioBase` | Quota diária: `valorMensal / diasDoMes` |
| `disponivelHoje` | Saldo acumulado até hoje: `base × diaAtual + entradas − totalGastos` |
| `accBufferStart` | Folga dos dias anteriores + entradas: `max(0, disponivelHoje + gastosHoje − base)` |
| `ratioMargem` | `disponivelHoje / valorDiarioBase` |
| `cicloEncerrado` | `rawDia > diasDoMes` |
| `metaRecuperacaoDiaria` | `base − (abs(disponivelHoje) / diasRestantes)` |

---

## Perfil 1 — Usuário leigo em finanças

### Objetivo
Verificar se uma pessoa sem conhecimento financeiro consegue entender quanto pode gastar hoje.

### Dados usados
- Ciclo: 30 dias, R$ 3.000
- Base diária: R$ 100,00
- Dia atual: 10
- Total gasto: R$ 800 (R$ 80/dia em média)
- `disponivelHoje` = R$ 1.000 − R$ 800 = R$ 200

### Jornada simulada (passo a passo)

1. Usuário abre o app pela primeira vez → OnboardingScreen.
2. Lê: "Organize seus gastos do dia a dia. Sem planilha. Sem complicação." → **OK.**
3. Lê passo 2 do onboarding: *"A cota diária reaproveita a margem de dias passados."* → **CONFUSÃO. Dois termos técnicos juntos (cota + margem).**
4. Clica "Entendi, vamos lá" → TelaConfig.
5. Vê preview animado "Sua cota diária" ao preencher o valor → **CONFUSÃO. "Cota" não significa nada para o usuário leigo.**
6. Configura ciclo normalmente. Entra na TelaConfig sem dificuldade.
7. No painel, vê a pill "No plano" → OK, compreensível.
8. Vê "R$ 200,00" como número principal com label "Disponível hoje" → **OK.**
9. Vê abaixo o SpendingGauge "Ritmo do plano" com a régua → **CONFUSÃO. Não sabe o que é "Ritmo", não entende a régua de 4 zonas.**
10. Clica "Como chegamos aqui?" → CalculationBreakdownSheet abre.
11. Lê "Cota de hoje: R$ 100,00" → **CONFUSÃO. O que é "cota"?**
12. Lê "Folga acumulada: + R$ 200,00" com subtítulo "Dos dias anteriores" → **Mais claro, mas "Folga" pode ser ambíguo.**
13. O usuário entende o número principal (R$ 200), mas não os detalhes.

### Resultado esperado
Usuário entende "R$ 200 disponível hoje" sem precisar de explicação externa.

### Resultado observado
**Parcialmente alcançado.** O número principal é claro. Os detalhes do breakdown e o Ritmo do Plano são confusos para leigos.

### Pontos de confusão
1. "Cota diária" em 3 lugares (onboarding passo 2, preview da config, breakdown sheet).
2. "Margem" no onboarding passo 2.
3. "Ritmo do plano" — o usuário leigo não sabe o que é "ritmo".
4. UsoDoDiaBar: labels "restam da margem" / "restam da cota" são técnicos.
5. A régua tem 4 zonas mas o usuário não sabe onde deveria estar.

### Bugs encontrados
- Nenhum técnico. Problemas são de linguagem.

### Sugestões de melhoria
- Substituir "Cota de hoje" por "Valor de hoje" no breakdown.
- Substituir "Folga acumulada" por "Guardado dos dias anteriores".
- Substituir "Ritmo do plano" por "Seu ritmo" ou "Como você está indo".
- Substituir "restam da margem" por "sobra guardada" e "restam da cota" por "ainda pode gastar hoje".
- No onboarding passo 2: reformular para linguagem simples.

### Severidade
**Média.** O usuário entende o número principal mas fica perdido nos detalhes.

### Prioridade para testes reais
**Alta.** Resolver antes dos testes.

---

## Perfil 2 — Usuário ansioso com dinheiro

### Objetivo
Verificar se o app orienta sem gerar culpa nem ansiedade.

### Dados usados
- Ciclo: 30 dias, R$ 2.000 (base = R$ 66,67/dia)
- Dia 7, gastou R$ 80 hoje (passou a cota do dia)
- Dias anteriores: todos dentro da cota
- `disponivelHoje` = 66,67 × 7 + 0 − (6×40 + 80) = 466,67 − 320 = R$ 146,67

### Jornada simulada

1. Usuário abre o app após gastar R$ 80.
2. Vê pill amarela "Apertado" → **Percepção de problema/perigo.**
3. Vê valor R$ 146,67 com label "Disponível no plano" (label muda quando `cotaDiaExcedida = true`) → **Confuso: o que é "no plano"? Estou fora do plano?**
4. Lê a frase: *"Você passou do valor de hoje, mas ainda tem R$ 146,67 guardados dos outros dias."* → **Mensagem é tranquilizadora. Boa.**
5. Vê a barra UsoDoDiaBar com balão "R$ 80,00 gastos" em amarelo.
6. Vê "Ritmo do plano" com estado "No ritmo" (porque média dos 7 dias é ~R$ 45,71 < base) → OK.
7. Se esse usuário ver o gauge vermelho "Ritmo alto" em outro cenário, pode se assustar excessivamente.

### Resultado esperado
Usuário entende que está ok, apesar de ter passado o valor de hoje.

### Resultado observado
**Parcialmente alcançado.** A frase tranquiliza, mas:
- A pill amarela "Apertado" causa alarme antes de o usuário ler a frase.
- O label "Disponível no plano" cria confusão momentânea.
- O usuário precisa ler toda a frase para entender que está bem.

### Pontos de confusão
1. Pill "Apertado" é amarela e soa como alerta antes de qualquer explicação.
2. Label "Disponível no plano" soa como "estou fora do plano" para quem está ansioso.
3. No estado "Passou" (saldo negativo), a frase usa "passa do valor disponível" — pode parecer irremediável para um usuário ansioso.
4. "Uma entrada extra ou um novo ajuste pode ajudar" (estado déficit irrecuperável) é neutro mas poderia ser mais acolhedor.

### Bugs encontrados
- Nenhum técnico.

### Sugestões de melhoria
- Pill "Apertado" poderia ser azul (neutro) em vez de amarela quando o saldo acumulado ainda é positivo.
- Label no hero quando `cotaDiaExcedida`: trocar "Disponível no plano" por "Ainda disponível" ou "Ainda tenho".
- No estado "Passou" com recuperação viável, reforçar que ainda é possível equilibrar.
- Considerar tom mais acolhedor: "Você usou um pouco da reserva, mas ainda está dentro do combinado."

### Severidade
**Média.** A frase tranquiliza, mas a primeira impressão (pill amarela + label ambíguo) pode alarmar.

### Prioridade para testes reais
**Alta.** Esse perfil é provavelmente a maioria dos usuários reais.

---

## Perfil 3 — Usuário disciplinado

### Objetivo
Verificar se o fluxo de registro é rápido, claro e satisfatório.

### Dados usados
- Ciclo: 30 dias, R$ 3.000 (base = R$ 100/dia)
- Dia 15 com 14 dias de histórico completo.
- Usuário quer registrar: "Almoço R$ 28,50" categoria Alimentação.

### Jornada simulada

1. Painel carrega → Vê informações do dia → OK.
2. Toca "Gastei!" → TelaEntrada abre com animação slideUp → **Boa.**
3. Teclado numérico aparece. Usuário digita: 2, 8, 5, 0 → R$ 28,50 → **Fluido.**
4. Categoria "Alimentação" já está selecionada (última usada via `SK_LAST_CAT`) → **Excelente UX.**
5. Toca "Confirmar" → Haptic + som → Snackbar "✅ Gasto de R$ 28,50 registrado" → **Satisfatório.**
6. Retorna ao painel com flash no card.
7. Vê o saldo atualizado.
8. Tempo total: ~5 segundos.

### Resultado esperado
Registro rápido, sem fricção, com feedback visual satisfatório.

### Resultado observado
**Alcançado.** O fluxo é muito bom para usuários disciplinados.

### Pontos de confusão
1. Ao retornar para o painel, o número grande sofre "num-pop" animation — mas a pill de status não pisca nem muda cor visivelmente. O usuário pode não perceber que o saldo mudou.
2. Não há indicador no botão "Gastei!" de quanto ainda pode gastar hoje (seria um atalho valioso: "Gastei! · R$ 71,50 restam").

### Bugs encontrados
- Nenhum.

### Sugestões de melhoria
- Mostrar o saldo disponível no botão "Gastei!" para referência rápida.
- Ao retornar do registro, dar mais destaque à mudança (borda colorida no card por 2s, não só no número).

### Severidade
**Baixa.** O fluxo funciona muito bem.

### Prioridade para testes reais
**Pode aguardar.** Melhorias de polish.

---

## Perfil 4 — Usuário esquecido (gastos retroativos)

### Objetivo
Testar se o app recalcula corretamente ao registrar gastos com data passada.

### Dados usados
- Ciclo: 30 dias, R$ 3.000 (base = R$ 100/dia)
- Dia atual: 8
- Usuário esqueceu de registrar: R$ 45 no dia 5 (Alimentação) e R$ 60 no dia 6 (Transporte).

### Cálculo esperado antes dos retroativos
- `disponivelHoje` = 100×8 − gastos_anteriores

### Jornada simulada

1. Usuário abre TelaEntrada e toca no date picker.
2. Seleciona data do dia 5 → "Retroativo" badge aparece em azul → **Bom.**
3. Digita R$ 45 → Confirma.
4. Abre TelaEntrada novamente, seleciona dia 6, digita R$ 60 → Confirma.
5. Retorna ao painel.
6. O `disponivelHoje` reflete os gastos retroativos corretamente? **Sim, por design.** `calcStats` refiltra todas as transações a cada render.

### Verificação de cálculo
Dados: base=100, dia=8, gastos_retroativos=105 (45+60).
`disponivelHoje` = 100×8 + 0 − 105 = R$ 695 (assumindo sem outros gastos).
Isso é correto — o saldo acumulado até hoje inclui os gastos retroativos pois eles têm data dentro do ciclo.

### Resultado esperado
Saldo recalculado corretamente. Interface permanece compreensível.

### Resultado observado
**Cálculo correto.** Interface mostra badge "Retroativo" durante o registro, o que é bom.
Porém, ao retornar ao painel, não há sinalização de "saldo atualizado por gastos retroativos".

### Pontos de confusão
1. O usuário não sabe quanto o saldo mudou por conta dos retroativos (apenas vê o novo total).
2. No histórico, os gastos retroativos aparecem pela data deles, não pela data de registro. O usuário pode confundir se a entrada sumiu ou não.
3. `minDate` na TelaEntrada é `state.dataInicio` — impede datas antes do início do ciclo. **Correto.**
4. `maxValue={todayStr}` impede datas futuras. **Correto.**

### Bugs encontrados
- **Nenhum de cálculo.** O sistema recalcula corretamente.

### Sugestões de melhoria
- Após salvar um gasto retroativo, o snackbar poderia dizer "Gasto retroativo de R$ 45 registrado para dia 05/05".
- O TelaHistorico poderia destacar visualmente transações retroativas (uma pill "retroativo" na linha).

### Severidade
**Baixa.** O fluxo funciona corretamente.

### Prioridade para testes reais
**Pode aguardar.**

---

## Perfil 5 — Usuário impulsivo (passou o valor do dia, tem sobra)

### Objetivo
Verificar se o app explica que o usuário usou a sobra, mas ainda não saiu do plano.

### Dados usados
- Ciclo: 30 dias, R$ 3.000 (base = R$ 100/dia)
- Dias 1–4: gastou R$ 50/dia (total R$ 200). Poupou R$ 200.
- Dia 5: gastou R$ 250 (passou a cota do dia em R$ 150)
- `disponivelHoje` = 100×5 + 0 − (200+250) = 500 − 450 = R$ 50

### Cálculo de accBufferStart
- `accBufferStart` = max(0, 50 + 250 − 100) = max(0, 200) = R$ 200

### Estado esperado no card
- `cotaDiaExcedida = true` (250 > 100)
- `margem = 50 > 0`
- Status = "Apertado"
- Label do hero = "Disponível no plano"
- Frase = "Você passou do valor de hoje, mas ainda tem R$ 50,00 guardados dos outros dias."

### Jornada simulada

1. Usuário chega em casa e abre o app.
2. Vê pill amarela "Apertado" → Pode assustar.
3. Vê "Disponível no plano: R$ 50,00" → Confuso. O que é "no plano"? Estou dentro ou fora?
4. Lê a frase → Entende que ainda tem R$ 50.
5. Clica "Como chegamos aqui?" → Vê cálculo detalhado. Útil.
6. Vê no breakdown: "Quanto você passou hoje: R$ 150", "Folga acumulada: + R$ 200", "Quanto foi usado da folga: − R$ 150".
7. "Ainda sobra no plano: R$ 50" → **Clareza melhor aqui do que no card principal!**

### Resultado esperado
Usuário entende que gastou da reserva mas ainda está no plano.

### Resultado observado
**Parcialmente alcançado.** O breakdown explica bem, mas o card principal não deixa suficientemente claro. A pill "Apertado" + label "Disponível no plano" cria ambiguidade antes de o usuário ler a frase.

### Pontos de confusão
1. Label "Disponível no plano" — o usuário não sabe o que "no plano" significa aqui.
2. A pill "Apertado" é a mesma quando o saldo geral está apertado e quando apenas o dia está apertado — duas situações diferentes, mesmo label.
3. O breakdown é a explicação mais clara, mas requer toque extra.

### Bugs encontrados
- Nenhum técnico.
- **Problema de UX:** dois estados distintos mapeados para a mesma pill "Apertado" com labels diferentes no hero.

### Sugestões de melhoria
- Criar pill diferente para "Passou o dia, mas no plano" vs "Saldo baixo". Ex: "Usado reserva" ou "Com sobra usada".
- Ou ao menos trocar o label do hero para "Ainda disponível" em vez de "Disponível no plano".
- O breakdown deveria ter um CTA mais visível no card principal quando `cotaDiaExcedida = true`.

### Severidade
**Média.** O entendimento correto depende de leitura da frase ou do breakdown.

### Prioridade para testes reais
**Alta.** Esse é provavelmente o cenário mais comum de uso real.

---

## Perfil 6 — Usuário que saiu do plano

### Objetivo
Verificar se o app explica o problema e mostra um caminho de recuperação.

### Dados usados
- Ciclo: 30 dias, R$ 3.000 (base = R$ 100/dia)
- Dia 10: gastou R$ 1.500 total (média de R$ 150/dia)
- `disponivelHoje` = 100×10 + 0 − 1500 = 1000 − 1500 = −R$ 500
- `diasRestantes = 20`
- `metaRecuperacaoDiaria = 100 − (500/20) = 100 − 25 = R$ 75/dia`

### Estado esperado
- `margem < 0` → Status = "Passou"
- Frase: "Você passou R$ 500,00 do que estava disponível até hoje. Para voltar ao plano, tente gastar até R$ 75,00/dia."

### Jornada simulada

1. Usuário abre o app.
2. Vê pill vermelha "Passou" → **Impacto visual forte. Pode assustar.**
3. Vê label "Fora do previsto" com R$ 500,00 em vermelho → **OK como mensagem de alerta.**
4. Lê frase de recuperação: "...tente gastar até R$ 75,00/dia." → **Utilíssimo! Isso é o caminho a seguir.**
5. Vê SpendingGauge "Ritmo alto" → Redundante mas reforça a mensagem.
6. "Como chegamos aqui?" não aparece quando `!noTx` e saldo negativo? Verificação: `{!noTx && <button onClick...>Como chegamos aqui?</button>}` — **o botão aparece pois noTx = false.** ✓
7. Clica "Como chegamos aqui?" → Vê breakdown.
8. No breakdown: resultado "Saiu do plano: R$ 500,00" em vermelho. Linhas: Cota de hoje R$ 100, Gasto de hoje X, Quanto passou Y.

### Observação crítica sobre o breakdown no estado negativo
Quando `disponivelHoje < 0`:
- `availableNow = -500`
- `carryBeforeToday = accBufferStart = max(0, -500 + gastosHoje - 100)`. Se gastosHoje = 150: `max(0, -500+150-100) = max(0,-450) = 0`.
- `carryBeforeToday = 0` → `hasCarry = false`.
- O breakdown mostra apenas: cota, gasto de hoje, quanto passou hoje. **Mas onde foi o gasto dos outros 9 dias?** O breakdown não explica o histórico acumulado, apenas o dia de hoje. **Isso pode confundir**: o usuário vê R$ 150 "gasto hoje" mas não entende como chegou a -R$ 500.

### Resultado esperado
Usuário entende que passou e tem uma meta concreta para recuperar.

### Resultado observado
**Parcialmente alcançado.** A frase de recuperação é excelente. Mas o breakdown não explica o déficit acumulado claramente.

### Pontos de confusão
1. Breakdown mostra apenas o dia de hoje, não o histórico acumulado que gerou o déficit.
2. Usuário pode pensar "mas eu só gastei R$ 150 hoje, como fui parar em −R$ 500?"
3. Pill vermelha + número grande negativo pode gerar pânico antes de o usuário ler a frase de recuperação.
4. O label "Fora do previsto" é bom mas poderia ser seguido imediatamente pela meta de recuperação no próprio hero.

### Bugs encontrados
- Nenhum técnico.
- Lacuna de UX: o breakdown não mostra o contexto histórico que gerou o déficit.

### Sugestões de melhoria
- Adicionar ao breakdown, quando déficit > gasto do dia, uma linha "Saldo acumulado antes de hoje: −R$ X".
- Frase do hero poderia ser mais acolhedora: "Você passou um pouco do combinado. Para equilibrar, tente ficar em R$ 75/dia a partir de amanhã."
- Considerar ícone diferente do "X" quando há caminho de recuperação — usar algo como ⚠️ em vez de ✗.

### Severidade
**Alta.** Estado crítico que o usuário precisa entender bem para agir.

### Prioridade para testes reais
**Alta.**

---

## Perfil 7 — Usuário com entradas extras

### Objetivo
Verificar se a entrada extra é incorporada corretamente e se a explicação visual faz sentido.

### Dados usados
- Ciclo: 30 dias, R$ 2.000 (base = R$ 66,67/dia)
- Dia 15, gasto normal de R$ 50/dia (total R$ 750)
- Usuário recebe reembolso de R$ 200

### Cálculo antes da entrada
- `disponivelHoje` = 66,67×15 + 0 − 750 = 1000 − 750 = R$ 250

### Cálculo depois da entrada
- `disponivelHoje` = 66,67×15 + 200 − 750 = R$ 450

### Jornada simulada

1. Usuário toca "Recebi" → TelaEntrada abre no modo "extra".
2. Categorias de renda aparecem: Salário, Freela, Bônus, Reembolso, Outros → **Bom.**
3. Seleciona "Reembolso", digita R$ 200, confirma → Snackbar aparece.
4. Retorna ao painel. Vê R$ 450 no hero. **Mas o usuário sabe que era R$ 250 antes?** O flash de entrada no card é verde, mas não há indicação de "subiu R$ 200".
5. Clica "Como chegamos aqui?" → Vê "Folga acumulada" com subtítulo "Dias anteriores + entradas" → **Correto mas vago.** O valor de R$ 200 de entrada não está separado do buffer acumulado de dias anteriores.

### Verificação de cálculo
`accBufferStart = max(0, 450 + 50_hoje − 66.67) = max(0, 433.33) = R$ 433.33`
O breakdown mostraria `carryBeforeToday = 433.33` como "Folga acumulada: Dias anteriores + entradas".
A entrada de R$ 200 e os R$ 233.33 de poupança dos dias anteriores estão lumped juntos. **Não há breakdown separado para entradas.**

### Resultado esperado
Usuário entende que o reembolso foi adicionado e o saldo subiu por conta disso.

### Resultado observado
**Cálculo correto.** Visualmente, o usuário vê o saldo maior, mas não entende exatamente **quanto** a entrada impactou. O breakdown não separa entradas de poupança acumulada.

### Pontos de confusão
1. Breakdown mostra "Folga acumulada: Dias anteriores + entradas" como um único número — não separa quanto veio de poupança e quanto veio de entradas.
2. O snackbar confirma o valor, mas o usuário precisa memorizar para comparar com o saldo anterior.
3. Usuário ansioso pode não entender por que o saldo subiu "mais do que esperava" (a poupança + entrada juntas).

### Bugs encontrados
- Nenhum técnico.

### Sugestões de melhoria
- No breakdown, separar "Poupança dos dias anteriores: R$ X" de "Entradas: + R$ Y".
- Ao registrar uma entrada, o snackbar poderia dizer: "Saldo subiu para R$ 450 (+R$ 200 do reembolso)".

### Severidade
**Média.**

### Prioridade para testes reais
**Pode aguardar.**

---

## Perfil 8 — Usuário que erra lançamentos

### Objetivo
Verificar se edição, exclusão e re-registro recalculam corretamente.

### Dados usados
- Ciclo: 30 dias, R$ 3.000 (base = R$ 100)
- Dia 5: registrou R$ 150 como gasto (erro), deveria ser R$ 50.

### Jornada simulada

#### 8.1 — Editar via TelaHistorico

1. Usuário vai ao Histórico.
2. Toca na transação → Expande com botões Editar / Excluir.
3. Toca "Editar" → TelaEntrada abre em modo "Editar lançamento".
4. Valor atual: R$ 150,00 (MoneyInput inicializado via `String(Math.round(150 * 100)) = '15000'`). ✓
5. Usuário precisa apagar e redigitar → Toca ⌫ múltiplas vezes → OK, mas incomodo (7 toques para apagar R$ 150,00).
6. Digita R$ 50,00 → Confirma.
7. A transação é atualizada com `prev.transacoes.map(t => t.id === editandoItem.id ? {...t, valor: 50} : t)`. ✓
8. Retorna ao Histórico. Snackbar: o retorno do salvar edição não tem snackbar! Verifica: `handleSalvarEdicao` não chama `showSnackbar`. **PROBLEMA.**

#### 8.2 — Excluir e re-registrar

1. Usuário exclui a transação.
2. Aparece snackbar "Transação excluída" com "Desfazer".
3. O `deletedRef.current` guarda a transação deletada.
4. Usuário clica "Desfazer" → transação volta com ID original. ✓
5. Usuário não clica desfazer → após 4 segundos, snackbar some. Transação perdida para sempre. **Sem aviso de que é irreversível após o timeout.**
6. Usuário re-registra R$ 50 normalmente. ✓

#### 8.3 — Editar via TelaPainel (últimos movimentos)

1. No card "Últimos movimentos", cada item tem botão "editar" (texto mini abaixo do valor) + ícone lixeira.
2. Toca no item → abre TelaEntrada em modo edição. ✓
3. Toca na lixeira diretamente → `onExcluir(t.id)` é chamado **sem confirmação**. **PROBLEMA DE UX.**
   No Histórico, há etapa de confirmação (botão "Confirmar exclusão"). No Painel, a lixeira exclui imediatamente (mas há desfazer via snackbar).

### Resultado esperado
Todos os fluxos de edição e exclusão recalculam corretamente.

### Resultado observado
**Cálculos corretos.** Mas:
1. **Sem snackbar/feedback após salvar edição** — o usuário não tem confirmação visual de que a edição foi salva.
2. **Exclusão no painel não tem confirmação** (diferente do comportamento no Histórico).
3. **Apagar o valor no MoneyInput** requer muitos toques de backspace.

### Bugs encontrados
1. `handleSalvarEdicao` não dispara `showSnackbar` — usuário não recebe feedback textual de que a edição foi salva. (Bug leve de feedback.)
2. Comportamento inconsistente de exclusão: com confirmação no Histórico, sem confirmação no Painel.

### Sugestões de melhoria
- Adicionar `showSnackbar('✅ Lançamento atualizado')` após salvar edição.
- Unificar comportamento de exclusão (sempre pedir confirmação, ou sempre usar desfazer via snackbar).
- No MoneyInput, considerar botão "Limpar" (×) para apagar o valor inteiro de uma vez.

### Severidade
- Bug feedback: **Baixa** (funciona mas sem confirmação visual).
- Inconsistência exclusão: **Média** (pode causar exclusão acidental no painel).

### Prioridade para testes reais
**Média.** Resolver a inconsistência de exclusão antes dos testes.

---

## Perfil 9 — Usuário de celular pequeno (viewport estreito)

### Objetivo
Detectar cortes de texto, botões apertados e layout quebrado em telas pequenas (320px–375px).

### Simulação visual (análise de código CSS/layout)

#### 9.1 — TelaPainel header
```
display: flex; justifyContent: space-between
```
Logo "Hoje Dá" + botão config à esquerda + ícone engrenagem à direita.
Em 320px: o texto "Hoje Dá" (22px, fontWeight 800) + botão edit (44px) + logo (28px) + gap 8 = 44+8+28+8+texto. Texto ~80px. Total ~168px para o grupo esquerdo. Margem suficiente para 320px.

#### 9.2 — SpendingGauge — labels de 4 zonas
```
gridTemplateColumns: 'repeat(4, 1fr)'
```
Cada label: "Ritmo leve" / "No ritmo" / "Atenção" / "Ritmo alto" em fontSize 9.
Em 320px: cada coluna ~80px. "Ritmo leve" = 9 chars × ~5px/char = ~45px. Cabe com folga.

#### 9.3 — WeeklyMiniChart barras
```
display: flex; justifyContent: space-between
```
7 barras de width: 32px + gaps. 7×32 + 6×gaps = 224px mínimo. Em 320px − 48px padding = 272px disponível. Cabe.

#### 9.4 — Resumo do ciclo (grid 3 cards no fechamento)
```
gridTemplateColumns: '1fr 1fr 1fr'; gap: 10px
```
Cada card com valores como "R$ 3.000,00". Em 320px − 32px padding = 288px. Cada coluna: 88px. "R$ 3.000,00" em fontSize 15 fontWeight 800 pode não caber (12+ chars × ~8px/char = ~96px > 88px). **RISCO DE CORTE.**

#### 9.5 — TelaFechamentoCiclo hero
```
fontSize: 48 lettering: -2
```
"+ R$ 3.000,00" em 48px pode exceder largura em 320px. **RISCO DE CORTE.**

#### 9.6 — CalculationBreakdownSheet
```
display: flex; gap: 12; padding: 14px 20px
```
CalcRow: ícone (36px) + gap (12) + texto flex + valor. Valores como "R$ 9.999,99" em fontSize 15. Em 320px isso deve caber, mas texto longo no subtitle pode quebrar a linha. Não há `whiteSpace: nowrap`, então quebra de linha é esperada — OK.

#### 9.7 — Botões "Gastei!" + "Recebi"
```
height: 68; borderRadius: 999
"Gastei!" flex: 1
"Recebi" width: 120
```
Em 320px − 48px padding − 12px gap = 260px disponível. Gastei: 140px, Recebi: 120px. Total 260px. Exatamente no limite. Em 320px com padding 24px×2=48px: pode ficar justo mas deve caber.

#### 9.8 — TelaConfig chips rápidos
```
display: flex; gap: 8
3 chips: "Este mês", "Hoje +30d", "Próx. ciclo"
flex: 1 each
```
Em 320px − 40px padding = 280px / 3 chips − 16px gaps = ~88px cada. "Próx. ciclo" (10 chars) em fontSize 12. Pode ficar apertado mas não deve cortar com `whiteSpace: nowrap` + `overflow: hidden`. **VERIFICAR.**

#### 9.9 — TelaConfig preview card "Dá por dia"
```
gradient card com fontSize: 40 fontWeight 800
```
"R$ 66,67" em 40px cabe em 320px. "R$ 1.000,00" em 40px pode ser ~140px, cabe.

#### 9.10 — MoneyInput display
```
fontSize: cents > 0 ? 46 : 40
```
"R$ 99.999,99" em fontSize 46 lettering -2 = ~180px. Em 320px cabe. Mas "R$ 99.999,99/dia" no preview seria grande. Analisar.

### Resultado esperado
Interface responsiva sem quebra de layout em 320px–375px.

### Resultado observado
**Maioria cabe.** Riscos identificados:

1. **Grid 3 colunas no TelaFechamentoCiclo** — valores grandes podem cortar em 320px.
2. **Hero da TelaFechamentoCiclo** em 48px com valores como "+R$ 3.000,00" pode cortar.
3. **Chips da TelaConfig** podem ficar muito apertados em 320px.

### Bugs encontrados
- Sem bugs confirmados (análise estática). Requer teste visual real.
- **Risco:** `fontSize: 48` no hero do fechamento sem `min-width: 0` ou `overflow: hidden` pode vazar.

### Sugestões de melhoria
- Adicionar `fontSize: clamp(32px, 8vw, 48px)` ou lógica de tamanho adaptativo no hero da TelaFechamentoCiclo.
- Testar em dispositivos reais com Samsung Galaxy A-series (360px) e iPhone SE (375px).

### Severidade
**Média.** Riscos visuais em dispositivos menores.

### Prioridade para testes reais
**Alta.** Testar em dispositivo real antes de liberar para usuários.

---

## Perfil 10 — Usuário de primeira viagem

### Objetivo
Avaliar onboarding, configuração inicial e primeira ação. O app deve ser entendido sem explicação externa.

### Dados usados
- Usuário leigo, abrindo pela primeira vez.

### Jornada completa simulada

**Passo 1 — OnboardingScreen:**
1. Vê hero azul com logo "Hoje Dá" e tagline "Clareza. Controle. Liberdade." → **Aspiracional, mas vago para leigo.**
2. Lê "Organize seus gastos do dia a dia. Sem planilha. Sem complicação." → **Claro. Bom.**
3. Vê seção "Como funciona" com 3 passos:
   - Passo 1: "Defina o valor do ciclo" → texto: "Um ciclo é o período entre pagamentos..." → **Usa a palavra "ciclo" para explicar "ciclo". Circular.**
   - Passo 2: "Registre gastos e entradas" → texto menciona "cota diária reaproveita a margem" → **Dois termos técnicos.**
   - Passo 3: "O app te diz se dá" → gauge colorida como ícone → **Intuitivo.**
4. CTA: "Entendi, vamos lá" → **Bom. Não forçou entender tudo.**

**Avaliação do onboarding:** Parcialmente claro. O passo 2 tem jargão desnecessário. O conceito central ("ciclo = período entre pagamentos") é explicado, mas a explicação usa a própria palavra que está definindo.

---

**Passo 2 — TelaConfig:**
1. Badge azul "Configuração" → OK.
2. Título: "Defina o valor do ciclo" → Subtext: "Escolha quanto quer usar nos gastos do dia a dia." → **Claro e humano. Bom.**
3. Card educativo "Como chegar nesse valor": Entradas − Investimentos − Contas fixas = Valor do ciclo → **Excelente. Visual e claro.**
4. Preenche valor R$ 2.000.
5. Preview animado aparece: "Sua cota diária — R$ 66,67 — por dia durante 30 dias" → **"Cota" aparece de novo. Poderia ser "Seu valor diário" ou "Dá R$ 66,67 por dia".**
6. Configura datas (quick-chip "Este mês" → fácil).
7. Resumo: "Valor do ciclo: R$ 2.000 | Duração: 30 dias | Dá por dia: R$ 66,67" → **"Dá por dia" é perfeito. Tom humano.**
8. Clica "Continuar".

**Avaliação da config:** Muito boa. A palavra "cota" aparece mas não bloqueia o entendimento. O "Dá por dia" resolve bem.

---

**Passo 3 — TelaPainel (primeira visita):**
1. Vê estado vazio: hero mostra "Sua cota de hoje: R$ 66,67" → **"Cota" de novo. Poderia ser "Você pode gastar hoje: R$ 66,67".**
2. Vê pill "Hoje" (não é status, apenas label de dia sem transações) → **Neutro, não confunde.**
3. Lê "Registre seu primeiro gasto para acompanhar o dia." → **Excelente call to action.**
4. Vê card vazio "Nenhum movimento ainda" com ✍️ e "Use os botões acima para registrar..." → **Redundante com a frase acima mas reforça.**
5. Vê WeeklyMiniChart "Esta semana" — apenas 7 barras vazias/cinzas. → **Pode parecer broken.**
6. Vê "Resumo do ciclo" com donut em verde (0%), R$ 0 gasto, saldo restante R$ 2.000. → **OK, mas "Projeção disponível após 5 dias" é informação prematura.**
7. Vê SpendingGauge "Ritmo do plano" com estado "Ainda cedo". → **Bom. Explica que não há dados ainda.**
8. **Não há nenhuma seta ou hint visual apontando para o botão "Gastei!"** — o usuário precisa descobrir sozinho.

**Avaliação do painel vazio:** Funcional, mas passivo. O usuário sabe que deve tocar "Gastei!" mas o app não guia ativamente.

---

**Passo 4 — Primeiro gasto:**
1. Toca "Gastei!" → TelaEntrada abre.
2. Título: "Quanto você gastou? 💸" → **Excelente.**
3. Teclado numérico grande, claro, fácil de usar. → **Ótimo.**
4. Categorias com emojis → **Visual e intuitivo.**
5. Confirma → snackbar de sucesso. → **Bom.**
6. Retorna ao painel. Vê saldo atualizado. → **Satisfatório.**

**Avaliação do primeiro gasto:** Excelente fluxo.

### Resultado esperado
Usuário de primeira viagem consegue configurar e registrar o primeiro gasto sem ajuda.

### Resultado observado
**Alcançado com ressalvas.**
- Configuração: muito boa.
- Primeiro gasto: ótimo.
- Tela principal com dados: confusa em alguns detalhes de linguagem.
- O app pode ser entendido sem explicação externa na maioria dos casos.

### Pontos de confusão (sumário da primeira viagem)
1. Passo 2 do onboarding: "cota" e "margem" sem explicação.
2. Preview da config: "Sua cota diária".
3. Estado inicial do painel: "Sua cota de hoje" (poderia ser "Você pode gastar hoje").
4. WeeklyMiniChart vazio parece broken.
5. SpendingGauge vazio não tem CTA.
6. Botão "Gastei!" não é autoevidentemente o passo 1 para o usuário.

### Bugs encontrados
- Nenhum técnico.

### Sugestões de melhoria
1. Onboarding passo 2: reescrever sem "cota" e "margem".
2. Preview config: trocar "Sua cota diária" por "Você tem R$ X por dia".
3. Estado vazio do painel: trocar "Sua cota de hoje" por "Hoje você pode gastar" ou "Ainda dá gastar".
4. Adicionar uma seta animada ou highlight no botão "Gastei!" no estado vazio (primeiro acesso).
5. No gráfico vazio, mostrar "Seus gastos desta semana aparecerão aqui" em vez de barras cinzas.

### Severidade
**Média.** O app é utilizável, mas poderia ser mais intuitivo para o leigo.

### Prioridade para testes reais
**Alta.** A primeira impressão define se o usuário continua usando.

---

## Resumo dos Perfis

| Perfil | Status | Crítico? | Prioridade |
|---|---|---|---|
| 1 — Leigo | Parcial | Não | Alta |
| 2 — Ansioso | Parcial | Não | Alta |
| 3 — Disciplinado | OK | Não | Baixa |
| 4 — Esquecido | OK | Não | Baixa |
| 5 — Impulsivo | Parcial | Não | Alta |
| 6 — Fora do plano | Parcial | Não | Alta |
| 7 — Entrada extra | OK com ressalvas | Não | Média |
| 8 — Erros de lançamento | OK com ressalvas | Sim (inconsistência) | Média |
| 9 — Celular pequeno | Riscos visuais | Possível | Alta |
| 10 — Primeira viagem | Parcial | Não | Alta |

---

## Cenários Financeiros Verificados

| Cenário | Resultado | Obs |
|---|---|---|
| 1. Ciclo 15d R$1.000 | ✅ Correto | base = R$66,67 |
| 2. Ciclo 30d R$3.000 | ✅ Correto | base = R$100 |
| 3. Dia 1 sem transações | ✅ Correto | noTx = true, mostra base |
| 4. Dia 1 gasto < base | ✅ Correto | status "No plano" ou "Com folga" |
| 5. Dia 1 gasto = base | ✅ Correto | disponivelHoje = 0, status "Apertado" (ratio=0) |
| 6. Dia 1 gasto > base | ✅ Correto | déficit, metaRecuperacaoDiaria calculada |
| 7. Dia 5 com sobra | ✅ Correto | accBufferStart acumulado |
| 8. Dia 5 gasto > base mas saldo positivo | ✅ Correto | cotaDiaExcedida=true, status "Apertado" |
| 9. Dia 5 gasto > disponível total | ✅ Correto | déficit, frase de recuperação |
| 10. Entrada extra | ✅ Correto | totalEntradas incluído no cálculo |
| 11. Gasto retroativo | ✅ Correto | calcStats refiltra todas as transações |
| 12. Edição de gasto | ✅ Correto | map com novo valor |
| 13. Exclusão de gasto | ✅ Correto | filter remove ID |
| 14. Recarga da página | ✅ Correto | loadState() restaura do localStorage |
| 15. Fechamento positivo | ✅ Correto | TelaFechamentoCiclo mostra saldo verde |
| 16. Fechamento negativo | ✅ Correto | TelaFechamentoCiclo mostra saldo vermelho |
| 17. Novo ciclo + saldo positivo | ✅ Correto | saldoAnterior passado para nova config |
| 18. Novo ciclo do zero | ✅ Correto | saldoAnterior = 0 |
| 19. Valor zero | ✅ Correto | botão desabilitado, não salva |
| 20. Valores altos (R$10.000+) | ⚠️ Limitado | MoneyInput: max R$99.999,99/transação |
| 21. Valores pequenos (R$0,50) | ✅ Correto | MoneyInput suporta centavos |
| 22. Ciclo curto (1 dia) | ✅ Correto | safeDias = max(1, diasDoMes) |
| 23. Ciclo longo (365 dias) | ✅ Correto | sem limite máximo de dias |
| 24. Data início ≠ dia 1 | ✅ Correto | NativeDatePicker permite qualquer data |
| 25. Transações futuras | ✅ Correto | filtradas por `d0 <= hoje_ts` em calcStats |
