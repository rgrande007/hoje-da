'use strict';
// ════════════════════════════════════════════════════════════════════════════
// Hoje Dá — Test Scenarios Runner
// Executa: node test-scenarios.js
// Requer Node.js 16+ (Intl.NumberFormat com pt-BR nativo)
// ════════════════════════════════════════════════════════════════════════════

// ─── Funções puras extraídas de index.html (sem React, sem DOM) ─────────────

function calcStats(state) {
  const hoje = new Date();
  const hojeDate   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioRaw  = new Date(state.dataInicio);
  const inicioDate = (!state.dataInicio || isNaN(inicioRaw.getTime()))
    ? hojeDate
    : new Date(inicioRaw.getFullYear(), inicioRaw.getMonth(), inicioRaw.getDate());
  const safeDias = Math.max(1, state.diasDoMes || 1);
  const rawDia   = Math.floor((hojeDate - inicioDate) / 86400000) + 1;
  const cicloEncerrado  = rawDia > safeDias;
  const diaAtual        = Math.max(1, Math.min(rawDia, safeDias));
  const diasRestantes   = safeDias - diaAtual;
  const valorDiarioBase = state.valorMensal / safeDias;
  const hoje_ts  = hojeDate.getTime();
  const inicio_ts = inicioDate.getTime();
  const txValidas = (state.transacoes || []).filter(t => {
    if (!t || !t.data) return false;
    const d  = new Date(t.data);
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return !isNaN(d.getTime()) && d0 <= hoje_ts && d0 >= inicio_ts;
  });
  const totalGastos   = txValidas.filter(t => t.tipo === 'gasto').reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const totalEntradas = txValidas.filter(t => t.tipo === 'extra').reduce((s, t) => s + (Number(t.valor) || 0), 0);
  const saldoTotalRestante = state.valorMensal + totalEntradas - totalGastos;
  const disponivelHoje     = valorDiarioBase * diaAtual + totalEntradas - totalGastos;
  const mediaGastoPorDia   = diaAtual > 0 ? totalGastos / diaAtual : 0;
  const projecaoFinal      = mediaGastoPorDia * state.diasDoMes;
  const projecaoDiff       = (state.valorMensal + totalEntradas) - projecaoFinal;
  let metaRecuperacaoDiaria = null;
  if (disponivelHoje < 0 && diasRestantes > 0) {
    const deficitPlano = Math.abs(disponivelHoje);
    metaRecuperacaoDiaria = valorDiarioBase - (deficitPlano / diasRestantes);
  }
  const r2 = v => Math.round(v * 100) / 100;
  return {
    cicloEncerrado, diaAtual, diasRestantes,
    valorDiarioBase:       r2(valorDiarioBase),
    totalGastos:           r2(totalGastos),
    totalEntradas:         r2(totalEntradas),
    saldoTotalRestante:    r2(saldoTotalRestante),
    disponivelHoje:        r2(disponivelHoje),
    projecaoDiff:          r2(projecaoDiff),
    mediaGastoPorDia:      r2(mediaGastoPorDia),
    metaRecuperacaoDiaria: metaRecuperacaoDiaria != null ? r2(metaRecuperacaoDiaria) : null,
  };
}

