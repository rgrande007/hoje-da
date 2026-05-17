# UsoDoDiaBar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a barra de "bateria" atual do card principal por `UsoDoDiaBar` — uma barra que começa cheia e drena da direita para a esquerda conforme o gasto do dia aumenta, com balão de consumo, ticks de remanescente e 4 estados visuais distintos.

**Architecture:** Novo componente `UsoDoDiaBar` inserido em `index.html` antes de `TelaPainel`. O bloco da barra atual (linhas ~1776–1826 em `TelaPainel`) é substituído por `<UsoDoDiaBar base={base} accBufferStart={accBufferStart} gastosHoje={gastosHoje} />`. `SpendingGauge` permanece no card sem alterações.

**Tech Stack:** React 18 via CDN, JSX inline com Babel standalone, design tokens em `T`, `fmt()` para formatação de valores.

---

## Arquivo modificado

- Modify: `index.html` — dois pontos:
  1. **Inserir** componente `UsoDoDiaBar` antes de `TelaPainel` (após `WeeklyMiniChart`, ~linha 1340)
  2. **Substituir** bloco da barra atual (~linhas 1776–1826) por `<UsoDoDiaBar />`

---

## Task 1: Adicionar componente `UsoDoDiaBar`

**Files:**
- Modify: `index.html` — inserir antes da linha que começa `// ═══════════════════════════════════════════════════════════════` que precede `TelaPainel` (~linha 1622)

- [ ] **Step 1: Localizar o ponto de inserção**

Abrir `index.html` e localizar a linha:
```
// ═══════════════════════════════════════════════════════════════
// TELA 2 — Painel principal
```
O novo componente deve ser inserido **imediatamente antes** dessa linha de comentário.

- [ ] **Step 2: Inserir o componente `UsoDoDiaBar`**

Inserir o seguinte bloco JSX antes da linha encontrada no Step 1:

