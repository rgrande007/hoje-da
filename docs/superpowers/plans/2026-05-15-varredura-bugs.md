# Varredura de Bugs e Melhorias — Hoje Dá

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 11 bugs e melhorias identificados na varredura do app Hoje Dá, sem alterar a arquitetura do projeto.

**Architecture:** App single-file (`index.html`) com React 18 + Babel standalone em runtime. Sem bundler, sem framework de testes. Todas as verificações são manuais no browser. O arquivo `sw.js` é o service worker PWA separado.

**Tech Stack:** React 18 (UMD), Babel standalone 7.29, localStorage, PWA/Service Worker, browser nativo.

---

## Mapa de arquivos

| Arquivo | Mudanças |
|---|---|
| `index.html` | Tasks 1–4, 6–10 |
| `sw.js` | Task 5 |

---

## Task 1: Bug crítico — handleIniciar preserva transações ao editar ciclo

**Arquivo:** `index.html`  
**Contexto:** A função `handleIniciar` (chamada ao confirmar a tela de configuração) sempre cria `transacoes: []`, apagando o histórico mesmo quando o usuário apenas edita datas/valor de um ciclo já ativo.

- [ ] **Passo 1: Localizar handleIniciar**

Buscar no `index.html` por `function handleIniciar`. Está em torno da linha 2950.

O bloco atual é:
```js
function handleIniciar({ valorMensal, diasDoMes, dataInicio }) {
  haptic('success');
  prevStateRef.current = null;
  const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00').toISOString() : new Date().toISOString();
  const next = { configurado: true, valorMensal, diasDoMes, dataInicio: inicio, transacoes: [] };
  saveState(next); setState(next); setTela(TELAS.painel);
}
```

- [ ] **Passo 2: Aplicar o fix**

Substituir o bloco acima por:
```js
function handleIniciar({ valorMensal, diasDoMes, dataInicio }) {
  haptic('success');
  const transacoesExistentes = prevStateRef.current?.transacoes ?? [];
  const isEditing = prevStateRef.current?.configurado === true;
  prevStateRef.current = null;
  const inicio = dataInicio ? new Date(dataInicio + 'T00:00:00').toISOString() : new Date().toISOString();
  const next = { configurado: true, valorMensal, diasDoMes, dataInicio: inicio, transacoes: isEditing ? transacoesExistentes : [] };
  saveState(next); setState(next); setTela(TELAS.painel);
}
```

- [ ] **Passo 3: Testar manualmente**

1. Abrir o app no browser com um ciclo já configurado e ao menos 2 transações registradas.
2. Clicar no ícone de editar (lápis) ao lado de "Hoje Dá" no header do painel.
3. Alterar o valor do ciclo ou as datas.
4. Clicar em "Continuar".
5. Verificar: as transações anteriores ainda aparecem na lista e no histórico.
6. Testar o caminho de "Novo mês": ir ao menu → "Novo mês" → confirmar. As transações devem ser apagadas (esse caminho usa `handleNovoMes`, não `handleIniciar`, então não é afetado).

- [ ] **Passo 4: Commit**

```bash
git add index.html
git commit -m "fix: handleIniciar preserva transações ao editar ciclo ativo"
```

---

## Task 2: Bug — Histórico exibe datas mais antigas primeiro

**Arquivo:** `index.html`  
**Contexto:** Em `TelaHistorico`, `.reverse()` é aplicado antes de popular o objeto `grupos`, fazendo com que as chaves de data mais antigas sejam inseridas primeiro. `Object.entries()` retorna essa ordem de inserção, então as datas mais antigas aparecem no topo da tela.

- [ ] **Passo 1: Localizar o bloco de grupos**

Buscar por `const grupos = {};` em `TelaHistorico`. Está em torno da linha 1833.

O bloco atual é:
```js
const grupos = {};
[...transacoesFiltradas].reverse().forEach(t => {
  const d = fmtDateKey(t.data);
  if (!grupos[d]) grupos[d] = [];
  grupos[d].push(t);
});
```

- [ ] **Passo 2: Remover o `.reverse()`**

Substituir por:
```js
const grupos = {};
transacoesFiltradas.forEach(t => {
  const d = fmtDateKey(t.data);
  if (!grupos[d]) grupos[d] = [];
  grupos[d].push(t);
});
```

