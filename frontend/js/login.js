function mudarAba(aba) {
  document.getElementById('aba-login').classList.toggle('ativo', aba === 'login');
  document.getElementById('aba-cadastro').classList.toggle('ativo', aba === 'cadastro');
  document.getElementById('form-recuperar').style.display = 'none';
  document.getElementById('form-login').style.display = aba === 'login' ? 'block' : 'none';
  document.getElementById('form-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
  document.getElementById('erro-form').innerHTML = '';
}

function redirecionarAposLogin() {
  const next = new URLSearchParams(window.location.search).get('next');
  window.location.href = next || 'index.html';
}

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erroBox = document.getElementById('erro-form');
  erroBox.innerHTML = '';
  try {
    const sessao = await api('/auth/login', {
      method: 'POST',
      autenticado: false,
      body: {
        email: document.getElementById('login-email').value.trim(),
        senha: document.getElementById('login-senha').value,
      },
    });
    Sessao.salvar(sessao);
    redirecionarAposLogin();
  } catch (err) {
    erroBox.innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
});

document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erroBox = document.getElementById('erro-form');
  erroBox.innerHTML = '';
  try {
    const sessao = await api('/auth/cadastro', {
      method: 'POST',
      autenticado: false,
      body: {
        nome: document.getElementById('cad-nome').value.trim(),
        email: document.getElementById('cad-email').value.trim(),
        senha: document.getElementById('cad-senha').value,
      },
    });
    Sessao.salvar(sessao);
    mostrarToast('Conta criada com sucesso! Bem-vindo(a) 🎉', 'sucesso');
    redirecionarAposLogin();
  } catch (err) {
    erroBox.innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
});

if (Sessao.estaLogado()) redirecionarAposLogin();

// --- US-16: recuperação de senha --------------------------------------------
function mostrarRecuperacao(mostrar) {
  document.getElementById('form-login').style.display = mostrar ? 'none' : 'block';
  document.getElementById('form-recuperar').style.display = mostrar ? 'block' : 'none';
  document.getElementById('erro-form').innerHTML = '';
  document.getElementById('resultado-recuperacao').innerHTML = '';
}
document.getElementById('link-esqueci').addEventListener('click', (e) => { e.preventDefault(); mostrarRecuperacao(true); });
document.getElementById('link-voltar').addEventListener('click', (e) => { e.preventDefault(); mostrarRecuperacao(false); });

document.getElementById('form-recuperar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saida = document.getElementById('resultado-recuperacao');
  try {
    const r = await api('/auth/recuperar-senha', { method: 'POST', autenticado: false, body: { email: document.getElementById('rec-email').value.trim() } });
    saida.innerHTML = `<div class="mensagem-sucesso">${esc(r.mensagem)}</div>` +
      (r.link_dev
        ? `<div class="cartao" style="margin-top:10px"><p style="font-size:0.8rem"><strong>Modo demonstração:</strong> como este protótipo não envia e-mails de verdade, o link da mensagem aparece aqui.</p><a class="botao botao-secundario" href="${esc(r.link_dev)}">Abrir link de redefinição</a></div>`
        : '');
  } catch (err) {
    saida.innerHTML = `<div class="mensagem-erro">${esc(err.message)}</div>`;
  }
});

// Se a conta foi bloqueada, oferece o atalho para "Recuperar Senha" (conforme wireframe da SP1)
const _formLogin = document.getElementById('form-login');
new MutationObserver(() => {
  const box = document.getElementById('erro-form');
  if (box.textContent.includes('Recuperar Senha') && !box.querySelector('a')) {
    box.firstElementChild.insertAdjacentHTML('beforeend', ' <a href="#" id="atalho-recuperar" style="color:var(--framboesa);font-weight:700">Recuperar senha agora</a>');
    document.getElementById('atalho-recuperar').addEventListener('click', (ev) => { ev.preventDefault(); mostrarRecuperacao(true); });
  }
}).observe(document.getElementById('erro-form'), { childList: true });
