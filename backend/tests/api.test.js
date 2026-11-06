/**
 * Testes de integração da API (rodam contra um MySQL REAL, em um database
 * separado: cupcakes_gourmet_test, recriado a cada execução).
 *
 *   npm test
 */
process.env.DB_NAME = process.env.DB_NAME_TEST || 'cupcakes_gourmet_test';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const criarApp = require('../src/app');
const { inicializarBanco } = require('../src/db/setup');
const { fechar, query } = require('../src/db/pool');

let servidor;
let BASE;
let adminToken;
let contador = 0;

async function http(metodo, caminho, { token, body } = {}) {
  const resp = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let dados = null;
  try { dados = await resp.json(); } catch { /* sem corpo */ }
  return { status: resp.status, dados };
}

async function novoCliente() {
  const email = `cliente${Date.now()}_${contador++}@teste.com`;
  const { dados } = await http('POST', '/api/auth/cadastro', { body: { nome: 'Cliente Teste', email, senha: '12345678' } });
  return { token: dados.token, email };
}

async function novoEndereco(token, cep = '01310-100') {
  const { dados } = await http('POST', '/api/enderecos', {
    token, body: { cep, logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
  });
  return dados.id_endereco;
}

const produtoPorNome = async (nome) => (await http('GET', '/api/produtos')).dados.find((p) => p.nome === nome);

before(async () => {
  await inicializarBanco({ reset: true });
  servidor = criarApp().listen(0);
  BASE = `http://127.0.0.1:${servidor.address().port}`;
  const login = await http('POST', '/api/auth/login', { body: { email: 'admin@cupcakesgourmet.com.br', senha: 'admin1234' } });
  adminToken = login.dados.token;
});

after(async () => {
  servidor.close();
  await fechar();
});

// ---------------------------------------------------------------- US-01 / US-02
test('US-02: cadastra cliente, rejeita senha curta e e-mail duplicado', async () => {
  const { email } = await novoCliente();
  const curta = await http('POST', '/api/auth/cadastro', { body: { nome: 'X', email: 'x@x.com', senha: '123' } });
  assert.equal(curta.status, 422);
  const duplicado = await http('POST', '/api/auth/cadastro', { body: { nome: 'Y', email, senha: '12345678' } });
  assert.equal(duplicado.status, 409);
});

test('US-01: login correto devolve token; senha errada informa tentativas restantes', async () => {
  const { email } = await novoCliente();
  const ok = await http('POST', '/api/auth/login', { body: { email, senha: '12345678' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.dados.token);
  const erro = await http('POST', '/api/auth/login', { body: { email, senha: 'errada!!' } });
  assert.equal(erro.status, 401);
  assert.match(erro.dados.erro, /mais 4 tentativa/);
});

test('US-01: bloqueia a conta na 5ª tentativa errada, mesmo com a senha correta depois', async () => {
  const { email } = await novoCliente();
  for (let i = 0; i < 5; i++) await http('POST', '/api/auth/login', { body: { email, senha: 'errada!!' } });
  const depois = await http('POST', '/api/auth/login', { body: { email, senha: '12345678' } });
  assert.equal(depois.status, 423);
});

// ---------------------------------------------------------------- Catálogo
test('US-04/05: lista o catálogo, filtra por categoria e busca por nome', async () => {
  const todos = await http('GET', '/api/produtos');
  assert.equal(todos.dados.length, 8);
  const veganos = await http('GET', '/api/produtos?categoria=2');
  assert.equal(veganos.dados.length, 1);
  assert.equal(veganos.dados[0].nome, 'Vegano de Cenoura');
  const busca = await http('GET', '/api/produtos?busca=chocolate');
  assert.equal(busca.dados.length, 1);
});

test('US-06: detalhe do produto traz ingredientes/alérgenos e 404 para inexistente', async () => {
  const p = await produtoPorNome('Red Velvet Gourmet');
  const det = await http('GET', `/api/produtos/${p.id_produto}`);
  assert.ok(det.dados.ingredientes && det.dados.alergenos);
  assert.equal((await http('GET', '/api/produtos/99999')).status, 404);
});

// ---------------------------------------------------------------- Carrinho
test('Carrinho exige login (401)', async () => {
  assert.equal((await http('GET', '/api/carrinho')).status, 401);
});

test('US-07/08: adiciona, altera quantidade, remove; respeita o estoque', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Limão Siciliano'); // estoque 20
  let r = await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 2 } });
  assert.equal(r.dados.total, 31.0);
  r = await http('PUT', `/api/carrinho/itens/${p.id_produto}`, { token, body: { quantidade: 4 } });
  assert.equal(r.dados.total, 62.0);
  const acima = await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 999 } });
  assert.equal(acima.status, 422);
  assert.match(acima.dados.erro, /Restam apenas 20 unidades/);
  r = await http('DELETE', `/api/carrinho/itens/${p.id_produto}`, { token });
  assert.equal(r.dados.itens.length, 0);
});

