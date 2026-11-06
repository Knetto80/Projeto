const { Categoria, Produto } = require('../models/Produto');
const Avaliacao = require('../models/Avaliacao');

async function listarCategorias(req, res) {
  res.json(await Categoria.listarAtivas());
}

async function listar(req, res) {
  const { categoria, busca } = req.query;
  const produtos = await Produto.listarDisponiveis({ id_categoria: categoria, busca });
  res.json(await Promise.all(produtos.map(async (p) => ({ ...p, avaliacao: await Avaliacao.mediaPorProduto(p.id_produto) }))));
}

async function detalhar(req, res) {
  const produto = await Produto.buscarPorId(Number(req.params.id));
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json({ ...produto, avaliacao: await Avaliacao.mediaPorProduto(produto.id_produto) });
}

// --- Admin (US-14) ---
async function criar(req, res) {
  res.status(201).json(await Produto.criar(req.body));
}

async function listarAdmin(req, res) {
  res.json(await Produto.listarTodosAdmin());
}

async function atualizar(req, res) {
  const produto = await Produto.atualizar(Number(req.params.id), req.body);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json(produto);
}

module.exports = { listarCategorias, listar, detalhar, criar, listarAdmin, atualizar };
