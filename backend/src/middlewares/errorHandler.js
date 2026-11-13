// Middleware centralizado de erros — controllers/models/services lançam erros com `status`
// e o tratamento fica aqui. Detalhes internos (ex.: texto de erro do MySQL) nunca vão ao cliente.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.status || 500;
  let mensagem = err.message;

  if (err.type === 'entity.parse.failed') { status = 400; mensagem = 'Requisição inválida: o corpo não é um JSON válido.'; }
  else if (err.type === 'entity.too.large') { status = 413; mensagem = 'Requisição grande demais.'; }
  else if (['ER_DATA_TOO_LONG', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'].includes(err.code)) {
    status = 422; mensagem = 'Algum campo excede o tamanho ou o formato permitido.';
  }

  if (status >= 500) {
    console.error(err);
    mensagem = 'Erro interno do servidor. Tente novamente em instantes.';
  }
  const codigoNegocio = typeof err.code === 'string' && !err.code.startsWith('ER_') ? err.code : undefined;
  res.status(status).json({ erro: mensagem, codigo: codigoNegocio, estoqueDisponivel: err.estoqueDisponivel });
}

module.exports = errorHandler;
