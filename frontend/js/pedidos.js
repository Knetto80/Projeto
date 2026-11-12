const RÓTULOS_STATUS = {
  RECEBIDO: 'Recebido',
  EM_PRODUCAO: 'Em produção',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

function classeStatus(status) {
  if (status === 'ENTREGUE') return 'entregue';
  if (status === 'CANCELADO') return 'cancelado';
  return '';
}

async function carregarPedidos() {
  if (!exigirLogin()) return;
  const pedidos = await api('/pedidos');
  const container = document.getElementById('conteudo');

  if (pedidos.length === 0) {
    container.innerHTML = `
      <div class="vazio">
        <h3>Você ainda não fez nenhum pedido</h3>
        <p>Seus pedidos aparecerão aqui assim que você finalizar uma compra.</p>
        <a class="botao botao-primario" style="margin-top:14px; display:inline-flex" href="index.html">Ver catálogo</a>
      </div>`;
    return;
  }

  container.innerHTML = pedidos
    .map(
      (p) => `
    <a class="cartao cartao-pedido" href="pedido.html?id=${p.id_pedido}">
      <div class="cabecalho-pedido">
        <span class="numero">${esc(p.numero_pedido)}</span>
        <span class="etiqueta-status ${classeStatus(p.status_pedido)}">${RÓTULOS_STATUS[p.status_pedido]}</span>
      </div>
      <p style="font-size:0.82rem; margin-bottom:8px">
        ${new Date(p.data_pedido).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        · ${p.itens.length} ${p.itens.length === 1 ? 'item' : 'itens'}
      </p>
      <div style="display:flex; justify-content:space-between; align-items:center">
        <strong>${formatarPreco(p.valor_total)}</strong>
        <button class="botao-texto" style="padding:4px" onclick="event.preventDefault(); repetirPedido(${p.id_pedido})">↻ Repetir pedido</button>
      </div>
    </a>`
    )
    .join('');
}

async function repetirPedido(idPedido) {
  const pedido = await api(`/pedidos/${idPedido}`);
  let adicionados = 0;
  for (const item of pedido.itens) {
    try {
      await api('/carrinho/itens', { method: 'POST', body: { id_produto: item.id_produto, quantidade: item.quantidade } });
      adicionados++;
    } catch {
      /* produto pode estar indisponível hoje — segue para os demais */
    }
  }
  if (adicionados === 0) {
    mostrarToast('Nenhum item deste pedido está disponível no momento.', 'erro');
  } else {
    mostrarToast(`${adicionados} item(ns) adicionados ao carrinho ✓`, 'sucesso');
    atualizarBadgeCarrinho();
  }
}

carregarPedidos();
