const idPedido = new URLSearchParams(window.location.search).get('id');
const ETAPAS = [
  { chave: 'RECEBIDO', rotulo: 'Pedido Recebido' },
  { chave: 'EM_PRODUCAO', rotulo: 'Em Produção' },
  { chave: 'SAIU_PARA_ENTREGA', rotulo: 'Saiu para Entrega' },
  { chave: 'ENTREGUE', rotulo: 'Entregue' },
];
let intervaloAtualizacao = null;

function horaDoHistorico(pedido, statusChave) {
  const registro = pedido.historico.find((h) => h.status_novo === statusChave);
  if (!registro) return null;
  return new Date(registro.data_alteracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function carregarPedido() {
  if (!exigirLogin()) return;
  let pedido;
  try {
    pedido = await api(`/pedidos/${idPedido}`);
  } catch {
    document.getElementById('conteudo').innerHTML = `<div class="vazio"><h3>Pedido não encontrado</h3></div>`;
    return;
  }

  document.getElementById('numero-pedido').textContent = pedido.numero_pedido;
  const indiceAtual = ETAPAS.findIndex((e) => e.chave === pedido.status_pedido);
  const cancelado = pedido.status_pedido === 'CANCELADO';

  const linhaTempo = cancelado
    ? `<div class="mensagem-erro">Este pedido foi cancelado.</div>`
    : `<div class="linha-tempo">
        ${ETAPAS.map((etapa, i) => {
          const concluida = i < indiceAtual || (i === indiceAtual && pedido.status_pedido === 'ENTREGUE');
          const atual = i === indiceAtual && pedido.status_pedido !== 'ENTREGUE';
          const hora = horaDoHistorico(pedido, etapa.chave);
          return `
          <div class="etapa-status ${concluida ? 'concluida' : ''} ${atual ? 'atual' : ''}">
            <div class="marcador">${concluida || atual ? '✓' : ''}</div>
            <div class="texto-etapa">
              <div class="titulo-etapa">${etapa.rotulo}${atual ? ' (Atual)' : ''}</div>
              <div class="hora-etapa">${hora || 'Aguardando'}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;

  document.getElementById('conteudo').innerHTML = `
    <div class="cartao">
      ${linhaTempo}
    </div>

    <h3>Itens do pedido</h3>
    <div class="cartao" style="padding:6px 16px">
      ${pedido.itens
        .map(
          (i, idx) => `
        <div style="display:flex; gap:12px; align-items:center; padding:12px 0; ${idx !== pedido.itens.length - 1 ? 'border-bottom:1px solid var(--linha)' : ''}">
          <img src="${esc(i.produto.imagens[0]?.url_imagem || '')}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;background:var(--creme-escuro)">
          <div style="flex:1">
            <div style="font-weight:700; font-size:0.87rem">${esc(i.produto.nome)} ${i.quantidade > 1 ? `× ${i.quantidade}` : ''}</div>
          </div>
          <div style="font-weight:700; font-size:0.85rem">${formatarPreco(i.subtotal)}</div>
        </div>`
        )
        .join('')}
    </div>

    <div class="cartao">
      <div class="linha-total"><span>Subtotal</span><span>${formatarPreco(pedido.valor_subtotal)}</span></div>
      ${pedido.valor_desconto > 0 ? `<div class="linha-total"><span>Desconto</span><span>−${formatarPreco(pedido.valor_desconto)}</span></div>` : ''}
      <div class="linha-total"><span>Frete</span><span>${pedido.valor_frete === 0 ? 'Grátis' : formatarPreco(pedido.valor_frete)}</span></div>
      <div class="linha-total destaque"><span>Total pago</span><span>${formatarPreco(pedido.valor_total)}</span></div>
    </div>

    <div id="bloco-avaliacao"></div>
  `;

  if (pedido.status_pedido === 'ENTREGUE') {
    renderizarAvaliacao(pedido);
    pararAtualizacaoAutomatica();
  } else if (!cancelado) {
    agendarAtualizacaoAutomatica();
  }
}

function renderizarAvaliacao(pedido) {
  const bloco = document.getElementById('bloco-avaliacao');
  bloco.innerHTML = `<h3 class="espaco-topo">Avaliar pedido</h3>` + pedido.itens
    .map((i) => `
    <div class="cartao" id="avaliacao-produto-${i.produto.id_produto}">
      <p style="font-weight:700; color:var(--chocolate); margin-bottom:8px">${esc(i.produto.nome)}</p>
      <div class="seletor-estrelas" data-produto="${i.produto.id_produto}">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-nota="${n}" onclick="selecionarNota(${i.produto.id_produto}, ${n})">★</button>`).join('')}
      </div>
      <textarea placeholder="Comentário (opcional)" rows="2" style="width:100%; margin-top:10px; border:1.5px solid var(--linha); border-radius:10px; padding:10px" id="comentario-${i.produto.id_produto}"></textarea>
      <button class="botao botao-secundario espaco-topo" onclick="enviarAvaliacao(${pedido.id_pedido}, ${i.produto.id_produto})">Enviar avaliação</button>
    </div>`)
    .join('');
}

const notasSelecionadas = {};
function selecionarNota(idProduto, nota) {
  notasSelecionadas[idProduto] = nota;
  document.querySelectorAll(`.seletor-estrelas[data-produto="${idProduto}"] button`).forEach((b) => {
    b.classList.toggle('selecionada', Number(b.dataset.nota) <= nota);
  });
}

async function enviarAvaliacao(idPedidoAtual, idProduto) {
  const nota = notasSelecionadas[idProduto];
  if (!nota) {
    mostrarToast('Selecione uma nota de 1 a 5 estrelas.', 'erro');
    return;
  }
  const comentario = document.getElementById(`comentario-${idProduto}`).value;
  try {
    await api(`/pedidos/${idPedidoAtual}/avaliacao`, { method: 'POST', body: { id_produto: idProduto, nota, comentario } });
    document.getElementById(`avaliacao-produto-${idProduto}`).innerHTML = `<p style="color:var(--sucesso); font-weight:700">✓ Avaliação enviada. Obrigado!</p>`;
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

function agendarAtualizacaoAutomatica() {
  // Substitui, no protótipo, a atualização via WebSocket prevista no RNF#1
  // (US-11) por um polling leve a cada 5s — ver nota no documento SP2.
  pararAtualizacaoAutomatica();
  intervaloAtualizacao = setInterval(carregarPedido, 5000);
}
function pararAtualizacaoAutomatica() {
  if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
}

if (new URLSearchParams(window.location.search).get('novo') === '1') {
  mostrarToast('Pedido realizado com sucesso! 🎉', 'sucesso');
}

carregarPedido();
