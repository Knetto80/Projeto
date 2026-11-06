const { query, transaction } = require('../db/pool');

const MAX_ENDERECOS_POR_CLIENTE = 5;

const Endereco = {
  async criar({ id_usuario, cep, logradouro, numero, complemento, bairro, cidade, uf, e_padrao }) {
    const id = await transaction(async (conn) => {
      const [{ total }] = await query('SELECT COUNT(*) AS total FROM tb_endereco WHERE id_usuario = ? FOR UPDATE', [id_usuario], conn);
      if (total >= MAX_ENDERECOS_POR_CLIENTE) {
        const err = new Error('Limite de 5 endereços por cliente atingido (RN#2).');
        err.status = 422;
        throw err;
      }
      const tornarPadrao = Boolean(e_padrao) || total === 0;
      if (tornarPadrao) await query('UPDATE tb_endereco SET e_padrao = 0 WHERE id_usuario = ?', [id_usuario], conn);
      const r = await query(
        `INSERT INTO tb_endereco (id_usuario, cep, logradouro, numero, complemento, bairro, cidade, uf, e_padrao)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_usuario, cep, logradouro, numero, complemento || null, bairro, cidade, uf, tornarPadrao],
        conn
      );
      return r.insertId;
    });
    return this.buscarPorId(id);
  },

  listarPorUsuario(id_usuario) {
    return query('SELECT * FROM tb_endereco WHERE id_usuario = ? ORDER BY e_padrao DESC, id_endereco', [id_usuario]);
  },

  async buscarPorId(id_endereco) {
    const rows = await query('SELECT * FROM tb_endereco WHERE id_endereco = ?', [id_endereco]);
    return rows[0] || null;
  },

  async definirPadrao(id_usuario, id_endereco) {
    const alvo = await this.buscarPorId(id_endereco);
    if (!alvo || alvo.id_usuario !== id_usuario) return null;
    await query('UPDATE tb_endereco SET e_padrao = (id_endereco = ?) WHERE id_usuario = ?', [id_endereco, id_usuario]);
    return this.buscarPorId(id_endereco);
  },
};

module.exports = Endereco;
