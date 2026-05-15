# Design: Varredura completa de bugs e melhorias — Hoje Dá

**Data:** 2026-05-15  
**Escopo:** Correção de todos os bugs e melhorias identificados na varredura do app  
**Arquivos afetados:** `index.html`, `sw.js`

---

## Contexto

O app "Hoje Dá" é uma PWA single-file (React + Babel em runtime) de controle de gastos diários. A varredura identificou 11 problemas distribuídos em 4 níveis de gravidade. A abordagem escolhida é correção completa por categoria, do mais crítico ao menor.

---

## Mudanças planejadas

### 1. Bug crítico — `handleIniciar` preserva transações ao editar configuração

**Arquivo:** `index.html` (~linha 2950)  
**Problema:** `handleIniciar` sempre cria `transacoes: []`, apagando o histórico inteiro quando o usuário edita a configuração do ciclo atual.  
**Fix:**

```js
const transacoesExistentes = prevStateRef.current?.transacoes ?? [];
const isEditing = prevStateRef.current?.configurado === true;
const next = {
  configurado: true, valorMensal, diasDoMes, dataInicio: inicio,
  transacoes: isEditing ? transacoesExistentes : [],
};
```

A distinção entre "editar ciclo" e "novo ciclo" usa `prevStateRef.current`, que já é populado corretamente antes de navegar para a tela de configuração.

---

### 2. Bug — Histórico exibe grupos de data em ordem cronológica inversa

**Arquivo:** `index.html` (`TelaHistorico`, ~linha 1834)  
**Problema:** `.reverse()` antes do `forEach` causa inserção dos grupos mais antigos primeiro no objeto `grupos`. `Object.entries()` retorna essa ordem, resultando em datas antigas no topo.  
**Fix:** Remover `.reverse()` e ordenar `Object.entries(grupos)` por key descendente no render:

```js
// Popular grupos sem reverse
transacoesFiltradas.forEach(t => {
  const d = fmtDateKey(t.data);
  if (!grupos[d]) grupos[d] = [];
  grupos[d].push(t);
});

// Ordenar no render
Object.entries(grupos)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(...)
```

---

### 3. Bug — `haptic()` vaza AudioContext

**Arquivo:** `index.html` (~linha 134)  
**Problema:** Novo `AudioContext` criado a cada chamada de `haptic()`. Browsers limitam ~6 contextos — exceder silencia o áudio e desperdiça memória.  
**Fix:** Singleton lazy:

```js
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}
```

Substituir `new (window.AudioContext || window.webkitAudioContext)()` dentro de `haptic()` por `getAudioCtx()`.

---

### 4. Bug — `DialogAjustarOrcamento` preview não atualiza em tempo real

**Arquivo:** `index.html` (`DialogAjustarOrcamento`, ~linha 2442)  
**Problema:** `handleChange` só atualiza `inputText`, nunca `novoValor`. O preview de impacto só muda ao tirar o foco. Comportamento inconsistente com `TelaConfig`.  
**Fix:** Espelhar `TelaConfig.handleChange`:

```js
function handleChange(e) {
  const text = e.target.value.replace(/[^0-9,.]/g, '');
  setInputText(text);
  const raw = text.replace(/\./g, '').replace(',', '.');
  const v = parseFloat(raw);
  if (!isNaN(v) && v >= 0) setNovoValor(v);
}
```

---

### 5. Bug — `sw.js` cache CDN retorna undefined em falha total

**Arquivo:** `sw.js` (~linha 62)  
**Problema:** Quando não há cache local e o fetch falha (offline), `.catch(() => cached)` retorna `undefined` (já que só chegamos no fetch quando `!cached`), resultando em resposta inválida.  
**Fix:**

```js
}).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
```

Aplicar nos dois blocos de cache CDN (CDN_URLS e Google Fonts).

---

### 6. Bug — `sw.js` condição duplicada no fetch handler

**Arquivo:** `sw.js` (linha 57)  
**Problema:** `CDN_URLS.includes(url.href) || CDN_URLS.some(cdn => url.href === cdn)` — as duas expressões são equivalentes.  
**Fix:**

