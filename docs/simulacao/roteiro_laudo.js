// Executa o roteiro de 13 tarefas do Laudo de Teste com 5 testadores (sessões automatizadas, só pela interface).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = process.env.OUT || path.join(__dirname, 'resultado_roteiro_laudo.json');
const ADMIN = { email: 'admin@cupcakesgourmet.com.br', senha: 'admin1234' };
const TAREFAS = [
  'Criar uma conta e entrar no sistema',
  'Buscar um cupcake pelo nome e filtrar por categoria',
  'Abrir os detalhes de um produto (ingredientes e alérgenos aparecem?)',
  'Adicionar produtos ao carrinho e alterar quantidades',
  'Tentar colocar mais unidades do que o estoque (mensagem clara?)',
  'Cadastrar um endereço de entrega',
  'Usar um CEP fora da área (CEP 20000-009) — o sistema avisa?',
  'Aplicar o cupom CUPCAKE10 e conferir o desconto e o total',
  'Finalizar o pedido e acompanhar o status',
  'Ver o histórico e usar "Repetir pedido"',
  'Errar a senha várias vezes e usar "Esqueci minha senha"',
  '(Administrador) cadastrar produto, alterar estoque e avançar o status de um pedido',
  'Avaliar um produto depois que o pedido estiver "Entregue"',
];
const DISP = [
  { n: 1, nome: 'Testador 1', disp: 'iPhone SE (emulado) 375×667, toque', cfg: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { n: 2, nome: 'Testador 2', disp: 'Android grande (emulado) 412×915, toque', cfg: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { n: 3, nome: 'Testador 3', disp: 'Computador 1366×768, mouse e teclado', cfg: { viewport: { width: 1366, height: 768 } } },
  { n: 4, nome: 'Testador 4', disp: 'Tablet (emulado) 768×1024, toque', cfg: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  { n: 5, nome: 'Testador 5', disp: 'Android pequeno (emulado) 360×640, toque', cfg: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
];
const dinheiro = (t) => parseFloat(String(t).replace(/[^\d,]/g, '').replace(',', '.'));
const curto = (e) => String(e && e.message || e).split('\n').find((l) => l.trim()) .slice(0, 220);
const wait = (p, ms = 500) => p.waitForTimeout(ms);
const ultimoToast = async (p) => { const t = await p.locator('.toast').allTextContents(); return t[t.length - 1] || ''; };
async function totais(p) { return p.evaluate(() => { const o = {}; document.querySelectorAll('.linha-total').forEach((r) => { const s = r.querySelectorAll('span'); o[s[0].textContent.trim()] = s[1].textContent.trim(); }); return o; }); }
async function botaoNaLinha(p, nomeProduto, simbolo) {
  const h = await p.evaluateHandle(([nome, simb]) => { const img = [...document.querySelectorAll('img[alt]')].find((i) => i.alt.includes(nome)); if (!img) return null; return [...img.parentElement.querySelectorAll('button')].find((b) => b.textContent.trim() === simb) || null; }, [nomeProduto, simbolo]);
  const el = h.asElement(); if (!el) throw new Error(`linha de "${nomeProduto}" não encontrada no carrinho`); return el;
}

async function sessao(browser, t, versao) {
  const email = `testador${t.n}_${Date.now()}@exemplo.com`;
  const senha = 'senha12345', senhaNova = 'novaSenha4567';
  const r = { testador: t.nome, dispositivo: t.disp, navegador: `Chromium ${versao}`, url: BASE, inicio: new Date().toISOString(), tarefas: [], errosTecnicos: [] };
  const ctx = await browser.newContext(t.cfg); const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  p.on('pageerror', (e) => r.errosTecnicos.push('JS: ' + curto(e)));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_(NAME|INTERNET|CONNECTION|FAILED)|Failed to load resource/.test(m.text())) r.errosTecnicos.push('console: ' + m.text().slice(0, 120)); });
  const est = { idPedido: null, totalExibido: null };
  const resultado = {};
  async function tarefa(i, fn, depende) {
    const reg = { n: i + 1, tarefa: TAREFAS[i] };
    if (depende && !depende()) { reg.resultado = 'NAO_TESTOU'; reg.detalhe = 'Não executada: dependia de uma tarefa anterior que não foi concluída.'; }
    else { try { reg.detalhe = await fn(); reg.resultado = 'FUNCIONOU'; } catch (e) { reg.resultado = 'FALHOU'; reg.detalhe = curto(e); } }
    resultado[i + 1] = reg.resultado; r.tarefas.push(reg); console.log(`[${t.nome}] T${i + 1} ${reg.resultado}: ${reg.detalhe}`);
  }
  const ok = (c, msg) => { if (!c) throw new Error(msg); };

  // 1 — criar conta e entrar
  await tarefa(0, async () => {
    await p.goto(BASE + '/login.html'); await p.click('#aba-cadastro');
    await p.fill('#cad-nome', t.nome); await p.fill('#cad-email', email); await p.fill('#cad-senha', senha);
    await p.click('#form-cadastro button[type=submit]'); await p.waitForURL('**/index.html'); await wait(p, 600);
    ok(/Olá, Testador/.test(await p.textContent('#saudacao')), 'a saudação com o nome não apareceu após criar a conta');
    await p.goto(BASE + '/perfil.html'); await p.click('text=Sair da conta'); await p.waitForURL('**/login.html');
    await p.fill('#login-email', email); await p.fill('#login-senha', senha); await p.click('#form-login button[type=submit]'); await p.waitForURL('**/index.html');
    return 'Conta criada, sessão encerrada ("Sair da conta") e novo login com as mesmas credenciais funcionaram.';
  });
  // 2 — buscar e filtrar
  await tarefa(1, async () => {
    await p.goto(BASE + '/index.html'); await p.waitForSelector('.cartao-produto');
    await p.fill('#campo-busca', 'choc'); await wait(p, 900);
    ok((await p.locator('.cartao-produto').count()) === 1 && /Chocolate/.test(await p.textContent('.cartao-produto')), 'a busca por "choc" não retornou só o Chocolate Belga');
    await p.fill('#campo-busca', ''); await wait(p, 700);
    await p.click('.chip:has-text("Veganos")'); await wait(p, 700);
    ok((await p.locator('.cartao-produto').count()) === 1 && /Vegano/.test(await p.textContent('.cartao-produto')), 'o filtro "Veganos" não retornou só o Vegano de Cenoura');
    await p.click('.chip:has-text("Todos")'); await wait(p, 600);
    return 'Busca "choc" → 1 resultado (Chocolate Belga 70%); filtro "Veganos" → 1 resultado (Vegano de Cenoura); "Todos" voltou à lista completa.';
  });
  // 3 — detalhes
  await tarefa(2, async () => {
    await p.click('.cartao-produto >> nth=0'); await p.waitForSelector('h1'); await wait(p, 500);
    const txt = await p.textContent('#conteudo');
    ok(/Ingredientes/.test(txt) && /Contém/.test(txt), 'ingredientes e/ou alérgenos não apareceram na tela de detalhes');
    return 'A tela de detalhes mostrou nome, preço, descrição, ingredientes e a linha de alérgenos.';
  });
  // 4 — carrinho e quantidades
  await tarefa(3, async () => {
    await p.click('#botao-adicionar'); await wait(p, 500);
    ok(/Adicionado/.test(await ultimoToast(p)), 'sem confirmação ao adicionar pela tela de detalhes');
    await p.goto(BASE + '/index.html'); await p.waitForSelector('.botao-add');
    await p.locator('.botao-add').nth(2).click(); await wait(p, 600);
    await p.goto(BASE + '/carrinho.html'); await wait(p, 900);
    ok(/\(2 itens\)/.test(await p.textContent('#titulo-carrinho')), 'o carrinho não mostrou 2 itens');
    const antes = dinheiro((await totais(p))['Subtotal']);
    await p.locator('button:text-is("+")').first().click(); await wait(p, 900);
    const depois = dinheiro((await totais(p))['Subtotal']);
    ok(depois > antes, `o subtotal não aumentou ao somar uma unidade (${antes} → ${depois})`);
    return `2 itens no carrinho; ao tocar em "+" o subtotal passou de R$ ${antes.toFixed(2)} para R$ ${depois.toFixed(2)}.`;
  });
  // 5 — acima do estoque
  await tarefa(4, async () => {
    await p.goto(BASE + '/index.html'); await p.waitForSelector('.cartao-produto');
    await p.click('.cartao-produto:has-text("Coco Sem Glúten")'); await p.waitForSelector('#botao-adicionar');
    const maxTela = 40; for (let k = 0; k < maxTela; k++) { const q = Number(await p.textContent('#quantidade-atual')); const antes = q; await p.locator('button:text-is("+")').first().click(); if (Number(await p.textContent('#quantidade-atual')) === antes) break; }
    const qMax = Number(await p.textContent('#quantidade-atual'));
    await p.click('#botao-adicionar'); await wait(p, 600);
    await p.goto(BASE + '/carrinho.html'); await wait(p, 900);
    await (await botaoNaLinha(p, 'Coco', '+')).click(); await wait(p, 1000);
    const toast = await ultimoToast(p);
    ok(/Restam apenas \d+ unidades/.test(toast), `mensagem esperada não apareceu (apareceu: "${toast}")`);
    for (let k = 0; k < 40; k++) { const h = await p.evaluateHandle(() => [...document.querySelectorAll('img[alt]')].find((i) => i.alt.includes('Coco'))); if (!h.asElement()) break; await (await botaoNaLinha(p, 'Coco', '−')).click(); await wait(p, 120); }
    return `Na tela de detalhes a quantidade parou em ${qMax} (o estoque). Ao tentar somar mais uma unidade no carrinho apareceu: "${toast}". Depois o item foi removido do carrinho.`;
  });
  // 6 — endereço
  await tarefa(5, async () => {
    await p.click('text=Adicionar endereço'); await wait(p, 300);
    await p.fill('#novo-cep', '01310-100'); await p.fill('#novo-logradouro', 'Av. Paulista'); await p.fill('#novo-numero', '1578'); await p.fill('#novo-bairro', 'Bela Vista'); await p.fill('#novo-cidade', 'São Paulo'); await p.fill('#novo-uf', 'SP');
    await p.click('text=Salvar endereço'); await wait(p, 900);
    ok(/Av\. Paulista/.test(await p.textContent('#bloco-endereco')), 'o endereço salvo não apareceu no carrinho');
    return 'Endereço (Av. Paulista, 1578 — CEP 01310-100) salvo e exibido como endereço de entrega.';
  });
  // 7 — CEP fora da área
  await tarefa(6, async () => {
    await p.click('text=+ Novo endereço'); await wait(p, 300);
    await p.fill('#novo-cep', '20000-009'); await p.fill('#novo-logradouro', 'Rua Distante'); await p.fill('#novo-numero', '10'); await p.fill('#novo-bairro', 'Longe'); await p.fill('#novo-cidade', 'Outra Cidade'); await p.fill('#novo-uf', 'RJ');
    await p.click('text=Salvar endereço'); await wait(p, 1100);
    const aviso = (await p.locator('.mensagem-erro').allTextContents()).join(' ');
    ok(/não entregamos/i.test(aviso), `aviso de CEP fora da área não apareceu (texto: "${aviso.slice(0, 80)}")`);
    const bloqueado = await p.$eval('#botao-finalizar', (b) => b.disabled);
    ok(bloqueado, 'o botão de finalizar não ficou desabilitado com CEP fora da área');
    await p.click('text=Trocar endereço'); await p.locator('label:has-text("CEP 01310-100") input').click(); await wait(p, 1000);
    ok(!(await p.$eval('#botao-finalizar', (b) => b.disabled)), 'ao voltar ao endereço válido o botão continuou desabilitado');
    return `Aviso exibido: "${aviso.trim().slice(0, 110)}"; botão "Finalizar" ficou desabilitado e voltou a funcionar ao trocar para o endereço válido.`;
  });
  // 8 — cupom e total
  await tarefa(7, async () => {
    await p.fill('#campo-cupom', 'CUPCAKE10'); await p.click('button:has-text("Aplicar")'); await wait(p, 1000);
    ok(await p.locator('text=Desconto aplicado').count(), 'o cupom não foi aplicado');
    const tt = await totais(p); const sub = dinheiro(tt['Subtotal']), desc = dinheiro(tt['Desconto']), frete = /Grátis/.test(tt['Frete']) ? 0 : dinheiro(tt['Frete']), total = dinheiro(tt['Total a pagar']);
    est.totalExibido = tt['Total a pagar'];
    ok(Math.abs(desc - Math.round(sub * 10) / 100) < 0.011, `desconto de 10% incorreto (subtotal ${sub}, desconto ${desc})`);
    ok(Math.abs(total - (sub - desc + frete)) < 0.011, `total não confere (${sub} − ${desc} + ${frete} ≠ ${total})`);
    return `Subtotal ${tt['Subtotal']}, desconto ${tt['Desconto']} (10%), frete ${tt['Frete']}, total ${tt['Total a pagar']} — a conta confere.`;
  });
  // 9 — finalizar e acompanhar
  await tarefa(8, async () => {
    await p.click('#botao-finalizar'); await p.waitForURL('**/pedido.html**'); await wait(p, 900);
    est.idPedido = new URL(p.url()).searchParams.get('id');
    ok(/Recebido/.test(await p.textContent('.etapa-status.atual .titulo-etapa')), 'a etapa "Pedido Recebido" não aparece como atual');
    const pago = (await p.locator('.linha-total.destaque span').nth(1).textContent()).trim();
    ok(pago === est.totalExibido, `total do pedido (${pago}) diferente do exibido no carrinho (${est.totalExibido})`);
    return `Pedido ${(await p.textContent('#numero-pedido')).trim()} criado; linha do tempo na etapa "Pedido Recebido"; total pago ${pago} igual ao do carrinho.`;
  });
  // 10 — histórico e repetir
  await tarefa(9, async () => {
    await p.goto(BASE + '/pedidos.html'); await wait(p, 800);
    ok(/Recebido/.test(await p.textContent('#conteudo')), 'o pedido não apareceu no histórico');
    await p.click('text=Repetir pedido'); await wait(p, 900);
    ok(/adicionados/.test(await ultimoToast(p)), 'sem confirmação ao repetir o pedido');
    await p.goto(BASE + '/carrinho.html'); await wait(p, 900);
    ok(/\(2 itens\)/.test(await p.textContent('#titulo-carrinho')), 'os itens do pedido anterior não voltaram ao carrinho');
    return 'O pedido apareceu no histórico como "Recebido"; "Repetir pedido" devolveu os 2 itens ao carrinho.';
  }, () => !!est.idPedido);
  // 11 — senha errada e recuperação
  await tarefa(10, async () => {
    await p.goto(BASE + '/perfil.html'); await p.click('text=Sair da conta'); await p.waitForURL('**/login.html');
    let msg = '';
    for (let k = 1; k <= 5; k++) { await p.fill('#login-email', email); await p.fill('#login-senha', 'senha-errada'); await p.click('#form-login button[type=submit]'); await wait(p, 500); msg = await p.textContent('#erro-form'); }
    ok(/bloqueada/i.test(msg), `após 5 erros a conta não foi bloqueada (mensagem: "${msg.trim().slice(0, 80)}")`);
    await p.click('#atalho-recuperar'); await p.fill('#rec-email', email); await p.click('#form-recuperar button[type=submit]'); await wait(p, 900);
    await p.click('text=Abrir link de redefinição'); await p.waitForURL('**/redefinir.html**');
    await p.fill('#nova-senha', senhaNova); await p.fill('#confirma-senha', senhaNova); await p.click('#form-redefinir button[type=submit]'); await p.waitForURL('**/login.html', { timeout: 8000 });
    await p.fill('#login-email', email); await p.fill('#login-senha', senhaNova); await p.click('#form-login button[type=submit]'); await p.waitForURL('**/index.html');
    return 'Após 5 senhas erradas a conta foi bloqueada; "Recuperar senha" gerou o link, a nova senha foi salva e o login com ela funcionou.';
  });
  // 12 — administrador
  const adm = await browser.newContext(t.cfg); const a = await adm.newPage(); a.setDefaultTimeout(6000);
  await tarefa(11, async () => {
    await a.goto(BASE + '/admin.html'); await a.fill('#admin-email', ADMIN.email); await a.fill('#admin-senha', ADMIN.senha); await a.click('#form-login-admin button[type=submit]'); await wait(a, 900);
    const nomeProd = `Cupcake de ${t.nome}`;
    await a.click('text=+ Cadastrar novo cupcake'); await wait(a, 400);
    await a.fill('#np-nome', nomeProd); await a.fill('#np-descricao', 'Produto de teste'); await a.fill('#np-ingredientes', 'Farinha, açúcar'); await a.fill('#np-preco', '17.5'); await a.fill('#np-estoque', '5');
    await a.click('text=Salvar cupcake'); await wait(a, 1100);
    const card = a.locator(`.cartao:has-text("${nomeProd}")`).first();
    ok(await card.count(), 'o produto cadastrado não apareceu na lista');
    await card.locator('input[type=number]').fill('9'); await card.locator('text=Atualizar estoque').click(); await wait(a, 1100);
    ok(/Estoque: 9 un/.test(await a.locator(`.cartao:has-text("${nomeProd}")`).first().innerText()), 'o estoque não foi atualizado para 9');
    await a.click('#aba-pedidos'); await wait(a, 900);
    const ped = a.locator(`.cartao:has-text("${t.nome}")`).first();
    ok(await ped.count(), 'o pedido do testador não apareceu no painel');
    for (const rot of ['Em produção', 'Saiu para entrega', 'Entregue']) { await a.locator(`.cartao:has-text("${t.nome}") button:has-text("Avançar → ${rot}")`).first().click(); await wait(a, 900); }
    ok(/Entregue/.test(await a.locator(`.cartao:has-text("${t.nome}")`).first().innerText()), 'o pedido não chegou ao status Entregue');
    return `Produto "${nomeProd}" (R$ 17,50) cadastrado; estoque alterado de 5 para 9; pedido do testador avançado por Em produção → Saiu para entrega → Entregue.`;
  }, () => !!est.idPedido);
  // 13 — avaliar
  await tarefa(12, async () => {
    await p.goto(BASE + `/pedido.html?id=${est.idPedido}`); await wait(p, 1100);
    ok(/Avaliar pedido/.test(await p.textContent('#conteudo')), 'o formulário de avaliação não apareceu com o pedido Entregue');
    await p.locator('.seletor-estrelas button[data-nota="5"]').first().click();
    await p.locator('textarea').first().fill('Teste automatizado do roteiro do laudo (sem opinião).');
    await p.locator('text=Enviar avaliação').first().click(); await wait(p, 900);
    ok(/Avaliação enviada/.test(await p.textContent('#bloco-avaliacao')), 'a confirmação da avaliação não apareceu');
    return 'Formulário liberado após "Entregue"; avaliação (nota 5 de teste) enviada e confirmada na tela.';
  }, () => !!est.idPedido && resultado[12] === 'FUNCIONOU');

  r.fim = new Date().toISOString(); await ctx.close(); await adm.close();
  return r;
}

(async () => {
  const browser = await chromium.launch(); const versao = browser.version(); const todos = [];
  for (const t of DISP) { console.log(`\n===== ${t.nome} — ${t.disp}`); todos.push(await sessao(browser, t, versao)); fs.writeFileSync(OUT, JSON.stringify(todos, null, 1)); }
  await browser.close(); console.log('\nFIM'); 
})().catch((e) => { console.error('ERRO NA EXECUÇÃO', e); process.exit(1); });
