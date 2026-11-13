const freteService = require('../services/freteService');
const cupomService = require('../services/cupomService');
const Carrinho = require('../models/Carrinho');
const v = require('../utils/validacao');

async function calcular(req, res) {
  const carrinho = await Carrinho.obterDetalhado(req.usuario.id_usuario);
  res.json(freteService.calcularFrete({ cep: v.cep(req.query.cep), subtotal: carrinho.total }));
}

async function validarCupom(req, res) {
  const carrinho = await Carrinho.obterDetalhado(req.usuario.id_usuario);
  res.json(await cupomService.validarECalcular(req.params.codigo, carrinho.total));
}

module.exports = { calcular, validarCupom };
