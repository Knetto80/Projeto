const { query } = require('../db/pool');
const { Produto } = require('./Produto');

const QTD_MAXIMA_POR_ITEM = 50;

async function obterOuCriar(id_usuario) {
  await query('INSERT IGNORE INTO tb_carrinho (id_usuario) VALUES (?)', [id_usuario]);
  const rows = await query('SELECT * FROM tb_carrinho WHERE id_usuario = ?', [id_usuario]);
  return rows[0];
}

function tocar(carrinho) {
  return query('UPDATE tb_carrinho SET data_atualizacao = CURRENT_TIMESTAMP WHERE id_carrinho = ?', [carrinho.id_carrinho]);
}

function erroEstoque(disponivel) {
  const err = new Error(`Ops! Restam apenas ${disponivel} unidades deste cupcake no estoque.`);
  err.status = 422;
  err.estoqueDisponivel = disponivel;
  return err;
}

const Carrinho = {
  async obterDetalhado(id_usuario) {
    const carrinho = await obterOuCriar(id_usuario);
    const linhas = await query('SELECT * FROM tb_item_carrinho WHERE id_carrinho = ? ORDER BY id_item_carrinho', [carrinho.id_carrinho]);
    const produtos = await Produto.buscarPorIds(linhas.map((l) => l.id_produto));
    const itens = linhas.map((l) => {
      const produto = produtos.find((p) => p.id_produto === l.id_produto);
      return { ...l, produto, subtotal: +(produto.preco * l.quantidade).toFixed(2) };
    });
    const total = +itens.reduce((soma, i) => soma + i.subtotal, 0).toFixed(2);
    return { ...carrinho, itens, total };
  },

  async adicionarItem(id_usuario, id_produto, quantidade = 1) {
    const produto = await Produto.buscarPorId(id_produto);
    if (!produto || !produto.ativo) {
      const err = new Error('Produto não encontrado ou indisponível.');
      err.status = 404;
      throw err;
    }
    if (!(quantidade >= 1)) {
      const err = new Error('Quantidade inválida.');
      err.status = 422;
      throw err;
    }
    const carrinho = await obterOuCriar(id_usuario);
    const existente = (await query('SELECT * FROM tb_item_carrinho WHERE id_carrinho = ? AND id_produto = ?', [carrinho.id_carrinho, id_produto]))[0];
    const novaQtd = Math.min((existente ? existente.quantidade : 0) + quantidade, QTD_MAXIMA_POR_ITEM);
    if (novaQtd > produto.quantidade_estoque) throw erroEstoque(produto.quantidade_estoque);

    if (existente) {
      await query('UPDATE tb_item_carrinho SET quantidade = ? WHERE id_item_carrinho = ?', [novaQtd, existente.id_item_carrinho]);
    } else {
      await query('INSERT INTO tb_item_carrinho (id_carrinho, id_produto, quantidade) VALUES (?, ?, ?)', [carrinho.id_carrinho, id_produto, novaQtd]);
    }
    await tocar(carrinho);
    return this.obterDetalhado(id_usuario);
  },

  async atualizarQuantidade(id_usuario, id_produto, quantidade) {
    const carrinho = await obterOuCriar(id_usuario);
    const item = (await query('SELECT * FROM tb_item_carrinho WHERE id_carrinho = ? AND id_produto = ?', [carrinho.id_carrinho, id_produto]))[0];
    if (!item) {
      const err = new Error('Item não está no carrinho.');
      err.status = 404;
      throw err;
    }
    if (quantidade < 1) return this.removerItem(id_usuario, id_produto);
    const produto = await Produto.buscarPorId(id_produto);
    const novaQtd = Math.min(quantidade, QTD_MAXIMA_POR_ITEM);
    if (novaQtd > produto.quantidade_estoque) throw erroEstoque(produto.quantidade_estoque);
    await query('UPDATE tb_item_carrinho SET quantidade = ? WHERE id_item_carrinho = ?', [novaQtd, item.id_item_carrinho]);
    await tocar(carrinho);
    return this.obterDetalhado(id_usuario);
  },

  async removerItem(id_usuario, id_produto) {
    const carrinho = await obterOuCriar(id_usuario);
    await query('DELETE FROM tb_item_carrinho WHERE id_carrinho = ? AND id_produto = ?', [carrinho.id_carrinho, id_produto]);
    await tocar(carrinho);
    return this.obterDetalhado(id_usuario);
  },

  async esvaziar(id_usuario) {
    const carrinho = await obterOuCriar(id_usuario);
    await query('DELETE FROM tb_item_carrinho WHERE id_carrinho = ?', [carrinho.id_carrinho]);
    await tocar(carrinho);
    return this.obterDetalhado(id_usuario);
  },
};

module.exports = Carrinho;
