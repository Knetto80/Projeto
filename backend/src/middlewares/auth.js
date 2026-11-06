const authService = require('../services/authService');

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  try {
    req.usuario = authService.verificarToken(token);
    next();
  } catch {
    return res.status(401).json({ erro: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

function somenteAdmin(req, res, next) {
  if (req.usuario?.tipo_usuario !== 'ADMINISTRADOR') {
    return res.status(403).json({ erro: 'Somente administradores acessam este painel (RN#1).' });
  }
  next();
}

module.exports = { autenticar, somenteAdmin };
