'use strict';
// Carrega declarações de nível superior de src/main.jsx para que os testes rodem
// o código REAL do app (e não uma cópia).
// Só funciona para declarações sem JSX (funções puras, constantes).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SCRIPT = '\n' + fs.readFileSync(path.join(__dirname, '..', 'src', 'main.jsx'), 'utf8');

const PARES = { '(': ')', '[': ']', '{': '}' };

// A partir de `i`, avança até o fim da expressão no nível 0 (';' ou fim de linha).
function fimDaExpressao(src, i) {
  const pilha = [];
  let str = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (str) {
      if (c === '\\') { i++; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (PARES[c]) pilha.push(PARES[c]);
    else if (c === ')' || c === ']' || c === '}') pilha.pop();
    else if (pilha.length === 0 && c === ';') return i + 1;
    else if (pilha.length === 0 && c === '\n') {
      // Continua se a próxima linha seguir a expressão (ex.: "  ? a" / "  : b" / "  .map(...)")
      const prox = src.slice(i + 1).match(/^\s*(\S)/);
      if (!prox || !'?:.&|+-*/'.includes(prox[1])) return i + 1;
    }
  }
  return i;
}

// Fecha o bloco que começa no primeiro '{' do corpo da função.
function fimDaFuncao(src, inicio) {
  let i = src.indexOf('(', inicio);
  let prof = 0;
  for (; i < src.length; i++) {
    if (src[i] === '(') prof++;
    else if (src[i] === ')' && --prof === 0) break;
  }
  i = src.indexOf('{', i);
  prof = 0;
  let str = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (str) {
      if (c === '\\') { i++; continue; }
      if (c === str) str = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '{') prof++;
    else if (c === '}' && --prof === 0) return i + 1;
  }
  throw new Error('Bloco não fechado');
}

function extrair(nome) {
  const fn = SCRIPT.match(new RegExp(`\\n(?:async )?function ${nome}\\(`));
  if (fn) {
    const ini = fn.index + 1;
    return SCRIPT.slice(ini, fimDaFuncao(SCRIPT, ini));
  }
  const cst = SCRIPT.match(new RegExp(`\\n(?:const|let) ${nome}\\s*=`));
  if (cst) {
    const ini = cst.index + 1;
    return SCRIPT.slice(ini, fimDaExpressao(SCRIPT, ini + cst[0].length - 1));
  }
  return null;
}

function criarLocalStorage(inicial = {}) {
  const dados = { ...inicial };
  return {
    getItem: k => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: k => { delete dados[k]; },
    clear: () => { for (const k of Object.keys(dados)) delete dados[k]; },
    _dados: dados,
  };
}

// Carrega `nomes` num contexto isolado. Nomes ausentes no index.html viram `undefined`
// (o teste correspondente falha com mensagem clara, em vez de quebrar o arquivo todo).
function carregar(nomes, { localStorage = criarLocalStorage(), Date: DateCtx = Date } = {}) {
  const ctx = vm.createContext({ Intl, Date: DateCtx, Math, Number, JSON, isFinite, isNaN, parseFloat, parseInt, localStorage, console });
  const encontrados = [];
  for (const nome of nomes) {
    const codigo = extrair(nome);
    if (!codigo) continue;
    vm.runInContext(codigo.replace(/^(const|let) /, 'var '), ctx);
    encontrados.push(nome);
  }
  const out = {};
  for (const n of nomes) out[n] = encontrados.includes(n) ? vm.runInContext(n, ctx) : undefined;
  out.localStorage = localStorage;
  return out;
}

// Date com "agora" fixo, para testar cálculos que dependem do dia de hoje.
function dateFixa(agoraISO) {
  const fixo = new Date(agoraISO).getTime();
  return class extends Date {
    constructor(...a) { if (a.length) super(...a); else super(fixo); }
    static now() { return fixo; }
  };
}

module.exports = { SCRIPT, extrair, carregar, criarLocalStorage, dateFixa };