- [ ] **Passo 3: Localizar o render dos grupos**

Logo abaixo, buscar por `Object.entries(grupos).map`. Está em torno da linha 1930.

O trecho atual é:
```jsx
{Object.entries(grupos).map(([key, items]) => (
```

- [ ] **Passo 4: Adicionar ordenação descendente**

Substituir por:
```jsx
{Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a)).map(([key, items]) => (
```

- [ ] **Passo 5: Testar manualmente**

1. Abrir o app com ao menos 3 transações em datas diferentes.
2. Navegar para "Histórico".
3. Verificar: a data mais recente aparece no topo, datas mais antigas abaixo.
4. Aplicar filtro "Gastos" e depois "Entradas" — verificar que a ordenação se mantém.
5. Fazer uma busca por descrição — verificar que a ordenação se mantém.

- [ ] **Passo 6: Commit**

```bash
git add index.html
git commit -m "fix: histórico exibe grupos de datas mais recentes primeiro"
```

---

## Task 3: Bug — haptic() vaza AudioContext

**Arquivo:** `index.html`  
**Contexto:** A cada chamada de `haptic()`, um novo `AudioContext` é criado e nunca fechado. Browsers limitam ~6 contextos simultâneos. Exceder esse limite silencia o áudio e desperdiça memória. A solução é um singleton lazy.

- [ ] **Passo 1: Localizar a função haptic**

Buscar por `function haptic(`. Está em torno da linha 135.

O trecho atual dentro de `haptic` é:
```js
try {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(), g = ctx.createGain();
```

- [ ] **Passo 2: Adicionar o singleton antes de haptic**

Imediatamente antes da declaração `function haptic(`, inserir:
```js
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}
```

- [ ] **Passo 3: Substituir a criação do contexto dentro de haptic**

Dentro de `haptic`, substituir:
```js
const ctx = new (window.AudioContext || window.webkitAudioContext)();
```
por:
```js
const ctx = getAudioCtx();
```

- [ ] **Passo 4: Testar manualmente**

1. Abrir o app no browser.
2. Apertar o botão "Gastei!" e registrar ~10 transações rapidamente (toque rápido em teclas do teclado numérico).
3. Verificar no console do browser: nenhum erro de "AudioContext limit" ou similar.
4. O som de feedback deve continuar funcionando após múltiplos toques rápidos.

- [ ] **Passo 5: Commit**

```bash
git add index.html
git commit -m "fix: haptic usa AudioContext singleton para evitar vazamento"
```

---

## Task 4: Bug — DialogAjustarOrcamento preview não atualiza em tempo real

**Arquivo:** `index.html`  
**Contexto:** Em `DialogAjustarOrcamento`, `handleChange` só atualiza `inputText`, nunca `novoValor`. O preview de impacto (comparativo base/dia atual vs. novo) só se atualiza após tirar o foco do campo. `TelaConfig` tem comportamento correto e pode servir de referência.

- [ ] **Passo 1: Localizar handleChange no DialogAjustarOrcamento**

Buscar por `function DialogAjustarOrcamento` e dentro dela localizar `function handleChange`. Está em torno da linha 2442.

O trecho atual:
```js
function handleChange(e) { setInputText(e.target.value.replace(/[^0-9,.]/g, '')); }
```

- [ ] **Passo 2: Aplicar o fix**

Substituir por:
```js
function handleChange(e) {
  const text = e.target.value.replace(/[^0-9,.]/g, '');
  setInputText(text);
  const raw = text.replace(/\./g, '').replace(',', '.');
  const v = parseFloat(raw);
  if (!isNaN(v) && v >= 0) setNovoValor(v);
}
```

- [ ] **Passo 3: Testar manualmente**

1. Abrir o app com um ciclo configurado.
2. Acessar o menu (engrenagem) → "Ajustar orçamento".
3. Limpar o campo e digitar um valor novo.
4. Verificar: o preview de impacto (base/dia atual → nova base/dia) atualiza em tempo real a cada dígito digitado, sem precisar tirar o foco.

- [ ] **Passo 4: Commit**

```bash
git add index.html
git commit -m "fix: DialogAjustarOrcamento atualiza preview em tempo real ao digitar"
```

