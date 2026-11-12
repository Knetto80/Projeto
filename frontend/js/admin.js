let abaAtual = 'produtos';

function verificarAcessoAdmin() {
  const logado = Sessao.estaLogado() && Sessao.ehAdmin();
  document.getElementById('login-admin').style.display = logado ? 'none' : 'block';
  document.getElementById('painel').style.display = logado ? 'block' : 'none';
  return logado;
}

document.getElementById('form-login-admin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erroBox = document.getElementById('erro-admin');
  erroBox.innerHTML = '';
  try {
    const sessao = await api('/auth/login', {
      method: 'POST',
      autenticado: false,
      body: { email: document.getElementById('admin-email').value.trim(), senha: document.getElementById('admin-senha').value },
    });
    if (sessao.usuario.tipo_usuario !== 'ADMINISTRADOR') {
      erroBox.innerHTML = `<div class="mensagem-erro">Esta conta não possui acesso administrativo (RN#1).</div>`;
      return;
    }
    Sessao.salvar(sessao);
    verificarAcessoAdmin();
    mudarAbaAdmin('produtos');
  } catch (err) {
    erroBox.innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
});

function sairAdmin() {
  Sessao.limpar();
  verificarAcessoAdmin();
}

function mudarAbaAdmin(aba) {
  abaAtual = aba;
  document.getElementById('aba-produtos').classList.toggle('ativo', aba === 'produtos');
  document.getElementById('aba-pedidos').classList.toggle('ativo', aba === 'pedidos');
  aba === 'produtos' ? carregarProdutosAdmin() : carregarPedidosAdmin();
}

// --- Produtos (US-14) --------------------------------------------------------
async function carregarProdutosAdmin() {
  const container = document.getElementById('conteudo-admin');
  container.innerHTML = `<div class="carregando">Carregando produtos…</div>`;
  const produtos = await api('/admin/produtos');

  container.innerHTML = `
    <button class="botao botao-primario" style="margin-bottom:16px" onclick="mostrarFormNovoProduto()">+ Cadastrar novo cupcake</button>
    <div id="form-novo-produto"></div>
    ${produtos
      .map(
        (p) => `
      <div class="cartao">
        <div style="display:flex; gap:12px">
          <img src="${esc(p.imagens[0]?.url_imagem || '')}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;background:var(--creme-escuro)">
          <div style="flex:1">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
              <strong style="font-size:0.92rem">${esc(p.nome)}</strong>
              <span class="etiqueta-status ${p.ativo && p.quantidade_estoque > 0 ? 'entregue' : 'cancelado'}">${p.ativo ? (p.quantidade_estoque > 0 ? 'Disponível' : 'Sem estoque') : 'Inativo'}</span>
            </div>
            <p style="font-size:0.82rem; margin:4px 0">${formatarPreco(p.preco)} · Estoque: ${p.quantidade_estoque} un.</p>
            <div style="display:flex; gap:8px; align-items:center">
              <input type="number" min="0" value="${p.quantidade_estoque}" id="estoque-${p.id_produto}" style="width:70px; border:1.5px solid var(--linha); border-radius:8px; padding:6px 8px; font-size:0.85rem">
              <button class="botao-texto" style="padding:6px" onclick="atualizarEstoque(${p.id_produto})">Atualizar estoque</button>
            </div>
          </div>
        </div>
      </div>`
      )
      .join('')}
  `;
}