function getStatusDiario(stats, { gastosHoje = 0, ratioMargem = 0 } = {}) {
  const base = (isFinite(stats.valorDiarioBase) && stats.valorDiarioBase > 0)
    ? stats.valorDiarioBase : 1;
  const margem         = stats.disponivelHoje;
  const cotaDiaExcedida = gastosHoje > base;
  const isPrimeiroDia  = stats.diaAtual === 1;
  const isUltimoDia    = stats.diasRestantes === 0 && !stats.cicloEncerrado;
  const semGastosHoje  = gastosHoje === 0;

  if (margem < 0) {
    if (stats.cicloEncerrado) return { pill:'Passou', frase:'Esse ciclo encerrou além do combinado. O próximo começa do zero.', nivel:'vermelho' };
    if (isUltimoDia)          return { pill:'Passou', frase:'Último dia e o plano está no negativo. Use o aprendizado no próximo ciclo.', nivel:'vermelho' };
    return { pill:'Passou', frase:'Saiu do plano por enquanto. Os próximos dias são a chance de equilibrar.', nivel:'vermelho' };
  }
  if (stats.cicloEncerrado) {
    const pill  = ratioMargem >= 1.5 ? 'Com folga' : ratioMargem >= 0.25 ? 'No plano' : 'Apertado';
    const nivel = ratioMargem >= 1.5 ? 'verde'     : ratioMargem >= 0.25 ? 'azul'     : 'amarelo';
    return { pill, frase:'Ciclo encerrado dentro do plano. Confira o resumo e inicie o próximo.', nivel };
  }
  if (cotaDiaExcedida) {
    const pill  = ratioMargem >= 1.5 ? 'Com folga' : ratioMargem >= 0.25 ? 'No plano' : 'Apertado';
    const nivel = ratioMargem >= 1.5 ? 'verde'     : ratioMargem >= 0.25 ? 'azul'     : 'amarelo';
    let frase;
    if (ratioMargem >= 1.5) frase = 'Hoje pesou mais. Mas a folga dos outros dias cobre bem.';
    else if (ratioMargem >= 0.25) frase = isUltimoDia
      ? 'Último dia e passou da cota. O plano ainda fecha no positivo.'
      : 'Passou da cota de hoje, mas o plano ainda está de pé.';
    else frase = isUltimoDia
      ? 'Último dia no limite. Tente não ultrapassar muito mais.'
      : 'Hoje foi além do esperado. A margem ficou curtinha — vale segurar.';
    return { pill, frase, nivel };
  }
  if (ratioMargem < 0.25) {
    return { pill:'Apertado', nivel:'amarelo',
      frase: isUltimoDia
        ? 'Último dia do ciclo com pouca folga. Praticamente chegou no combinado.'
        : 'Está apertado por hoje. Bom momento para segurar um pouco.' };
  }
  if (ratioMargem < 1.5) {
    let frase;
    if (isPrimeiroDia)       frase = 'Primeiro dia do ciclo. Ainda é cedo para sentir o ritmo.';
    else if (isUltimoDia)    frase = 'Último dia e praticamente no combinado. Bom ritmo até aqui.';
    else if (semGastosHoje)  frase = 'Sem gastos hoje ainda. O plano segue no caminho certo.';
    else                     frase = 'No ritmo certo. Dá para continuar o dia com tranquilidade.';
    return { pill:'No plano', frase, nivel:'azul' };
  }
  let frase;
  if (isUltimoDia)                    frase = 'Último dia e com boa folga. O ciclo praticamente fechou dentro do plano.';
  else if (semGastosHoje && !isPrimeiroDia) frase = 'Sem gastos hoje. Você está com boa folga acumulada.';
  else                                frase = 'Você está com folga. Dá para gastar um pouco sem sair do plano.';
  return { pill:'Com folga', frase, nivel:'verde' };
}

// Simula apenas a parte de parsing/validação do loadState (sem localStorage)
function parseState(raw) {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) || null;
    if (parsed) {
      if (Array.isArray(parsed.transacoes)) {
        parsed.transacoes = parsed.transacoes.filter(t => {
          if (t == null || !t.tipo) return false;
          const v = Number(t.valor);
          if (!isFinite(v) || v <= 0) return false;
          t.valor = v;
          if (!t.data || isNaN(new Date(t.data).getTime())) return false;
          return true;
        });
      } else {
        parsed.transacoes = [];
      }
      parsed.valorMensal = Math.max(0, Number(parsed.valorMensal) || 0);
      parsed.diasDoMes   = Math.max(1, Math.round(Number(parsed.diasDoMes) || 1));
    }
    return parsed;
  } catch { return null; }
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