// ---------------------------------------------------------------- Frete / cupom
test('US-17: CEP fora do raio de 30 km é recusado', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Baunilha Clássica');
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 1 } });
  const r = await http('GET', '/api/frete?cep=20000-009', { token });
  assert.equal(r.status, 422);
  assert.equal(r.dados.codigo, 'CEP_FORA_DE_COBERTURA');
});

test('US-17: frete grátis a partir de R$ 80,00', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Chocolate Belga 70%'); // 16,50
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 5 } }); // 82,50
  const r = await http('GET', '/api/frete?cep=01310-100', { token });
  assert.equal(r.dados.frete_gratis, true);
  assert.equal(r.dados.valor_frete, 0);
});

test('US-13: cupom inválido e cupom com valor mínimo não atingido', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Baunilha Clássica'); // 12,90 < 20
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 1 } });
  const invalido = await http('GET', '/api/cupons/NAOEXISTE/validar', { token });
  assert.equal(invalido.dados.codigo, 'CUPOM_INVALIDO');
  const minimo = await http('GET', '/api/cupons/CUPCAKE10/validar', { token });
  assert.equal(minimo.dados.codigo, 'CUPOM_VALOR_MINIMO');
});

// ---------------------------------------------------------------- Checkout
test('US-10: checkout com cupom calcula os totais, baixa estoque e esvazia o carrinho', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Red Velvet Gourmet'); // 14,90
  const estoqueAntes = p.quantidade_estoque;
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 3 } }); // 44,70
  const idEndereco = await novoEndereco(token);
  const r = await http('POST', '/api/pedidos', { token, body: { id_endereco: idEndereco, codigo_cupom: 'CUPCAKE10', forma_pagamento: 'PIX' } });
  assert.equal(r.status, 201);
  const ped = r.dados.pedido;
  assert.equal(ped.valor_subtotal, 44.7);
  assert.equal(ped.valor_desconto, 4.47);
  assert.equal(ped.valor_frete, 8);
  assert.equal(ped.valor_total, 48.23);
  assert.match(ped.numero_pedido, /^PED-\d{4}-\d{3}$/);
  assert.equal(ped.status_pedido, 'RECEBIDO');
  assert.equal((await produtoPorNome('Red Velvet Gourmet')).quantidade_estoque, estoqueAntes - 3);
  assert.equal((await http('GET', '/api/carrinho', { token })).dados.itens.length, 0);
});

test('US-10: carrinho vazio e endereço de outro usuário são recusados', async () => {
  const a = await novoCliente();
  const b = await novoCliente();
  const endA = await novoEndereco(a.token);
  const vazio = await http('POST', '/api/pedidos', { token: a.token, body: { id_endereco: endA, forma_pagamento: 'PIX' } });
  assert.equal(vazio.status, 422);
  const p = await produtoPorNome('Baunilha Clássica');
  await http('POST', '/api/carrinho/itens', { token: b.token, body: { id_produto: p.id_produto, quantidade: 2 } });
  const alheio = await http('POST', '/api/pedidos', { token: b.token, body: { id_endereco: endA, forma_pagamento: 'PIX' } });
  assert.equal(alheio.status, 422);
});

test('US-10: pedido abaixo de R$ 10,00 é recusado (regra de valor mínimo)', async () => {
  const mini = await http('POST', '/api/admin/produtos', {
    token: adminToken,
    body: { id_categoria: 1, nome: 'Mini Teste', descricao: 'd', ingredientes: 'i', preco: 1.5, quantidade_estoque: 10, imagens: ['/img/baunilha-classica.svg'] },
  });
  assert.equal(mini.status, 201);
  const { token } = await novoCliente();
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: mini.dados.id_produto, quantidade: 1 } });
  const idEndereco = await novoEndereco(token);
  const r = await http('POST', '/api/pedidos', { token, body: { id_endereco: idEndereco, forma_pagamento: 'PIX' } });
  assert.equal(r.status, 422);
  assert.equal(r.dados.codigo, 'PEDIDO_ABAIXO_DO_MINIMO');
});