---

## Task 5: sw.js — Corrigir cache CDN e condição duplicada

**Arquivo:** `sw.js`  
**Contexto:** Dois problemas no service worker: (a) cache miss + falha de rede retorna `undefined` em vez de uma resposta válida; (b) condição duplicada redundante no fetch handler.

- [ ] **Passo 1: Corrigir condição duplicada (linha 57)**

Localizar:
```js
if (CDN_URLS.includes(url.href) || CDN_URLS.some(cdn => url.href === cdn)) {
```

Substituir por:
```js
if (CDN_URLS.includes(url.href)) {
```

- [ ] **Passo 2: Corrigir o fallback do bloco CDN_URLS (em torno da linha 62)**

Localizar o `.catch` dentro do bloco CDN_URLS:
```js
return fetch(e.request).then(res => {
  if (res.ok) cache.put(e.request, res.clone());
  return res;
}).catch(() => cached);
```

Substituir por:
```js
return fetch(e.request).then(res => {
  if (res.ok) cache.put(e.request, res.clone());
  return res;
}).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
```

- [ ] **Passo 3: Corrigir o fallback do bloco Google Fonts (em torno da linha 79)**

Localizar o bloco Google Fonts (hostname `fonts.googleapis.com` ou `fonts.gstatic.com`) e aplicar a mesma correção no `.catch`:

```js
}).catch(() => cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }));
```

- [ ] **Passo 4: Testar manualmente**

1. Abrir o browser com DevTools → Application → Service Workers.
2. Verificar que o novo sw.js registrou (pode precisar de "Update" ou "Skip waiting").
3. No DevTools → Network → colocar throttling em "Offline".
4. Recarregar a página — o app deve carregar do cache sem erros no console relacionados a fetch.

- [ ] **Passo 5: Commit**

```bash
git add sw.js
git commit -m "fix: sw.js retorna 503 em cache miss + offline e remove condição duplicada"
```

---

## Task 6: UX — isMobile reativo a redimensionamento

**Arquivo:** `index.html`  
**Contexto:** `window.innerWidth <= 500` é lido uma única vez na renderização do `App`. Redimensionar a janela não reaplica o layout (desktop vs mobile). A solução é um hook React que escuta o evento `resize`.

- [ ] **Passo 1: Localizar a seção de utilitários/hooks**

Buscar por `// ─── Utilitários` no início do script (em torno da linha 95). Adicionar o hook após as funções `fmtDate`, `fmtDateKey`, `fmtTime`.

- [ ] **Passo 2: Adicionar o hook useIsMobile**

Logo após o bloco de utilitários (`fmtTime`), inserir:
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

- [ ] **Passo 3: Substituir o uso no App**

Buscar por `const isMobile = window.innerWidth <= 500` dentro da função `App` (em torno da linha 3062).

Substituir por:
```js
const isMobile = useIsMobile();
```

- [ ] **Passo 4: Testar manualmente**

1. Abrir o app no browser em janela larga (>500px) — deve mostrar o layout desktop com o AndroidDevice wrapper.
2. Redimensionar a janela para menos de 500px — o layout deve mudar para mobile sem recarregar a página.
3. Redimensionar de volta para > 500px — deve voltar ao layout desktop.

- [ ] **Passo 5: Commit**

```bash
git add index.html
git commit -m "fix: isMobile reativo a redimensionamento via hook useIsMobile"
```

---

## Task 7: UX — DateSpinner em TelaEntrada com suporte a maxValue

**Arquivo:** `index.html`  
**Contexto:** O campo de data em `TelaEntrada` usa `<input type="date">` nativo, que é inconsistente visualmente no Android/iOS. O componente `DateSpinner` já existe mas não suporta `maxValue` (para bloquear datas futuras). Esta task adiciona `maxValue` ao `DateSpinner` e o usa em `TelaEntrada`.

- [ ] **Passo 1: Adicionar maxValue ao DateSpinner**

Buscar por `function DateSpinner({ label, value, onChange, minValue })`. Está em torno da linha 465.

Substituir a assinatura por:
```js
function DateSpinner({ label, value, onChange, minValue, maxValue }) {
```

- [ ] **Passo 2: Adicionar a validação de maxValue no apply**