// Retorna ISO string representando a meia-noite local de N dias atrás
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Retorna ISO string representando o meio-dia local de N dias atrás
function noonAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function fmtDateKey(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

const hojeKey = fmtDateKey(new Date().toISOString());

function gastosHojeFn(transacoes) {
  return (transacoes || [])
    .filter(t => t && t.tipo === 'gasto' && fmtDateKey(t.data) === hojeKey)
    .reduce((s, t) => s + t.valor, 0);
}

const fmt = v => {
  const n = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
  return (v < 0 ? '−' : '') + 'R$ ' + n;
};

// ─── Runner de testes ─────────────────────────────────────────────────────────

let PASS = 0, FAIL = 0;
const results = [];

function run(num, name, stateFn, expectFn) {
  const state = stateFn();
  const stats = calcStats(state);
  const gh    = gastosHojeFn(state.transacoes || []);
  const ratio = stats.valorDiarioBase > 0 ? stats.disponivelHoje / stats.valorDiarioBase : 0;
  const status = getStatusDiario(stats, { gastosHoje: gh, ratioMargem: ratio });
  // accBufferStart como TelaPainel calcula
  const accBuffer = Math.max(0, stats.disponivelHoje + gh - stats.valorDiarioBase);

  const ctx = { stats, gastosHoje: gh, ratioMargem: ratio, status, accBuffer };
  const issues = expectFn(ctx);

  const ok = issues.length === 0;
  if (ok) PASS++; else FAIL++;
  results.push({ num, name, ok, issues, ctx });
}

function check(label, actual, expected) {
  if (actual !== expected) return [`  ${label}: esperado "${expected}", recebeu "${actual}"`];
  return [];
}

function checkApprox(label, actual, expected, tol = 0.02) {
  if (Math.abs(actual - expected) > tol) return [`  ${label}: esperado ≈${expected}, recebeu ${actual}`];
  return [];
}

function checkTrue(label, cond) {
  if (!cond) return [`  ${label}: esperado verdadeiro`];
  return [];
}

function checkFalse(label, cond) {
  if (cond) return [`  ${label}: esperado falso`];
  return [];
}

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 1 — Ciclo saudável (dia 19 de 30, folga confortável)
// valorMensal 3000, 30 dias → cota R$100/dia
// Gastos dias 1-18: R$60/dia (total R$1080) + R$60 hoje
// disponivelHoje = 100×19 − 1140 = R$760  |  ratio = 7.6 → "Com folga"
// ════════════════════════════════════════════════════════════════════════════
run(1, 'Ciclo saudável — Com folga', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:1080, descricao:'Gastos 18 dias', categoria:'alimentacao', data: noonAgo(10) },
    { id:'t2', tipo:'gasto', valor:60,   descricao:'Hoje',           categoria:'alimentacao', data: noonAgo(0)  },
  ],
}), ({ stats, gastosHoje, ratioMargem, status }) => [
  ...checkApprox('diaAtual',        stats.diaAtual,       19),
  ...checkApprox('disponivelHoje',  stats.disponivelHoje, 760),
  ...check('pill',                  status.pill,          'Com folga'),
  ...check('nivel',                 status.nivel,         'verde'),
  ...checkApprox('gastosHoje',      gastosHoje,           60),
  ...checkFalse('cicloEncerrado',   stats.cicloEncerrado),
  ...checkApprox('diasRestantes',   stats.diasRestantes,  11),
  ...checkTrue('saldo positivo',    stats.saldoTotalRestante > 0),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 2 — Ciclo apertado (margem < 25% da cota)
// Gasto de R$1880 no dia 5, sem gastos hoje
// disponivelHoje = 100×19 − 1880 = R$20  |  ratio = 0.20 → "Apertado"
// ════════════════════════════════════════════════════════════════════════════
run(2, 'Ciclo apertado — Apertado', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:1880, descricao:'Gasto acumulado', categoria:'outros', data: noonAgo(14) },
  ],
}), ({ stats, gastosHoje, status }) => [
  ...checkApprox('disponivelHoje',  stats.disponivelHoje, 20),
  ...check('pill',                  status.pill,          'Apertado'),
  ...check('nivel',                 status.nivel,         'amarelo'),
  ...checkApprox('gastosHoje',      gastosHoje,           0),
  ...checkTrue('disponivelHoje > 0', stats.disponivelHoje > 0),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 3 — Ciclo negativo (saiu do plano)
// Gasto de R$2100 no início do ciclo, sem gastos hoje
// disponivelHoje = 100×19 − 2100 = −R$200  |  "Passou"
// metaRecuperacaoDiaria = 100 − 200/11 ≈ R$81.82
// ════════════════════════════════════════════════════════════════════════════
run(3, 'Ciclo negativo — Passou', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:2100, descricao:'Gasto alto', categoria:'outros', data: noonAgo(17) },
  ],
}), ({ stats, gastosHoje, status, accBuffer }) => [
  ...checkApprox('disponivelHoje',  stats.disponivelHoje, -200),
  ...check('pill',                  status.pill,          'Passou'),
  ...check('nivel',                 status.nivel,         'vermelho'),
  ...checkTrue('metaRecuperacao existe', stats.metaRecuperacaoDiaria !== null),
  ...checkApprox('metaRecuperacaoDiaria', stats.metaRecuperacaoDiaria, 81.82, 0.05),
  ...checkApprox('gastosHoje',      gastosHoje,           0),
  // accBuffer deve ser 0: sem gastos hoje, deficit vem de dias anteriores
  ...checkApprox('accBuffer',       accBuffer,            0),
  ...checkFalse('cicloEncerrado',   stats.cicloEncerrado),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 4 — Ciclo com entrada extra
// Gasto R$1500 + Entrada extra R$500
// disponivelHoje = 100×19 + 500 − 1500 = R$900  |  ratio = 9.0 → "Com folga"
// saldoTotalRestante = 3000 + 500 − 1500 = R$2000
// ════════════════════════════════════════════════════════════════════════════
run(4, 'Ciclo com entrada extra', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:1500, descricao:'Gastos normais',  categoria:'alimentacao', data: noonAgo(10) },
    { id:'t2', tipo:'extra', valor:500,  descricao:'Freela recebido', categoria:'freela',      data: noonAgo(5)  },
  ],
}), ({ stats, status }) => [
  ...checkApprox('disponivelHoje',    stats.disponivelHoje,    900),
  ...checkApprox('totalEntradas',     stats.totalEntradas,     500),
  ...checkApprox('saldoTotalRestante',stats.saldoTotalRestante,2000),
  ...check('pill',                    status.pill,             'Com folga'),
  ...check('nivel',                   status.nivel,            'verde'),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 5 — Muitos gastos pequenos (95 transações de R$10)
// 5 por dia, últimos 19 dias → gastosHoje = R$50, total = R$950
// disponivelHoje = 100×19 − 950 = R$950  |  ratio = 9.5 → "Com folga"
// Valida: performance e acúmulo correto de N transações
// ════════════════════════════════════════════════════════════════════════════
run(5, 'Muitos gastos pequenos (95 transações)', () => {
  const txs = [];
  for (let i = 0; i < 95; i++) {
    const dayOffset = Math.floor(i / 5); // 5 por dia, dias 0..18
    txs.push({ id:`m${i}`, tipo:'gasto', valor:10, descricao:`Pequeno ${i}`, categoria:'alimentacao', data: noonAgo(dayOffset) });
  }
  return { configurado: true, valorMensal: 3000, diasDoMes: 30, dataInicio: daysAgo(18), transacoes: txs };
}, ({ stats, gastosHoje, status }) => [
  ...checkApprox('totalGastos',     stats.totalGastos,    950),
  ...checkApprox('disponivelHoje',  stats.disponivelHoje, 950),
  ...checkApprox('gastosHoje',      gastosHoje,           50),
  ...check('pill',                  status.pill,          'Com folga'),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 6 — Um gasto muito alto hoje (R$2500)
// disponivelHoje = 100×19 − 2500 = −R$600  |  "Passou"
// accBuffer = max(0, −600 + 2500 − 100) = R$1800  (folga acumulada antes de hoje)
// metaRecuperacao = 100 − 600/11 ≈ R$45.45
// ════════════════════════════════════════════════════════════════════════════
run(6, 'Gasto muito alto hoje', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:2500, descricao:'Gasto alto hoje', categoria:'outros', data: noonAgo(0) },
  ],
}), ({ stats, gastosHoje, status, accBuffer }) => [
  ...checkApprox('disponivelHoje',       stats.disponivelHoje,       -600),
  ...checkApprox('gastosHoje',           gastosHoje,                  2500),
  ...check('pill',                       status.pill,                 'Passou'),
  // accBuffer = folga de 18 dias acumulada antes de hoje (18×100 = 1800)
  ...checkApprox('accBuffer',            accBuffer,                   1800),
  ...checkTrue('metaRecuperacao existe', stats.metaRecuperacaoDiaria !== null),
  ...checkApprox('metaRecuperacaoDiaria',stats.metaRecuperacaoDiaria, 45.45, 0.05),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 7 — Ciclo no primeiro dia (sem gastos)
// diaAtual = 1, diasRestantes = 29
// disponivelHoje = 100×1 = R$100  |  ratio = 1.0 → "No plano" + frase primeiro dia
// ════════════════════════════════════════════════════════════════════════════
run(7, 'Primeiro dia do ciclo', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(0),
  transacoes: [],
}), ({ stats, gastosHoje, status }) => [
  ...checkApprox('diaAtual',       stats.diaAtual,       1),
  ...checkApprox('diasRestantes',  stats.diasRestantes,  29),
  ...checkApprox('disponivelHoje', stats.disponivelHoje, 100),
  ...check('pill',                 status.pill,          'No plano'),
  ...checkTrue('frase primeiro dia', status.frase.includes('Primeiro dia')),
  ...checkApprox('gastosHoje',     gastosHoje,           0),
  ...checkFalse('cicloEncerrado',  stats.cicloEncerrado),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 8 — Último dia do ciclo
// dataInicio = 29 dias atrás → diaAtual = 30, diasRestantes = 0, cicloEncerrado = false
// Gastos: R$2700 anteriores + R$100 hoje = R$2800 total
// disponivelHoje = 100×30 − 2800 = R$200  |  ratio = 2.0 → "Com folga"
// frase deve mencionar "Último dia"
// ════════════════════════════════════════════════════════════════════════════
run(8, 'Último dia do ciclo', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(29),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:2700, descricao:'Gastos 29 dias', categoria:'outros',      data: noonAgo(15) },
    { id:'t2', tipo:'gasto', valor:100,  descricao:'Gasto hoje',     categoria:'alimentacao', data: noonAgo(0)  },
  ],
}), ({ stats, gastosHoje, status }) => [
  ...checkApprox('diaAtual',        stats.diaAtual,      30),
  ...checkApprox('diasRestantes',   stats.diasRestantes, 0),
  ...checkFalse('cicloEncerrado',   stats.cicloEncerrado),
  ...checkApprox('disponivelHoje',  stats.disponivelHoje, 200),
  ...check('pill',                  status.pill,          'Com folga'),
  ...checkTrue('frase ultimo dia',  status.frase.includes('ltimo dia')),
  ...checkApprox('gastosHoje',      gastosHoje,           100),
]);

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 9 — LocalStorage vazio
// parseState(null)  → null
// parseState('')    → null
// App deve inicializar com estado padrão (configurado: false)
// ════════════════════════════════════════════════════════════════════════════
run(9, 'LocalStorage vazio', () => {
  // Retorna um estado fake apenas para satisfazer a assinatura do runner
  // A verificação real é sobre parseState()
  return { configurado: false, valorMensal: 0, diasDoMes: 30, dataInicio: null, transacoes: [] };
}, ({ stats }) => {
  const issues = [];
  // parseState com ausência de dado
  if (parseState(null) !== null)  issues.push('  parseState(null) deveria retornar null');
  if (parseState('')   !== null)  issues.push('  parseState("") deveria retornar null');
  if (parseState('null') !== null) issues.push('  parseState("null") deveria retornar null');
  // Sem config definida, calcStats com dataInicio null deve usar hojeDate como início
  if (stats.diaAtual !== 1)       issues.push('  diaAtual deveria ser 1 quando dataInicio é null');
  return issues;
});

