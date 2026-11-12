let categoriaAtiva = '';
let termoBusca = '';
let temporizadorBusca = null;

function renderizarSaudacao() {
  const usuario = Sessao.obterUsuario();
  const el = document.getElementById('saudacao');
  el.textContent = usuario ? `Olá, ${usuario.nome.split(' ')[0]}! Escolha seu doce hoje 🍰` : 'Olá! Escolha seu doce hoje 🍰';
}

async function carregarCategorias() {
  const categorias = await api('/categorias', { autenticado: false });
  const container = document.getElementById('filtros');
  categorias.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.id = cat.id_categoria;
    btn.textContent = cat.nome;
    btn.addEventListener('click', () => selecionarCategoria(cat.id_categoria, btn));
    container.appendChild(btn);
  });
  container.querySelector('.chip[data-id=""]').addEventListener('click', (e) => selecionarCategoria('', e.target));
}

function selecionarCategoria(id, botaoClicado) {
  categoriaAtiva = id;
  document.querySelectorAll('.chip').forEach((c) => c.classList.remove('ativo'));
  botaoClicado.classList.add('ativo');
  carregarProdutos();
}

async function carregarProdutos() {
  const grade = document.getElementById('grade-produtos');
  grade.innerHTML = '<div class="carregando">Carregando cupcakes…</div>';
  const params = new URLSearchParams();
  if (categoriaAtiva) params.set('categoria', categoriaAtiva);
  if (termoBusca) params.set('busca', termoBusca);

  const produtos = await api(`/produtos?${params.toString()}`, { autenticado: false });
  document.getElementById('contagem-produtos').textContent = `${produtos.length} cupcake${produtos.length !== 1 ? 's' : ''}`;

  if (produtos.length === 0) {
    grade.innerHTML = `<div class="vazio" style="grid-column:1/-1"><h3>Nenhum cupcake encontrado</h3><p>Tente outra busca ou categoria.</p></div>`;
    return;
  }

  grade.innerHTML = produtos
    .map((p) => {
      const imagem = p.imagens[0]?.url_imagem || '';
      return `
      <a class="cartao-produto" href="produto.html?id=${p.id_produto}">
        <div class="imagem"><img src="${esc(imagem)}" alt="${esc(p.nome)}" loading="lazy"></div>
        <div class="corpo">
          <div class="nome">${esc(p.nome)}</div>
          <div class="rodape-cartao">
            <span class="preco">${formatarPreco(p.preco)}</span>
            <button class="botao-add" data-id="${p.id_produto}" aria-label="Adicionar ${esc(p.nome)} ao carrinho" onclick="event.preventDefault(); adicionarRapido(${p.id_produto})">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>
      </a>`;
    })
    .join('');
}

async function adicionarRapido(idProduto) {
  if (!exigirLogin()) return;
  try {
    await api('/carrinho/itens', { method: 'POST', body: { id_produto: idProduto, quantidade: 1 } });
    mostrarToast('Adicionado ao carrinho ✓', 'sucesso');
    atualizarBadgeCarrinho();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

document.getElementById('campo-busca').addEventListener('input', (e) => {
  termoBusca = e.target.value.trim();
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(carregarProdutos, 300);
});

renderizarSaudacao();
carregarCategorias();
carregarProdutos();
