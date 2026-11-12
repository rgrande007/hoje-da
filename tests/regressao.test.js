'use strict';
// Testes de regressão dos bugs da auditoria de nov/2026.
// Rodam o código REAL do app (src/main.jsx, via tests/extrair.js).
// Executar: npm test
process.env.TZ = 'America/Sao_Paulo';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SCRIPT, carregar, criarLocalStorage, dateFixa } = require('./extrair');

const NOMES = ['T', 'SK', 'SK_LEGACY', 'fmt', 'fmtDateKey', 'novoId', 'parseValorBR', 'dataLancamentoISO', 'dataEditadaISO',
  'temHoraReal', 'podeIniciarCiclo', 'DIAS_ENTRE_BACKUPS', 'deveLembrarBackup', 'sanitizeState', 'loadState', 'arquivarCiclo', 'calcStats', 'projecaoMargem'];

function app(opts) {
  const a = carregar(NOMES, opts);
  return a;
}

function exige(fn, nome) {
  assert.equal(typeof fn, 'function', `função ${nome} não existe no index.html`);
}

// ─── Bug 1: valor do ciclo digitado com ponto ficava 100× maior ─────────────
test('parseValorBR entende ponto como decimal quando não há vírgula', () => {
  const { parseValorBR } = app();
  exige(parseValorBR, 'parseValorBR');
  assert.equal(parseValorBR('1500.00'), 1500);
  assert.equal(parseValorBR('2500.5'), 2500.5);
  assert.equal(parseValorBR('99.9'), 99.9);
});

test('parseValorBR entende o formato brasileiro com milhar e vírgula', () => {
  const { parseValorBR } = app();
  exige(parseValorBR, 'parseValorBR');
  assert.equal(parseValorBR('1.500'), 1500);
  assert.equal(parseValorBR('1.234.567'), 1234567);
  assert.equal(parseValorBR('1.500,00'), 1500);
  assert.equal(parseValorBR('1500,00'), 1500);
  assert.equal(parseValorBR('12,5'), 12.5);
  assert.equal(parseValorBR('R$ 1.234,56'), 1234.56);
});

test('parseValorBR devolve 0 para texto vazio ou inválido', () => {
  const { parseValorBR } = app();
  exige(parseValorBR, 'parseValorBR');
  assert.equal(parseValorBR(''), 0);
  assert.equal(parseValorBR(','), 0);
  assert.equal(parseValorBR('abc'), 0);
});

test('TelaConfig usa parseValorBR ao digitar e ao sair do campo', () => {
  const corpo = SCRIPT.slice(SCRIPT.indexOf('function TelaConfig('), SCRIPT.indexOf('function SpendingGauge('));
  assert.ok(/function handleBlur\(\)[^}]*parseValorBR\(/.test(corpo), 'handleBlur não usa parseValorBR');
  assert.ok(/function handleChange\(e\)[^}]*parseValorBR\(/.test(corpo), 'handleChange não usa parseValorBR');
});

// ─── Bug 2: todo lançamento era salvo às 12:00 ──────────────────────────────
test('lançamento de hoje guarda o horário real', () => {
  const { dataLancamentoISO } = app();
  exige(dataLancamentoISO, 'dataLancamentoISO');
  const agora = new Date('2026-11-12T08:47:00-03:00');
  assert.equal(dataLancamentoISO('2026-11-12', agora), agora.toISOString());
});

test('lançamento retroativo fica ao meio-dia do dia escolhido', () => {
  const { dataLancamentoISO } = app();
  exige(dataLancamentoISO, 'dataLancamentoISO');
  const agora = new Date('2026-11-12T22:10:00-03:00');
  assert.equal(dataLancamentoISO('2026-11-10', agora), new Date('2026-11-10T12:00:00-03:00').toISOString());
});

test('editar sem trocar a data mantém o horário original', () => {
  const { dataEditadaISO } = app();
  exige(dataEditadaISO, 'dataEditadaISO');
  const original = new Date('2026-11-12T22:10:00-03:00').toISOString(); // em UTC já é dia 13
  const agora = new Date('2026-11-13T09:00:00-03:00');
  assert.equal(dataEditadaISO(original, '2026-11-12', agora), original);
});

test('editar trocando a data move o lançamento para o novo dia', () => {
  const { dataEditadaISO } = app();
  exige(dataEditadaISO, 'dataEditadaISO');
  const original = new Date('2026-11-12T22:10:00-03:00').toISOString();
  const agora = new Date('2026-11-13T09:00:00-03:00');
  assert.equal(dataEditadaISO(original, '2026-11-11', agora), new Date('2026-11-11T12:00:00-03:00').toISOString());
});

