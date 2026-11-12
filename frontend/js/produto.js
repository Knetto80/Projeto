const idProduto = new URLSearchParams(window.location.search).get('id');
let quantidadeSelecionada = 1;
let produtoAtual = null;

function estrelas(media) {
  const cheias = Math.round(media);
  return '★'.repeat(cheias) + '☆'.repeat(5 - cheias);
}

async function carregarProduto() {
  const container = document.getElementById('conteudo');
  try {
    produtoAtual = await api(`/produtos/${idProduto}`, { autenticado: false });
  } catch {
    container.innerHTML = `<div class="vazio"><h3>Cupcake não encontrado</h3><p>Ele pode ter saído do catálogo.</p></div>`;
    return;
  }
  const p = produtoAtual;
  const semEstoque = p.quantidade_estoque === 0;
  const imagem = p.imagens[0]?.url_imagem || '';

  container.innerHTML = `
    <div class="cartao" style="padding:0; overflow:hidden">
      <div style="aspect-ratio:1/1; background:var(--creme-escuro)">
        <img src="${esc(imagem)}" alt="${esc(p.nome)}" style="width:100%;height:100%;object-fit:cover;display:block">
      </div>
    </div>

    <h1>${esc(p.nome)}</h1>
    <div class="estrelas" style="margin-bottom:10px">
      ${p.avaliacao.total > 0
        ? `${estrelas(p.avaliacao.media)} <span style="color:var(--chocolate-suave)">${p.avaliacao.media} (${p.avaliacao.total} avaliações)</span>`
        : `<span style="color:var(--chocolate-suave)">Ainda sem avaliações</span>`}
    </div>
    <div style="font-family:var(--fonte-titulo); font-size:1.4rem; font-weight:700; color:var(--framboesa); margin-bottom:14px">
      ${formatarPreco(p.preco)}
    </div>

    <h3>Descrição</h3>
    <p>${esc(p.descricao)}</p>

    <h3>Ingredientes &amp; alérgenos</h3>
    <p>${esc(p.ingredientes)}</p>
    ${p.alergenos ? `<p style="color:var(--alerta); font-weight:700; font-size:0.85rem">⚠ ${esc(p.alergenos)}</p>` : ''}

    ${semEstoque
      ? `<div class="mensagem-erro">Este cupcake está indisponível no momento.</div>`
      : `
      <div class="cartao" style="display:flex; align-items:center; justify-content:space-between">
        <span style="font-weight:700">Quantidade</span>
        <div style="display:flex; align-items:center; gap:14px">
          <button class="icone-botao" style="background:var(--creme-escuro)" onclick="mudarQuantidade(-1)">−</button>
          <span id="quantidade-atual" style="font-weight:700; min-width:20px; text-align:center">1</span>
          <button class="icone-botao" style="background:var(--creme-escuro)" onclick="mudarQuantidade(1)">+</button>
        </div>
      </div>`}
  `;

  if (!semEstoque) {
    const barra = document.createElement('div');
    barra.className = 'barra-acao';
    barra.innerHTML = `
      <button class="botao botao-primario" id="botao-adicionar">
        Adicionar ao Carrinho — <span id="total-selecionado">${formatarPreco(p.preco)}</span>
      </button>`;
    container.appendChild(barra);
    document.getElementById('botao-adicionar').addEventListener('click', adicionarAoCarrinho);
  }
}

function mudarQuantidade(delta) {
  quantidadeSelecionada = Math.max(1, Math.min(produtoAtual.quantidade_estoque, quantidadeSelecionada + delta));
  document.getElementById('quantidade-atual').textContent = quantidadeSelecionada;
  document.getElementById('total-selecionado').textContent = formatarPreco(produtoAtual.preco * quantidadeSelecionada);
}

async function adicionarAoCarrinho() {
  if (!exigirLogin()) return;
  try {
    await api('/carrinho/itens', { method: 'POST', body: { id_produto: produtoAtual.id_produto, quantidade: quantidadeSelecionada } });
    mostrarToast('Adicionado ao carrinho ✓', 'sucesso');
    atualizarBadgeCarrinho();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

carregarProduto();
