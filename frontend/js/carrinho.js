let carrinhoAtual = null;
let enderecosDisponiveis = [];
let enderecoSelecionado = null;
let cupomAplicado = null;
let freteCalculado = null;
let formaPagamento = 'PIX';
let mostrandoNovoEndereco = false;

async function iniciar() {
  if (!exigirLogin()) return;
  await Promise.all([carregarCarrinho(), carregarEnderecos()]);
  renderizar();
}

async function carregarCarrinho() {
  carrinhoAtual = await api('/carrinho');
}

async function carregarEnderecos() {
  enderecosDisponiveis = await api('/enderecos');
  const padrao = enderecosDisponiveis.find((e) => e.e_padrao) || enderecosDisponiveis[0];
  enderecoSelecionado = padrao || null;
}

async function recalcularFrete() {
  freteCalculado = null;
  if (!enderecoSelecionado) return;
  try {
    const params = new URLSearchParams({ cep: enderecoSelecionado.cep });
    freteCalculado = await api(`/frete?${params.toString()}`);
  } catch (err) {
    freteCalculado = { erro: err.message };
  }
}

function calcularTotais() {
  const subtotal = carrinhoAtual.total;
  const valorFrete = freteCalculado && !freteCalculado.erro ? freteCalculado.valor_frete : 0;
  const desconto = cupomAplicado ? cupomAplicado.valor_desconto : 0;
  const total = +(subtotal - desconto + valorFrete).toFixed(2);
  return { subtotal, valorFrete, desconto, total };
}

