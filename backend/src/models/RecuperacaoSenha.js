const { query } = require('../db/pool');

const VALIDADE_MINUTOS = 60; // RN#1 da US-16

const RecuperacaoSenha = {
  // Guardamos apenas o HASH do token: se o banco vazar, os links não funcionam.
  async criar(id_usuario, tokenHash) {
    await query(
      'INSERT INTO tb_recuperacao_senha (id_usuario, token, data_expiracao) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [id_usuario, tokenHash, VALIDADE_MINUTOS]
    );
  },
  async buscarValido(tokenHash) {
    const rows = await query(
      'SELECT * FROM tb_recuperacao_senha WHERE token = ? AND utilizado = 0 AND data_expiracao > NOW()',
      [tokenHash]
    );
    return rows[0] || null;
  },
  async marcarUtilizado(id_recuperacao, conn) {
    await query('UPDATE tb_recuperacao_senha SET utilizado = 1 WHERE id_recuperacao = ?', [id_recuperacao], conn);
  },
  VALIDADE_MINUTOS,
};

module.exports = RecuperacaoSenha;
