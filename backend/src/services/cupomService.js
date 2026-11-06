const Cupom = require('../models/Cupom');

async function validarECalcular(codigo, subtotal) {
  const cupom = await Cupom.buscarPorCodigo(codigo);
  if (!cupom || !cupom.ativo || new Date(cupom.data_validade) < new Date()) {
    const err = new Error('Cupom inválido ou expirado. Verifique o código e tente novamente.');
    err.status = 422;
    err.code = 'CUPOM_INVALIDO';
    throw err;
  }
  if (subtotal < cupom.valor_minimo_pedido) {
    const err = new Error(`Este cupom exige pedido mínimo de R$ ${cupom.valor_minimo_pedido.toFixed(2).replace('.', ',')}.`);
    err.status = 422;
    err.code = 'CUPOM_VALOR_MINIMO';
    throw err;
  }
  let desconto = cupom.tipo_desconto === 'PERCENTUAL' ? subtotal * (cupom.valor_desconto / 100) : cupom.valor_desconto;
  desconto = Math.min(desconto, subtotal); // RN#2 — desconto não pode exceder o total do pedido
  return { cupom, valor_desconto: +desconto.toFixed(2) };
}

module.exports = { validarECalcular };