test('Transação: dois clientes disputam a última unidade — só um pedido é criado', async () => {
  const raro = await http('POST', '/api/admin/produtos', {
    token: adminToken,
    body: { id_categoria: 1, nome: 'Edição Única', descricao: 'd', ingredientes: 'i', preco: 20, quantidade_estoque: 1, imagens: ['/img/baunilha-classica.svg'] },
  });
  const idProduto = raro.dados.id_produto;
  const [a, b] = [await novoCliente(), await novoCliente()];
  for (const c of [a, b]) {
    const add = await http('POST', '/api/carrinho/itens', { token: c.token, body: { id_produto: idProduto, quantidade: 1 } });
    assert.equal(add.status, 201); // os dois conseguem colocar no carrinho
    c.endereco = await novoEndereco(c.token);
  }
  const resultados = await Promise.all(
    [a, b].map((c) => http('POST', '/api/pedidos', { token: c.token, body: { id_endereco: c.endereco, forma_pagamento: 'PIX' } }))
  );
  const status = resultados.map((r) => r.status).sort();
  assert.deepEqual(status, [201, 422]);
  const perdedor = resultados.find((r) => r.status === 422);
  assert.equal(perdedor.dados.codigo, 'ESTOQUE_INSUFICIENTE');
  const final = (await http('GET', '/api/admin/produtos', { token: adminToken })).dados.find((p) => p.id_produto === idProduto);
  assert.equal(final.quantidade_estoque, 0); // nunca negativo
});

// ---------------------------------------------------------------- Admin / status / avaliação
test('Autorização: sem token = 401; cliente em rota admin = 403', async () => {
  const { token } = await novoCliente();
  assert.equal((await http('GET', '/api/admin/pedidos')).status, 401);
  assert.equal((await http('GET', '/api/admin/pedidos', { token })).status, 403);
});

test('US-15/US-18: status sequencial, bloqueia pulo de etapa, avalia só após entrega e só uma vez', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Doce de Leite Argentino');
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 2 } });
  const idEndereco = await novoEndereco(token);
  const { dados } = await http('POST', '/api/pedidos', { token, body: { id_endereco: idEndereco, forma_pagamento: 'DINHEIRO' } });
  const id = dados.pedido.id_pedido;
  const mudar = (status) => http('PUT', `/api/admin/pedidos/${id}/status`, { token: adminToken, body: { status } });
  const avaliar = (nota) => http('POST', `/api/pedidos/${id}/avaliacao`, { token, body: { id_produto: p.id_produto, nota } });

  assert.equal((await avaliar(5)).status, 422); // ainda não entregue
  assert.equal((await mudar('ENTREGUE')).status, 422); // pulo de etapa
  for (const s of ['EM_PRODUCAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']) assert.equal((await mudar(s)).status, 200);
  assert.equal((await mudar('CANCELADO')).status, 422); // pedido já finalizado

  assert.equal((await avaliar(9)).status, 422); // nota inválida
  assert.equal((await avaliar(5)).status, 201);
  assert.equal((await avaliar(4)).status, 409); // duplicada
  const hist = (await http('GET', `/api/pedidos/${id}`, { token })).dados.historico.map((h) => h.status_novo);
  assert.deepEqual(hist, ['RECEBIDO', 'EM_PRODUCAO', 'SAIU_PARA_ENTREGA', 'ENTREGUE']);
});

test('Cancelar um pedido devolve os itens ao estoque', async () => {
  const { token } = await novoCliente();
  const p = await produtoPorNome('Morango do Campo');
  const antes = p.quantidade_estoque;
  await http('POST', '/api/carrinho/itens', { token, body: { id_produto: p.id_produto, quantidade: 2 } });
  const idEndereco = await novoEndereco(token);
  const { dados } = await http('POST', '/api/pedidos', { token, body: { id_endereco: idEndereco, forma_pagamento: 'PIX' } });
  assert.equal((await produtoPorNome('Morango do Campo')).quantidade_estoque, antes - 2);
  await http('PUT', `/api/admin/pedidos/${dados.pedido.id_pedido}/status`, { token: adminToken, body: { status: 'CANCELADO' } });
  assert.equal((await produtoPorNome('Morango do Campo')).quantidade_estoque, antes);
});

test('Privacidade: cliente não enxerga o pedido de outro cliente (404)', async () => {
  const a = await novoCliente();
  const b = await novoCliente();
  const p = await produtoPorNome('Baunilha Clássica');
  await http('POST', '/api/carrinho/itens', { token: a.token, body: { id_produto: p.id_produto, quantidade: 2 } });
  const idEndereco = await novoEndereco(a.token);
  const { dados } = await http('POST', '/api/pedidos', { token: a.token, body: { id_endereco: idEndereco, forma_pagamento: 'PIX' } });
  assert.equal((await http('GET', `/api/pedidos/${dados.pedido.id_pedido}`, { token: b.token })).status, 404);
});

