async function carregarPerfil() {
  if (!exigirLogin()) return;
  const usuario = Sessao.obterUsuario();
  const enderecos = await api('/enderecos');

  document.getElementById('conteudo').innerHTML = `
    <div class="cartao centro">
      <div style="width:64px; height:64px; border-radius:50%; background:var(--framboesa); color:#fff; display:flex; align-items:center; justify-content:center; font-family:var(--fonte-titulo); font-size:1.5rem; font-weight:700; margin:0 auto 12px">
        ${usuario.nome.charAt(0).toUpperCase()}
      </div>
      <h3>${usuario.nome}</h3>
      <p>${usuario.email}</p>
      ${usuario.tipo_usuario === 'ADMINISTRADOR' ? `<a class="botao botao-secundario espaco-topo" href="admin.html" style="display:inline-flex">Abrir painel administrativo</a>` : ''}
    </div>

    <h3 class="espaco-topo">📍 Meus endereços</h3>
    ${enderecos.length === 0
      ? `<div class="cartao"><p>Nenhum endereço cadastrado ainda. Adicione um no momento do checkout.</p></div>`
      : enderecos
          .map(
            (e) => `
      <div class="cartao">
        <div style="display:flex; justify-content:space-between; align-items:flex-start">
          <div>
            <p style="font-weight:700; color:var(--chocolate); margin-bottom:2px">${e.logradouro}, ${e.numero} ${e.e_padrao ? '<span class="etiqueta-status entregue" style="margin-left:6px">Padrão</span>' : ''}</p>
            <p style="font-size:0.85rem">${e.bairro} — ${e.cidade}/${e.uf} · CEP ${e.cep}</p>
          </div>
          ${!e.e_padrao ? `<button class="botao-texto" style="padding:4px" onclick="tornarPadrao(${e.id_endereco})">Tornar padrão</button>` : ''}
        </div>
      </div>`
          )
          .join('')}

    <button class="botao botao-secundario espaco-topo" onclick="sair()">Sair da conta</button>
  `;
}

async function tornarPadrao(idEndereco) {
  await api(`/enderecos/${idEndereco}/padrao`, { method: 'PUT' });
  mostrarToast('Endereço padrão atualizado ✓', 'sucesso');
  carregarPerfil();
}

async function sair() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    Sessao.limpar();
    window.location.href = 'login.html';
  }
}

carregarPerfil();
