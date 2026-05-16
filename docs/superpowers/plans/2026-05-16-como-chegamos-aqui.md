# "Como chegamos aqui" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um bottom sheet `CalculationBreakdownSheet` que explica visualmente como o app calculou o valor disponível, acessível via link "Ver cálculo" no card principal do `TelaPainel`.

**Architecture:** Componente novo `CalculationBreakdownSheet` (função global JSX antes de `TelaPainel`) recebe props calculadas do card principal. `TelaPainel` ganha um `React.useState(false)` local e calcula `accBufferStart` no escopo externo para passá-lo ao sheet. Nenhuma mudança na máquina de estados global.

**Tech Stack:** React 18 via CDN, Babel standalone, JSX inline em `index.html`, inline styles, paleta `T` existente, função `fmt()` existente.

---

## Arquivos modificados

- **Modify:** `index.html`
  - Inserir função `CalculationBreakdownSheet` imediatamente antes do comentário `// TELA 2 — Painel principal` (linha ~1336)
  - Três edições dentro de `TelaPainel`: adicionar `useState`, extrair `accBufferStart` ao escopo externo, adicionar "Ver cálculo →" dentro do IIFE, renderizar sheet no return externo

---

## Task 1: Adicionar componente `CalculationBreakdownSheet`

**Files:**
- Modify: `index.html` — inserir antes da linha que contém `// TELA 2 — Painel principal`

- [ ] **Step 1: Inserir o componente completo**

Localizar este comentário no arquivo:
```
// ═══════════════════════════════════════════════════════════════
// TELA 2 — Painel principal  (v4 — hierarquia reestruturada)
// ═══════════════════════════════════════════════════════════════
```

Inserir o bloco abaixo **imediatamente antes** desse comentário:

```jsx
// ═══════════════════════════════════════════════════════════════
// CalculationBreakdownSheet — Bottom sheet "Como chegamos aqui"
// ═══════════════════════════════════════════════════════════════
function CalculationBreakdownSheet({ dailyQuota, todaySpent, carryBeforeToday, availableNow, onClose }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  const todayOverflow   = Math.max(0, todaySpent - dailyQuota);
  const usedPlanBuffer  = Math.min(carryBeforeToday, todayOverflow);
  const remainingBuffer = carryBeforeToday - usedPlanBuffer;
  const withinQuota     = todaySpent <= dailyQuota;
  const isNegative      = availableNow < 0;
  const hasCarry        = carryBeforeToday > 0;

  const resultPositive = !isNegative;
  const resultValue    = withinQuota ? dailyQuota - todaySpent : isNegative ? Math.abs(availableNow) : remainingBuffer;
  const resultTitle    = withinQuota ? 'Ainda dá hoje' : isNegative ? 'Saiu do plano' : 'Ainda sobra no plano';
  const resultSubtitle = withinQuota
    ? 'É o quanto você ainda pode gastar'
    : isNegative
      ? 'Você passou do valor disponível para este período'
      : 'É o que você ainda pode gastar';

  const IconCircle = ({ bg, border, emoji }) => (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: bg, border: `1.5px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: 16,
    }}>
      {emoji}
    </div>
  );

  const CalcRow = ({ icon, title, subtitle, value, valueColor }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      paddingTop: 14, paddingBottom: 14,
      borderBottom: '1px solid rgba(15,23,42,0.06)',
    }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textSec, marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: valueColor || T.text, flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: visible ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
        transition: 'background 0.25s',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '0 20px 40px',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(.2,.8,.3,1)',
          fontFamily: T.font,
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(15,23,42,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>Como chegamos aqui</div>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(15,23,42,0.06)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: T.font, flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke={T.text} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Linhas de cálculo */}
        <div style={{ marginBottom: 16 }}>

          {/* 1. Valor de hoje */}
          <CalcRow
            icon={<IconCircle bg={T.blueLight} border={T.blue} emoji="📅" />}
            title="Valor de hoje"
            subtitle={!withinQuota ? 'Cota diária' : undefined}
            value={fmt(dailyQuota)}
          />

          {/* 2. Gasto de hoje */}
          <CalcRow
            icon={<IconCircle bg={T.redLight} border={T.red} emoji="💸" />}
            title="Gasto de hoje"
            value={fmt(todaySpent)}
          />

          {/* 3. Passou do valor — só quando excedeu */}
          {!withinQuota && (
            <CalcRow
              icon={<IconCircle bg={T.redLight} border={T.red} emoji="⬆️" />}
              title="Passou do valor de hoje"
              subtitle="Excesso sobre o valor de hoje"
              value={fmt(todayOverflow)}
              valueColor={T.red}
            />
          )}

          {/* 4. Folga que tinha — só quando excedeu e há carry */}
          {!withinQuota && hasCarry && (
            <CalcRow
              icon={<IconCircle bg={T.greenLight} border={T.green} emoji="✨" />}
              title="Folga que você tinha"
              subtitle="Antes de gastar hoje"
              value={`+ ${fmt(carryBeforeToday)}`}
              valueColor={T.green}
            />
          )}

          {/* 5. Folga usada hoje — só quando excedeu e há carry */}
          {!withinQuota && hasCarry && (
            <CalcRow
              icon={<IconCircle bg="#FFF3E0" border="#F97316" emoji="🔄" />}
              title="Folga usada hoje"
              subtitle="Para cobrir o excesso de hoje"
              value={`- ${fmt(usedPlanBuffer)}`}
              valueColor={T.red}
            />
          )}

        </div>

        {/* Bloco resultado */}
        <div style={{
          borderRadius: 16, padding: '16px',
          background: resultPositive ? T.greenLight : T.redLight,
          border: `1px solid ${resultPositive ? 'rgba(49,164,108,0.2)' : 'rgba(227,93,106,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: resultPositive ? T.green : T.red,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {resultPositive
              ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 8.5l4 4 7-8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v6M8 11.5v1" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: resultPositive ? '#3D8A60' : '#9B4A55' }}>{resultTitle}</div>
            <div style={{ fontSize: 12, color: resultPositive ? '#3D8A60' : '#9B4A55', marginTop: 1, opacity: 0.85, lineHeight: '16px' }}>{resultSubtitle}</div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: resultPositive ? T.green : T.red, flexShrink: 0 }}>
            {fmt(resultValue)}
          </div>
        </div>

        {/* Bloco "Entenda o cálculo" */}
        <div style={{
          borderRadius: 16, padding: '14px 16px',
          background: T.blueLight,
          border: '1px solid rgba(47,111,237,0.15)',
          display: 'flex', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 1,
          }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 800, lineHeight: 1 }}>i</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.blue, marginBottom: 4 }}>Entenda o cálculo</div>
            <div style={{ fontSize: 12, color: '#3B5EA6', lineHeight: '18px' }}>
              Quando você gasta acima do valor de hoje, usamos sua folga do plano para manter tudo sob controle. Por isso, o valor disponível pode mudar durante o período.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

```

- [ ] **Step 2: Verificar inserção**

```
grep -n "function CalculationBreakdownSheet\|function TelaPainel" index.html
```

Resultado esperado: `CalculationBreakdownSheet` tem linha menor que `TelaPainel`.

---

## Task 2: Integrar em `TelaPainel`

**Files:**
- Modify: `index.html` — quatro edições dentro de `TelaPainel`

**Atenção sobre escopo:** `TelaPainel` tem um IIFE interno `{(() => { ... })()}` que renderiza o card principal. Variáveis como `isNeg`, `noTx`, `accBufferStart` existem apenas dentro desse IIFE. O "Ver cálculo" está dentro do IIFE (acessa essas variáveis). O `CalculationBreakdownSheet` é renderizado fora do IIFE (no return externo), então precisa de `accBufferStart` calculado no escopo de `TelaPainel`.

- [ ] **Step 1: Adicionar `useState` e `accBufferStart` externo**

Localizar no início de `TelaPainel`:
```js
  const status = getStatusDiario(stats, { gastosHoje, ratioMargem });
  const isPositive = margemAteHoje >= 0;
```

Substituir por:
```js
  const status = getStatusDiario(stats, { gastosHoje, ratioMargem });
  const isPositive = margemAteHoje >= 0;
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const accBufferStart = Math.max(0, margemAteHoje + gastosHoje - stats.valorDiarioBase);
```

- [ ] **Step 2: Adicionar link "Ver cálculo →" dentro do IIFE**

Localizar este bloco exato (dentro do IIFE do card, após as divs de breakdown):
```jsx
            {!noTx && isNeg && stats.metaRecuperacaoDiaria != null && stats.metaRecuperacaoDiaria > 0 && (
              <div style={{ fontSize: 12, color: T.red, marginTop: 3 }}>
                meta: {fmt(stats.metaRecuperacaoDiaria)}/dia nos próximos {stats.diasRestantes} {stats.diasRestantes === 1 ? 'dia' : 'dias'}
              </div>
            )}
          </div>
```

Substituir por:
```jsx
            {!noTx && isNeg && stats.metaRecuperacaoDiaria != null && stats.metaRecuperacaoDiaria > 0 && (
              <div style={{ fontSize: 12, color: T.red, marginTop: 3 }}>
                meta: {fmt(stats.metaRecuperacaoDiaria)}/dia nos próximos {stats.diasRestantes} {stats.diasRestantes === 1 ? 'dia' : 'dias'}
              </div>
            )}
            {!noTx && (
              <button
                onClick={() => setShowBreakdown(true)}
                style={{
                  background: 'none', border: 'none', padding: 0, marginTop: 5,
                  cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  color: T.blue, fontFamily: T.font, display: 'block',
                }}
              >
                Ver cálculo →
              </button>
            )}
          </div>
```

- [ ] **Step 3: Renderizar `CalculationBreakdownSheet` no return externo**

Localizar o fechamento do return de `TelaPainel`. É o trecho:
```jsx

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TELA 3/4 — Registrar gasto / Adicionar extra (+ Editar)
```

Substituir apenas o `    </div>` e `  );` (mantendo `}` e o comentário da próxima tela):
```jsx

      {showBreakdown && (
        <CalculationBreakdownSheet
          dailyQuota={stats.valorDiarioBase}
          todaySpent={gastosHoje}
          carryBeforeToday={accBufferStart}
          availableNow={margemAteHoje}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: bottom sheet 'Como chegamos aqui' com CalculationBreakdownSheet"
```

---

## Task 3: Verificação visual

- [ ] **Step 1: Abrir o app no navegador**

Abrir `index.html` diretamente no browser. Confirmar que não há erro no console do DevTools.

- [ ] **Step 2: Testar Estado 1 — dentro da cota** (`todaySpent ≤ dailyQuota`)

Com gastos de hoje abaixo do valor diário: tocar "Ver cálculo →" e confirmar:
- Sheet abre com animação slide-up
- Mostra "Valor de hoje" + "Gasto de hoje"
- Bloco verde "Ainda dá hoje" com `dailyQuota - todaySpent`
- Linhas 3, 4, 5 (excesso/folga) **não aparecem**

- [ ] **Step 3: Testar Estado 2 — passou da cota, tem folga** (`todaySpent > dailyQuota` e `accBufferStart > 0`)

Confirmar que aparecem as 5 linhas completas e bloco verde "Ainda sobra no plano" com `remainingBuffer`.

- [ ] **Step 4: Testar Estado 3 — saiu do plano** (`margemAteHoje < 0`)

Confirmar bloco vermelho "Saiu do plano" com `Math.abs(margemAteHoje)`.

- [ ] **Step 5: Testar fechamento**

Confirmar: botão X fecha com slide-down, toque no backdrop fecha, valores matemáticos batem com o card principal.

- [ ] **Step 6: Testar em tela pequena**

Reduzir para 375px. Confirmar que o conteúdo é rolável quando necessário.

- [ ] **Step 7: Confirmar ausência do link sem transações**

Com `state.transacoes = []` (ou app recém configurado): "Ver cálculo →" não deve aparecer.
