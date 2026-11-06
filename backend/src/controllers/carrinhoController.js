const Carrinho = require('../models/Carrinho');

const obter = async (req, res) => res.json(await Carrinho.obterDetalhado(req.usuario.id_usuario));

async function adicionar(req, res) {
  const { id_produto, quantidade } = req.body;
  res.status(201).json(await Carrinho.adicionarItem(req.usuario.id_usuario, Number(id_produto), Number(quantidade) || 1));
}

const atualizarItem = async (req, res) =>
  res.json(await Carrinho.atualizarQuantidade(req.usuario.id_usuario, Number(req.params.idProduto), Number(req.body.quantidade)));

const removerItem = async (req, res) => res.json(await Carrinho.removerItem(req.usuario.id_usuario, Number(req.params.idProduto)));

const esvaziar = async (req, res) => res.json(await Carrinho.esvaziar(req.usuario.id_usuario));

module.exports = { obter, adicionar, atualizarItem, removerItem, esvaziar };
