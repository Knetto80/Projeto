const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const crypto = require('crypto');
const config = require('../config');
const RecuperacaoSenha = require('../models/RecuperacaoSenha');
const v = require('../utils/validacao');
const { query, transaction } = require('../db/pool');

const JWT_EXPIRA_EM = '24h';
const MAX_TENTATIVAS = 5;

function erro(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

async function cadastrar({ nome, email, senha }) {
  nome = v.texto(nome, 'Nome', { min: 2, max: 100 });
  email = v.email(email);
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 72) throw erro(422, 'A senha deve ter entre 8 e 72 caracteres.');
  if (await Usuario.buscarPorEmail(email)) throw erro(409, 'E-mail já cadastrado.');
  const senha_hash = await bcrypt.hash(senha, 10);
  const usuario = await Usuario.criar({ nome, email, senha_hash });
  return gerarSessao(usuario);
}

async function autenticar({ email, senha }) {
  const usuario = email ? await Usuario.buscarPorEmail(email) : null;
  if (!usuario) throw erro(401, 'E-mail ou senha incorretos.');
  if (usuario.conta_bloqueada) throw erro(423, 'Conta bloqueada por excesso de tentativas. Use "Recuperar Senha".');

  if (!(await bcrypt.compare(senha || '', usuario.senha_hash))) {
    const atualizado = await Usuario.registrarTentativaFalha(usuario.id_usuario);
    if (atualizado.conta_bloqueada) throw erro(401, 'Conta bloqueada por excesso de tentativas. Use "Recuperar Senha".');
    const restantes = Math.max(0, MAX_TENTATIVAS - atualizado.tentativas_falhas);
    throw erro(401, `E-mail ou senha incorretos. Você possui mais ${restantes} tentativa(s) antes do bloqueio.`);
  }
  await Usuario.resetarTentativas(usuario.id_usuario);
  return gerarSessao(usuario);
}

function gerarSessao(usuario) {
  const token = jwt.sign({ id_usuario: usuario.id_usuario, tipo_usuario: usuario.tipo_usuario }, config.jwtSecret, { expiresIn: JWT_EXPIRA_EM });
  return {
    token,
    usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, email: usuario.email, tipo_usuario: usuario.tipo_usuario },
  };
}

function verificarToken(token) {
  return jwt.verify(token, config.jwtSecret);
}


const sha256 = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

/**
 * US-16 — gera um token único (válido por 60 min, uso único) e "envia" o link.
 * Sem servidor SMTP neste protótipo, o e-mail é SIMULADO: o link é escrito no
 * console do servidor e, enquanto EMAIL_SIMULADO != 'false', devolvido na
 * resposta para que a demonstração funcione. Em produção, troque por um
 * envio real (ex.: nodemailer) e NUNCA devolva o link na resposta.
 * A resposta é a mesma para e-mails existentes e inexistentes (não revela cadastros).
 */
async function solicitarRecuperacao({ email, urlBase }) {
  const resposta = { mensagem: 'Se o e-mail estiver cadastrado, enviamos um link de recuperação (válido por 60 minutos).' };
  const usuario = email ? await Usuario.buscarPorEmail(email) : null;
  if (!usuario) return resposta;

  const token = crypto.randomBytes(32).toString('hex');
  await RecuperacaoSenha.criar(usuario.id_usuario, sha256(token));
  const link = `${urlBase}/redefinir.html?token=${token}`;
  console.log(`📧 [e-mail simulado] Para: ${usuario.email} — Link de recuperação: ${link}`);
  if (config.emailSimulado) resposta.link_dev = link;
  return resposta;
}

async function redefinirSenha({ token, nova_senha }) {
  if (typeof nova_senha !== 'string' || nova_senha.length < 8 || nova_senha.length > 72) throw erro(422, 'A nova senha deve ter entre 8 e 72 caracteres.');
  const registro = token ? await RecuperacaoSenha.buscarValido(sha256(String(token))) : null;
  if (!registro) throw erro(422, 'Link inválido, expirado ou já utilizado. Solicite uma nova recuperação.');
  const senha_hash = await bcrypt.hash(nova_senha, 10);
  await transaction(async (conn) => {
    await query('UPDATE tb_usuario SET senha_hash = ?, tentativas_falhas = 0, conta_bloqueada = 0 WHERE id_usuario = ?', [senha_hash, registro.id_usuario], conn);
    await RecuperacaoSenha.marcarUtilizado(registro.id_recuperacao, conn); // RN#2 — uso único
  });
  return { mensagem: 'Senha redefinida com sucesso! Você já pode entrar.' };
}

module.exports = { cadastrar, autenticar, verificarToken, solicitarRecuperacao, redefinirSenha };
