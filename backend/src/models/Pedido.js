const { query, transaction } = require('../db/pool');
const { Produto } = require('./Produto');

const FLUXO_STATUS = ['RECEBIDO', 'EM_PRODUCAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'];
const STATUS_FINAIS = ['ENTREGUE', 'CANCELADO'];

function erro422(msg, codigo) {
  const e = new Error(msg);
  e.status = 422;
  if (codigo) e.code = codigo;
  return e;
}

const Pedido = {
  /**
   * Cria o pedido de forma ATÔMICA (transação): trava as linhas de estoque
   * (SELECT ... FOR UPDATE), confere disponibilidade, grava pedido + itens +
   * histórico, baixa o estoque e esvazia o carrinho. Se qualquer passo falhar,
   * nada é gravado (ROLLBACK). Isso impede vender a mesma última unidade
   * para dois clientes ao mesmo tempo.
   */
  async criar({ id_usuario, id_endereco, id_cupom, itens, valor_subtotal, valor_desconto, valor_frete, valor_total, forma_pagamento }) {
    const id_pedido = await transaction(async (conn) => {
      // ordena para evitar deadlock entre transações concorrentes
      const ordenados = [...itens].sort((a, b) => a.id_produto - b.id_produto);
      for (const item of ordenados) {
        const [prod] = await query('SELECT nome, quantidade_estoque FROM tb_produto WHERE id_produto = ? FOR UPDATE', [item.id_produto], conn);
        if (!prod || prod.quantidade_estoque < item.quantidade) {
          throw erro422(
            `Estoque insuficiente para "${prod ? prod.nome : 'produto'}": restam ${prod ? prod.quantidade_estoque : 0} unidades.`,
            'ESTOQUE_INSUFICIENTE'
          );
        }
      }

      // Consome o carrinho DENTRO da transação: se outra requisição (clique duplo) já finalizou
      // esta compra, nenhuma linha é apagada e o pedido duplicado é recusado.
      const consumidos = await query(
        'DELETE FROM tb_item_carrinho WHERE id_carrinho IN (SELECT id_carrinho FROM tb_carrinho WHERE id_usuario = ?)',
        [id_usuario],
        conn
      );
      if (consumidos.affectedRows !== itens.length) {
        throw erro422('Seu carrinho mudou ou este pedido já foi finalizado. Confira o carrinho e tente novamente.', 'CARRINHO_ALTERADO');
      }

      const r = await query(
        `INSERT INTO tb_pedido (id_usuario, id_endereco, id_cupom, numero_pedido, valor_subtotal, valor_desconto, valor_frete, valor_total, forma_pagamento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_usuario, id_endereco, id_cupom || null, `T${require('crypto').randomBytes(9).toString('hex')}`, valor_subtotal, valor_desconto, valor_frete, valor_total, forma_pagamento],
        conn
      );
      const id = r.insertId;
      const numero = `PED-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
      await query('UPDATE tb_pedido SET numero_pedido = ? WHERE id_pedido = ?', [numero, id], conn);

      for (const item of itens) {
        await query(
          'INSERT INTO tb_item_pedido (id_pedido, id_produto, quantidade, preco_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [id, item.id_produto, item.quantidade, item.preco_unitario, +(item.preco_unitario * item.quantidade).toFixed(2)],
          conn
        );
        await query('UPDATE tb_produto SET quantidade_estoque = quantidade_estoque - ? WHERE id_produto = ?', [item.quantidade, item.id_produto], conn);
      }

      await query('INSERT INTO tb_historico_status_pedido (id_pedido, status_anterior, status_novo) VALUES (?, NULL, ?)', [id, 'RECEBIDO'], conn);
      return id;
    });
    return this.buscarDetalhado(id_pedido);
  },

  async buscarDetalhado(id_pedido) {
    const pedido = (await query('SELECT * FROM tb_pedido WHERE id_pedido = ?', [id_pedido]))[0];
    if (!pedido) return null;
    const linhas = await query('SELECT * FROM tb_item_pedido WHERE id_pedido = ? ORDER BY id_item_pedido', [id_pedido]);
    const produtos = await Produto.buscarPorIds(linhas.map((l) => l.id_produto));
    const itens = linhas.map((l) => ({ ...l, produto: produtos.find((p) => p.id_produto === l.id_produto) }));
    const historico = await query('SELECT * FROM tb_historico_status_pedido WHERE id_pedido = ? ORDER BY id_historico', [id_pedido]);
    return { ...pedido, itens, historico };
  },

  /** Visão do pedido para a loja: inclui quem comprou e para onde entregar. */
  async detalharParaAdmin(id_pedido) {
    const pedido = await this.buscarDetalhado(id_pedido);
    const [cliente] = await query('SELECT id_usuario, nome, email FROM tb_usuario WHERE id_usuario = ?', [pedido.id_usuario]);
    const [endereco] = await query('SELECT * FROM tb_endereco WHERE id_endereco = ?', [pedido.id_endereco]);
    return { ...pedido, cliente, endereco };
  },

  async listarPorUsuario(id_usuario) {
    const ids = await query('SELECT id_pedido FROM tb_pedido WHERE id_usuario = ? ORDER BY data_pedido DESC, id_pedido DESC', [id_usuario]);
    return Promise.all(ids.map((r) => this.buscarDetalhado(r.id_pedido)));
  },

  async listarTodos({ status, id_usuario } = {}) {
    const filtros = [];
    const params = [];
    if (status) { filtros.push('status_pedido = ?'); params.push(status); }
    if (id_usuario) { filtros.push('id_usuario = ?'); params.push(Number(id_usuario)); }
    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
    const ids = await query(`SELECT id_pedido FROM tb_pedido ${where} ORDER BY data_pedido DESC, id_pedido DESC`, params);
    return Promise.all(ids.map((r) => this.detalharParaAdmin(r.id_pedido)));
  },

  /**
   * Regras: o fluxo é sequencial (Recebido → Em produção → Saiu para entrega →
   * Entregue); pedidos finalizados não mudam mais; Cancelar devolve o estoque.
   */
  async alterarStatus(id_pedido, novoStatus) {
    if (![...FLUXO_STATUS, 'CANCELADO'].includes(novoStatus)) throw erro422('Status de pedido inválido.');
    const encontrou = await transaction(async (conn) => {
      const pedido = (await query('SELECT * FROM tb_pedido WHERE id_pedido = ? FOR UPDATE', [id_pedido], conn))[0];
      if (!pedido) return false;
      const atual = pedido.status_pedido;
      if (STATUS_FINAIS.includes(atual)) throw erro422('Pedido já finalizado: o status não pode mais ser alterado.');
      const proximoValido = FLUXO_STATUS[FLUXO_STATUS.indexOf(atual) + 1];
      if (novoStatus !== 'CANCELADO' && novoStatus !== proximoValido) {
        throw erro422(`Transição inválida: de "${atual}" só é possível avançar para "${proximoValido}" ou cancelar.`);
      }
      await query('UPDATE tb_pedido SET status_pedido = ? WHERE id_pedido = ?', [novoStatus, id_pedido], conn);
      await query('INSERT INTO tb_historico_status_pedido (id_pedido, status_anterior, status_novo) VALUES (?, ?, ?)', [id_pedido, atual, novoStatus], conn);
      if (novoStatus === 'CANCELADO') {
        await query(
          `UPDATE tb_produto p JOIN tb_item_pedido i ON i.id_produto = p.id_produto
              SET p.quantidade_estoque = p.quantidade_estoque + i.quantidade
            WHERE i.id_pedido = ?`,
          [id_pedido],
          conn
        );
      }
      return true;
    });
    return encontrou ? this.buscarDetalhado(id_pedido) : null;
  },

  FLUXO_STATUS,
};

module.exports = Pedido;
