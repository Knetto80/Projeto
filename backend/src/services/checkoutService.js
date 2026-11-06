const Carrinho = require('../models/Carrinho');
const Endereco = require('../models/Endereco');
const Pedido = require('../models/Pedido');
const freteService = require('./freteService');
const cupomService = require('./cupomService');

const VALOR_MINIMO_PEDIDO = 10.0;
const FORMAS_PAGAMENTO_VALIDAS = ['CARTAO_CREDITO', 'PIX', 'DINHEIRO'];

async function finalizarCompra({ id_usuario, id_endereco, codigo_cupom, forma_pagamento }) {
  if (!FORMAS_PAGAMENTO_VALIDAS.includes(forma_pagamento)) {
    const err = new Error('Forma de pagamento inválida.');
    err.status = 422;
    throw err;
  }

  const endereco = await Endereco.buscarPorId(id_endereco);
  if (!endereco || endereco.id_usuario !== id_usuario) {
    const err = new Error('Endereço de entrega inválido.');
    err.status = 422;
    throw err;
  }

  const carrinho = await Carrinho.obterDetalhado(id_usuario);
  if (carrinho.itens.length === 0) {
    const err = new Error('Carrinho vazio não permite checkout.');
    err.status = 422;
    throw err;
  }

  const subtotal = carrinho.total;
  const frete = freteService.calcularFrete({ cep: endereco.cep, subtotal });

  let valor_desconto = 0;
  let id_cupom = null;
  if (codigo_cupom) {
    const resultado = await cupomService.validarECalcular(codigo_cupom, subtotal);
    valor_desconto = resultado.valor_desconto;
    id_cupom = resultado.cupom.id_cupom;
  }

  const valor_total = +(subtotal - valor_desconto + frete.valor_frete).toFixed(2);
  if (valor_total < VALOR_MINIMO_PEDIDO) {
    const err = new Error(`O valor mínimo para checkout é R$ ${VALOR_MINIMO_PEDIDO.toFixed(2).replace('.', ',')}. Adicione mais um doce ao carrinho!`);
    err.status = 422;
    err.code = 'PEDIDO_ABAIXO_DO_MINIMO';
    throw err;
  }

  const pedido = await Pedido.criar({
    id_usuario,
    id_endereco,
    id_cupom,
    itens: carrinho.itens.map((i) => ({
      id_produto: i.id_produto,
      quantidade: i.quantidade,
      preco_unitario: i.produto.preco,
    })),
    valor_subtotal: subtotal,
    valor_desconto,
    valor_frete: frete.valor_frete,
    valor_total,
    forma_pagamento,
  });

  // o carrinho já é esvaziado dentro da transação de Pedido.criar()

  return { pedido, frete };
}

module.exports = { finalizarCompra, VALOR_MINIMO_PEDIDO };
