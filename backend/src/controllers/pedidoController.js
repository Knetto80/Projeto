const checkoutService = require('../services/checkoutService');
const Pedido = require('../models/Pedido');
const Avaliacao = require('../models/Avaliacao');

async function finalizarCompra(req, res) {
  const { id_endereco, codigo_cupom, forma_pagamento } = req.body;
  const resultado = await checkoutService.finalizarCompra({
    id_usuario: req.usuario.id_usuario,
    id_endereco: Number(id_endereco),
    codigo_cupom,
    forma_pagamento,
  });
  res.status(201).json(resultado);
}

const listarMeusPedidos = async (req, res) => res.json(await Pedido.listarPorUsuario(req.usuario.id_usuario));

async function detalhar(req, res) {
  const pedido = await Pedido.buscarDetalhado(Number(req.params.id));
  if (!pedido || (pedido.id_usuario !== req.usuario.id_usuario && req.usuario.tipo_usuario !== 'ADMINISTRADOR')) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' });
  }
  res.json(pedido);
}

async function avaliar(req, res) {
  const pedido = await Pedido.buscarDetalhado(Number(req.params.id));
  if (!pedido || pedido.id_usuario !== req.usuario.id_usuario) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  if (pedido.status_pedido !== 'ENTREGUE') {
    return res.status(422).json({ erro: "Avaliação disponível somente após status 'Entregue' (RN#1)." });
  }
  const { id_produto, nota, comentario } = req.body;
  const avaliacao = await Avaliacao.criar({
    id_pedido: pedido.id_pedido,
    id_usuario: req.usuario.id_usuario,
    id_produto: Number(id_produto),
    nota: Number(nota),
    comentario,
  });
  res.status(201).json(avaliacao);
}

// --- Admin (US-15) ---
const listarTodosAdmin = async (req, res) => res.json(await Pedido.listarTodos({ status: req.query.status, id_usuario: req.query.id_usuario }));

async function alterarStatusAdmin(req, res) {
  const pedido = await Pedido.alterarStatus(Number(req.params.id), req.body.status);
  if (!pedido) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  res.json(pedido);
}

module.exports = { finalizarCompra, listarMeusPedidos, detalhar, avaliar, listarTodosAdmin, alterarStatusAdmin };