// ════════════════════════════════════════════════════════════════════════════
// CENÁRIO 10 — LocalStorage corrompido
// Testa 5 formas de corrupção:
//   (a) JSON inválido                       → null
//   (b) Objeto válido mas campos inválidos  → valores default (valorMensal=0, diasDoMes=1)
//   (c) Transações inválidas misturadas     → inválidas filtradas, válidas mantidas
//   (d) Transação com valor=0              → filtrada (v <= 0)
//   (e) Transação com data inválida         → filtrada
// ════════════════════════════════════════════════════════════════════════════
run(10, 'LocalStorage corrompido', () => ({
  configurado: false, valorMensal: 0, diasDoMes: 30, dataInicio: null, transacoes: [],
}), () => {
  const issues = [];

  // (a) JSON inválido
  const a = parseState('{invalid}');
  if (a !== null) issues.push('  (a) JSON inválido deveria retornar null, recebeu ' + JSON.stringify(a));

  // (b) Campos numéricos inválidos → valorMensal e diasDoMes ficam com defaults
  const b = parseState('{"configurado":true,"valorMensal":"abc","diasDoMes":"xyz","transacoes":[]}');
  if (!b) { issues.push('  (b) Objeto válido com campos ruins deveria parsear sem cravar'); }
  else {
    if (b.valorMensal !== 0) issues.push(`  (b) valorMensal="abc" → esperado 0, recebeu ${b.valorMensal}`);
    if (b.diasDoMes !== 1)   issues.push(`  (b) diasDoMes="xyz" → esperado 1, recebeu ${b.diasDoMes}`);
  }

  // (c) Transações: null, valor inválido, data inválida, uma válida
  const rawC = JSON.stringify({
    configurado: true, valorMensal: 3000, diasDoMes: 30,
    transacoes: [
      null,
      { id:'bad1', tipo:'gasto', valor: 'xyz',  data: noonAgo(1) },
      { id:'bad2', tipo:'gasto', valor: 0,       data: noonAgo(1) },
      { id:'bad3', tipo:'gasto', valor: 10,      data: 'data-invalida' },
      { id:'ok',   tipo:'gasto', valor: 50,      data: noonAgo(1) },
    ],
  });
  const c = parseState(rawC);
  if (!c) { issues.push('  (c) parseState deveria retornar objeto, retornou null'); }
  else {
    if (c.transacoes.length !== 1)        issues.push(`  (c) esperado 1 tx válida, recebeu ${c.transacoes.length}`);
    if (c.transacoes[0]?.valor !== 50)    issues.push(`  (c) tx válida deveria ter valor=50, recebeu ${c.transacoes[0]?.valor}`);
    if (c.transacoes[0]?.id !== 'ok')     issues.push(`  (c) tx válida deveria ter id="ok"`);
  }

  // (d) Valor negativo → filtrado
  const rawD = JSON.stringify({ configurado: true, valorMensal: 1000, diasDoMes: 30,
    transacoes: [{ id:'neg', tipo:'gasto', valor:-10, data: noonAgo(1) }] });
  const d = parseState(rawD);
  if (d && d.transacoes.length !== 0) issues.push('  (d) Valor negativo deveria ser filtrado');

  // (e) Sem campo "transacoes" → não cravar
  const rawE = JSON.stringify({ configurado: true, valorMensal: 1000, diasDoMes: 30 });
  const e = parseState(rawE);
  if (!e) { issues.push('  (e) Sem campo transacoes deveria parsear sem cravar'); }
  else if (!Array.isArray(e.transacoes)) issues.push('  (e) transacoes deveria ser array vazio');

  return issues;
});