async function renderizar() {
  const container = document.getElementById('conteudo');
  document.getElementById('titulo-carrinho').textContent = `Meu Carrinho (${carrinhoAtual.itens.length} ${carrinhoAtual.itens.length === 1 ? 'item' : 'itens'})`;

  if (carrinhoAtual.itens.length === 0) {
    container.innerHTML = `
      <div class="vazio">
        <h3>Seu carrinho está vazio</h3>
        <p>Que tal experimentar um cupcake gourmet agora?</p>
        <a class="botao botao-primario" style="margin-top:14px; display:inline-flex" href="index.html">Ver catálogo</a>
      </div>`;
    return;
  }

  await recalcularFrete();
  const { subtotal, valorFrete, desconto, total } = calcularTotais();

  container.innerHTML = `
    <div class="cartao" style="padding:6px 16px">
      ${carrinhoAtual.itens
        .map(
          (i) => `
        <div style="display:flex; gap:12px; align-items:center; padding:12px 0; ${i !== carrinhoAtual.itens[carrinhoAtual.itens.length - 1] ? 'border-bottom:1px solid var(--linha)' : ''}">
          <img src="${esc(i.produto.imagens[0]?.url_imagem || '')}" alt="${esc(i.produto.nome)}" style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:var(--creme-escuro)">
          <div style="flex:1">
            <div style="font-weight:700; font-size:0.88rem">${esc(i.produto.nome)}</div>
            <div style="color:var(--framboesa); font-weight:700; font-size:0.85rem">${formatarPreco(i.subtotal)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px">
            <button class="icone-botao" style="background:var(--creme-escuro)" onclick="alterarQuantidade(${i.id_produto}, ${i.quantidade - 1})">−</button>
            <span style="min-width:16px; text-align:center; font-weight:700; font-size:0.85rem">${i.quantidade}</span>
            <button class="icone-botao" style="background:var(--creme-escuro)" onclick="alterarQuantidade(${i.id_produto}, ${i.quantidade + 1})">+</button>
          </div>
        </div>`
        )
        .join('')}
    </div>

    <h3 class="espaco-topo">📍 Endereço de entrega</h3>
    <div class="cartao" id="bloco-endereco"></div>

    <h3>🏷️ Cupom de desconto</h3>
    <div class="cartao">
      <div style="display:flex; gap:8px">
        <input id="campo-cupom" placeholder="Ex: CUPCAKE10" style="flex:1; min-width:0; min-height:46px; border:1.5px solid var(--linha); border-radius:10px; padding:12px 14px; text-transform:uppercase" value="${cupomAplicado ? cupomAplicado.cupom.codigo : ''}" ${cupomAplicado ? 'disabled' : ''}>
        ${cupomAplicado
          ? `<button class="botao botao-secundario" style="width:auto; min-height:46px; padding:12px 16px" onclick="removerCupom()">Remover</button>`
          : `<button class="botao botao-primario" style="width:auto; min-height:46px; padding:12px 16px" onclick="aplicarCupom()">Aplicar</button>`}
      </div>
      ${cupomAplicado ? `<p style="color:var(--sucesso); font-weight:700; margin-top:8px; font-size:0.85rem">✓ Desconto aplicado: −${formatarPreco(cupomAplicado.valor_desconto)}</p>` : ''}
      <div id="erro-cupom"></div>
    </div>

    <h3>💳 Forma de pagamento</h3>
    <div class="cartao" style="display:flex; flex-direction:column; gap:10px">
      ${['PIX', 'CARTAO_CREDITO', 'DINHEIRO']
        .map(
          (fp) => `
        <label style="display:flex; align-items:center; gap:10px; font-size:0.92rem; font-weight:600">
          <input type="radio" name="pagamento" value="${fp}" ${formaPagamento === fp ? 'checked' : ''} onchange="formaPagamento='${fp}'">
          ${fp === 'PIX' ? 'PIX' : fp === 'CARTAO_CREDITO' ? 'Cartão de crédito' : 'Dinheiro na entrega'}
        </label>`
        )
        .join('')}
    </div>

    <div class="cartao espaco-topo">
      <div class="linha-total"><span>Subtotal</span><span>${formatarPreco(subtotal)}</span></div>
      ${desconto > 0 ? `<div class="linha-total"><span>Desconto</span><span>−${formatarPreco(desconto)}</span></div>` : ''}
      <div class="linha-total"><span>Frete</span><span>${freteCalculado?.erro ? '—' : freteCalculado?.frete_gratis ? 'Grátis' : formatarPreco(valorFrete)}</span></div>
      <div class="linha-total destaque"><span>Total a pagar</span><span>${formatarPreco(total)}</span></div>
    </div>
    ${freteCalculado?.erro ? `<div class="mensagem-erro">${esc(freteCalculado.erro)}</div>` : ''}

    <div id="erro-checkout"></div>
  `;

  const barra = document.createElement('div');
  barra.className = 'barra-acao';
  barra.innerHTML = `<button class="botao botao-primario" id="botao-finalizar" ${!enderecoSelecionado || freteCalculado?.erro ? 'disabled' : ''}>Finalizar e Pagar — ${formatarPreco(total)}</button>`;
  container.appendChild(barra);
  document.getElementById('botao-finalizar').addEventListener('click', finalizarCompra);

  renderizarBlocoEndereco();
}

function renderizarBlocoEndereco() {
  const bloco = document.getElementById('bloco-endereco');
  if (mostrandoNovoEndereco) {
    bloco.innerHTML = `
      <div class="campo"><label for="novo-cep">CEP</label><input id="novo-cep" placeholder="00000-000"></div>
      <div class="campo"><label for="novo-logradouro">Logradouro</label><input id="novo-logradouro" placeholder="Rua das Flores"></div>
      <div class="campo-linha">
        <div class="campo"><label for="novo-numero">Número</label><input id="novo-numero" placeholder="123"></div>
        <div class="campo"><label for="novo-bairro">Bairro</label><input id="novo-bairro" placeholder="Centro"></div>
      </div>
      <div class="campo-linha">
        <div class="campo"><label for="novo-cidade">Cidade</label><input id="novo-cidade" placeholder="São Paulo"></div>
        <div class="campo" style="max-width:70px"><label for="novo-uf">UF</label><input id="novo-uf" maxlength="2" placeholder="SP"></div>
      </div>
      <div id="erro-endereco"></div>
      <div style="display:flex; gap:8px">
        <button class="botao botao-secundario" onclick="mostrandoNovoEndereco=false; renderizarBlocoEndereco()">Cancelar</button>
        <button class="botao botao-primario" onclick="salvarNovoEndereco()">Salvar endereço</button>
      </div>
    `;
    return;
  }

  if (!enderecoSelecionado) {
    bloco.innerHTML = `<p>Você ainda não tem endereços cadastrados.</p><button class="botao botao-primario" onclick="mostrandoNovoEndereco=true; renderizarBlocoEndereco()">+ Adicionar endereço</button>`;
    return;
  }

  bloco.innerHTML = `
    <p style="color:var(--chocolate); font-weight:600; margin-bottom:2px">${esc(enderecoSelecionado.logradouro)}, ${esc(enderecoSelecionado.numero)}</p>
    <p style="font-size:0.85rem">${esc(enderecoSelecionado.bairro)} — ${esc(enderecoSelecionado.cidade)}/${esc(enderecoSelecionado.uf)} · CEP ${esc(enderecoSelecionado.cep)}</p>
    <div style="display:flex; gap:8px; margin-top:10px">
      ${enderecosDisponiveis.length > 1 ? `<button class="botao-texto" onclick="mostrarSeletorEndereco()">Trocar endereço</button>` : ''}
      <button class="botao-texto" onclick="mostrandoNovoEndereco=true; renderizarBlocoEndereco()">+ Novo endereço</button>
    </div>
  `;
}

function mostrarSeletorEndereco() {
  const bloco = document.getElementById('bloco-endereco');
  bloco.innerHTML = enderecosDisponiveis
    .map(
      (e) => `
    <label style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid var(--linha); align-items:flex-start">
      <input type="radio" name="endereco" style="margin-top:4px" ${e.id_endereco === enderecoSelecionado.id_endereco ? 'checked' : ''} onchange='selecionarEndereco(${e.id_endereco})'>
      <span style="font-size:0.88rem"><strong>${esc(e.logradouro)}, ${esc(e.numero)}</strong><br>${esc(e.bairro)} — ${esc(e.cidade)}/${esc(e.uf)} · CEP ${esc(e.cep)}</span>
    </label>`
    )
    .join('') + `<button class="botao-texto" style="margin-top:8px" onclick="renderizarBlocoEndereco()">Fechar</button>`;
}

async function selecionarEndereco(id) {
  enderecoSelecionado = enderecosDisponiveis.find((e) => e.id_endereco === id);
  await renderizar();
}

async function salvarNovoEndereco() {
  const dados = {
    cep: document.getElementById('novo-cep').value.trim(),
    logradouro: document.getElementById('novo-logradouro').value.trim(),
    numero: document.getElementById('novo-numero').value.trim(),
    bairro: document.getElementById('novo-bairro').value.trim(),
    cidade: document.getElementById('novo-cidade').value.trim(),
    uf: document.getElementById('novo-uf').value.trim().toUpperCase(),
  };
  if (Object.values(dados).some((v) => !v)) {
    document.getElementById('erro-endereco').innerHTML = `<div class="mensagem-erro">Preencha todos os campos do endereço.</div>`;
    return;
  }
  try {
    const endereco = await api('/enderecos', { method: 'POST', body: dados });
    enderecosDisponiveis.push(endereco);
    enderecoSelecionado = endereco;
    mostrandoNovoEndereco = false;
    await renderizar();
    mostrarToast('Endereço cadastrado ✓', 'sucesso');
  } catch (err) {
    document.getElementById('erro-endereco').innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
}

async function alterarQuantidade(idProduto, novaQtd) {
  try {
    carrinhoAtual = await api(`/carrinho/itens/${idProduto}`, { method: 'PUT', body: { quantidade: novaQtd } });
    cupomAplicado = null; // recalcula desconto sobre o novo subtotal
    await renderizar();
    atualizarBadgeCarrinho();
  } catch (err) {
    const max = err.corpo?.estoqueDisponivel;
    if (typeof max === 'number' && max >= 1) {
      // Wireframe SP1: "ajusta automaticamente a quantidade máxima"
      try {
        carrinhoAtual = await api(`/carrinho/itens/${idProduto}`, { method: 'PUT', body: { quantidade: max } });
        await renderizar();
        mostrarToast(`${esc(err.message)} Ajustamos para o máximo disponível.`, 'erro');
        return;
      } catch { /* cai no toast padrão */ }
    }
    mostrarToast(err.message, 'erro');
  }
}

async function aplicarCupom() {
  const codigo = document.getElementById('campo-cupom').value.trim();
  if (!codigo) return;
  try {
    cupomAplicado = await api(`/cupons/${codigo}/validar`);
    await renderizar();
    mostrarToast('Cupom aplicado ✓', 'sucesso');
  } catch (err) {
    document.getElementById('campo-cupom').value = ''; // wireframe SP1: limpa o campo
    document.getElementById('erro-cupom').innerHTML = `<div class="mensagem-erro" style="margin-top:8px">${esc(err.message)}</div>`;
  }
}

async function removerCupom() {
  cupomAplicado = null;
  await renderizar();
}

async function finalizarCompra() {
  const botao = document.getElementById('botao-finalizar');
  if (botao.disabled) return; // evita clique duplo gerar dois pedidos
  const rotuloOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Processando…';
  const erroBox = document.getElementById('erro-checkout');
  erroBox.innerHTML = '';
  try {
    const resultado = await api('/pedidos', {
      method: 'POST',
      body: {
        id_endereco: enderecoSelecionado.id_endereco,
        codigo_cupom: cupomAplicado ? cupomAplicado.cupom.codigo : undefined,
        forma_pagamento: formaPagamento,
      },
    });
    window.location.href = `pedido.html?id=${resultado.pedido.id_pedido}&novo=1`;
  } catch (err) {
    botao.disabled = false;
    botao.textContent = rotuloOriginal;
    erroBox.innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
}

iniciar();