test('US-09: limite de 5 endereços e troca do endereço padrão', async () => {
  const { token } = await novoCliente();
  for (let i = 0; i < 5; i++) await novoEndereco(token);
  const sexto = await http('POST', '/api/enderecos', {
    token, body: { cep: '01310-100', logradouro: 'R', numero: '1', bairro: 'B', cidade: 'C', uf: 'SP' },
  });
  assert.equal(sexto.status, 422);
  const lista = (await http('GET', '/api/enderecos', { token })).dados;
  assert.equal(lista.filter((e) => e.e_padrao).length, 1);
  const outro = lista.find((e) => !e.e_padrao);
  await http('PUT', `/api/enderecos/${outro.id_endereco}/padrao`, { token });
  const nova = (await http('GET', '/api/enderecos', { token })).dados;
  assert.equal(nova.filter((e) => e.e_padrao).length, 1);
  assert.equal(nova.find((e) => e.e_padrao).id_endereco, outro.id_endereco);
});

test('US-14: admin cadastra produto (nome único, preço > 0) e atualiza estoque', async () => {
  const base = { id_categoria: 1, descricao: 'd', ingredientes: 'i', imagens: ['/img/baunilha-classica.svg'] };
  const ok = await http('POST', '/api/admin/produtos', { token: adminToken, body: { ...base, nome: 'Novo Sabor', preco: 17.5, quantidade_estoque: 5 } });
  assert.equal(ok.status, 201);
  const dup = await http('POST', '/api/admin/produtos', { token: adminToken, body: { ...base, nome: 'Novo Sabor', preco: 17.5 } });
  assert.equal(dup.status, 422);
  const zero = await http('POST', '/api/admin/produtos', { token: adminToken, body: { ...base, nome: 'Grátis', preco: 0 } });
  assert.equal(zero.status, 422);
  const upd = await http('PUT', `/api/admin/produtos/${ok.dados.id_produto}`, { token: adminToken, body: { quantidade_estoque: 42, id_produto: 999 } });
  assert.equal(upd.dados.quantidade_estoque, 42);
  assert.equal(upd.dados.id_produto, ok.dados.id_produto); // campo não editável é ignorado
  const neg = await http('PUT', `/api/admin/produtos/${ok.dados.id_produto}`, { token: adminToken, body: { quantidade_estoque: -1 } });
  assert.equal(neg.status, 422);
});

test('US-16: recuperação de senha — token de uso único, expira, desbloqueia a conta', async () => {
  const { email } = await novoCliente();
  for (let i = 0; i < 5; i++) await http('POST', '/api/auth/login', { body: { email, senha: 'errada!!' } }); // bloqueia
  assert.equal((await http('POST', '/api/auth/login', { body: { email, senha: '12345678' } })).status, 423);

  const sol = await http('POST', '/api/auth/recuperar-senha', { body: { email } });
  assert.equal(sol.status, 200);
  const token = new URL(sol.dados.link_dev).searchParams.get('token');

  const curta = await http('POST', '/api/auth/redefinir-senha', { body: { token, nova_senha: '123' } });
  assert.equal(curta.status, 422);
  const ok = await http('POST', '/api/auth/redefinir-senha', { body: { token, nova_senha: 'novaSenha456' } });
  assert.equal(ok.status, 200);
  assert.equal((await http('POST', '/api/auth/login', { body: { email, senha: 'novaSenha456' } })).status, 200); // desbloqueada
  const reuso = await http('POST', '/api/auth/redefinir-senha', { body: { token, nova_senha: 'outraSenha789' } });
  assert.equal(reuso.status, 422); // RN#2: uso único

  const sol2 = await http('POST', '/api/auth/recuperar-senha', { body: { email } });
  const token2 = new URL(sol2.dados.link_dev).searchParams.get('token');
  await query('UPDATE tb_recuperacao_senha SET data_expiracao = DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
  const expirado = await http('POST', '/api/auth/redefinir-senha', { body: { token: token2, nova_senha: 'novaSenha999' } });
  assert.equal(expirado.status, 422); // RN#1: expira

  const inexistente = await http('POST', '/api/auth/recuperar-senha', { body: { email: 'nao-existe@x.com' } });
  assert.equal(inexistente.status, 200);
  assert.equal(inexistente.dados.link_dev, undefined); // não revela se o e-mail existe
});