// ─── Casos de borda adicionais (filtros de data) ─────────────────────────────

run('A', 'Gasto futuro ignorado nos cálculos', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:100,  descricao:'Hoje',    categoria:'outros', data: noonAgo(0) },
    { id:'t2', tipo:'gasto', valor:9999, descricao:'Futuro',  categoria:'outros', data: noonAgo(-5) }, // 5 dias no futuro
  ],
}), ({ stats, gastosHoje }) => [
  ...checkApprox('totalGastos com futuro ignorado', stats.totalGastos, 100),
  ...checkApprox('gastosHoje', gastosHoje, 100),
]);

run('B', 'Gasto retroativo antes do ciclo ignorado', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 30,
  dataInicio: daysAgo(18),
  transacoes: [
    { id:'t1', tipo:'gasto', valor:100,  descricao:'Dentro',  categoria:'outros', data: noonAgo(18) }, // início exato
    { id:'t2', tipo:'gasto', valor:9999, descricao:'Antes',   categoria:'outros', data: noonAgo(25) }, // antes do início
  ],
}), ({ stats }) => [
  ...checkApprox('totalGastos com pré-ciclo ignorado', stats.totalGastos, 100),
]);

run('C', 'Ciclo encerrado — status correto', () => ({
  configurado: true, valorMensal: 3000, diasDoMes: 10, // ciclo de 10 dias
  dataInicio: daysAgo(15), // 15 dias atrás → diaAtual = 16 > 10 → encerrado
  transacoes: [
    { id:'t1', tipo:'gasto', valor:800, descricao:'Gastos', categoria:'outros', data: noonAgo(14) },
  ],
}), ({ stats, status, ratioMargem }) => [
  ...checkTrue('cicloEncerrado', stats.cicloEncerrado),
  // Ciclo encerrado com saldo positivo (3000−800=2200 restante)
  ...checkTrue('disponivelHoje positivo', stats.disponivelHoje > 0),
  // ratio >= 1.5 → "Com folga" mesmo sendo encerrado
  ...check('pill ciclo encerrado', status.pill, 'Com folga'),
  ...checkTrue('frase encerrado', status.frase.includes('encerrado')),
]);

