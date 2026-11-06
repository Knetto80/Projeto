const { Router } = require('express');
const { autenticar, somenteAdmin } = require('../middlewares/auth');

const authController = require('../controllers/authController');
const produtoController = require('../controllers/produtoController');
const carrinhoController = require('../controllers/carrinhoController');
const enderecoController = require('../controllers/enderecoController');
const freteController = require('../controllers/freteController');
const pedidoController = require('../controllers/pedidoController');

const router = Router();

// --- Autenticação (US-01, US-02, US-03, US-16) -------------------------------------
router.post('/auth/cadastro', authController.cadastrar);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/recuperar-senha', authController.recuperarSenha);   // US-16
router.post('/auth/redefinir-senha', authController.redefinirSenha);   // US-16

// --- Catálogo (US-04, US-05, US-06) — público --------------------------------
router.get('/categorias', produtoController.listarCategorias);
router.get('/produtos', produtoController.listar);
router.get('/produtos/:id', produtoController.detalhar);

// --- Carrinho (US-07, US-08) — autenticado -----------------------------------
router.get('/carrinho', autenticar, carrinhoController.obter);
router.post('/carrinho/itens', autenticar, carrinhoController.adicionar);
router.put('/carrinho/itens/:idProduto', autenticar, carrinhoController.atualizarItem);
router.delete('/carrinho/itens/:idProduto', autenticar, carrinhoController.removerItem);
router.delete('/carrinho', autenticar, carrinhoController.esvaziar);

// --- Endereços (US-09) — autenticado ------------------------------------------
router.get('/enderecos', autenticar, enderecoController.listar);
router.post('/enderecos', autenticar, enderecoController.criar);
router.put('/enderecos/:id/padrao', autenticar, enderecoController.definirPadrao);

// --- Frete e cupom (US-17, US-13) — autenticado -------------------------------
router.get('/frete', autenticar, freteController.calcular);
router.get('/cupons/:codigo/validar', autenticar, freteController.validarCupom);

// --- Pedidos (US-10, US-11, US-12, US-18) — autenticado -----------------------
router.post('/pedidos', autenticar, pedidoController.finalizarCompra);
router.get('/pedidos', autenticar, pedidoController.listarMeusPedidos);
router.get('/pedidos/:id', autenticar, pedidoController.detalhar);
router.post('/pedidos/:id/avaliacao', autenticar, pedidoController.avaliar);

// --- Administração (US-14, US-15) — autenticado + admin -----------------------
router.get('/admin/produtos', autenticar, somenteAdmin, produtoController.listarAdmin);
router.post('/admin/produtos', autenticar, somenteAdmin, produtoController.criar);
router.put('/admin/produtos/:id', autenticar, somenteAdmin, produtoController.atualizar);
router.get('/admin/pedidos', autenticar, somenteAdmin, pedidoController.listarTodosAdmin);
router.put('/admin/pedidos/:id/status', autenticar, somenteAdmin, pedidoController.alterarStatusAdmin);

module.exports = router;