```js
if (CDN_URLS.includes(url.href)) {
```

---

### 7. UX — `isMobile` reativo a redimensionamento de janela

**Arquivo:** `index.html` (`App`, ~linha 3062)  
**Problema:** `window.innerWidth <= 500` lido uma única vez — redimensionar a janela não reaplica o layout desktop/mobile.  
**Fix:** Hook dedicado:

```js
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth <= 500);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}
```

Substituir `const isMobile = window.innerWidth <= 500` no `App` por `const isMobile = useIsMobile()`.

---

### 8. UX — `TelaEntrada` usa `DateSpinner` em vez de `<input type="date">`

**Arquivo:** `index.html` (`TelaEntrada`, ~linha 1753)  
**Problema:** `<input type="date">` nativo é visualmente inconsistente no Android/iOS e quebra o design. O componente `DateSpinner` já existe e é usado em `TelaConfig`.  
**Fix:** Substituir o bloco de `<input type="date">` por `<DateSpinner>` com:
- `label="Data do lançamento"`
- `value={dataLancamento}`
- `onChange={setDataLancamento}`
- `minValue={minDate || undefined}`
- Max = `todayStr` (via validação no `apply` interno do DateSpinner, passando `maxValue`)

O `DateSpinner` atual não tem `maxValue` — adicionar suporte para bloquear datas futuras, simétrico ao `minValue` já existente.

---

### 9. UX — Confirmação ao sair de `TelaEntrada` com valor preenchido

**Arquivo:** `index.html` (`TelaEntrada`, ~linha 1668)  
**Problema:** Clicar em voltar com valor digitado descarta os dados silenciosamente.  
**Fix:** Estado `confirmSaida` local. Quando `valor > 0` e o usuário pressiona voltar, mostrar dois botões inline abaixo do header (sem modal de tela cheia):

```js
const [confirmSaida, setConfirmSaida] = React.useState(false);

function handleBack() {
  if (valor > 0 && !confirmSaida) { setConfirmSaida(true); return; }
  onVoltar();
}
```

Quando `confirmSaida === true`, renderizar um banner no topo da tela com **"Descartar"** (vermelho) e **"Continuar editando"** (azul). Clicar em "Continuar editando" reseta `confirmSaida` e o usuário permanece na tela. Clicar em "Descartar" chama `onVoltar()` sem salvar.

---

### 10. UX — Texto de aviso dos lembretes

**Arquivo:** `index.html` (`DialogNotificacoes`, ~linha 2794)  
**Problema:** Texto atual é vago sobre limitações dos lembretes.  
**Fix:**

```
// Antes
"Funciona enquanto o app estiver aberto no browser"

// Depois
"O lembrete dispara enquanto o app estiver aberto. Para lembretes em background, adicione o app à tela inicial."
```

---

### 11. Performance — `calcStats()` memoizado com `useMemo`

**Arquivo:** `index.html`  
**Problema:** `calcStats(state)` é O(n) e chamado em múltiplos componentes a cada render sem memoização.  
**Fix:** Adicionar `React.useMemo` nos 4 pontos onde `calcStats` é chamado diretamente dentro de componentes:
- `TelaPainel` (~linha 1249)
- `TelaAnalise` (~linha 2029)
- `TelaFechamentoCiclo` (~linha 1107)
- `DialogAjustarOrcamento` (~linha 2496, dentro do preview)

```js
const stats = React.useMemo(() => calcStats(state), [state]);
```

---

## Ordem de implementação

1. Bug crítico (#1) — risco de perda de dados
2. Bugs reais (#2, #3, #4) — comportamento incorreto visível
3. sw.js (#5, #6) — confiabilidade offline
4. UX (#7, #8, #9, #10) — polimento de experiência
5. Performance (#11) — otimização

## Fora de escopo

- Migração do Babel standalone para bundler (Vite/esbuild) — mudança de infraestrutura, iteração futura separada
- Push API com backend para lembretes em background — exige servidor