run('D', 'Ciclo 28 dias — cálculo correto', () => ({
  configurado: true, valorMensal: 2800, diasDoMes: 28,
  dataInicio: daysAgo(13), // dia 14 de 28
  transacoes: [
    { id:'t1', tipo:'gasto', valor:700, data: noonAgo(10) }, // média 50/dia até agora
  ],
}), ({ stats }) => [
  ...checkApprox('diaAtual', stats.diaAtual, 14),
  ...checkApprox('valorDiarioBase', stats.valorDiarioBase, 100),
  ...checkApprox('disponivelHoje', stats.disponivelHoje, 700), // 100×14 − 700
]);

run('E', 'valorMensal muito baixo — sem divisão por zero', () => ({
  configurado: true, valorMensal: 1, diasDoMes: 30,
  dataInicio: daysAgo(5),
  transacoes: [],
}), ({ stats, status }) => {
  const issues = [];
  if (!isFinite(stats.valorDiarioBase)) issues.push('  valorDiarioBase não-finito com valorMensal=1');
  if (!isFinite(stats.disponivelHoje))  issues.push('  disponivelHoje não-finito');
  if (!status.pill)                     issues.push('  pill indefinido');
  return issues;
});

// ─── Saída do relatório ───────────────────────────────────────────────────────

