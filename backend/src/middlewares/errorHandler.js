// Middleware centralizado de erros — todo controller delega erros de
// regra de negócio (lançados pelos models/services com `err.status`)
// para cá via `next(err)`, mantendo os controllers enxutos.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({
    erro: err.message || 'Erro interno do servidor.',
    codigo: err.code || undefined,
    estoqueDisponivel: err.estoqueDisponivel,
  });
}

module.exports = errorHandler;