test('temHoraReal esconde o "12:00" de lançamentos sem horário', () => {
  const { temHoraReal } = app();
  exige(temHoraReal, 'temHoraReal');
  assert.equal(temHoraReal(new Date('2026-11-10T12:00:00-03:00').toISOString()), false);
  assert.equal(temHoraReal(new Date('2026-11-10T08:47:13-03:00').toISOString()), true);
});

// ─── Bugs 2 e 3: datas "de hoje" tiradas do UTC ─────────────────────────────
// toISOString().split('T')[0] devolve a data em UTC: depois das 21h no Brasil já é "amanhã".
// Isso fazia o lembrete das 21h tocar só em dias alternados e a edição abrir no dia errado.
test('nenhuma data local é tirada de toISOString().split("T")', () => {
  const achados = SCRIPT.split('\n').filter(l => /\.split\('T'\)\[0\]/.test(l)).map(l => l.trim());
  assert.deepEqual(achados, []);
});

// ─── Bug 4: dívida maior que o novo ciclo criava ciclo negativo ─────────────
test('não deixa iniciar ciclo quando a dívida é maior que o valor', () => {
  const { podeIniciarCiclo } = app();
  exige(podeIniciarCiclo, 'podeIniciarCiclo');
  assert.equal(podeIniciarCiclo(500, -800, 30), false);
  assert.equal(podeIniciarCiclo(800, -800, 30), false);
});

test('deixa iniciar ciclo com valor positivo, com ou sem saldo anterior', () => {
  const { podeIniciarCiclo } = app();
  exige(podeIniciarCiclo, 'podeIniciarCiclo');
  assert.equal(podeIniciarCiclo(1000, -800, 30), true);
  assert.equal(podeIniciarCiclo(500, 0, 30), true);
  assert.equal(podeIniciarCiclo(500, 200, 30), true);
  assert.equal(podeIniciarCiclo(0, 300, 30), false);
});

// ─── Proteção de dados ──────────────────────────────────────────────────────
test('sanitizeState corrige um backup malformado', () => {
  const { sanitizeState } = app();
  exige(sanitizeState, 'sanitizeState');
  const s = sanitizeState({
    configurado: true, valorMensal: '-300', diasDoMes: 0, dataInicio: '2026-11-01T03:00:00.000Z',
    transacoes: [
      { id: 'a', tipo: 'gasto', valor: '50', data: '2026-11-02T15:00:00.000Z' },
      { id: 'b', tipo: 'gasto', valor: 0, data: '2026-11-02T15:00:00.000Z' },
      { id: 'c', tipo: 'gasto', valor: 10 },
      { id: 'd', valor: 10, data: '2026-11-02T15:00:00.000Z' },
      null,
    ],
    ciclosAnteriores: 'quebrado',
  });
  assert.deepEqual(s.transacoes.map(t => [t.id, t.valor]), [['a', 50]]);
  assert.equal(s.valorMensal, 0);
  assert.equal(s.diasDoMes, 1);
  assert.ok(Array.isArray(s.ciclosAnteriores));
  assert.equal(s.ciclosAnteriores.length, 0);
});

test('sanitizeState limpa os lançamentos dos ciclos arquivados', () => {
  const { sanitizeState } = app();
  exige(sanitizeState, 'sanitizeState');
  const s = sanitizeState({
    transacoes: [],
    ciclosAnteriores: [{ valorMensal: 100, diasDoMes: 10, transacoes: [{ id: 'x', tipo: 'gasto', valor: '7', data: '2026-10-02T15:00:00.000Z' }, { id: 'y' }] }, null],
  });
  assert.equal(s.ciclosAnteriores.length, 1);
  assert.deepEqual(s.ciclosAnteriores[0].transacoes.map(t => t.valor), [7]);
});

test('sanitizeState dá um id a lançamento sem id (senão excluir um apagaria todos)', () => {
  const { sanitizeState } = app();
  exige(sanitizeState, 'sanitizeState');
  const s = sanitizeState({ transacoes: [
    { tipo: 'gasto', valor: 5, data: '2026-11-02T15:00:00.000Z' },
    { tipo: 'gasto', valor: 6, data: '2026-11-02T15:00:00.000Z' },
  ] });
  const ids = s.transacoes.map(t => t.id);
  assert.ok(ids.every(id => typeof id === 'string' && id.length > 0), 'lançamento ficou sem id');
  assert.notEqual(ids[0], ids[1]);
});