Dentro de `DateSpinner`, na função `apply`, localizar o bloco de validação do `minValue`:
```js
if (minValue && str < minValue) {
  haptic('error');
  setBlocked(true);
  setTimeout(() => setBlocked(false), 420);
  return;
}
haptic('light');
onChange(str);
```

Substituir por:
```js
if (minValue && str < minValue) {
  haptic('error');
  setBlocked(true);
  setTimeout(() => setBlocked(false), 420);
  return;
}
if (maxValue && str > maxValue) {
  haptic('error');
  setBlocked(true);
  setTimeout(() => setBlocked(false), 420);
  return;
}
haptic('light');
onChange(str);
```

- [ ] **Passo 3: Substituir o bloco de data em TelaEntrada**

Buscar por `{/* Data do lançamento */}` em `TelaEntrada`. Está em torno da linha 1753.

O bloco atual (do comentário até o `</div>` de fechamento):
```jsx
{/* Data do lançamento */}
<div style={{ padding: '8px 16px 0' }}>
  <div style={{
    background: T.card, borderRadius: T.r14, padding: '0 16px',
    display: 'flex', alignItems: 'center', gap: 10,
    border: `1px solid ${isRetroativo ? T.blue : 'rgba(15,23,42,0.06)'}`,
    transition: 'border-color 0.2s',
  }}>
    <span style={{ fontSize: 16, flexShrink: 0 }}>📅</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: T.textTer, fontWeight: 600, paddingTop: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Data do lançamento
      </div>
      <input
        type="date"
        value={dataLancamento}
        min={minDate || undefined}
        max={todayStr}
        onChange={e => setDataLancamento(e.target.value)}
        style={{
          border: 'none', outline: 'none', fontSize: 14, color: T.text,
          fontFamily: T.font, fontWeight: 500, paddingBottom: 10,
          background: 'transparent', width: '100%',
        }}
      />
    </div>
    {isRetroativo && (
      <span style={{ fontSize: 11, color: T.blue, fontWeight: 700, flexShrink: 0, background: T.blueLight, padding: '3px 8px', borderRadius: 8 }}>
        Retroativo
      </span>
    )}
  </div>
</div>
```

Substituir por:
```jsx
{/* Data do lançamento */}
<div style={{ padding: '8px 16px 0' }}>
  <DateSpinner
    label="Data do lançamento"
    value={dataLancamento}
    onChange={setDataLancamento}
    minValue={minDate || undefined}
    maxValue={todayStr}
  />
  {isRetroativo && (
    <div style={{ textAlign: 'center', marginTop: 6 }}>
      <span style={{ fontSize: 11, color: T.blue, fontWeight: 700, background: T.blueLight, padding: '3px 8px', borderRadius: 8 }}>
        Retroativo
      </span>
    </div>
  )}
</div>
```

- [ ] **Passo 4: Testar manualmente**

1. Abrir o app e clicar em "Gastei!".
2. Verificar que o seletor de data agora usa o `DateSpinner` (segmentos dia/mês/ano com setas).
3. Tentar avançar para uma data futura — deve bloquear com animação shake.
4. Tentar recuar para antes do início do ciclo (se `minDate` estiver definido) — deve bloquear.
5. Selecionar uma data passada dentro do ciclo — o badge "Retroativo" deve aparecer abaixo do spinner.
6. Repetir o teste na tela "Recebi".
7. Abrir uma transação para editar — verificar que o DateSpinner carrega a data original corretamente.

- [ ] **Passo 5: Commit**

```bash
git add index.html
git commit -m "feat: TelaEntrada usa DateSpinner para seleção de data; DateSpinner suporta maxValue"
```

---

## Task 8: UX — Confirmação ao sair de TelaEntrada com valor preenchido

**Arquivo:** `index.html`  
**Contexto:** Clicar em voltar com um valor digitado descarta os dados silenciosamente. A solução é um banner inline de confirmação (sem modal de tela cheia) que aparece apenas quando `valor > 0`.

- [ ] **Passo 1: Adicionar o estado confirmSaida em TelaEntrada**

Buscar por `const [saved, setSaved]` dentro de `TelaEntrada`. Está em torno da linha 1646.

Após essa linha, adicionar:
```js
const [confirmSaida, setConfirmSaida] = React.useState(false);
```

