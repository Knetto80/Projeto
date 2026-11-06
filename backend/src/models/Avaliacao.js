const { query } = require('../db/pool');

function erro(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

const Avaliacao = {
  async criar({ id_pedido, id_usuario, id_produto, nota, comentario }) {
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) throw erro(422, 'A nota deve ser um número inteiro de 1 a 5.');
    const noPedido = await query('SELECT 1 FROM tb_item_pedido WHERE id_pedido = ? AND id_produto = ?', [id_pedido, id_produto]);
    if (noPedido.length === 0) throw erro(422, 'Este produto não faz parte do pedido.');
    try {
      const r = await query(
        'INSERT INTO tb_avaliacao (id_pedido, id_usuario, id_produto, nota, comentario) VALUES (?, ?, ?, ?, ?)',
        [id_pedido, id_usuario, id_produto, nota, comentario || '']
      );
      return (await query('SELECT * FROM tb_avaliacao WHERE id_avaliacao = ?', [r.insertId]))[0];
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw erro(409, 'Este produto já foi avaliado neste pedido.');
      throw err;
    }
  },

  listarPorProduto(id_produto) {
    return query('SELECT * FROM tb_avaliacao WHERE id_produto = ? ORDER BY data_avaliacao DESC', [id_produto]);
  },

  async mediaPorProduto(id_produto) {
    const [r] = await query('SELECT AVG(nota) AS media, COUNT(*) AS total FROM tb_avaliacao WHERE id_produto = ?', [id_produto]);
    return { media: r.total ? +Number(r.media).toFixed(1) : 0, total: r.total };
  },
};

module.exports = Avaliacao;
