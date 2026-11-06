const { query } = require('../db/pool');

const Cupom = {
  async criar({ codigo, tipo_desconto, valor_desconto, valor_minimo_pedido = 0, data_validade }) {
    const r = await query(
      'INSERT INTO tb_cupom (codigo, tipo_desconto, valor_desconto, valor_minimo_pedido, data_validade) VALUES (?, ?, ?, ?, ?)',
      [codigo.toUpperCase(), tipo_desconto, valor_desconto, valor_minimo_pedido, new Date(data_validade)]
    );
    const rows = await query('SELECT * FROM tb_cupom WHERE id_cupom = ?', [r.insertId]);
    return rows[0];
  },
  async buscarPorCodigo(codigo) {
    const rows = await query('SELECT * FROM tb_cupom WHERE codigo = ?', [String(codigo).toUpperCase()]);
    return rows[0] || null;
  },
  listarTodos() {
    return query('SELECT * FROM tb_cupom ORDER BY id_cupom');
  },
};

module.exports = Cupom;
