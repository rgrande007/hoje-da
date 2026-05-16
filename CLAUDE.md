# CLAUDE.md — Hoje Dá

## Stack
- React 18 via CDN (unpkg) + Babel standalone (transpilação em runtime no browser)
- JSX inline no `index.html` — sem imports, sem módulos ES, sem bundler para o código do app
- Vite 5 como dev server (`npm run dev`) e build (`npm run build`)
- localStorage: chave `orcamento_diario_v6`
- PWA: service worker em `sw.js` com estratégia `injectManifest` via `vite-plugin-pwa`

## Comandos
- `npm run dev` — servidor local (porta 5173)
- `npm run build` — build de produção em `dist/`
- `npm run preview` — preview do build

## Arquitetura
Todo o código do app está em `index.html` dentro de um único `<script type="text/babel">`.
Componentes são funções globais no mesmo escopo — sem imports, sem exports.
State centralizado no componente `App` via `React.useState`.
`android-frame.jsx` (em `public/`) é carregado separadamente via Babel e expõe `AndroidDevice` para o frame desktop.

## Lógica financeira central
```javascript
disponivelHoje = (valorDiarioBase × diaAtual) + totalEntradas − totalGastos
valorDiarioBase = valorMensal / diasDoMes
```
- `calcStats(state)` em `index.html:195` — função pura, retorna todos os dados calculados
- `getStatusDiario(stats, { gastosHoje, ratioMargem })` em `index.html:248` — determina status e frase contextual
- `ratioMargem = disponivelHoje / valorDiarioBase` — ratio que define os 4 estados

## Terminologia canônica (OBRIGATÓRIO nos textos da UI)
- **"ciclo"** — nunca "mês" (o período entre pagamentos pode ter qualquer duração)
- **"cota"** — cota diária (`valorDiarioBase`)
- **"margem"** — folga acumulada de dias anteriores (`accBufferStart`)
- **"planejado"** — nunca "orçamento" ao se referir ao plano
- **"Saiu do plano"** — nunca "passou do plano" (mais suave)
- **"Novo ciclo"** — nunca "Novo mês" em menus e diálogos
- Status canônicos: **Passou | Apertado | No plano | Com folga**

## Regras de desenvolvimento
- **Não criar arquivos separados de componentes** — manter tudo em `index.html`
- **Não adicionar dependências npm** além de devDependencies de build (vite, vite-plugin-pwa)
- Usar sempre a terminologia canônica acima nos textos visíveis ao usuário
- Perguntar antes de implementar decisões de layout ou UX ambíguas
- `corSaldo()` em `index.html:235` — É USADA em TelaAnalise (não é código morto)

## Componentes principais
| Componente | Linha aprox. | Responsabilidade |
|-----------|------------|-----------------|
| `calcStats` | 195 | Função pura de cálculo financeiro |
| `getStatusDiario` | 248 | Determina status e frase contextual |
| `SpendingGauge` | 970 | Régua visual Passou/Apertado/No plano/Com folga |
| `WeeklyMiniChart` | 1044 | Barras da semana (Seg–Dom) |
| `TelaPainel` | 1546 | Dashboard principal |
| `CalculationBreakdownSheet` | 1339 | Sheet "Como chegamos aqui" |
| `TelaEntrada` | 1969 | Registrar gasto/entrada |
| `TelaHistorico` | 2163 | Listagem de lançamentos |
| `TelaAnalise` | 2414 | Gráficos e projeção |
| `App` | 3284 | Estado global e roteamento de telas |

## Brand — Design tokens
Paleta em constante `T` no início do `<script type="text/babel">`:
- `T.blue = '#2F6FED'` — cor principal
- `T.blueDark = '#163B75'` — azul navy (fundo do ícone, theme-color)
- `T.green = '#31A46C'`, `T.yellow = '#E8B63E'`, `T.red = '#E35D6A'`
- Fonte: DM Sans (Google Fonts, variable)