const RESET = '\x1b[0m', GREEN = '\x1b[32m', RED = '\x1b[31m', BOLD = '\x1b[1m', DIM = '\x1b[2m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';

console.log(`\n${BOLD}════════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  Hoje Dá — Test Suite${RESET}`);
console.log(`${DIM}  Data de referência: ${new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}${RESET}`);
console.log(`${BOLD}════════════════════════════════════════════════════════════════${RESET}\n`);

for (const r of results) {
  const icon = r.ok ? `${GREEN}✅${RESET}` : `${RED}❌${RESET}`;
  const label = typeof r.num === 'number' ? `[${String(r.num).padStart(2,' ')}]` : `[${r.num} ]`;
  console.log(`  ${icon} ${label} ${r.name}`);
  if (!r.ok) {
    r.issues.forEach(i => console.log(`${RED}${i}${RESET}`));
  } else {
    // resumo dos valores-chave (apenas cenários numéricos)
    const s = r.ctx.stats;
    const vals = [];
    if (s.diaAtual)        vals.push(`dia ${s.diaAtual}/${s.diaAtual + s.diasRestantes}`);
    if (s.disponivelHoje !== undefined) vals.push(`hero=${fmt(s.disponivelHoje)}`);
    if (r.ctx.status?.pill) vals.push(`pill="${r.ctx.status.pill}"`);
    if (vals.length) console.log(`${DIM}         ${vals.join(' · ')}${RESET}`);
  }
}

