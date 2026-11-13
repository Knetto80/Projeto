const Carrinho = require('../models/Carrinho');
const { inteiro } = require('../utils/validacao');

const obter = async (req, res) => res.json(await Carrinho.obterDetalhado(req.usuario.id_usuario));

async function adicionar(req, res) {
  const id_produto = inteiro(req.body.id_produto, 'Produto', { min: 1 });
  const quantidade = req.body.quantidade === undefined ? 1 : inteiro(req.body.quantidade, 'Quantidade', { min: 1, max: 1000 });
  res.status(201).json(await Carrinho.adicionarItem(req.usuario.id_usuario, id_produto, quantidade));
}

async function atualizarItem(req, res) {
  const id_produto = inteiro(req.params.idProduto, 'Produto', { min: 1 });
  const quantidade = inteiro(req.body.quantidade, 'Quantidade', { min: 0, max: 1000 });
  res.json(await Carrinho.atualizarQuantidade(req.usuario.id_usuario, id_produto, quantidade));
}

const removerItem = async (req, res) => res.json(await Carrinho.removerItem(req.usuario.id_usuario, inteiro(req.params.idProduto, 'Produto', { min: 1 })));

const esvaziar = async (req, res) => res.json(await Carrinho.esvaziar(req.usuario.id_usuario));

module.exports = { obter, adicionar, atualizarItem, removerItem, esvaziar };
