const { query } = require('../db/pool');

const MAX_TENTATIVAS = 5;

const Usuario = {
  async criar({ nome, email, senha_hash, tipo_usuario = 'CLIENTE' }) {
    try {
      const r = await query(
        'INSERT INTO tb_usuario (nome, email, senha_hash, tipo_usuario) VALUES (?, ?, ?, ?)',
        [nome, email, senha_hash, tipo_usuario]
      );
      return this.buscarPorId(r.insertId);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const e = new Error('E-mail já cadastrado.');
        e.status = 409;
        throw e;
      }
      throw err;
    }
  },

  async buscarPorEmail(email) {
    const rows = await query('SELECT * FROM tb_usuario WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async buscarPorId(id) {
    const rows = await query('SELECT * FROM tb_usuario WHERE id_usuario = ?', [id]);
    return rows[0] || null;
  },

  async registrarTentativaFalha(id_usuario) {
    // conta_bloqueada é calculada antes do incremento (avaliação da esquerda p/ direita)
    await query(
      `UPDATE tb_usuario
          SET conta_bloqueada = (tentativas_falhas + 1 >= ?),
              tentativas_falhas = tentativas_falhas + 1
        WHERE id_usuario = ?`,
      [MAX_TENTATIVAS, id_usuario]
    );
    return this.buscarPorId(id_usuario);
  },

  async resetarTentativas(id_usuario) {
    await query('UPDATE tb_usuario SET tentativas_falhas = 0 WHERE id_usuario = ?', [id_usuario]);
  },
};

module.exports = Usuario;
