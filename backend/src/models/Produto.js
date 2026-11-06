const { query, transaction } = require('../db/pool');

function erro422(msg) {
  const e = new Error(msg);
  e.status = 422;
  return e;
}

async function anexarImagens(produtos) {
  if (produtos.length === 0) return [];
  const imagens = await query(
    'SELECT * FROM tb_produto_imagem WHERE id_produto IN (?) ORDER BY e_principal DESC, id_imagem',
    [produtos.map((p) => p.id_produto)]
  );
  return produtos.map((p) => ({ ...p, imagens: imagens.filter((i) => i.id_produto === p.id_produto) }));
}

const Categoria = {
  async criar({ nome, descricao }) {
    const r = await query('INSERT INTO tb_categoria (nome, descricao) VALUES (?, ?)', [nome, descricao || null]);
    return this.buscarPorId(r.insertId);
  },
  listarAtivas() {
    return query('SELECT * FROM tb_categoria WHERE ativa = 1 ORDER BY id_categoria');
  },
  async buscarPorId(id) {
    const rows = await query('SELECT * FROM tb_categoria WHERE id_categoria = ?', [id]);
    return rows[0] || null;
  },
};

const CAMPOS_EDITAVEIS = ['id_categoria', 'nome', 'descricao', 'ingredientes', 'alergenos', 'preco', 'quantidade_estoque', 'ativo'];

const Produto = {
  async criar({ id_categoria, nome, descricao, ingredientes, alergenos, preco, quantidade_estoque, imagens = [] }) {
    if (!(Number(preco) > 0)) throw erro422('Preço deve ser maior que R$ 0,00 (RN#2).');
    if (imagens.length === 0) throw erro422('Pelo menos uma imagem é obrigatória (RN#3).');
    if (!nome || !descricao || !ingredientes) throw erro422('Nome, descrição e ingredientes são obrigatórios.');
    try {
      const id = await transaction(async (conn) => {
        const r = await query(
          `INSERT INTO tb_produto (id_categoria, nome, descricao, ingredientes, alergenos, preco, quantidade_estoque)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id_categoria, nome, descricao, ingredientes, alergenos || '', preco, quantidade_estoque || 0],
          conn
        );
        for (let i = 0; i < imagens.length; i++) {
          await query('INSERT INTO tb_produto_imagem (id_produto, url_imagem, e_principal) VALUES (?, ?, ?)', [r.insertId, imagens[i], i === 0], conn);
        }
        return r.insertId;
      });
      return this.buscarPorId(id);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') throw erro422('Nome do produto já existe (RN#1).');
      if (err.code === 'ER_NO_REFERENCED_ROW_2') throw erro422('Categoria inexistente.');
      throw err;
    }
  },

  async listarDisponiveis({ id_categoria, busca } = {}) {
    const filtros = ['ativo = 1', 'quantidade_estoque > 0'];
    const params = [];
    if (id_categoria) { filtros.push('id_categoria = ?'); params.push(Number(id_categoria)); }
    if (busca) { filtros.push('nome LIKE ?'); params.push(`%${busca}%`); }
    const rows = await query(`SELECT * FROM tb_produto WHERE ${filtros.join(' AND ')} ORDER BY id_produto`, params);
    return anexarImagens(rows);
  },

  async buscarPorId(id_produto) {
    const rows = await query('SELECT * FROM tb_produto WHERE id_produto = ?', [id_produto]);
    if (!rows[0]) return null;
    return (await anexarImagens(rows))[0];
  },

  async buscarPorIds(ids) {
    if (ids.length === 0) return [];
    return anexarImagens(await query('SELECT * FROM tb_produto WHERE id_produto IN (?)', [ids]));
  },

  async listarTodosAdmin() {
    return anexarImagens(await query('SELECT * FROM tb_produto ORDER BY id_produto'));
  },

  async atualizar(id_produto, dados) {
    const campos = Object.keys(dados).filter((c) => CAMPOS_EDITAVEIS.includes(c));
    if (dados.preco !== undefined && !(Number(dados.preco) > 0)) throw erro422('Preço deve ser maior que R$ 0,00 (RN#2).');
    if (dados.quantidade_estoque !== undefined && Number(dados.quantidade_estoque) < 0) throw erro422('Estoque não pode ficar negativo.');
    if (campos.length > 0) {
      const sets = campos.map((c) => `${c} = ?`).join(', ');
      await query(`UPDATE tb_produto SET ${sets} WHERE id_produto = ?`, [...campos.map((c) => dados[c]), id_produto]);
    }
    return this.buscarPorId(id_produto);
  },
};

module.exports = { Categoria, Produto };
