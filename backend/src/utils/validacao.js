/**
 * Validações de entrada compartilhadas. Toda falha vira HTTP 422 com mensagem
 * clara — nunca um erro 500 vindo do banco.
 */
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

function erro(mensagem, codigo) {
  const e = new Error(mensagem);
  e.status = 422;
  if (codigo) e.code = codigo;
  return e;
}

function texto(valor, rotulo, { min = 1, max } = {}) {
  const t = typeof valor === 'string' ? valor.trim() : '';
  if (t.length < min) throw erro(`${rotulo} é obrigatório.`);
  if (max !== undefined && t.length > max) throw erro(`${rotulo} deve ter no máximo ${max} caracteres.`);
  return t;
}

function inteiro(valor, rotulo, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (!Number.isInteger(n) || n < min || n > max) throw erro(`${rotulo}: valor inválido.`);
  return n;
}

function email(valor) {
  const t = texto(valor, 'E-mail', { max: 120 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) throw erro('Informe um e-mail válido.');
  return t;
}

function cep(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  if (d.length !== 8) throw erro('CEP inválido. Use o formato 00000-000.', 'CEP_INVALIDO');
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function uf(valor) {
  const u = String(valor ?? '').trim().toUpperCase();
  if (!UFS.includes(u)) throw erro('UF inválida. Use a sigla do estado (ex.: SP).');
  return u;
}

module.exports = { texto, inteiro, email, cep, uf, erro, UFS };