- [ ] **Passo 2: Criar a função handleBack**

Após `const [confirmSaida, setConfirmSaida]`, adicionar:
```js
function handleBack() {
  if (valor > 0 && !confirmSaida) { setConfirmSaida(true); return; }
  onVoltar();
}
```

- [ ] **Passo 3: Alterar onBack no ScreenHeader**

Buscar por `<ScreenHeader` dentro de `TelaEntrada`. Localizar:
```jsx
<ScreenHeader
  title={isEdit ? 'Editar lançamento' : (isGasto ? 'Quanto você gastou? 💸' : 'Quanto entrou? 💰')}
  onBack={onVoltar}
/>
```

Substituir `onBack={onVoltar}` por `onBack={handleBack}`:
```jsx
<ScreenHeader
  title={isEdit ? 'Editar lançamento' : (isGasto ? 'Quanto você gastou? 💸' : 'Quanto entrou? 💰')}
  onBack={handleBack}
/>
```

- [ ] **Passo 4: Adicionar o banner de confirmação**

Imediatamente após o `<ScreenHeader .../>`, inserir:
```jsx
{confirmSaida && (
  <div className="fade-in" style={{
    background: T.yellowLight, padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    borderBottom: `1px solid ${T.yellow}44`,
  }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: '#7A5A00', flex: 1 }}>
      Descartar as alterações?
    </span>
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      <button onClick={() => setConfirmSaida(false)} style={{
        height: 32, padding: '0 12px', borderRadius: 99, border: `1.5px solid ${T.blue}`,
        background: T.blueLight, color: T.blue, fontSize: 12, fontWeight: 700,
        fontFamily: T.font, cursor: 'pointer',
      }}>Continuar</button>
      <button onClick={() => onVoltar()} style={{
        height: 32, padding: '0 12px', borderRadius: 99, border: 'none',
        background: T.red, color: '#fff', fontSize: 12, fontWeight: 700,
        fontFamily: T.font, cursor: 'pointer',
      }}>Descartar</button>
    </div>
  </div>
)}
```

- [ ] **Passo 5: Testar manualmente**

1. Abrir o app e clicar em "Gastei!".
2. Digitar qualquer valor no teclado numérico.
3. Clicar na seta de voltar — o banner amarelo "Descartar as alterações?" deve aparecer.
4. Clicar em "Continuar" — banner deve desaparecer, o usuário permanece na tela com o valor intacto.
5. Clicar em voltar novamente, depois em "Descartar" — deve voltar ao painel sem salvar.
6. Testar com valor = 0 (sem digitar nada): clicar em voltar deve ir direto para o painel, sem mostrar o banner.
7. Testar na tela "Recebi" — mesmo comportamento.

- [ ] **Passo 6: Commit**

```bash
git add index.html
git commit -m "feat: TelaEntrada confirma descarte ao sair com valor preenchido"
```

---

## Task 9: UX — Melhorar texto de aviso dos lembretes

**Arquivo:** `index.html`  
**Contexto:** O texto atual sobre limitações dos lembretes é vago. Informar o usuário de forma mais clara e acionar a instrução de adicionar à tela inicial como alternativa.

- [ ] **Passo 1: Localizar o texto em DialogNotificacoes**

Buscar por `Funciona enquanto o app estiver aberto no browser`. Está em torno da linha 2794.

O trecho atual:
```jsx
<div style={{ fontSize: 12, color: T.textSec, marginTop: 2, lineHeight: 1.4 }}>Funciona enquanto o app estiver aberto no browser</div>
```

- [ ] **Passo 2: Substituir o texto**

```jsx
<div style={{ fontSize: 12, color: T.textSec, marginTop: 2, lineHeight: 1.4 }}>O lembrete dispara enquanto o app estiver aberto. Para lembretes em background, adicione o app à tela inicial.</div>
```

- [ ] **Passo 3: Testar manualmente**

1. Abrir o app → menu (engrenagem) → "Lembretes diários".
2. Ativar o lembrete.
3. Verificar que o novo texto aparece corretamente abaixo do horário.

- [ ] **Passo 4: Commit**

```bash
git add index.html
git commit -m "fix: texto de aviso dos lembretes é mais claro sobre limitações e alternativa"
```