console.log(`\n${BOLD}════════════════════════════════════════════════════════════════${RESET}`);
const total = PASS + FAIL;
if (FAIL === 0) {
  console.log(`${GREEN}${BOLD}  ✅ Todos os ${total} testes passaram${RESET}`);
} else {
  console.log(`${GREEN}  ✅ ${PASS} passaram${RESET}   ${RED}❌ ${FAIL} falharam${RESET}   de ${total} total`);
}
console.log(`${BOLD}════════════════════════════════════════════════════════════════${RESET}\n`);

// ─── Tabela de cenários para colar no browser (localStorage) ─────────────────
console.log(`${CYAN}${BOLD}  ─── Comandos para teste manual no browser (console) ───${RESET}`);
console.log(`${DIM}  Abrir DevTools → Console e colar um por vez, depois recarregar.${RESET}\n`);

const BROWSER_CMDS = [
  {
    nome: 'S1 — Ciclo saudável',
    state: { configurado:true, valorMensal:3000, diasDoMes:30,
      dataInicio: daysAgo(18),
      transacoes: [
        { id:'t1', tipo:'gasto', valor:1080, descricao:'Gastos 18 dias', categoria:'alimentacao', data: noonAgo(10) },
        { id:'t2', tipo:'gasto', valor:60,   descricao:'Hoje',           categoria:'alimentacao', data: noonAgo(0)  },
      ] },
  },
  {
    nome: 'S2 — Ciclo apertado',
    state: { configurado:true, valorMensal:3000, diasDoMes:30,
      dataInicio: daysAgo(18),
      transacoes: [{ id:'t1', tipo:'gasto', valor:1880, descricao:'Gastos', categoria:'outros', data: noonAgo(14) }] },
  },
  {
    nome: 'S3 — Ciclo negativo',
    state: { configurado:true, valorMensal:3000, diasDoMes:30,
      dataInicio: daysAgo(18),
      transacoes: [{ id:'t1', tipo:'gasto', valor:2100, descricao:'Gasto alto', categoria:'outros', data: noonAgo(17) }] },
  },
  {
    nome: 'S4 — Com entrada extra',
    state: { configurado:true, valorMensal:3000, diasDoMes:30,
      dataInicio: daysAgo(18),
      transacoes: [
        { id:'t1', tipo:'gasto', valor:1500, descricao:'Gastos', categoria:'alimentacao', data: noonAgo(10) },
        { id:'t2', tipo:'extra', valor:500,  descricao:'Freela', categoria:'freela',      data: noonAgo(5)  },
      ] },
  },
  {
    nome: 'S7 — Primeiro dia',
    state: { configurado:true, valorMensal:3000, diasDoMes:30, dataInicio: daysAgo(0), transacoes:[] },
  },
  {
    nome: 'S8 — Último dia',
    state: { configurado:true, valorMensal:3000, diasDoMes:30,
      dataInicio: daysAgo(29),
      transacoes: [
        { id:'t1', tipo:'gasto', valor:2700, descricao:'Gastos 29 dias', categoria:'outros',      data: noonAgo(15) },
        { id:'t2', tipo:'gasto', valor:100,  descricao:'Hoje',           categoria:'alimentacao', data: noonAgo(0)  },
      ] },
  },
  {
    nome: 'S9 — LocalStorage vazio',
    state: null,
  },
  {
    nome: 'S10 — LocalStorage corrompido',
    raw: '{corrompido:true, "valorMensal":}',
  },
];

for (const cmd of BROWSER_CMDS) {
  console.log(`  ${YELLOW}// ${cmd.nome}${RESET}`);
  if (cmd.state === null) {
    console.log(`  localStorage.removeItem('orcamento_diario_v6'); localStorage.removeItem('onboardingSeen'); location.reload();`);
  } else if (cmd.raw) {
    console.log(`  localStorage.setItem('orcamento_diario_v6', ${JSON.stringify(cmd.raw)}); location.reload();`);
  } else {
    const json = JSON.stringify(cmd.state);
    console.log(`  localStorage.setItem('orcamento_diario_v6', '${json.replace(/'/g, "\\'")}'); location.reload();`);
  }
  console.log('');
}

process.exit(FAIL > 0 ? 1 : 0);
