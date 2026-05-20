# QA Bugfixes — Crítico + Alto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Corrigir todos os bugs classificados como Crítico e Alto no QA_REPORT.md sem alterar a arquitetura do app.

**Architecture:** Todas as mudanças são em `index.html` (único arquivo de código do app). Nenhum novo arquivo criado. Cada tarefa é um conjunto coeso de alterações; o build (`npm run build`) é a verificação final.

**Tech Stack:** React 18 via CDN, Babel standalone, JSX inline, localStorage, Vite 5 + vite-plugin-pwa

---

## Arquivos afetados

| Arquivo | Linhas modificadas | Motivo |
|---|---|---|
| `index.html` | ~199 | calcStats: adicionar flag `cicloEncerrado` |
| `index.html` | ~175 | getCat: corrigir fallback CATS[7]→CATS[8] |
| `index.html` | ~256 | getStatusDiario: usar `cicloEncerrado` no lugar de `diasRestantes <= 0` |
| `index.html` | ~281,291 | getStatusDiario: pills "Usou uma sobra"/"Atenção leve" → "Apertado" |
| `index.html` | ~725 | TelaConfig handleChange: corrigir parsing decimal inglês |
| `index.html` | ~931 | TelaConfig chip: "Próx. mês" → "Próx. ciclo" |
| `index.html` | ~1693 | TelaPainel: banner usar `stats.cicloEncerrado` |
| `index.html` | ~1324 | TelaFechamentoCiclo: "Orçado" → "Planejado" |
| `index.html` | ~2847 | DialogReiniciar: "próximo mês" → "próximo ciclo" |
| `index.html` | ~3134 | agendarLembrete: agendar para amanhã se horário passou |
| `index.html` | ~3532 | renderTela TELAS.editar: passar minDate |

---

### Tarefa 1 — calcStats: adicionar flag `cicloEncerrado`

**Arquivos:** `index.html:197-239`

- [ ] Extrair `rawDia` antes do clamp e derivar `cicloEncerrado`:
  ```javascript
  // antes:
  const diaAtual = Math.max(1, Math.min(
      Math.floor((hojeDate - inicioDate) / 86400000) + 1,
      safeDias
  ));
  
  // depois:
  const rawDia = Math.floor((hojeDate - inicioDate) / 86400000) + 1;
  const cicloEncerrado = rawDia > safeDias;
  const diaAtual = Math.max(1, Math.min(rawDia, safeDias));
  ```

- [ ] Adicionar `cicloEncerrado` ao objeto retornado:
  ```javascript
  return {
    cicloEncerrado,          // ← novo
    diaAtual, diasRestantes,
    // ... resto igual
  };
  ```

---

### Tarefa 2 — getCat: corrigir fallback

**Arquivos:** `index.html:175`

- [ ] Trocar índice do fallback:
  ```javascript
  // antes:
  const getCat = id => CATS.find(c => c.id === id) || CATS[7];
  // depois:
  const getCat = id => CATS.find(c => c.id === id) || CATS[8];
  ```

---

### Tarefa 3 — getStatusDiario: usar cicloEncerrado + corrigir pills

**Arquivos:** `index.html:249-315`

- [ ] Substituir `stats.diasRestantes <= 0` por `stats.cicloEncerrado`:
  ```javascript
  // antes:
  if (stats.diasRestantes <= 0) {
  // depois:
  if (stats.cicloEncerrado) {
  ```

- [ ] Corrigir pills para seguir terminologia canônica (CLAUDE.md):
  ```javascript
  // cotaDiaExcedida — antes: pill: 'Usou uma sobra'
  pill: 'Apertado',
  
  // ratioMargem < 0.25 — antes: pill: 'Atenção leve'
  pill: 'Apertado',
  ```

---

### Tarefa 4 — TelaConfig: corrigir parsing decimal + chip "Próx. ciclo"

**Arquivos:** `index.html:725,931`

- [ ] Fix parsing em `handleChange` para tratar ponto como decimal quando não há vírgula:
  ```javascript
  // antes:
  const raw = text.replace(/\./g, '').replace(',', '.');
  
  // depois:
  const raw = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text;
  ```

- [ ] Renomear chip:
  ```javascript
  // antes: label: 'Próx. mês'
  label: 'Próx. ciclo'
  ```

---

### Tarefa 5 — TelaPainel: banner usar cicloEncerrado

**Arquivos:** `index.html:1693`

- [ ] Trocar condição do banner de ciclo encerrado:
  ```javascript
  // antes:
  {stats.diasRestantes <= 0 && (
  // depois:
  {stats.cicloEncerrado && (
  ```

---

### Tarefa 6 — TelaFechamentoCiclo: "Orçado" → "Planejado"

**Arquivos:** `index.html:1324`

- [ ] Alterar label do card de stats:
  ```javascript
  // antes: { label: 'Orçado', value: fmt(state.valorMensal), ico: '📋' },
  { label: 'Planejado', value: fmt(state.valorMensal), ico: '📋' },
  ```

---

### Tarefa 7 — DialogReiniciar: "próximo mês" → "próximo ciclo"

**Arquivos:** `index.html:2847`

- [ ] Corrigir texto:
  ```javascript
  // antes: `Levar ${fmt(saldoRestante)} para o próximo mês`
  `Levar ${fmt(saldoRestante)} para o próximo ciclo`
  ```

---

### Tarefa 8 — agendarLembrete: agendar para amanhã se horário passou

**Arquivos:** `index.html:3134`

- [ ] Substituir early return quando `delay <= 0`:
  ```javascript
  // antes:
  if (delay <= 0) return;
  setTimeout(() => { ... }, delay);
  
  // depois:
  if (delay <= 0) {
    alvo.setDate(alvo.getDate() + 1); // amanhã no mesmo horário
  }
  setTimeout(() => { ... }, alvo - new Date());
  ```

---

### Tarefa 9 — renderTela: passar minDate na edição

**Arquivos:** `index.html:3532`

- [ ] Adicionar `minDate` ao case `TELAS.editar`:
  ```javascript
  // antes:
  case TELAS.editar: return <TelaEntrada tipo={editandoItem?.tipo || 'gasto'}
    initialData={editandoItem} onSalvar={handleSalvarEdicao}
    onVoltar={...} />;
  
  // depois:
  case TELAS.editar: return <TelaEntrada tipo={editandoItem?.tipo || 'gasto'}
    initialData={editandoItem}
    minDate={state.dataInicio ? fmtDateKey(new Date(state.dataInicio).toISOString()) : null}
    onSalvar={handleSalvarEdicao}
    onVoltar={...} />;
  ```

---

### Tarefa 10 — Build e verificação

- [ ] Rodar `npm run build`
- [ ] Confirmar: 0 erros, warning não-bloqueante do android-frame.jsx ainda presente (esperado)
- [ ] Atualizar QA_REPORT.md marcando cada bug como corrigido
