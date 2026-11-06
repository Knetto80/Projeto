const Endereco = require('../models/Endereco');

const listar = async (req, res) => res.json(await Endereco.listarPorUsuario(req.usuario.id_usuario));

async function criar(req, res) {
  const { cep, logradouro, numero, complemento, bairro, cidade, uf, e_padrao } = req.body;
  if (![cep, logradouro, numero, bairro, cidade, uf].every(Boolean)) {
    return res.status(422).json({ erro: 'Preencha CEP, logradouro, número, bairro, cidade e UF.' });
  }
  res.status(201).json(await Endereco.criar({ id_usuario: req.usuario.id_usuario, cep, logradouro, numero, complemento, bairro, cidade, uf, e_padrao }));
}

async function definirPadrao(req, res) {
  const endereco = await Endereco.definirPadrao(req.usuario.id_usuario, Number(req.params.id));
  if (!endereco) return res.status(404).json({ erro: 'Endereço não encontrado.' });
  res.json(endereco);
}

module.exports = { listar, criar, definirPadrao };
