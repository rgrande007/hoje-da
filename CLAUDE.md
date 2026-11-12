# CLAUDE.md — Hoje Dá

## Stack
- React 18.3.1 (npm, empacotado no build). Não há mais React/Babel por CDN nem compilação no navegador.
- Vite 5 compila o JSX no build (`esbuild.jsx: 'automatic'`, então JSX não precisa de `import React`).
- localStorage: chave `orcamento_diario_v6` (estado), `hd_backup` (lembrete de backup), `hd_notif` (lembrete diário).
- PWA: service worker em `sw.js` (estratégia `injectManifest` do `vite-plugin-pwa`). O manifest é gerado pelo plugin a partir do `vite.config.js`; não existe `public/manifest.json`.

## Comandos
- `npm run dev` — servidor local (porta 5173). Service worker só roda no build.
- `npm run build` — build de produção em `dist/`
- `npm run preview` — serve o build (porta 4173), com service worker e modo offline
- `npm test` — testes de regressão em `tests/`. `tests/extrair.js` carrega as funções puras de `src/main.jsx` (o código real, não uma cópia) e roda no fuso de Brasília. Uma função nova usada por outra também precisa entrar na lista `NOMES` do teste. O `test-scenarios.js` antigo testa uma *cópia* do `calcStats`.
- `node scripts/gerar-icones.js` — gera os ícones do PWA a partir de `BRAND/icone.svg`

## Publicação
A Vercel publica automaticamente a branch `main` (produção: hoje-da.vercel.app). Outras branches geram preview.

## Arquitetura
- `index.html` — só a casca: metatags, fontes, `src/estilos.css`, tela de abertura (`.boot`, trocada pelo React ao montar) e `<script type="module" src="/src/main.jsx">`.
- `src/main.jsx` — todo o app: lógica, componentes e `App`. Componentes ficam neste arquivo.
- `src/android-frame.jsx` — moldura de celular usada no desktop (exporta `AndroidDevice`).
- `src/estilos.css` — estilos globais (animações, foco visível, `prefers-reduced-motion`). Não coloque `<style>` dentro do `index.html`: no Windows, com caminho `a:\` minúsculo, o Vite falha no build ("No matching HTML proxy module").
- State centralizado no componente `App` via `React.useState`.

## Lógica financeira central
```javascript
disponivelHoje = (valorDiarioBase × diaAtual) + totalEntradas − totalGastos
valorDiarioBase = valorMensal / diasDoMes
```
- `calcStats(state)` — função pura, retorna todos os dados calculados
- `getStatusDiario(stats, { gastosHoje, ratioMargem })` — determina status e frase contextual
- `ratioMargem = disponivelHoje / valorDiarioBase` — ratio que define os 4 estados
- `podeIniciarCiclo` — valor + saldo anterior precisa ser > 0 (dívida maior que o valor bloqueia)
- `sanitizeState` — limpa o estado ao carregar e ao importar backup (lançamento inválido, sem id, descrição não-texto)

## Datas (cuidado com fuso)
- Data "de hoje" sempre com `fmtDateKey(new Date())`, nunca `toISOString().split('T')[0]` (em UTC, depois das 21h já é amanhã). Um teste barra isso.
- Lançamentos usam `dataLancamentoISO`: hoje = horário real; outro dia = meio-dia local (`temHoraReal` esconde esse "12:00").

## Terminologia canônica (OBRIGATÓRIO nos textos da UI)
- **"ciclo"** — nunca "mês" (o período entre pagamentos pode ter qualquer duração)
- **"cota"** — cota diária (`valorDiarioBase`)
- **"margem"** — folga acumulada de dias anteriores (`accBufferStart`). Decisão do dono (nov/2026): "cota" e "margem" continuam visíveis na UI.
- **"planejado"** — nunca "orçamento" ao se referir ao plano
- **"Saiu do plano"** — nunca "passou do plano" (mais suave)
- **"Novo ciclo"** — nunca "Novo mês" em menus e diálogos
- Status canônicos: **Passou | Apertado | No plano | Com folga**

## Regras de desenvolvimento
- Componentes ficam em `src/main.jsx` (não fragmentar em vários arquivos sem combinar com o dono)
- Dependências npm: só `react`/`react-dom` em produção; o resto é devDependency de build/teste
- Usar sempre a terminologia canônica acima nos textos visíveis ao usuário
- Perguntar antes de implementar decisões de layout ou UX ambíguas
- `corSaldo()` — É USADA em TelaAnalise (não é código morto)
- Backend (login/sincronização/push) adiado por decisão do dono (nov/2026): o app é 100% local por enquanto

## Componentes principais (em `src/main.jsx`)
| Componente | Responsabilidade |
|-----------|-----------------|
| `calcStats` | Função pura de cálculo financeiro |
| `getStatusDiario` | Determina status e frase contextual |
| `SpendingGauge` | Régua de ritmo do ciclo |
| `UsoDoDiaBar` | Barra "Uso do dia" (spec aprovada em docs/superpowers/specs) |
| `WeeklyMiniChart` | Barras da semana (Seg–Dom) |
| `TelaPainel` | Dashboard principal (inclui `LembreteBackup`) |
| `CalculationBreakdownSheet` | Sheet "Como chegamos aqui" |
| `TelaEntrada` | Registrar gasto/entrada |
| `TelaHistorico` | Listagem de lançamentos |
| `TelaAnalise` | Gráficos e projeção |
| `App` | Estado global e roteamento de telas |

## Brand — Design tokens
Paleta em constante `T` no início de `src/main.jsx`:
- `T.blue = '#2F6FED'` — cor principal
- `T.blueDark = '#163B75'` — azul navy (fundo do ícone, theme-color)
- `T.green = '#31A46C'`, `T.yellow = '#E8B63E'`, `T.red = '#E35D6A'` — para barras, bolinhas e fundos
- **Texto colorido usa `textoCor(cor)`** (ou `T.greenText`, `T.redText`, `T.yellowText`, `T.blueText`): as cores da marca não passam no contraste mínimo (4,5:1) como texto pequeno — o amarelo tem 1,9:1.
- Fonte: DM Sans (Google Fonts)
- Referências visuais e princípios de UX: `BRAND/` (direção de arte, princípios de UX, sistema de componentes)

## Decisões de UX (nov/2026, aprovadas pelo dono — testes em tests/regressao.test.js protegem)
- Rótulos em caixa normal ("Disponível hoje"), nunca `textTransform: 'uppercase'`; sem "→" no fim de links/botões.
- Painel = "Quanto ainda dá hoje?": cabeçalho só com logo + engrenagem (sem slogan; "Editar ciclo" fica no menu),
  card do dia, Gastei/Recebi, lembrete de backup, Esta semana, um único "Resumo do ciclo" (ritmo + previsão + barra), últimos movimentos.
- A régua de ritmo (`SpendingGauge`) fica na Análise ("Como está meu ritmo?").
- `UsoDoDiaBar`: folga em verde; amarela só quando o gasto de hoje passou da cota e está consumindo a folga.
- Análise "Próximos dias": uma frase com `projecaoMargem(stats, n)`, não uma lista.
- Títulos de cartão do painel: 18px/800.
