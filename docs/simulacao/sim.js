// Simulação de 5 testadores (personas) — sessões reais em navegador com dispositivos emulados.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const jwt = require(path.join(__dirname, '..', '..', 'backend', 'node_modules', 'jsonwebtoken'));
const axeSrc = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || path.join(__dirname, 'resultado.json');
const obs = [];
const add = (p, tipo, txt) => { obs.push({ p, tipo, txt }); console.log(`[${p}] ${tipo}: ${txt}`); };
const wait = (pg, ms = 500) => pg.waitForTimeout(ms);

async function apiNode(method, path, token, body) {
  const r = await fetch(BASE + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { status: r.status, d };
}
let seq = 0;
async function novoUsuario(nome = 'Teste') {
  const email = `sim${Date.now()}_${seq++}@exemplo.com`;
  const r = await apiNode('POST', '/auth/cadastro', null, { nome, email, senha: 'senha12345' });
  return { token: r.d.token, usuario: r.d.usuario, email };
}
async function pessoa(browser, p, cfg, logado) {
  const ctx = await browser.newContext(cfg);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => add(p, 'PROBLEMA', `Erro de JavaScript na página: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_(NAME|INTERNET|CONNECTION|FAILED)|Failed to load resource/.test(m.text())) add(p, 'PROBLEMA', `Erro no console: ${m.text().slice(0, 120)}`); });
  if (logado) await page.addInitScript(({ t, u }) => { localStorage.setItem('cg_token', t); localStorage.setItem('cg_usuario', JSON.stringify(u)); }, { t: logado.token, u: logado.usuario });
  return { ctx, page };
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const coberto = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s); if (!el) return null;
  const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (y > innerHeight || y < 0) return { situacao: 'fora da tela', y: Math.round(y), altura: innerHeight };
  const topo = document.elementFromPoint(x, y);
  return { situacao: (topo === el || el.contains(topo)) ? 'visível' : 'COBERTO por ' + (topo && (topo.className || topo.tagName)) };
}, sel);
async function toques(page, rotulo, p) {
  const r = await page.evaluate(() => {
    const out = []; document.querySelectorAll('button, a, input, select, textarea').forEach((el) => {
      const b = el.getBoundingClientRect(); if (b.width === 0 || b.height === 0 || getComputedStyle(el).visibility === 'hidden') return;
      if (el.tagName === 'INPUT' && el.type === 'radio') return;
      const m = Math.min(b.width, b.height); if (m < 44) out.push({ el: (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 24), w: Math.round(b.width), h: Math.round(b.height) });
    });
    return out;
  });
  const menor24 = r.filter((x) => Math.min(x.w, x.h) < 24);
  if (r.length) add(p, 'PROBLEMA', `${rotulo}: ${r.length} elemento(s) clicável(is) com menos de 44 px de altura/largura (ex.: ${r.slice(0, 3).map((x) => `"${x.el}" ${x.w}×${x.h}`).join('; ')})${menor24.length ? `; ${menor24.length} com menos de 24 px` : ''}.`);
  else add(p, 'OK', `${rotulo}: todos os alvos de toque têm pelo menos 44 px.`);
}
async function fontes(page, rotulo, p) {
  const r = await page.evaluate(() => { let n = 0, ex = ''; document.querySelectorAll('body *').forEach((el) => { if (el.children.length === 0 && (el.textContent || '').trim()) { const s = parseFloat(getComputedStyle(el).fontSize); if (s < 12) { n++; ex = ex || `"${el.textContent.trim().slice(0, 18)}" ${s.toFixed(1)}px`; } } }); return { n, ex }; });
  if (r.n) add(p, 'SUGESTAO', `${rotulo}: ${r.n} texto(s) menor(es) que 12 px (ex.: ${r.ex}) — difícil de ler para quem tem vista cansada.`);
}
async function axe(page, rotulo, p) {
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }).then((x) => x.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help }))));
  if (r.length === 0) add(p, 'OK', `${rotulo}: verificador de acessibilidade (axe, WCAG 2.1 AA) sem violações.`);
  r.forEach((v) => add(p, 'PROBLEMA', `${rotulo}: acessibilidade [${v.impact}] ${v.id} (${v.n} elemento/s) — ${v.help}`));
}

(async () => {
  const browser = await chromium.launch();

  // ============ P1 — Ana, iPhone SE, comprando pela primeira vez ============
  {
    const P = 'P1 Ana (iPhone SE 375×667)';
    const { page } = await pessoa(browser, P, { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(BASE + '/login.html'); await wait(page);
    const ov = []; const chk = async (nome) => { const o = await overflow(page); if (o > 1) ov.push(`${nome} (+${o}px)`); };
    await chk('login');
    await page.click('#aba-cadastro'); await page.fill('#cad-nome', 'Ana Paula'); await page.fill('#cad-email', `ana${Date.now()}@exemplo.com`); await page.fill('#cad-senha', 'senha12345');
    await page.click('#form-cadastro button[type=submit]'); await page.waitForURL('**/index.html'); await wait(page, 800); await chk('catálogo');
    add(P, 'OK', 'Criou a conta e chegou ao catálogo sem dificuldade.');
    await toques(page, 'Catálogo', P); await fontes(page, 'Catálogo', P);
    await page.fill('#campo-busca', 'choc'); await wait(page, 800);
    const n = await page.locator('.cartao-produto').count(); add(P, n === 1 ? 'OK' : 'PROBLEMA', `Busca por "choc" retornou ${n} produto(s).`);
    await page.click('.cartao-produto >> nth=0'); await wait(page, 700); await chk('produto');
    let c = await coberto(page, '#botao-adicionar'); add(P, c?.situacao === 'visível' ? 'OK' : 'PROBLEMA', `Tela do produto — botão "Adicionar ao Carrinho" ao abrir a tela: ${c?.situacao}.`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 300);
    c = await coberto(page, '#botao-adicionar'); add(P, c?.situacao === 'visível' ? 'OK' : 'PROBLEMA', `Tela do produto — botão depois de rolar até o fim: ${c?.situacao}.`);
    await toques(page, 'Detalhes do produto', P);
    await page.evaluate(() => window.scrollTo(0, 0)); await page.evaluate(() => document.getElementById('botao-adicionar').click()); await wait(page, 600);
    await page.goto(BASE + '/index.html'); await wait(page, 700); await (await page.$$('.botao-add'))[2].click(); await wait(page, 500);
    await page.goto(BASE + '/carrinho.html'); await wait(page, 800); await chk('carrinho');
    c = await coberto(page, '#botao-finalizar'); add(P, c?.situacao === 'visível' ? 'OK' : 'PROBLEMA', `Carrinho — botão "Finalizar e Pagar" ao abrir a tela: ${c?.situacao}${c?.altura ? ` (botão a ${c.y}px; a tela tem ${c.altura}px)` : ''}.`);
    const desab = await page.$eval('#botao-finalizar', (b) => b.disabled); add(P, desab ? 'OK' : 'PROBLEMA', desab ? 'Sem endereço, o botão de finalizar fica desabilitado (correto).' : 'Sem endereço, o botão de finalizar não ficou desabilitado.');
    await toques(page, 'Carrinho', P);
    await page.click('text=Adicionar endereço'); await page.fill('#novo-cep', '01310-100'); await page.fill('#novo-logradouro', 'Av. Paulista'); await page.fill('#novo-numero', '1578'); await page.fill('#novo-bairro', 'Bela Vista'); await page.fill('#novo-cidade', 'São Paulo'); await page.fill('#novo-uf', 'SP');
    await page.click('text=Salvar endereço'); await wait(page, 800);
    await page.fill('#campo-cupom', 'cupcake10'); await page.click('button:has-text("Aplicar")'); await wait(page, 800);
    const ok = await page.locator('text=Desconto aplicado').count(); add(P, ok ? 'OK' : 'PROBLEMA', ok ? 'Cupom digitado em minúsculas foi aceito.' : 'Cupom em minúsculas não foi aceito.');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(page, 300);
    c = await coberto(page, '#botao-finalizar'); add(P, c?.situacao === 'visível' ? 'OK' : 'PROBLEMA', `Carrinho — botão "Finalizar" depois de rolar até o fim: ${c?.situacao}.`);
    await page.click('#botao-finalizar'); await page.waitForURL('**/pedido.html**', { timeout: 8000 }).catch(() => add(P, 'PROBLEMA', 'Não conseguiu finalizar o pedido.'));
    if (/pedido\.html/.test(page.url())) add(P, 'OK', 'Finalizou o pedido e viu a linha do tempo de acompanhamento.');
    await chk('pedido'); await page.goto(BASE + '/pedidos.html'); await wait(page, 600); await chk('histórico');
    await page.click('text=Repetir pedido'); await wait(page, 600); const t = await page.textContent('.toast').catch(() => ''); add(P, /adicionados/.test(t) ? 'OK' : 'PROBLEMA', `"Repetir pedido": ${t || 'sem retorno'}.`);
    await page.goto(BASE + '/perfil.html'); await wait(page, 500); await chk('perfil');
    add(P, ov.length ? 'PROBLEMA' : 'OK', ov.length ? `Rolagem horizontal indesejada em: ${ov.join(', ')}.` : 'Nenhuma tela com rolagem horizontal indesejada.');
    add(P, 'NAO_TESTADO', 'Avaliação do pedido (o pedido não chegou a "Entregue" durante a sessão) e painel do administrador.');
  }

  // ============ P2 — Carlos, Android pequeno, internet lenta/instável ============
  {
    const P = 'P2 Carlos (Android 360×640, rede lenta)';
    const u = await novoUsuario('Carlos Mendes');
    const { ctx, page } = await pessoa(browser, P, { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, u);
    const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 60 * 1024, uploadThroughput: 30 * 1024 });
    const t0 = Date.now(); await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('.cartao-produto', { timeout: 30000 }); const dt = ((Date.now() - t0) / 1000).toFixed(1);
    add(P, dt < 4 ? 'OK' : 'SUGESTAO', `Catálogo apareceu em ${dt}s com rede lenta (latência 400 ms, ~60 KB/s).`);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    // erro de rede
    await ctx.setOffline(true); await (await page.$$('.botao-add'))[0].click(); await wait(page, 900);
    const msg = await page.textContent('.toast').catch(() => '(nenhuma mensagem)');
    add(P, /conex|internet|rede/i.test(msg) ? 'OK' : 'PROBLEMA', `Sem internet ao adicionar um item, a mensagem exibida foi: "${msg}".`); await ctx.setOffline(false);
    // clique duplo no checkout + corrida via API
    const prod = (await apiNode('GET', '/produtos')).d.find((x) => x.nome === 'Baunilha Clássica');
    await apiNode('POST', '/carrinho/itens', u.token, { id_produto: prod.id_produto, quantidade: 2 });
    const end = (await apiNode('POST', '/enderecos', u.token, { cep: '01310-100', logradouro: 'Rua A', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP' })).d.id_endereco;
    const antes = (await apiNode('GET', '/produtos')).d.find((x) => x.nome === 'Baunilha Clássica').quantidade_estoque;
    const [r1, r2] = await Promise.all([1, 2].map(() => apiNode('POST', '/pedidos', u.token, { id_endereco: end, forma_pagamento: 'PIX' })));
    const pedidos = (await apiNode('GET', '/pedidos', u.token)).d.length;
    const depois = (await apiNode('GET', '/produtos')).d.find((x) => x.nome === 'Baunilha Clássica').quantidade_estoque;
    add(P, pedidos === 1 ? 'OK' : 'PROBLEMA', `Duas finalizações simultâneas do mesmo carrinho (clique duplo): ${pedidos} pedido(s) criado(s) (respostas ${r1.status}/${r2.status}); estoque baixou ${antes - depois} unidade(s) para uma compra de 2.`);
    // botão duplo na interface
    await page.goto(BASE + '/carrinho.html'); await wait(page, 700);
    const desabilitaAoClicar = await page.evaluate(() => { const b = document.getElementById('botao-finalizar'); return b ? 'existe' : 'sem botão (carrinho vazio)'; });
    add(P, 'OK', `Voltar ao carrinho depois do pedido mostra: ${await page.locator('.vazio h3').textContent().catch(() => desabilitaAoClicar)}.`);
    add(P, 'NAO_TESTADO', 'Pagamento com cartão/dinheiro e histórico de pedidos.');
  }

  // ============ P3 — Marina, desktop, teclado e acessibilidade ============
  {
    const P = 'P3 Marina (desktop 1366×768, teclado + acessibilidade)';
    const u = await novoUsuario('Marina Lopes');
    const prod = (await apiNode('GET', '/produtos')).d[0];
    await apiNode('POST', '/carrinho/itens', u.token, { id_produto: prod.id_produto, quantidade: 1 });
    // login sem estar logada: teclado
    const { page } = await pessoa(browser, P, { viewport: { width: 1366, height: 768 } });
    await page.goto(BASE + '/login.html'); await wait(page);
    const ordem = []; for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); ordem.push(await page.evaluate(() => { const e = document.activeElement; return (e.id || e.textContent || e.tagName).trim().slice(0, 22); })); }
    add(P, 'OK', `Ordem do Tab na tela de login: ${ordem.join(' → ')}.`);
    const foco = await page.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0; });
    add(P, foco ? 'OK' : 'PROBLEMA', foco ? 'O foco do teclado fica visível nos elementos.' : 'O foco do teclado não aparece.');
    await page.fill('#login-email', u.email); await page.fill('#login-senha', 'senha12345'); await page.keyboard.press('Enter'); await page.waitForURL('**/index.html'); add(P, 'OK', 'Entrou usando apenas o teclado (Enter envia o formulário).');
    const larg = await page.evaluate(() => document.getElementById('app').getBoundingClientRect().width); add(P, 'SUGESTAO', `No computador o aplicativo ocupa só ${Math.round(larg)} px no centro da tela de 1366 px (layout de celular). Aceitável para um app mobile-first, mas sobra espaço vazio.`);
    for (const [rot, url] of [['Login', '/login.html'], ['Catálogo', '/index.html'], ['Detalhes do produto', `/produto.html?id=${prod.id_produto}`], ['Carrinho', '/carrinho.html'], ['Histórico de pedidos', '/pedidos.html'], ['Perfil', '/perfil.html'], ['Painel admin (acesso)', '/admin.html']]) {
      if (rot === 'Login') { await page.evaluate(() => localStorage.clear()); }
      else if (rot === 'Catálogo') { await page.evaluate(({ t, u }) => { localStorage.setItem('cg_token', t); localStorage.setItem('cg_usuario', JSON.stringify(u)); }, { t: u.token, u: u.usuario }); }
      await page.goto(BASE + url); await wait(page, 900); await axe(page, rot, P);
    }
  }

  // ============ P4 — Diego, tenta "quebrar" o sistema ============
  {
    const P = 'P4 Diego (desenvolvedor curioso, entradas inválidas)';
    const { page } = await pessoa(browser, P, { viewport: { width: 1280, height: 720 } });
    // XSS pelo nome
    const nomeMau = '<img src=x onerror="window.__xss=1">';
    const u = await novoUsuario(nomeMau);
    await page.addInitScript(({ t, u }) => { localStorage.setItem('cg_token', t); localStorage.setItem('cg_usuario', JSON.stringify(u)); }, { t: u.token, u: u.usuario });
    await page.goto(BASE + '/perfil.html'); await wait(page, 800);
    const xss1 = await page.evaluate(() => window.__xss === 1);
    add(P, xss1 ? 'PROBLEMA' : 'OK', xss1 ? 'Cadastrou o nome com código HTML e, ao abrir o Perfil, o código foi EXECUTADO na página (vulnerabilidade XSS).' : 'Nome com código HTML não foi executado no Perfil.');
    const admin = await apiNode('POST', '/auth/login', null, { email: 'admin@cupcakesgourmet.com.br', senha: 'admin1234' });
    const nomeProd = '<img src=x onerror="window.__xss2=1">';
    await apiNode('POST', '/admin/produtos', admin.d.token, { id_categoria: 1, nome: nomeProd, descricao: 'x', ingredientes: 'x', preco: 9.9, quantidade_estoque: 3, imagens: ['/img/red-velvet.svg'] });
    await page.goto(BASE + '/index.html'); await wait(page, 900);
    const xss2 = await page.evaluate(() => window.__xss2 === 1);
    add(P, xss2 ? 'PROBLEMA' : 'OK', xss2 ? 'Um produto com HTML no nome foi executado no catálogo de todos os clientes (XSS armazenado).' : 'HTML no nome do produto não foi executado no catálogo.');
    // validações do servidor
    const longo = await apiNode('POST', '/auth/cadastro', null, { nome: 'A'.repeat(300), email: `longo${Date.now()}@x.com`, senha: 'senha12345' });
    add(P, longo.status < 500 ? 'OK' : 'PROBLEMA', `Nome com 300 caracteres no cadastro → HTTP ${longo.status}${longo.status >= 500 ? ' (erro interno do servidor)' : ''}.`);
    const mail = await apiNode('POST', '/auth/cadastro', null, { nome: 'X', email: 'isto-nao-e-email', senha: 'senha12345' });
    add(P, mail.status === 422 ? 'OK' : 'PROBLEMA', `E-mail inválido ("isto-nao-e-email") enviado direto à API → HTTP ${mail.status}${mail.status === 201 ? ' (conta criada com e-mail inválido)' : ''}.`);
    const cep = await apiNode('POST', '/enderecos', u.token, { cep: 'abc', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'C', uf: 'XX' });
    add(P, cep.status === 422 ? 'OK' : 'PROBLEMA', `Endereço com CEP "abc" e UF "XX" → HTTP ${cep.status}${cep.status === 201 ? ' (aceito sem validação)' : ''}.`);
    const prod = (await apiNode('GET', '/produtos')).d[1];
    await apiNode('POST', '/carrinho/itens', u.token, { id_produto: prod.id_produto, quantidade: 1 });
    const q = await apiNode('PUT', `/carrinho/itens/${prod.id_produto}`, u.token, { quantidade: 'abc' });
    add(P, q.status < 500 ? 'OK' : 'PROBLEMA', `Quantidade "abc" no carrinho → HTTP ${q.status}${q.status >= 500 ? ' (erro interno)' : ''}.`);
    const frete = await apiNode('GET', '/frete?cep=abc', u.token);
    add(P, frete.status === 422 && frete.d.codigo !== 'CEP_FORA_DE_COBERTURA' ? 'OK' : 'PROBLEMA', `Cálculo de frete com CEP "abc" → HTTP ${frete.status}${frete.status === 200 ? ' (aceitou e calculou frete)' : ''}.`);
    const inj = await apiNode('GET', '/produtos?busca=' + encodeURIComponent("' OR 1=1 --"));
    add(P, inj.status === 200 && inj.d.length === 0 ? 'OK' : 'PROBLEMA', `Busca com injeção de SQL ("' OR 1=1 --") → HTTP ${inj.status}, ${Array.isArray(inj.d) ? inj.d.length : '?'} resultado(s) (consulta parametrizada resiste).`);
    const outro = await apiNode('GET', '/pedidos/1', u.token); add(P, outro.status === 404 ? 'OK' : 'PROBLEMA', `Abrir por URL o pedido de outra pessoa → HTTP ${outro.status}.`);
    const semLogin = await apiNode('GET', '/admin/produtos'); add(P, semLogin.status === 401 ? 'OK' : 'PROBLEMA', `Rota de administrador sem login → HTTP ${semLogin.status}.`);
    const forjado = jwt.sign({ id_usuario: 1, tipo_usuario: 'ADMINISTRADOR' }, 'cupcakes-gourmet-dev-secret');
    const f = await apiNode('GET', '/admin/pedidos', forjado);
    add(P, f.status === 200 ? 'PROBLEMA' : 'OK', f.status === 200 ? 'Lendo o código no GitHub, forjou um token de administrador com o segredo JWT padrão e acessou o painel (risco real se o site for publicado sem definir JWT_SECRET).' : 'Token forjado com o segredo padrão foi recusado.');
    add(P, 'NAO_TESTADO', 'Interface visual em celular; fluxo feliz de compra (foco foi tentar quebrar).');
  }

  // ============ P5 — Júlia, confeiteira (administradora) no tablet ============
  {
    const P = 'P5 Júlia (confeiteira/admin, tablet 768×1024)';
    const cli = await novoUsuario('Cliente da Júlia');
    const prods = (await apiNode('GET', '/produtos')).d;
    await apiNode('POST', '/carrinho/itens', cli.token, { id_produto: prods[0].id_produto, quantidade: 3 });
    await apiNode('POST', '/carrinho/itens', cli.token, { id_produto: prods[2].id_produto, quantidade: 2 });
    const end = (await apiNode('POST', '/enderecos', cli.token, { cep: '01310-100', logradouro: 'Rua das Flores', numero: '77', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP' })).d.id_endereco;
    await apiNode('POST', '/pedidos', cli.token, { id_endereco: end, forma_pagamento: 'DINHEIRO' });
    const { page } = await pessoa(browser, P, { viewport: { width: 768, height: 1024 }, hasTouch: true });
    let dialogos = 0; page.on('dialog', (d) => { dialogos++; d.dismiss(); });
    await page.goto(BASE + '/admin.html'); await wait(page);
    await page.fill('#admin-email', 'admin@cupcakesgourmet.com.br'); await page.fill('#admin-senha', 'admin1234'); await page.click('#form-login-admin button[type=submit]'); await wait(page, 900);
    add(P, 'OK', 'Entrou no painel do administrador.');
    await page.click('text=+ Cadastrar novo cupcake'); await wait(page, 500);
    await page.fill('#np-nome', 'Cupcake da Júlia'); await page.fill('#np-descricao', 'Teste'); await page.fill('#np-ingredientes', 'Teste'); await page.fill('#np-preco', '0'); await page.fill('#np-estoque', '5');
    await page.click('text=Salvar cupcake'); await wait(page, 700);
    const e1 = await page.textContent('#erro-novo-produto').catch(() => ''); add(P, /maior que/.test(e1) ? 'OK' : 'PROBLEMA', `Cadastro com preço R$ 0,00: "${e1.trim() || 'sem aviso'}".`);
    await page.fill('#np-preco', '18.5'); await page.click('text=Salvar cupcake'); await wait(page, 900);
    add(P, (await page.locator('text=Cupcake da Júlia').count()) ? 'OK' : 'PROBLEMA', 'Cadastrou um novo cupcake com sucesso e ele apareceu na lista.');
    await wait(page, 3600); await page.fill('#estoque-1', '-5'); await page.click('text=Atualizar estoque >> nth=0'); await wait(page, 600);
    const ts = await page.locator('.toast').allTextContents(); const t = ts[ts.length - 1] || ''; add(P, /negativo/.test(t) ? 'OK' : 'PROBLEMA', `Estoque -5 digitado: "${t}".`);
    add(P, (await page.locator('button:has-text("Editar"), button:has-text("Desativar"), button:has-text("Preço")').count()) ? 'OK' : 'SUGESTAO', 'Na lista de produtos só dá para alterar o ESTOQUE: não há botão para editar preço/descrição nem para desativar um produto.');
    await page.click('#aba-pedidos'); await wait(page, 900);
    const card = await page.locator('#conteudo-admin .cartao').first().innerText();
    const temItens = /Red Velvet|Baunilha|×|x \d/.test(card), temEndereco = /Rua das Flores|Centro|CEP/.test(card), temCliente = /Cliente da Júlia/.test(card), temPgto = /Dinheiro|DINHEIRO|PIX|Cartão/i.test(card);
    add(P, temItens && temEndereco && temCliente ? 'OK' : 'PROBLEMA', `Card do pedido no painel — mostra itens: ${temItens ? 'sim' : 'NÃO'}; endereço: ${temEndereco ? 'sim' : 'NÃO'}; cliente: ${temCliente ? 'sim' : 'NÃO'}; forma de pagamento: ${temPgto ? 'sim' : 'NÃO'}. (Conteúdo visto: "${card.replace(/\s+/g, ' ').slice(0, 90)}…")`);
    add(P, (await page.locator('#conteudo-admin select, #conteudo-admin .chip').count()) ? 'OK' : 'SUGESTAO', 'Não há filtro de pedidos por status (a lista mistura pedidos novos e antigos).');
    await page.click('text=Cancelar >> nth=0'); await wait(page, 800);
    add(P, dialogos > 0 ? 'OK' : 'PROBLEMA', dialogos > 0 ? 'Cancelar pedido pediu confirmação.' : 'Ao tocar em "Cancelar" o pedido foi cancelado na hora, sem pedir confirmação (ação irreversível; fácil de tocar sem querer no tablet).');
    await toques(page, 'Painel admin (tablet)', P);
    add(P, 'NAO_TESTADO', 'Avançar o pedido pelas 4 etapas completas depois do cancelamento (o pedido de teste foi cancelado) e relatórios de vendas (não existem).');
  }

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(obs, null, 1));
  console.log('\nFIM —', obs.length, 'observações salvas em', OUT);
})().catch((e) => { console.error('ERRO NA SIMULAÇÃO', e); process.exit(1); });