async function atualizarEstoque(idProduto) {
  const valor = Number(document.getElementById(`estoque-${idProduto}`).value);
  try {
    await api(`/admin/produtos/${idProduto}`, { method: 'PUT', body: { quantidade_estoque: valor } });
    mostrarToast('Estoque atualizado ✓', 'sucesso');
    carregarProdutosAdmin();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

function mostrarFormNovoProduto() {
  document.getElementById('form-novo-produto').innerHTML = `
    <div class="cartao">
      <h3>Novo cupcake</h3>
      <div id="erro-novo-produto"></div>
      <div class="campo"><label for="np-nome">Nome</label><input id="np-nome"></div>
      <div class="campo"><label for="np-categoria">Categoria</label><select id="np-categoria"></select></div>
      <div class="campo"><label for="np-descricao">Descrição</label><textarea id="np-descricao" rows="2"></textarea></div>
      <div class="campo"><label for="np-ingredientes">Ingredientes</label><textarea id="np-ingredientes" rows="2"></textarea></div>
      <div class="campo"><label for="np-alergenos">Alérgenos</label><input id="np-alergenos"></div>
      <div class="campo-linha">
        <div class="campo"><label for="np-preco">Preço (R$)</label><input type="number" step="0.01" min="0.01" id="np-preco"></div>
        <div class="campo"><label for="np-estoque">Estoque inicial</label><input type="number" min="0" id="np-estoque"></div>
      </div>
      <button class="botao botao-primario" onclick="salvarNovoProduto()">Salvar cupcake</button>
    </div>
  `;
  api('/categorias', { autenticado: false }).then((categorias) => {
    document.getElementById('np-categoria').innerHTML = categorias.map((c) => `<option value="${c.id_categoria}">${esc(c.nome)}</option>`).join('');
  });
}

async function salvarNovoProduto() {
  const erroBox = document.getElementById('erro-novo-produto');
  erroBox.innerHTML = '';
  try {
    await api('/admin/produtos', {
      method: 'POST',
      body: {
        id_categoria: Number(document.getElementById('np-categoria').value),
        nome: document.getElementById('np-nome').value.trim(),
        descricao: document.getElementById('np-descricao').value.trim(),
        ingredientes: document.getElementById('np-ingredientes').value.trim(),
        alergenos: document.getElementById('np-alergenos').value.trim(),
        preco: Number(document.getElementById('np-preco').value),
        quantidade_estoque: Number(document.getElementById('np-estoque').value) || 0,
        imagens: ['/img/baunilha-classica.svg'],
      },
    });
    mostrarToast('Cupcake cadastrado ✓', 'sucesso');
    carregarProdutosAdmin();
  } catch (err) {
    erroBox.innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
}

// --- Pedidos (US-15) ---------------------------------------------------------
const STATUS_SEQUENCIA = ['RECEBIDO', 'EM_PRODUCAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE'];
const RÓTULOS = { RECEBIDO: 'Recebido', EM_PRODUCAO: 'Em produção', SAIU_PARA_ENTREGA: 'Saiu para entrega', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' };

async function carregarPedidosAdmin() {
  const container = document.getElementById('conteudo-admin');
  container.innerHTML = `<div class="carregando">Carregando pedidos…</div>`;
  const pedidos = await api('/admin/pedidos');

  if (pedidos.length === 0) {
    container.innerHTML = `<div class="vazio"><h3>Nenhum pedido ainda</h3></div>`;
    return;
  }

  container.innerHTML = pedidos
    .map((p) => {
      const proximo = STATUS_SEQUENCIA[STATUS_SEQUENCIA.indexOf(p.status_pedido) + 1];
      return `
      <div class="cartao">
        <div class="cabecalho-pedido">
          <span class="numero">${esc(p.numero_pedido)}</span>
          <span class="etiqueta-status ${p.status_pedido === 'ENTREGUE' ? 'entregue' : p.status_pedido === 'CANCELADO' ? 'cancelado' : ''}">${RÓTULOS[p.status_pedido]}</span>
        </div>
        <p style="font-size:0.82rem">${new Date(p.data_pedido).toLocaleString('pt-BR')} · ${formatarPreco(p.valor_total)}</p>
        <div style="display:flex; gap:8px; margin-top:10px">
          ${proximo ? `<button class="botao botao-secundario" style="width:auto; padding:9px 14px; font-size:0.82rem" onclick="mudarStatusPedido(${p.id_pedido}, '${proximo}')">Avançar → ${RÓTULOS[proximo]}</button>` : ''}
          ${p.status_pedido !== 'ENTREGUE' && p.status_pedido !== 'CANCELADO' ? `<button class="botao-texto" style="color:var(--alerta)" onclick="mudarStatusPedido(${p.id_pedido}, 'CANCELADO')">Cancelar</button>` : ''}
        </div>
      </div>`;
    })
    .join('');
}

async function mudarStatusPedido(idPedido, novoStatus) {
  try {
    await api(`/admin/pedidos/${idPedido}/status`, { method: 'PUT', body: { status: novoStatus } });
    mostrarToast('Status do pedido atualizado ✓', 'sucesso');
    carregarPedidosAdmin();
  } catch (err) {
    mostrarToast(err.message, 'erro');
  }
}

if (verificarAcessoAdmin()) mudarAbaAdmin('produtos');