---

## Task 10: Performance — calcStats memoizado com useMemo

**Arquivo:** `index.html`  
**Contexto:** `calcStats(state)` é O(n) sobre as transações e chamado em múltiplos componentes a cada render sem memoização. Adicionar `React.useMemo` nos 4 componentes que chamam `calcStats` diretamente.

**Os 4 pontos a modificar:**
1. `TelaPainel` — em torno da linha 1249
2. `TelaFechamentoCiclo` — em torno da linha 1107
3. `TelaAnalise` — em torno da linha 2029
4. `DialogAjustarOrcamento` — em torno da linha 2426

- [ ] **Passo 1: Memoizar em TelaPainel**

Buscar por `function TelaPainel(` e dentro, localizar:
```js
const stats = calcStats(state);
```

Substituir por:
```js
const stats = React.useMemo(() => calcStats(state), [state]);
```

- [ ] **Passo 2: Memoizar em TelaFechamentoCiclo**

Buscar por `function TelaFechamentoCiclo(` e dentro, localizar:
```js
const stats = calcStats(state);
```

Substituir por:
```js
const stats = React.useMemo(() => calcStats(state), [state]);
```

- [ ] **Passo 3: Memoizar em TelaAnalise**

Buscar por `function TelaAnalise(` e dentro, localizar:
```js
const stats = calcStats(state);
```

Substituir por:
```js
const stats = React.useMemo(() => calcStats(state), [state]);
```

- [ ] **Passo 4: Memoizar em DialogAjustarOrcamento**

Buscar por `function DialogAjustarOrcamento(`. Dentro dessa função, `calcStats` é chamado dentro de um IIFE JSX (`{podeConfirmar && (() => { const stats = calcStats(state); ... })()`). Refatorar para usar `useMemo` no nível do componente.

Buscar o trecho atual no início do componente (após os estados):
```js
const [isFocused, setIsFocused] = React.useState(false);
const inputRef = React.useRef(null);
```

Após essas linhas, adicionar:
```js
const stats = React.useMemo(() => calcStats(state), [state]);
```

Depois, dentro do IIFE JSX do preview, remover a declaração local `const stats = calcStats(state);`:

Localizar dentro do `{podeConfirmar && (() => {`:
```js
{podeConfirmar && (() => {
  const stats = calcStats(state);
  const novaBase = stats.diasRestantes > 0 ? novoValor / state.diasDoMes : 0;
```

Substituir por:
```js
{podeConfirmar && (() => {
  const novaBase = stats.diasRestantes > 0 ? novoValor / state.diasDoMes : 0;
```

- [ ] **Passo 5: Testar manualmente**

1. Abrir o app com várias transações.
2. Navegar entre painel, histórico e análise — o app deve continuar funcionando corretamente.
3. Abrir "Ajustar orçamento" e digitar um valor — o preview deve funcionar como antes.
4. Opcional: abrir DevTools → Performance → gravar uma interação (ex: registrar um gasto). Verificar que não há renders desnecessários.

- [ ] **Passo 6: Commit final**

```bash
git add index.html
git commit -m "perf: calcStats memoizado com useMemo em TelaPainel, TelaAnalise, TelaFechamentoCiclo e DialogAjustarOrcamento"
```

---

## Auto-revisão do plano

**Cobertura do spec:**
- #1 handleIniciar → Task 1 ✓
- #2 histórico ordem → Task 2 ✓
- #3 AudioContext → Task 3 ✓
- #4 DialogAjustarOrcamento preview → Task 4 ✓
- #5 sw.js 503 fallback → Task 5 ✓
- #6 sw.js condição duplicada → Task 5 ✓
- #7 isMobile hook → Task 6 ✓
- #8 DateSpinner em TelaEntrada → Task 7 ✓
- #9 confirmação saída → Task 8 ✓
- #10 texto lembretes → Task 9 ✓
- #11 useMemo → Task 10 ✓

**Placeholders:** Nenhum. Todo passo tem o código exato da mudança.

**Consistência de nomes:** `getAudioCtx` definida na Task 3 e usada na mesma task. `useIsMobile` definida e usada na Task 6. `confirmSaida`/`handleBack` definidos e usados na Task 8. Sem conflitos.
