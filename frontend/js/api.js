/**
 * api.js — camada única de comunicação com o back-end (padrão "API client").
 * Todas as páginas importam este arquivo antes de seus próprios scripts.
 */
const API_BASE = '/api';

const Sessao = {
  obterToken() {
    return localStorage.getItem('cg_token');
  },
  obterUsuario() {
    const raw = localStorage.getItem('cg_usuario');
    return raw ? JSON.parse(raw) : null;
  },
  salvar({ token, usuario }) {
    localStorage.setItem('cg_token', token);
    localStorage.setItem('cg_usuario', JSON.stringify(usuario));
  },
  limpar() {
    localStorage.removeItem('cg_token');
    localStorage.removeItem('cg_usuario');
  },
  estaLogado() {
    return !!this.obterToken();
  },
  ehAdmin() {
    return this.obterUsuario()?.tipo_usuario === 'ADMINISTRADOR';
  },
};

async function api(caminho, { method = 'GET', body, autenticado = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (autenticado && Sessao.obterToken()) {
    headers.Authorization = `Bearer ${Sessao.obterToken()}`;
  }
  const resp = await fetch(API_BASE + caminho, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }

  if (!resp.ok) {
    if (resp.status === 401 && autenticado) {
      Sessao.limpar();
    }
    const erro = new Error(data?.erro || 'Não foi possível completar a ação.');
    erro.status = resp.status;
    erro.codigo = data?.codigo;
    erro.corpo = data;
    throw erro;
  }
  return data;
}

function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mostrarToast(mensagem, tipo = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function exigirLogin() {
  if (!Sessao.estaLogado()) {
    window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
    return false;
  }
  return true;
}

async function atualizarBadgeCarrinho() {
  const badge = document.getElementById('badge-carrinho');
  if (!badge || !Sessao.estaLogado()) return;
  try {
    const carrinho = await api('/carrinho');
    const qtd = carrinho.itens.reduce((s, i) => s + i.quantidade, 0);
    badge.textContent = qtd;
    badge.style.display = qtd > 0 ? 'flex' : 'none';
  } catch {
    /* silencioso — badge é cosmético */
  }
}

function marcarNavAtiva() {
  const pagina = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-inferior a').forEach((link) => {
    link.classList.toggle('ativo', link.dataset.pagina === pagina);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  marcarNavAtiva();
  atualizarBadgeCarrinho();
});
