const authService = require('../services/authService');

async function cadastrar(req, res) {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(422).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  res.status(201).json(await authService.cadastrar({ nome, email, senha }));
}

async function login(req, res) {
  res.json(await authService.autenticar({ email: req.body.email, senha: req.body.senha }));
}

function logout(req, res) {
  // Sessão stateless (JWT): o logout (US-03) é efetivado no cliente descartando o token.
  res.json({ mensagem: 'Sessão encerrada com sucesso.' });
}

async function recuperarSenha(req, res) {
  const urlBase = `${req.protocol}://${req.get('host')}`;
  res.json(await authService.solicitarRecuperacao({ email: req.body.email, urlBase }));
}

async function redefinirSenha(req, res) {
  res.json(await authService.redefinirSenha({ token: req.body.token, nova_senha: req.body.nova_senha }));
}

module.exports = { cadastrar, login, logout, recuperarSenha, redefinirSenha };