test('sanitizeState transforma descrição que não é texto (quebrava a tela)', () => {
  const { sanitizeState } = app();
  exige(sanitizeState, 'sanitizeState');
  const base = { tipo: 'gasto', valor: 5, data: '2026-11-02T15:00:00.000Z' };
  const s = sanitizeState({ transacoes: [
    { ...base, id: 'a', descricao: { quebrado: true } },
    { ...base, id: 'b', descricao: 123 },
    { ...base, id: 'c', descricao: 'Mercado' },
    { ...base, id: 'd' },
  ] });
  assert.deepEqual(s.transacoes.map(t => t.descricao), ['', '123', 'Mercado', '']);
});

test('sanitizeState recusa o que não é um objeto de estado', () => {
  const { sanitizeState } = app();
  exige(sanitizeState, 'sanitizeState');
  assert.equal(sanitizeState(null), null);
  assert.equal(sanitizeState('texto'), null);
  assert.equal(sanitizeState([1, 2]), null);
});

test('importar backup passa pelo sanitizeState', () => {
  const corpo = SCRIPT.slice(SCRIPT.indexOf('function handleImportFile('), SCRIPT.indexOf('function handleConfirmarImport('));
  assert.ok(/sanitizeState\(/.test(corpo), 'handleImportFile não usa sanitizeState');
});

test('loadState continua limpando os dados salvos', () => {
  const ls = criarLocalStorage({ orcamento_diario_v6: JSON.stringify({ configurado: true, valorMensal: 3000, diasDoMes: 30, dataInicio: '2026-11-01T03:00:00.000Z', transacoes: [{ id: 'a', tipo: 'gasto', valor: '25', data: '2026-11-02T15:00:00.000Z' }, { id: 'z' }] }) });
  const { loadState } = app({ localStorage: ls });
  const s = loadState();
  assert.deepEqual(s.transacoes.map(t => t.valor), [25]);
  assert.equal(s.valorMensal, 3000);
});

test('arquivar ciclo não descarta ciclos antigos', () => {
  const { arquivarCiclo } = app();
  exige(arquivarCiclo, 'arquivarCiclo');
  const doze = Array.from({ length: 12 }, (_, i) => ({ n: i }));
  const r = arquivarCiclo(doze, { n: 12 });
  assert.equal(r.length, 13);
  assert.deepEqual(r[0], { n: 0 });
  assert.deepEqual(r[12], { n: 12 });
});

test('a tela de erro não apaga os dados sem confirmação', () => {
  const corpo = SCRIPT.slice(SCRIPT.indexOf('class ErrorBoundary'), SCRIPT.indexOf('function TabBar('));
  assert.ok(!/onClick=\{\(\) => \{ try \{ localStorage\.clear\(\)/.test(corpo), 'botão apaga tudo direto');
  assert.ok(/confirm\(/.test(corpo), 'sem confirmação antes de apagar');
});

// ─── Lembrete de backup (a cada 7 dias) ─────────────────────────────────────
const DIA = 86400000;
const AGORA = new Date('2026-11-20T10:00:00-03:00');
const haDias = n => new Date(AGORA.getTime() - n * DIA).toISOString();
const tx = dias => ({ id: 'x' + dias, tipo: 'gasto', valor: 10, data: haDias(dias) });

test('lembrete de backup não aparece sem nenhum lançamento', () => {
  const { deveLembrarBackup } = app();
  exige(deveLembrarBackup, 'deveLembrarBackup');
  assert.equal(deveLembrarBackup({ transacoes: [], ciclosAnteriores: [] }, {}, AGORA), false);
});

test('sem backup, lembra 7 dias depois do primeiro lançamento', () => {
  const { deveLembrarBackup } = app();
  exige(deveLembrarBackup, 'deveLembrarBackup');
  assert.equal(deveLembrarBackup({ transacoes: [tx(3), tx(1)] }, {}, AGORA), false);
  assert.equal(deveLembrarBackup({ transacoes: [tx(8), tx(1)] }, {}, AGORA), true);
});

test('com backup, lembra 7 dias depois do último backup', () => {
  const { deveLembrarBackup } = app();
  exige(deveLembrarBackup, 'deveLembrarBackup');
  const estado = { transacoes: [tx(30)] };
  assert.equal(deveLembrarBackup(estado, { ultimo: haDias(2) }, AGORA), false);
  assert.equal(deveLembrarBackup(estado, { ultimo: haDias(7) }, AGORA), true);
});

test('"agora não" adia o lembrete', () => {
  const { deveLembrarBackup } = app();
  exige(deveLembrarBackup, 'deveLembrarBackup');
  const estado = { transacoes: [tx(30)] };
  const amanha = new Date(AGORA.getTime() + DIA).toISOString();
  assert.equal(deveLembrarBackup(estado, { adiadoAte: amanha }, AGORA), false);
  assert.equal(deveLembrarBackup(estado, { adiadoAte: haDias(1) }, AGORA), true);
});

test('lançamentos de ciclos anteriores contam para o lembrete', () => {
  const { deveLembrarBackup } = app();
  exige(deveLembrarBackup, 'deveLembrarBackup');
  const estado = { transacoes: [], ciclosAnteriores: [{ transacoes: [tx(20)] }] };
  assert.equal(deveLembrarBackup(estado, {}, AGORA), true);
});

// ─── Contagem de dias no horário de verão (fora do Brasil) ──────────────────
test('dia do ciclo não atrasa na virada do horário de verão', () => {
  process.env.TZ = 'America/New_York'; // 08/03/2026: o dia tem 23h
  try {
    const DateNY = dateFixa('2026-03-09T10:00:00-04:00');
    const { calcStats } = app({ Date: DateNY });
    const s = calcStats({ valorMensal: 3000, diasDoMes: 30, dataInicio: new Date(2026, 2, 8).toISOString(), transacoes: [] });
    assert.equal(s.diaAtual, 2);
  } finally {
    process.env.TZ = 'America/Sao_Paulo';
  }
});

// ─── Decisões de UX de nov/2026 (brand book: BRAND/) ────────────────────────
const corpoDe = (inicio, fim) => SCRIPT.slice(SCRIPT.indexOf(inicio), SCRIPT.indexOf(fim));
// Linhas de código (ignora comentários), para checar só textos e estilos de verdade
const linhasDeCodigo = () => SCRIPT.split(/\r?\n/).map(l => l.replace(/\{\/\*.*?\*\/\}/g, '').replace(/\/\/.*$/, '')).filter(l => l.trim());

test('rótulos em caixa normal, como no brand book (sem textTransform uppercase)', () => {
  const achados = linhasDeCodigo().filter(l => l.includes("textTransform: 'uppercase'")).length;
  assert.equal(achados, 0, `${achados} rótulo(s) ainda em caixa alta`);
});

test('links e botões sem seta "→" no fim do texto', () => {
  const achados = linhasDeCodigo().filter(l => l.includes('→')).map(l => l.trim().slice(0, 80));
  assert.deepEqual(achados, []);
});

test('painel sem o slogan diário', () => {
  const painel = corpoDe('function TelaPainel(', 'function TelaEntrada(');
  assert.ok(!painel.includes('Clareza. Controle. Liberdade.'), 'slogan ainda aparece no painel');
});

test('"Editar ciclo" fica no menu de opções', () => {
  const app = corpoDe('function App()', 'ReactDOM.createRoot');
  assert.ok(app.includes("label: 'Editar ciclo'"), 'menu sem "Editar ciclo"');
});

test('régua de ritmo saiu do painel e foi para a análise', () => {
  assert.ok(!corpoDe('function TelaPainel(', 'function TelaEntrada(').includes('<SpendingGauge'), 'régua ainda no painel');
  assert.ok(corpoDe('function TelaAnalise(', 'function DialogReiniciar(').includes('<SpendingGauge'), 'régua não está na análise');
});

test('na barra "Uso do dia" a folga é verde e só fica amarela quando está sendo usada', () => {
  const barra = corpoDe('function UsoDoDiaBar(', 'function LembreteBackup(');
  assert.ok(barra.includes('background: emMargem ? T.yellow : T.green'), 'zona de folga sem a regra verde/amarelo');
});

test('projeção da margem daqui a N dias segue o ritmo atual', () => {
  const { projecaoMargem } = app();
  exige(projecaoMargem, 'projecaoMargem');
  const stats = { disponivelHoje: 715.9, valorDiarioBase: 100, mediaGastoPorDia: 62.19 };
  assert.equal(projecaoMargem(stats, 7), 980.57);
  assert.equal(projecaoMargem(stats, 0), 715.9);
  assert.equal(projecaoMargem({ disponivelHoje: -50, valorDiarioBase: 100, mediaGastoPorDia: 130 }, 5), -200);
});