```jsx
// ─── UsoDoDiaBar — barra de uso do dia (drena direita → esquerda) ─────────────
function UsoDoDiaBar({ base, accBufferStart, gastosHoje }) {
  const totalCapacity = base + accBufferStart;
  if (totalCapacity === 0) return null;

  const passou       = gastosHoje > totalCapacity;
  const emMargem     = gastosHoje > base && !passou;
  const semGastos    = gastosHoje === 0;
  const excedente    = Math.max(0, gastosHoje - totalCapacity);
  const cotaRestante = Math.max(0, base - gastosHoje);
  const margRestante = Math.max(0, accBufferStart - Math.max(0, gastosHoje - base));

  // buffZonePct: posição do delimitador margem/cota (% da esquerda, fixo)
  const buffZonePct  = (accBufferStart / totalCapacity) * 100;
  // remainingPct: onde termina a parte colorida (borda direita do restante)
  const remainingPct = Math.max(0, (totalCapacity - gastosHoje) / totalCapacity * 100);
  // balloonLeft: clampa para não cortar o pill nas bordas
  const balloonLeft  = Math.min(Math.max(remainingPct, 8), 90);

  const balloonColor = passou ? T.red : emMargem ? T.yellow : T.blue;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.textTer,
        textTransform: 'uppercase', letterSpacing: 1,
        marginBottom: semGastos ? 8 : 0,
      }}>
        Uso do dia
      </div>

      <div style={{ position: 'relative', paddingTop: semGastos ? 0 : 40 }}>

        {/* Balloon estados 1 e 2 */}
        {!semGastos && !passou && (
          <div style={{
            position: 'absolute', left: `${balloonLeft}%`, top: 0,
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            zIndex: 5, pointerEvents: 'none',
          }}>
            <div style={{
              background: balloonColor, color: '#fff',
              fontSize: 11, fontWeight: 800,
              padding: '4px 12px', borderRadius: 99,
              whiteSpace: 'nowrap',
              boxShadow: `0 3px 8px ${balloonColor}55`,
            }}>
              {fmt(gastosHoje)} gastos
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${balloonColor}`,
            }} />
          </div>
        )}

        {/* Balloon estado 3 — Passou, ancorado na esquerda */}
        {passou && (
          <div style={{
            position: 'absolute', left: 0, top: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            zIndex: 5, pointerEvents: 'none',
          }}>
            <div style={{
              background: T.red, color: '#fff',
              fontSize: 11, fontWeight: 800,
              padding: '4px 12px', borderRadius: 99,
              whiteSpace: 'nowrap',
              boxShadow: `0 3px 8px ${T.red}55`,
            }}>
              {fmt(gastosHoje)} gastos
            </div>
            <div style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `8px solid ${T.red}`,
              marginLeft: 14,
            }} />
          </div>
        )}

        {/* Barra */}
        <div style={{ position: 'relative', height: 20, borderRadius: 999, overflow: 'hidden' }}>
          {passou ? (
            <div style={{ position: 'absolute', inset: 0, background: '#FECDD3' }} />
          ) : (
            <>
              {/* Fundo cinza (zona consumida, cresce da direita) */}
              <div style={{ position: 'absolute', inset: 0, background: '#E2E8F0' }} />
              {/* Margem restante (amarelo) — esquerda */}
              {accBufferStart > 0 && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${emMargem ? remainingPct : buffZonePct}%`,
                  background: T.yellow,
                }} />
              )}
              {/* Cota restante (azul) — após a zona de margem */}
              {!emMargem && cotaRestante > 0 && (
                <div style={{
                  position: 'absolute',
                  left: `${buffZonePct}%`, top: 0, bottom: 0,
                  width: `${(cotaRestante / totalCapacity) * 100}%`,
                  background: T.blue,
                }} />
              )}
            </>
          )}
        </div>

        {/* Delimitador margem/cota (overlay, acima do overflow:hidden) */}
        {accBufferStart > 0 && (
          <div style={{
            position: 'absolute',
            top: semGastos ? 0 : 40,
            left: 0, right: 0, height: 20,
            pointerEvents: 'none', zIndex: 3,
          }}>
            <div style={{
              position: 'absolute',
              left: `${buffZonePct}%`, top: -2, bottom: -2,
              width: 2.5,
              background: passou
                ? 'rgba(255,255,255,0.6)'
                : emMargem
                ? 'rgba(255,255,255,0.4)'
                : 'white',
              transform: 'translateX(-50%)',
              borderRadius: 2,
            }} />
          </div>
        )}

        {/* Ticks */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: passou ? '1fr 1fr 1fr' : '1fr 1fr',
          marginTop: 12,
          gap: 4,
        }}>
          {passou ? (
            <>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.red }}>{fmt(excedente)}</div>
                <div style={{ fontSize: 9, color: T.red, fontWeight: 600, marginTop: 1 }}>excedente</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.textTer }}>{fmt(0)}</div>
                <div style={{ fontSize: 9, color: T.textTer, marginTop: 1 }}>restam da margem</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: T.textTer }}>{fmt(0)}</div>
                <div style={{ fontSize: 9, color: T.textTer, marginTop: 1 }}>restam da cota</div>
              </div>
            </>
          ) : (
            <>
              {accBufferStart > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.yellow }}>{fmt(margRestante)}</div>
                  <div style={{ fontSize: 9, color: T.textTer, marginTop: 1 }}>restam da margem</div>
                </div>
              )}
              <div style={{ textAlign: accBufferStart > 0 ? 'right' : 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: cotaRestante > 0 ? T.blue : T.textTer }}>{fmt(cotaRestante)}</div>
                <div style={{ fontSize: 9, color: T.textTer, marginTop: 1 }}>restam da cota</div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar no browser que o componente existe (sem erros)**

```bash
npm run dev
```

Abrir http://localhost:5173. Não deve haver erro no console. O card ainda mostra a barra antiga (o componente existe mas ainda não foi wired).

---

## Task 2: Substituir a barra antiga por `<UsoDoDiaBar />`

**Files:**
- Modify: `index.html` linhas ~1776–1826

- [ ] **Step 1: Localizar e remover o bloco da barra atual**

Em `TelaPainel`, dentro do IIFE que retorna o card principal, localizar e **remover** o seguinte bloco (linhas ~1776–1826):

```jsx
{/* Barra de duas zonas proporcionais (cota → acumulado) */}
{!isNeg ? (
  <div style={{ marginBottom: 14 }}>
    {/* Barra estilo bateria ... */}
    ...
  </div>
) : (
  <div style={{ marginBottom: 14 }}>
    <div style={{ height: 14, borderRadius: 999, background: T.red, opacity: 0.75 }} />
    <div style={{ fontSize: 11, fontWeight: 600, color: T.red, marginTop: 6 }}>
      {stats.diasRestantes > 0 ? `${stats.diasRestantes} dias restantes para recuperar` : 'Período encerrado acima do previsto'}
    </div>
  </div>
)}
```

- [ ] **Step 2: Inserir `<UsoDoDiaBar />` no lugar**

No exato ponto onde estava o bloco removido (antes do `{/* Divisor */}`), inserir:

```jsx
<UsoDoDiaBar
  base={base}
  accBufferStart={accBufferStart}
  gastosHoje={gastosHoje}
/>
```

O resultado no card deve ficar assim (ordem dos elementos):

```jsx
{/* Status pill */}
...

{/* Hero: disponível hoje */}
...

{/* Uso do Dia — nova barra */}
<UsoDoDiaBar base={base} accBufferStart={accBufferStart} gastosHoje={gastosHoje} />

{/* Divisor */}
<div style={{ height: 1, background: 'rgba(15,23,42,0.06)', marginBottom: 14 }} />

<SpendingGauge stats={stats} flashColor={flashColor} />

{!noTx && (
  <div ...>
    <button ...>Como chegamos aqui?</button>
  </div>
)}
```

- [ ] **Step 3: Verificar que não há variáveis indefinidas**

`base`, `accBufferStart` e `gastosHoje` já existem no escopo do IIFE do card:
- `base = stats.valorDiarioBase` — linha ~1713
- `gastosHoje` — linha ~1634 (escopo de `TelaPainel`)
- `accBufferStart` — linha ~1637 (escopo de `TelaPainel`)

Confirmar que essas três variáveis existem **acima** do ponto de inserção do `<UsoDoDiaBar />`.

---

## Task 3: Testar os 4 estados no browser

**Files:**
- Nenhum arquivo adicional — testar via `npm run dev`

- [ ] **Step 1: Estado 0 — sem gastos**

Condição: ciclo configurado, `transacoes` vazia (ou só entradas, sem gastos).

Esperado:
- Barra totalmente colorida: amarelo à esquerda (se houver margem), azul à direita
- Sem balloon, sem cinza
- Ticks: "restam da margem R$ X" e "restam da cota R$ Y"
- Se não há margem (`accBufferStart === 0`): barra 100% azul, só tick de cota

- [ ] **Step 2: Estado 1 — gasto dentro da cota**

Condição: `gastosHoje > 0` e `gastosHoje ≤ base`.

Esperado:
- Lado esquerdo: amarelo (margem intacta) + azul (cota restante)
- Lado direito: cinza cresce da direita
- Balloon azul na fronteira do cinza, mostrando valor gasto
- Ticks: margem intacta (amarelo) + cota restante (azul)

- [ ] **Step 3: Estado 2 — gasto usando a margem**

Condição: `gastosHoje > base` e `gastosHoje ≤ totalCapacity`.

Esperado:
- Lado esquerdo: só amarelo restante (pequena fatia)
- Lado direito: cinza (a maioria)
- Balloon amarelo na fronteira
- Delimitador original em `buffZonePct` visível mas suave no cinza
- Ticks: margem restante (amarelo) + cota R$0,00 (cinza)

- [ ] **Step 4: Estado 3 — Passou**

Condição: `gastosHoje > totalCapacity` (gasto excede cota + margem).

Esperado:
- Barra inteiramente `#FECDD3` (vermelho claro)
- Balloon vermelho ancorado no extremo esquerdo
- Delimitador em `buffZonePct` visível com opacidade reduzida
- 3 ticks: excedente (vermelho) | margem R$0,00 | cota R$0,00

- [ ] **Step 5: Verificar que SpendingGauge ainda aparece**

Após a nova barra, o divisor e o `SpendingGauge` (Ritmo do Plano) devem continuar visíveis no card, sem alterações.

- [ ] **Step 6: Verificar no console do browser**

Sem erros JavaScript. Sem warnings de React (`key`, `prop-types`, etc.).

---

## Task 4: Commit

- [ ] **Step 1: Commit**

```bash
git add index.html
git commit -m "feat: substituir barra de bateria por UsoDoDiaBar (drena direita para esquerda)"
```
