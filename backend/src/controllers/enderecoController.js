const Endereco = require('../models/Endereco');
const v = require('../utils/validacao');

const listar = async (req, res) => res.json(await Endereco.listarPorUsuario(req.usuario.id_usuario));

async function criar(req, res) {
  const b = req.body;
  const dados = {
    id_usuario: req.usuario.id_usuario,
    cep: v.cep(b.cep),
    logradouro: v.texto(b.logradouro, 'Logradouro', { max: 150 }),
    numero: v.texto(String(b.numero ?? ''), 'Número', { max: 20 }),
    complemento: b.complemento ? v.texto(b.complemento, 'Complemento', { max: 50 }) : null,
    bairro: v.texto(b.bairro, 'Bairro', { max: 80 }),
    cidade: v.texto(b.cidade, 'Cidade', { max: 80 }),
    uf: v.uf(b.uf),
    e_padrao: Boolean(b.e_padrao),
  };
  res.status(201).json(await Endereco.criar(dados));
}

async function definirPadrao(req, res) {
  const endereco = await Endereco.definirPadrao(req.usuario.id_usuario, v.inteiro(req.params.id, 'Endereço', { min: 1 }));
  if (!endereco) return res.status(404).json({ erro: 'Endereço não encontrado.' });
  res.json(endereco);
}

module.exports = { listar, criar, definirPadrao };
